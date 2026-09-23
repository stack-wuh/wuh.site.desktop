'use client'

/**
 * 主编辑器（CodeMirror 6 薄包装，20260922-refactor-codemirror-editor）：
 * - 源码编辑（markdown 语法高亮 + lineWrapping），功能入口在壳层胶囊与面板动作行；
 * - content 双通道：updateListener 的 docChanged → workspaceStore.setContent；store 侧
 *   外部注入（openDoc/startDraft/插件帧 doc.set）经 cmExternalContent 全量回写，
 *   pushedRef 区分自发输入与外部变更，编辑中不做全量重置；命令事务同样经
 *   updateListener 自动回同步 store（CM6 无 Vditor「命令突变不触发回调」问题）；
 * - 命令通道：订阅 editor-commands，格式化/插入/大纲跳转/聚焦走 lib/editor-cm 适配；
 *   文档操作类命令（save/saveAs/newDraft/closeDoc）在此不消费，归胶囊与面板宿主；
 * - 图片粘贴：capture 拦截 image 文件，经 savePastedImage 落文档同名 .assets 后插入
 *   相对引用；剪贴板入口（insertClipboardImage）同一落盘链路；提示用面板内 notice
 *   条（CM6 无 tip API），2.6s 自动消退；
 * - 主题桥接：EditorView.theme + HighlightStyle 只写 var(--token)，明暗随 data 属性
 *   路由自动生效，无 Vditor 式 setTheme 重建；语法配色仅语义 token，禁硬编码色值。
 */
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { markdown, markdownKeymap } from '@codemirror/lang-markdown'
import { tags } from '@lezer/highlight'
import { workspaceStore, useWorkspaceStore } from '../../lib/store'
import { publishEditorCommand, subscribeEditorCommands, type EditorCommand } from '../../lib/editor-commands'
import { cmApplyFormat, cmExternalContent, cmHeadingCursor, cmInsertSnippet } from '../../lib/editor-cm'
import { useLocale } from '../../lib/i18n/context'

const MIN_EDITOR_HEIGHT = 140

/** 语法配色：仅语义 token（标题/强调/链接/标记符等），明暗自动跟随 */
const editorHighlight = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--text-primary)', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--primary-color)' },
  { tag: tags.url, color: 'var(--text-muted)' },
  { tag: tags.monospace, color: 'var(--text-primary)' },
  { tag: tags.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: tags.list, color: 'var(--primary-color)' },
  { tag: tags.contentSeparator, color: 'var(--text-muted)' },
  { tag: tags.processingInstruction, color: 'var(--text-muted)' },
  { tag: tags.meta, color: 'var(--text-muted)' }
])

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px'
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-sans)'
  },
  '.cm-content': {
    caretColor: 'var(--primary-color)',
    lineHeight: 1.7,
    padding: '8px 2px 12px 0'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--primary-color)'
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in oklab, var(--primary-color) 22%, transparent)'
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent'
  },
  '.cm-placeholder': {
    color: 'var(--text-muted)'
  }
})

/* 挂载容器：布局与滚动在这里，视觉（背景/光标/选区/语法色）全在 editorTheme */
const EditorMount = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: ${MIN_EDITOR_HEIGHT}px;
`

const Notice = styled.div`
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  padding: 6px 10px;
  border-radius: var(--border-radius-base);
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  font-size: 12px;
  color: var(--text-secondary);
  pointer-events: none;
`

/** Blob → 纯 base64（Data URL 前缀剥除；savePastedImage 契约要裸 base64） */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const commaAt = result.indexOf(',')
      resolve(commaAt >= 0 ? result.slice(commaAt + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取剪贴板图片失败'))
    reader.readAsDataURL(blob)
  })
}

/** 剪贴板图片落盘并插入（blog 约定：文档同名 .assets 目录，主进程 src/main/images.ts） */
async function insertClipboardImage(
  view: EditorView,
  tipEmpty: string,
  tipNeedDoc: string,
  notify: (msg: string) => void
): Promise<void> {
  const doc = workspaceStore.get()
  if (!doc.activePath) {
    notify(tipNeedDoc)
    return
  }
  let base64: string | null = null
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith('image/'))
      if (!imageType) continue
      const blob = await item.getType(imageType)
      base64 = await blobToBase64(blob)
      break
    }
  } catch {
    // 权限拒绝或读取失败按「无图片」处理
  }
  if (!base64) {
    notify(tipEmpty)
    return
  }
  try {
    const saved = await window.api.savePastedImage(doc.activePath, 'image.png', base64)
    view.dispatch({
      changes: { from: view.state.selection.main.to, insert: `![](${saved.markdownRef})` }
    })
    view.focus()
  } catch (err) {
    notify(err instanceof Error ? err.message : String(err))
  }
}

export function MarkdownEditor(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  /** 编辑器自发推给 store 的最近内容：与 store.content 比对区分外部注入 */
  const pushedRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const mountEl = containerRef.current
    if (!mountEl) return
    let disposed = false

    // 面板内提示条（替代 Vditor tip）：2.6s 自动消退
    let noticeTimer: ReturnType<typeof setTimeout> | null = null
    const notify = (msg: string): void => {
      setNotice(msg)
      if (noticeTimer) clearTimeout(noticeTimer)
      noticeTimer = setTimeout(() => setNotice(null), 2600)
    }

    const extensions = [
      EditorView.lineWrapping,
      history(),
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            publishEditorCommand({ kind: 'save' })
            return true
          }
        },
        ...markdownKeymap,
        ...defaultKeymap,
        ...historyKeymap
      ]),
      markdown(),
      syntaxHighlighting(editorHighlight),
      editorTheme,
      placeholder(t('editor.placeholder')),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return
        const value = update.state.doc.toString()
        pushedRef.current = value
        workspaceStore.setContent(value)
      }),
      EditorView.domEventHandlers({
        paste(event, view) {
          const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
            f.type.startsWith('image/')
          )
          if (!file) return false
          event.preventDefault()
          event.stopPropagation()
          const docState = workspaceStore.get()
          if (!docState.activePath) {
            notify(t('editor.imageNeedDoc'))
            return true
          }
          const docPath = docState.activePath
          void blobToBase64(file)
            .then((base64) =>
              window.api.savePastedImage(docPath, file.name || 'image.png', base64)
            )
            .then((saved) => {
              view.dispatch({
                changes: { from: view.state.selection.main.to, insert: `![](${saved.markdownRef})` }
              })
              view.focus()
            })
            .catch((err: unknown) => notify(err instanceof Error ? err.message : String(err)))
          return true
        }
      })
    ]

    const initial = workspaceStore.get().content ?? ''
    pushedRef.current = initial
    const view = new EditorView({
      state: EditorState.create({ doc: initial, extensions }),
      parent: mountEl
    })
    viewRef.current = view
    if (!disposed) setReady(true)

    // 命令消费：文档突变事务经 updateListener 自动回同步 store，无需显式读回
    const handleCommand = (command: EditorCommand): boolean => {
      const v = viewRef.current
      if (!v) return false
      switch (command.kind) {
        case 'format':
          v.dispatch(cmApplyFormat(v.state, command.action))
          v.focus()
          return true
        case 'insert':
          v.dispatch(cmInsertSnippet(v.state, command.snippet))
          v.focus()
          return true
        case 'insertClipboardImage':
          void insertClipboardImage(v, t('editor.clipboardEmpty'), t('editor.imageNeedDoc'), notify)
          return true
        case 'scrollToHeading': {
          const pos = cmHeadingCursor(v.state.doc, command.index)
          if (pos == null) return false
          v.dispatch({ selection: EditorSelection.cursor(pos), scrollIntoView: true })
          v.focus()
          return true
        }
        case 'focus':
          v.focus()
          return true
        default:
          // 文档操作类（save/saveAs/newDraft/closeDoc）由胶囊与面板宿主认领
          return false
      }
    }
    const off = subscribeEditorCommands(handleCommand)

    return () => {
      disposed = true
      off()
      if (noticeTimer) clearTimeout(noticeTimer)
      view.destroy()
      viewRef.current = null
      setReady(false)
    }
    // t 只取挂载期初值（placeholder 与提示文案）；明暗经 CSS 变量自动跟随，无需重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 外部注入回写：openDoc / startDraft / 插件帧 doc.set 改写了 store.content
  useEffect(() => {
    const v = viewRef.current
    if (!v || !ready) return
    const content = doc.content ?? ''
    if (content === pushedRef.current) return
    v.dispatch(cmExternalContent(v.state, content))
    pushedRef.current = content
  }, [doc.content, ready])

  return (
    <EditorMount ref={containerRef} aria-label={t('editor.placeholder')} data-testid="markdown-editor">
      {notice && <Notice role="status">{notice}</Notice>}
    </EditorMount>
  )
}
