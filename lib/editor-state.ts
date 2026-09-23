/**
 * 编辑器实时状态总线（host 侧纯逻辑，可独立测试）——命令通道（editor-commands）
 * 的反向通道：编辑器实例把「光标所在章节」等派生状态单向回推，胶囊/面板经
 * useSyncExternalStore 消费。发布即替换状态源，订阅者拿同一引用（浅比较后通知）。
 */
import { activeOutlineIndex } from './editor-info'

export interface EditorLiveState {
  /** 光标归属的标题序号（parseOutline 序列；无归属为 -1），大纲跟随高亮用 */
  activeHeading: number
  /** 即时渲染 ↔ 纯源码（L3 渲染开关的当前态，编辑器挂载与切换时回推） */
  renderMode: 'render' | 'source'
}

let state: EditorLiveState = { activeHeading: -1, renderMode: 'render' }

const subscribers = new Set<() => void>()

export function getEditorLiveState(): EditorLiveState {
  return state
}

/** 编辑器侧在光标/文档/渲染模式变化时回推 */
export function publishEditorLiveState(patch: {
  content?: string
  cursorLine?: number
  renderMode?: 'render' | 'source'
}): void {
  const next: EditorLiveState = { ...state }
  if (patch.renderMode !== undefined) next.renderMode = patch.renderMode
  if (patch.content !== undefined && patch.cursorLine !== undefined) {
    next.activeHeading = activeOutlineIndex(patch.content, patch.cursorLine)
  }
  if (next.activeHeading === state.activeHeading && next.renderMode === state.renderMode) return
  state = next
  subscribers.forEach((fn) => {
    try {
      fn()
    } catch (err) {
      console.error('编辑器状态订阅者异常', err)
    }
  })
}

export function subscribeEditorLiveState(fn: () => void): () => void {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function resetEditorLiveStateForTests(): void {
  state = { activeHeading: -1, renderMode: 'render' }
  subscribers.clear()
}
