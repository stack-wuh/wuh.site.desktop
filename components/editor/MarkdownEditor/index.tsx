'use client'

/**
 * 主编辑器（CodeMirror 6 薄包装）：
 * - 源码编辑（markdown 语法高亮 + lineWrapping），功能入口在壳层胶囊与面板动作行；
 * - content 双通道：updateListener 的 docChanged → workspaceStore.setContent；store 侧
 *   外部注入（openDoc/startDraft/插件帧 doc.set）经 cmExternalContent 全量回写，
 *   pushedRef 区分自发输入与外部变更，编辑中不做全量重置；命令事务同样经
 *   updateListener 自动回同步 store；
 * - 命令通道：格式化/插入/大纲跳转/聚焦/渲染开关/查找替换/撤销重做在编辑器侧消费，
 *   文档操作类（save/saveAs/newDraft/closeDoc）归胶囊与面板宿主；
 * - L3 即时渲染（20260923-feature-cm-live-preview）：livePreviewField 装饰层 +
 *   Compartment 热切换（即时渲染 ↔ 纯源码），偏好持久化 wd.editorRenderMode，
 *   切换态经 editor-state 总线回推（面板/胶囊单状态源）；主题样式见 ./renderTheme；
 * - 图片粘贴：capture 拦截 image 文件，经 savePastedImage 落文档同名 .assets 后插入
 *   相对引用；剪贴板入口（insertClipboardImage）同一落盘链路；提示用面板内 notice
 *   条，2.6s 自动消退。
 * （20260926-refactor-mega-component-split：主题/样式拆至 ./renderTheme、./styles）
 */
import { useEffect, useRef, useState } from 'react'
import { Compartment, EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, redo, undo } from '@codemirror/commands'
import { closeSearchPanel, openSearchPanel, search, searchKeymap } from '@codemirror/search'
import { syntaxHighlighting } from '@codemirror/language'
import { markdown, markdownKeymap } from '@codemirror/lang-markdown'
import { workspaceStore, useWorkspaceStore } from '../../../lib/store'
import { publishEditorCommand, subscribeEditorCommands, type EditorCommand } from '../../../lib/editor-commands'
import { cmApplyFormat, cmExternalContent, cmHeadingCursor, cmInsertSnippet } from '../../../lib/editor-cm'
import { livePreviewField } from '../decorations'
import {
  loadPersistedEditorState,
  publishEditorLiveState,
  useEditorLiveState
} from '../../../lib/editor-state'
import { useLocale } from '../../../lib/i18n/context'
import 'katex/dist/katex.min.css'
import { editorHighlight, editorTheme } from './renderTheme'
import { EditorMount, Notice } from './styles'

/** 渲染模式偏好持久化键（与 wd.theme / wd.locale 同族命名） */
const RENDER_STORAGE_KEY = 'wd.editorRenderMode'

function readRenderPref(): 'render' | 'source' {
  try {
    return localStorage.getItem(RENDER_STORAGE_KEY) === 'source' ? 'source' : 'render'
  } catch {
    return 'render'
  }
}

function writeRenderPref(mode: 'render' | 'source'): void {
  try {
    localStorage.setItem(RENDER_STORAGE_KEY, mode)
  } catch {
    // 存储不可用时偏好仅会话内生效
  }
}

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
  /** 渲染模式偏好：初始读持久化，toggle 经 Compartment 热切换 */
  const renderModeRef = useRef<'render' | 'source'>('render')
  const renderCompRef = useRef<Compartment | null>(null)
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const mountEl = containerRef.current
    if (!mountEl) return
    let disposed = false

    // 面板内提示条：2.6s 自动消退
    let noticeTimer: ReturnType<typeof setTimeout> | null = null
    const notify = (msg: string): void => {
      setNotice(msg)
      if (noticeTimer) clearTimeout(noticeTimer)
      noticeTimer = setTimeout(() => setNotice(null), 2600)
    }

    renderModeRef.current = readRenderPref()
    const renderComp = new Compartment()
    renderCompRef.current = renderComp
    // 排版偏好等持久化态入总线（专注/大纲跟随为会话态默认值）
    loadPersistedEditorState()

    const extensions = [
      EditorView.lineWrapping,
      // 选区自绘：主题的 .cm-selectionBackground 才会生效，且不再与 display:none
      // 隐藏标记的原生选区渲染互相打架（20260924-fix-cm-selection-atomic）
      drawSelection(),
      history(),
      renderComp.of(renderModeRef.current === 'render' ? livePreviewField : []),
      search({
        top: true
      }),
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            publishEditorCommand({ kind: 'save' })
            return true
          }
        },
        {
          key: 'Mod-/',
          run: () => {
            publishEditorCommand({ kind: 'toggleRender' })
            return true
          }
        },
        {
          key: 'Mod-Shift-f',
          run: () => {
            publishEditorCommand({ kind: 'toggleFocus' })
            return true
          }
        },
        ...searchKeymap,
        ...markdownKeymap,
        ...defaultKeymap,
        ...historyKeymap
      ]),
      markdown(),
      syntaxHighlighting(editorHighlight),
      editorTheme,
      placeholder(t('editor.placeholder')),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const value = update.state.doc.toString()
          pushedRef.current = value
          workspaceStore.setContent(value)
        }
        if (update.docChanged || update.selectionSet) {
          const head = update.state.selection.main.head
          const line = update.state.doc.lineAt(head).number - 1
          publishEditorLiveState({
            content: update.state.doc.toString(),
            cursorLine: line
          })
        }
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
    if (!disposed) {
      setReady(true)
      publishEditorLiveState({ renderMode: renderModeRef.current })
    }

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
        case 'toggleRender': {
          const next = renderModeRef.current === 'render' ? 'source' : 'render'
          renderModeRef.current = next
          writeRenderPref(next)
          v.dispatch({
            effects: renderComp.reconfigure(next === 'render' ? livePreviewField : [])
          })
          publishEditorLiveState({ renderMode: next })
          v.focus()
          return true
        }
        case 'findReplace': {
          if (document.querySelector('.cm-panel.cm-search')) {
            closeSearchPanel(v)
          } else {
            openSearchPanel(v)
          }
          v.focus()
          return true
        }
        case 'undo':
          undo(v)
          v.focus()
          return true
        case 'redo':
          redo(v)
          v.focus()
          return true
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
      renderCompRef.current = null
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

  // 排版偏好 → surface CSS 变量（字号/行距/行宽；预览分栏不受影响）
  const { typography } = useEditorLiveState()
  const mountStyle = {
    '--editor-font-size': `${typography.fontSize}px`,
    '--editor-line-height': String(typography.lineHeight),
    '--editor-measure': typography.measure === 'full' ? 'none' : `${typography.measure}px`
  } as React.CSSProperties

  return (
    <EditorMount ref={containerRef} style={mountStyle} aria-label={t('editor.placeholder')} data-testid="markdown-editor">
      {notice && <Notice role="status">{notice}</Notice>}
    </EditorMount>
  )
}
