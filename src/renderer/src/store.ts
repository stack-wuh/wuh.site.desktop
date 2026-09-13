import { useSyncExternalStore } from 'react'

export interface WorkspaceState {
  root: string | null
  activePath: string | null
  content: string | null
  /** 最近一次保存/加载的内容，dirty 依据 */
  saved: string | null
  dirty: boolean
  loading: boolean
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
  },
  setRoot(root: string): void {
    setState({ root })
  },
  async openFile(path: string): Promise<void> {
    if (state.dirty && !confirm(`「${state.activePath}」有未保存的修改，确定放弃并打开新文件？`)) {
      return
    }
    setState({ loading: true })
    try {
      const fc = await window.api.readFile(path)
      setState({ activePath: path, content: fc.content, saved: fc.content, dirty: false, loading: false })
    } catch (err) {
      setState({ loading: false })
      alert(`打开失败：${err instanceof Error ? err.message : String(err)}`)
    }
  },
  setContent(content: string): void {
    setState({ content, dirty: content !== state.saved })
  },
  markSaved(): void {
    setState({ saved: state.content, dirty: false })
  }
}

export function useWorkspaceStore(): WorkspaceState {
  return useSyncExternalStore(workspaceStore.subscribe, workspaceStore.get)
}
