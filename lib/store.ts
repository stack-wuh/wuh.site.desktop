import { useSyncExternalStore } from 'react'
import type { DesktopApi, FileNode } from '../src/shared/types'

/**
 * preload 注入的 DesktopApi。经 globalThis 取用而非裸 window：
 * store 是宿主与 node 侧测试共用的模块，测试环境无 DOM 全局。
 */
function api(): DesktopApi {
  return (globalThis as unknown as { window: { api: DesktopApi } }).window.api
}

/**
 * 文档状态 store（两栏布局起为插件 doc 服务的宿主侧状态源）：
 * content 双通道写入——宿主首页编辑器面板直写（2026-09-22 起，openDoc/setContent）
 * 与插件帧 doc.set 并存，最终汇聚于此单一状态源；
 * 工作区可经首页项目入口切换（2026-09-21 起），切换时 doc 状态整体失效（switchWorkspace）。
 */
export interface WorkspaceState {
  root: string | null
  activePath: string | null
  content: string | null
  /** 最近一次保存/加载的内容，dirty 依据 */
  saved: string | null
  dirty: boolean
}

// ---------- 文档生命周期事件（插件 documentHooks 的事件源） ----------

export type DocEventName = 'doc.opened' | 'doc.saved' | 'doc.changed' | 'doc.closed' | 'workspace'
type DocEventListener = (name: DocEventName, payload: Record<string, unknown>) => void

const docListeners = new Set<DocEventListener>()
let changedTimer: ReturnType<typeof setTimeout> | null = null

export const documentEvents = {
  subscribe(listener: DocEventListener): () => void {
    docListeners.add(listener)
    return () => {
      docListeners.delete(listener)
    }
  },
  emit(name: DocEventName, payload: Record<string, unknown>): void {
    docListeners.forEach((l) => {
      try {
        l(name, payload)
      } catch (err) {
        console.error('documentEvents 监听器异常', err)
      }
    })
  }
}

function emitChangedDebounced(): void {
  if (changedTimer) clearTimeout(changedTimer)
  changedTimer = setTimeout(() => {
    changedTimer = null
    documentEvents.emit('doc.changed', { path: state.activePath, dirty: state.dirty })
  }, 300)
}

let state: WorkspaceState = {
  root: null,
  activePath: null,
  content: null,
  saved: null,
  dirty: false
}

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function setState(patch: Partial<WorkspaceState>): void {
  state = { ...state, ...patch }
  emit()
}

export const workspaceStore = {
  get: (): WorkspaceState => state,
  subscribe(l: () => void): () => void {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  setContent(content: string): void {
    setState({ content, dirty: content !== state.saved })
    emitChangedDebounced()
  },
  markSaved(): void {
    setState({ saved: state.content, dirty: false })
    documentEvents.emit('doc.saved', { path: state.activePath })
  },
  /** 写盘当前文档（插件 documentHooks 的 save 入口） */
  async saveActive(): Promise<void> {
    const { activePath, content } = state
    if (!activePath || content == null) return
    await api().writeFile(activePath, content)
    this.markSaved()
  },
  /** 宿主编辑器打开工作区文档：activePath/content/saved 赋值 + doc.opened 广播 */
  openDoc(path: string, content: string): void {
    setState({ activePath: path, content, saved: content, dirty: false })
    documentEvents.emit('doc.opened', { path })
    documentEvents.emit('doc.changed', { path, dirty: false })
  },
  /** 宿主编辑器回到新草稿态：无 activePath、空内容、clean */
  startDraft(): void {
    setState({ activePath: null, content: '', saved: '', dirty: false })
    documentEvents.emit('doc.changed', { path: null, dirty: false })
  },
  /** 关闭当前文档（回到无文档态）；空态下 no-op 不广播 */
  closeDoc(): void {
    if (!state.activePath && state.content == null) return
    const path = state.activePath
    setState({ activePath: null, content: null, saved: null, dirty: false })
    if (path) documentEvents.emit('doc.closed', { path })
    documentEvents.emit('doc.changed', { path: null, dirty: false })
  },
  /** 工作区切换：doc 状态归属旧工作区，整体失效并广播 doc.changed（root 供 doc 服务解析新根） */
  switchWorkspace(root: string | null): void {
    setState({ root, activePath: null, content: null, saved: null, dirty: false })
    documentEvents.emit('doc.changed', { path: null, dirty: false })
  }
}

export function useWorkspaceStore(): WorkspaceState {
  // 第三参沿用同一快照：模块级纯内存状态，服务端预渲染与客户端取值一致
  return useSyncExternalStore(workspaceStore.subscribe, workspaceStore.get, workspaceStore.get)
}

// ---------- 首页编辑器面板的纯逻辑（可独立测试） ----------

/** 递归按 DFS 顺序收集工作区 .md 文件（相对路径） */
export function collectMarkdownFiles(tree: FileNode[]): string[] {
  const out: string[] = []
  const walk = (nodes: FileNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'dir') {
        if (node.children) walk(node.children)
      } else if (node.path.toLowerCase().endsWith('.md')) {
        out.push(node.path)
      }
    }
  }
  walk(tree)
  return out
}

/** 文件筛选：大小写不敏感的子串匹配（空查询原样返回） */
export function filterMarkdownFiles(paths: string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...paths]
  return paths.filter((p) => p.toLowerCase().includes(q))
}

// ---------- Markdown 插入（胶囊格式化命令的纯逻辑基础，位置计算供测试与等价路径） ----------

export type MarkdownInsertAction =
  | 'h1'
  | 'h2'
  | 'bold'
  | 'italic'
  | 'ul'
  | 'ol'
  | 'quote'
  | 'code'
  | 'link'

export interface InsertResult {
  content: string
  selStart: number
  selEnd: number
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

/**
 * 在 content 的 [selStart, selEnd) 上执行插入：
 * - 包裹类（bold/italic/code）：选区被标记包裹，选区回落到原文本；无选区插入空标记并定位中间
 * - link：选区变 [text]()，光标落 url 待输入位
 * - 行前缀类（h1/h2/quote/ul/ol）：选区覆盖的每一行行首加前缀；单行选区光标保持行内相对位置，
 *   跨行选区扩展为覆盖整个前缀块
 */
export function applyMarkdownInsert(
  content: string,
  selStart: number,
  selEnd: number,
  action: MarkdownInsertAction
): InsertResult {
  if (action === 'link') {
    const text = content.slice(selStart, selEnd)
    const before = content.slice(0, selStart)
    const after = content.slice(selEnd)
    const urlAt = selStart + text.length + 3 // '[' + text + '](' 之后
    return { content: `${before}[${text}]()${after}`, selStart: urlAt, selEnd: urlAt }
  }

  const wrap = WRAP_MARKS[action]
  if (wrap) {
    const selected = content.slice(selStart, selEnd)
    const before = content.slice(0, selStart)
    const after = content.slice(selEnd)
    const innerStart = selStart + wrap.length
    return {
      content: `${before}${wrap}${selected}${wrap}${after}`,
      selStart: innerStart,
      selEnd: innerStart + selected.length
    }
  }

  const prefix = LINE_PREFIXES[action]
  if (!prefix) throw new Error(`未知的插入动作: ${action}`)

  const lineStart = content.lastIndexOf('\n', selStart - 1) + 1
  const nlAfterEnd = content.indexOf('\n', selEnd)
  const lineEnd = nlAfterEnd === -1 ? content.length : nlAfterEnd
  const block = content.slice(lineStart, lineEnd)
  const prefixed = block
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')

  const lineIdxOf = (offset: number): number =>
    content.slice(lineStart, offset).split('\n').length - 1
  const idxStart = lineIdxOf(selStart)
  const idxEnd = lineIdxOf(selEnd)
  const p = prefix.length
  const nextContent = content.slice(0, lineStart) + prefixed + content.slice(lineEnd)

  if (idxEnd === idxStart) {
    return { content: nextContent, selStart: selStart + (idxStart + 1) * p, selEnd: selEnd + (idxEnd + 1) * p }
  }
  return { content: nextContent, selStart: lineStart, selEnd: lineStart + prefixed.length }
}
