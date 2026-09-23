/**
 * 编辑器实时状态总线（host 侧纯逻辑，可独立测试）——命令通道（editor-commands）
 * 的反向通道：编辑器实例把「光标所在章节」等派生状态单向回推，胶囊/面板经
 * useSyncExternalStore 消费；胶囊/编辑器任一侧的开关（渲染/专注/大纲跟随）
 * 与排版偏好也走本总线，保证双挂点单状态源。发布即替换状态源，订阅者拿同一
 * 引用（浅比较后通知）。排版偏好持久化 wd.editorTypography，专注/跟随为会话态。
 */
import { useSyncExternalStore } from 'react'
import { activeOutlineIndex } from './editor-info'

/** 排版偏好：字号 px / 行距 / 行宽（满幅或像素值） */
export interface EditorTypography {
  fontSize: number
  lineHeight: number
  measure: 'full' | number
}

export const DEFAULT_TYPOGRAPHY: EditorTypography = {
  fontSize: 14,
  lineHeight: 1.7,
  measure: 'full'
}

const TYPOGRAPHY_STORAGE_KEY = 'wd.editorTypography'

export interface EditorLiveState {
  /** 光标归属的标题序号（parseOutline 序列；无归属为 -1），大纲跟随高亮用 */
  activeHeading: number
  /** 即时渲染 ↔ 纯源码（L3 渲染开关的当前态，编辑器挂载与切换时回推） */
  renderMode: 'render' | 'source'
  /** 专注模式：问候/散点图淡出、编辑区沉浸 */
  focusMode: boolean
  /** 大纲跟随：胶囊大纲高亮光标所在章节 */
  outlineFollow: boolean
  /** 排版偏好（作用于编辑器 surface CSS 变量，预览分栏不受影响） */
  typography: EditorTypography
}

function loadTypography(): EditorTypography {
  try {
    const raw = localStorage.getItem(TYPOGRAPHY_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_TYPOGRAPHY }
    const parsed = JSON.parse(raw) as Partial<EditorTypography>
    const fontSize =
      typeof parsed.fontSize === 'number' ? Math.min(18, Math.max(12, Math.round(parsed.fontSize))) : DEFAULT_TYPOGRAPHY.fontSize
    const lineHeight =
      typeof parsed.lineHeight === 'number' ? Math.min(2.2, Math.max(1.5, Math.round(parsed.lineHeight * 10) / 10)) : DEFAULT_TYPOGRAPHY.lineHeight
    const measure =
      parsed.measure === 'full' || (typeof parsed.measure === 'number' && parsed.measure >= 480)
        ? parsed.measure
        : DEFAULT_TYPOGRAPHY.measure
    return { fontSize, lineHeight, measure }
  } catch {
    return { ...DEFAULT_TYPOGRAPHY }
  }
}

let state: EditorLiveState = {
  activeHeading: -1,
  renderMode: 'render',
  focusMode: false,
  outlineFollow: true,
  typography: { ...DEFAULT_TYPOGRAPHY }
}

const subscribers = new Set<() => void>()

export function getEditorLiveState(): EditorLiveState {
  return state
}

/** 编辑器侧在光标/文档/渲染模式变化时回推；开关与排版由胶囊/编辑器任一侧切换 */
export function publishEditorLiveState(patch: {
  content?: string
  cursorLine?: number
  renderMode?: 'render' | 'source'
  focusMode?: boolean
  outlineFollow?: boolean
  typography?: EditorTypography
}): void {
  const next: EditorLiveState = { ...state }
  if (patch.renderMode !== undefined) next.renderMode = patch.renderMode
  if (patch.focusMode !== undefined) next.focusMode = patch.focusMode
  if (patch.outlineFollow !== undefined) next.outlineFollow = patch.outlineFollow
  if (patch.typography !== undefined) {
    next.typography = patch.typography
    try {
      localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(patch.typography))
    } catch {
      // 存储不可用时排版偏好仅会话内生效
    }
  }
  if (patch.content !== undefined && patch.cursorLine !== undefined) {
    next.activeHeading = activeOutlineIndex(patch.content, patch.cursorLine)
  }
  if (
    next.activeHeading === state.activeHeading &&
    next.renderMode === state.renderMode &&
    next.focusMode === state.focusMode &&
    next.outlineFollow === state.outlineFollow &&
    next.typography === state.typography
  ) {
    return
  }
  state = next
  subscribers.forEach((fn) => {
    try {
      fn()
    } catch (err) {
      console.error('编辑器状态订阅者异常', err)
    }
  })
}

/** 挂载期加载持久化排版偏好（编辑器 mount 时调用；SSR 安全） */
export function loadPersistedEditorState(): void {
  publishEditorLiveState({ typography: loadTypography() })
}

export function subscribeEditorLiveState(fn: () => void): () => void {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

/** 组件侧标准消费口：编辑器面板/胶囊/首页共用（单状态源） */
export function useEditorLiveState(): EditorLiveState {
  return useSyncExternalStore(subscribeEditorLiveState, getEditorLiveState, getEditorLiveState)
}

export function resetEditorLiveStateForTests(): void {
  state = {
    activeHeading: -1,
    renderMode: 'render',
    focusMode: false,
    outlineFollow: true,
    typography: { ...DEFAULT_TYPOGRAPHY }
  }
  subscribers.clear()
}
