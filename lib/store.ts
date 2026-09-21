import { useSyncExternalStore } from 'react'

/**
 * 文档状态 store（两栏布局起为插件 doc 服务的宿主侧状态源）：
 * 内置编辑器已移除，宿主不再有写入 UI——content 仅经帧协议 doc.set 更新，
 * activePath/root 保留字段语义（未来默认编辑插件回归时复用），当前恒为初始值。
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
    await window.api.writeFile(activePath, content)
    this.markSaved()
  }
}

export function useWorkspaceStore(): WorkspaceState {
  return useSyncExternalStore(workspaceStore.subscribe, workspaceStore.get)
}
