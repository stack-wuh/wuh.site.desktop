'use client'

/**
 * 主编辑器（Vditor IR 薄包装，20260922 胶囊化演进）：
 * - IR 即时渲染（类 Typora），不渲染内置工具栏——功能入口全部收进壳层全局胶囊；
 * - content 双通道：input → workspaceStore.setContent 直写；store 侧外部注入
 *   （openDoc/startDraft/插件帧 doc.set）经 setValue 回写，pushedRef 区分自发
 *   输入与外部变更，编辑中不做全量重置（IR 的 setValue 会丢光标）；命令类突变
 *   （insertValue/updateValue）不触发 input 回调，必须显式读回同步 store；
 * - 命令通道：订阅 editor-commands 消费格式化/插入/大纲跳转/聚焦——全部走
 *   Vditor 增量 API 与「打字等价」路径（行前缀 = 光标移行首后 insertValue，
 *   IR 渲染管线与手工输入一致）；文档操作类命令（save/saveAs/newDraft/closeDoc）
 *   在此不消费，由胶囊编辑器宿主认领。
 * - 主题桥接（20260922-fix-vditor-theme-bridge 重写）：Vditor 把 `vditor` 类加在
 *   **挂载元素自身**（destroy 移除该类为证），后代选择器永不命中——token 变量与
 *   子树样式必须写在挂载元素复合选择器上（&.vditor / &.vditor--dark / & .vditor-*），
 *   (0,2,0) 压过 Vditor 变量块 (0,1,0)，不依赖样式注入顺序；颜色只经主题 token，
 *   字体只用三语义 token，callout 语义彩保留 Vditor 原值（固定语义色豁免）。
 */
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type Vditor from 'vditor'
import 'vditor/dist/index.css'
import { workspaceStore, useWorkspaceStore, type MarkdownInsertAction } from '../../lib/store'
import { publishEditorCommand, subscribeEditorCommands, type EditorCommand } from '../../lib/editor-commands'
import { INSERT_SNIPPETS } from '../../lib/editor-info'
import type { Locale } from '../../lib/i18n/locales'
import { useLocale } from '../../lib/i18n/context'
import { useTheme } from '../theme/ThemeProvider'

const MIN_EDITOR_HEIGHT = 140

const VDITOR_LANG: Record<Locale, 'zh_CN' | 'en_US' | 'ja_JP'> = {
  zh: 'zh_CN',
  en: 'en_US',
  ja: 'ja_JP'
}

const WRAP_MARKS: Partial<Record<MarkdownInsertAction, string>> = {
  bold: '**',
  italic: '*',
  code: '`'
}

const LINE_PREFIXES: Partial<Record<MarkdownInsertAction, string>> = {
  h1: '# ',
  h2: '## ',
  quote: '> ',
  ul: '- ',
  ol: '1. '
}

/* 挂载元素即 .vditor 本体：变量映射与子树样式都在这里（见文件头桥接说明） */
const EditorMount = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  max-height: 45vh;
  margin: 0 8px;
  overflow-y: auto;
  border-radius: var(--border-radius-base);

  &.vditor,
  &.vditor--dark {
    --border-color: var(--chrome-border);
    --second-color: color-mix(in oklab, var(--text-muted) 55%, transparent);
    --panel-background-color: transparent;
    --panel-shadow: none;
    --textarea-background-color: transparent;
    --textarea-text-color: var(--text-primary);
    --heading-border-color: color-mix(in oklab, var(--chrome-border) 80%, transparent);
    --blockquote-color: var(--text-muted);
    --count-background-color: var(--chrome-raised);
    --toolbar-background-color: transparent;
    --toolbar-icon-color: var(--text-muted);
    --toolbar-icon-hover-color: var(--primary-color);
    --ir-heading-color: var(--text-primary);
    --ir-link-color: var(--primary-color);
    --ir-title-color: var(--text-primary);
    --ir-bi-color: var(--text-primary);
    --ir-bracket-color: var(--text-muted);
    --ir-paren-color: var(--text-muted);
  }

  &.vditor {
    border: none;
    background: transparent;
    min-height: ${MIN_EDITOR_HEIGHT}px;
    font-family: var(--font-sans);
  }

  & .vditor-reset {
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.7;
    padding: 8px 2px 12px;
  }

  & .vditor-reset h1,
  & .vditor-reset h2,
  & .vditor-reset h3,
  & .vditor-reset h4,
  & .vditor-reset h5,
  & .vditor-reset h6 {
    color: var(--text-primary);
  }

  & .vditor-reset a {
    color: var(--primary-color);
  }

  & .vditor-reset code,
  & .vditor-reset pre {
    font-family: var(--font-mono);
  }

  & .vditor-reset code {
    background: var(--chrome-raised);
    color: var(--text-primary);
  }

  & .vditor-reset pre {
    background: var(--chrome-raised);
  }

  & .vditor-ir .vditor-ir-placeholder,
  & .vditor-sv .vditor-sv-placeholder {
    color: var(--text-muted);
  }
`

/** 光标回退 n 个字符（包裹类插入后落位到标记内侧；Electron/Chromium 支持） */
function nudgeCaretBack(steps: number): void {
  const selection = window.getSelection()
  for (let i = 0; i < steps; i++) {
    selection?.modify('move', 'backward', 'character')
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

/** 光标移到所在行行首（打字等价路径的前置步；lineboundary 粒度 Chromium 支持） */
function caretToLineStart(): boolean {
  const selection = window.getSelection()
  if (!selection || !selection.anchorNode) return false
  selection.modify('move', 'backward', 'lineboundary')
  return true
}

function scrollHeading(root: HTMLElement | null, index: number): boolean {
  if (!root) return false
  const headings = root.querySelectorAll(
    '.vditor-reset h1, .vditor-reset h2, .vditor-reset h3, .vditor-reset h4, .vditor-reset h5, .vditor-reset h6'
  )
  const target = headings[index]
  if (!target) return false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  return true
}

/**
 * 剪贴板图片落盘并插入（blog 约定：文档同名 .assets 目录 + 时间戳命名，
 * 主进程实现 src/main/images.ts）。无活动文档提示先保存；剪贴板无图提示为空。
 */
async function insertClipboardImage(
  v: Vditor,
  tipEmpty: string,
  tipNeedDoc: string,
  syncFromEditor: (v: Vditor) => void
): Promise<void> {
  const doc = workspaceStore.get()
  if (!doc.activePath) {
    v.tip(tipNeedDoc, 2600)
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
    v.tip(tipEmpty, 2600)
    return
  }
  try {
    const saved = await window.api.savePastedImage(doc.activePath, 'image.png', base64)
    v.insertValue(`![](${saved.markdownRef})`)
    v.focus()
    syncFromEditor(v)
  } catch (err) {
    v.tip(err instanceof Error ? err.message : String(err), 3200)
  }
}

export function MarkdownEditor(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t, locale } = useLocale()
  const { scheme } = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const vditorRef = useRef<Vditor | null>(null)
  /** 编辑器自发推给 store 的最近内容：与 store.content 比对区分外部注入 */
  const pushedRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false

    // 命令突变（insertValue/updateValue）不触发 Vditor 的 input 回调，
    // 必须显式读回内容同步 store，否则 dirty/保存链路滞留旧稿
    const syncFromEditor = (v: Vditor): void => {
      const value = v.getValue()
      pushedRef.current = value
      workspaceStore.setContent(value)
    }

    const handleCommand = (command: EditorCommand): boolean => {
      const v = vditorRef.current
      if (!v) return false
      switch (command.kind) {
        case 'format': {
          if (command.action === 'link') {
            const selected = v.getSelection()
            if (selected) {
              v.updateValue(`[${selected}]()`)
            } else {
              v.insertValue('[]()')
            }
            nudgeCaretBack(1)
            syncFromEditor(v)
            return true
          }
          const mark = WRAP_MARKS[command.action]
          if (mark) {
            const selected = v.getSelection()
            if (selected) {
              v.updateValue(`${mark}${selected}${mark}`)
            } else {
              v.insertValue(`${mark}${mark}`)
            }
            nudgeCaretBack(mark.length)
            syncFromEditor(v)
            return true
          }
          const prefix = LINE_PREFIXES[command.action]
          if (!prefix) return false
          if (!caretToLineStart()) return false
          v.insertValue(prefix)
          syncFromEditor(v)
          return true
        }
        case 'insert':
          v.insertValue(INSERT_SNIPPETS[command.snippet])
          syncFromEditor(v)
          return true
        case 'insertClipboardImage':
          void insertClipboardImage(v, t('editor.clipboardEmpty'), t('editor.imageNeedDoc'), syncFromEditor)
          return true
        case 'scrollToHeading':
          return scrollHeading(containerRef.current, command.index)
        case 'focus':
          v.focus()
          return true
        default:
          // 文档操作类（save/saveAs/newDraft/closeDoc）由胶囊宿主认领
          return false
      }
    }

    const off = subscribeEditorCommands(handleCommand)

    // 粘贴截图直落盘：capture 拦截 image 文件（避免 Vditor 落 base64 内嵌），
    // 经 savePastedImage 写文档同名 .assets 后插入相对引用；文本粘贴不受影响
    const mountEl = containerRef.current
    const onPaste = (event: ClipboardEvent): void => {
      const v = vditorRef.current
      if (!v) return
      const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/')
      )
      if (!file) return
      event.preventDefault()
      event.stopPropagation()
      const doc = workspaceStore.get()
      if (!doc.activePath) {
        v.tip(t('editor.imageNeedDoc'), 2600)
        return
      }
      const docPath = doc.activePath
      void blobToBase64(file)
        .then((base64) => window.api.savePastedImage(docPath, file.name || 'image.png', base64))
        .then((saved) => {
          v.insertValue(`![](${saved.markdownRef})`)
          syncFromEditor(v)
        })
        .catch((err: unknown) => {
          v.tip(err instanceof Error ? err.message : String(err), 3200)
        })
    }
    mountEl?.addEventListener('paste', onPaste, true)

    void (async () => {
      const VditorCtor = (await import('vditor')).default
      if (disposed || !mountEl) return
      const initial = workspaceStore.get().content ?? ''
      pushedRef.current = initial
      const instance = new VditorCtor(mountEl, {
        cdn: '/vditor',
        mode: 'ir',
        lang: VDITOR_LANG[locale],
        theme: scheme === 'dark' ? 'dark' : 'classic',
        toolbar: [],
        value: initial,
        placeholder: t('editor.placeholder'),
        cache: { enable: false },
        undoDelay: 200,
        height: 'auto',
        minHeight: MIN_EDITOR_HEIGHT,
        input: (value) => {
          pushedRef.current = value
          workspaceStore.setContent(value)
        },
        keydown: (event) => {
          if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'S')) {
            event.preventDefault()
            publishEditorCommand({ kind: 'save' })
          }
        },
        after: () => {
          if (!disposed) setReady(true)
        }
      })
      vditorRef.current = instance
    })()

    return () => {
      disposed = true
      off()
      mountEl?.removeEventListener('paste', onPaste, true)
      vditorRef.current?.destroy()
      vditorRef.current = null
      setReady(false)
    }
    // locale/scheme/t 只取挂载期初值：语言与明暗的运行时切换经下方独立 effect 跟进
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 明暗跟随：Vditor 主题档位切换（CSS 变量映射层自动跟随宿主 token，无需重建）
  useEffect(() => {
    if (!ready) return
    vditorRef.current?.setTheme(scheme === 'dark' ? 'dark' : 'classic')
  }, [scheme, ready])

  // 外部注入回写：openDoc / startDraft / 插件帧 doc.set 改写了 store.content
  useEffect(() => {
    const v = vditorRef.current
    if (!v || !ready) return
    const content = doc.content ?? ''
    if (content === pushedRef.current) return
    v.setValue(content, true)
    pushedRef.current = content
  }, [doc.content, ready])

  return <EditorMount ref={containerRef} className="md-editor" aria-label={t('editor.placeholder')} />
}
