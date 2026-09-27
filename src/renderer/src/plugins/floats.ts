/**
 * 浮窗注册表（host 侧纯逻辑，可独立测试）。
 *
 * 模型：float 区域插件视图的窗口态注册表——开合、最小化、视口内几何与 z 序。
 * FloatLayer 组件经 useSyncExternalStore 订阅快照渲染窗口；视图内容本身仍是
 * 沙箱插件帧（复用 PluginView）。几何在每次写入时按传入视口钳制，保证窗口
 * 永不丢失在视口外；close 移除记录，minimize 保留几何以便还原。
 */

export interface FloatWindowState {
  /** `${pluginId}:${viewId}` */
  key: string
  open: boolean
  /** 最小化为角落 chip（几何保留，restore 还原） */
  minimized: boolean
  /** 视口内几何（px，已钳制） */
  x: number
  y: number
  width: number
  height: number
  /** z 序；focusFloat/openFloat 取 topZ+1，大者在上 */
  z: number
}

interface FloatsState {
  windows: FloatWindowState[]
  topZ: number
}

/** 浮窗几何常量：默认尺寸 / 最小尺寸 / 视口安全边距 / 级联步长 */
export const FLOAT_DEFAULT_WIDTH = 520
export const FLOAT_DEFAULT_HEIGHT = 640
export const FLOAT_MIN_WIDTH = 280
export const FLOAT_MIN_HEIGHT = 200
export const FLOAT_MARGIN = 16
const CASCADE_STEP = 28
const CASCADE_MAX = 6

export interface FloatViewport {
  width: number
  height: number
}

let state: FloatsState = { windows: [], topZ: 0 }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

/** 就地变更后统一走这里产出新快照（useSyncExternalStore 依赖新引用） */
function commit(): void {
  state = { windows: [...state.windows], topZ: state.topZ }
  emit()
}

export function floatKey(pluginId: string, viewId: string): string {
  return `${pluginId}:${viewId}`
}

/** 组件读取当前视口（SSR/测试兜底），保证钳制输入恒为正数 */
export function viewportOf(w: number, h: number): FloatViewport {
  return {
    width: Math.max(w, FLOAT_MIN_WIDTH + FLOAT_MARGIN * 2),
    height: Math.max(h, FLOAT_MIN_HEIGHT + FLOAT_MARGIN * 2)
  }
}

function clampSize(w: number, h: number, vp: FloatViewport): { width: number; height: number } {
  return {
    width: Math.min(Math.max(w, FLOAT_MIN_WIDTH), vp.width - FLOAT_MARGIN * 2),
    height: Math.min(Math.max(h, FLOAT_MIN_HEIGHT), vp.height - FLOAT_MARGIN * 2)
  }
}

function clampPosition(x: number, y: number, width: number, height: number, vp: FloatViewport): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, FLOAT_MARGIN), Math.max(FLOAT_MARGIN, vp.width - width - FLOAT_MARGIN)),
    y: Math.min(Math.max(y, FLOAT_MARGIN), Math.max(FLOAT_MARGIN, vp.height - height - FLOAT_MARGIN))
  }
}

function defaultGeometry(vp: FloatViewport): { x: number; y: number; width: number; height: number } {
  const size = clampSize(FLOAT_DEFAULT_WIDTH, FLOAT_DEFAULT_HEIGHT, vp)
  // 级联：按已开窗数向左下错开，多窗不精确重叠
  const cascade = (state.windows.filter((w) => w.open).length % CASCADE_MAX) * CASCADE_STEP
  const pos = clampPosition(
    vp.width - size.width - 24 - cascade,
    48 + cascade,
    size.width,
    size.height,
    vp
  )
  return { ...size, ...pos }
}

function mutate(key: string, fn: (w: FloatWindowState) => void): void {
  const w = state.windows.find((x) => x.key === key)
  if (!w) return
  fn(w)
  commit()
}

export const floatsStore = {
  get: (): FloatsState => state,
  subscribe(l: () => void): () => void {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
}

export function isOpen(key: string): boolean {
  return state.windows.some((w) => w.key === key && w.open)
}

/** 打开（已存在则恢复显示并置顶），返回窗口态 */
export function openFloat(key: string, vp: FloatViewport): FloatWindowState {
  const existing = state.windows.find((w) => w.key === key)
  if (existing) {
    existing.open = true
    existing.minimized = false
    existing.z = ++state.topZ
    const pos = clampPosition(existing.x, existing.y, existing.width, existing.height, vp)
    Object.assign(existing, pos)
    commit()
    return existing
  }
  const z = ++state.topZ
  const w: FloatWindowState = { key, open: true, minimized: false, z, ...defaultGeometry(vp) }
  state.windows.push(w)
  commit()
  return w
}

/** 关闭并移除记录（再开为新的默认几何；最小化几何保留由 minimize/restore 负责） */
export function closeFloat(key: string): void {
  const before = state.windows.length
  state.windows = state.windows.filter((w) => w.key !== key)
  if (state.windows.length !== before) commit()
}

/** 开合语义：关闭→打开；最小化→恢复；打开→关闭 */
export function toggleFloat(key: string, vp: FloatViewport): void {
  const w = state.windows.find((x) => x.key === key)
  if (!w || !w.open) openFloat(key, vp)
  else if (w.minimized) restoreFloat(key)
  else closeFloat(key)
}

/** 最小化为角落 chip（open 保持 true，几何保留） */
export function minimizeFloat(key: string): void {
  mutate(key, (w) => {
    w.minimized = true
  })
}

export function restoreFloat(key: string): void {
  mutate(key, (w) => {
    if (w.open) w.minimized = false
  })
}

export function focusFloat(key: string): void {
  mutate(key, (w) => {
    w.z = ++state.topZ
  })
}

export function moveFloat(key: string, x: number, y: number, vp: FloatViewport): void {
  mutate(key, (w) => {
    Object.assign(w, clampPosition(x, y, w.width, w.height, vp))
  })
}

export function resizeFloat(key: string, width: number, height: number, vp: FloatViewport): void {
  mutate(key, (w) => {
    const size = clampSize(width, height, vp)
    Object.assign(w, size, clampPosition(w.x, w.y, size.width, size.height, vp))
  })
}

export function resetFloatsForTests(): void {
  state = { windows: [], topZ: 0 }
  emit()
}
