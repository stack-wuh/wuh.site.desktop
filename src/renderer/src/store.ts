import { useSyncExternalStore } from 'react'
import { uiConfirm } from './components/ui/Dialog'

export interface WorkspaceState {
  root: string | null
  activePath: string | null
  content: string | null
  /** 最近一次保存/加载的内容，dirty 依据 */
  saved: string | null
  dirty: boolean
  loading: boolean
}

// ---------- 文档生命周期事件（插件 documentHooks 的事件源） ----------

export type DocEventName = 'doc.opened' | 'doc.saved' | 'doc.changed' | 'doc.closed'
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
  dirty: false,
  loading: false
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
  reset(): void {
    setState({ root: null, activePath: null, content: null, saved: null, dirty: false, loading: false })
    documentEvents.emit('doc.closed', {})
  },
  setRoot(root: string): void {
    setState({ root })
  },
  async openFile(path: string): Promise<void> {
    if (state.dirty) {
      const ok = await uiConfirm({
        title: '未保存的修改',
        message: `「${state.activePath}」有未保存的修改，确定放弃并打开新文件？`,
        okText: '放弃并打开',
        danger: true
      })
      if (!ok) return
    }
    setState({ loading: true })
    try {
      const fc = await window.api.readFile(path)
      setState({ activePath: path, content: fc.content, saved: fc.content, dirty: false, loading: false })
      documentEvents.emit('doc.opened', { path })
    } catch (err) {
      setState({ loading: false })
      alert(`打开失败：${err instanceof Error ? err.message : String(err)}`)
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
  /** 写盘当前文档（host 自用与插件 documentHooks 的 save 入口） */
  async saveActive(): Promise<void> {
    const { activePath, content } = state
    if (!activePath || content == null) return
    await window.api.writeFile(activePath, content)
    this.markSaved()
  }
}

export function useWorkspaceStore(): WorkspaceState {
  return useSyncExternalStore(workspaceStore.subscribe, workspaceStore.get)
}
