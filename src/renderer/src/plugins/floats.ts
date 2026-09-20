/**
 * 浮窗注册表（host 侧纯逻辑，可独立测试）。
 *
 * 模型：float 视图经 ActivityBar toggle 开/关——「视图=内容，区域=slot」，
 * 开合与几何是进程内状态：work 视图卸载（设置页/首页）时浮窗随之卸载，
 * 注册表保持开合与几何，返回后还原（与 activePanel 同语义）。
 * 焦点序单调递增，点按即置顶；最小化收敛为角落 chip，不卸载帧。
 */

import type { PluginIconName } from '@shared/plugin'

export interface FloatGeometry {
  x: number
  y: number
  width: number
  height: number
}

export interface FloatState {
  /** `${pluginId}:${viewId}` */
  key: string
  pluginId: string
  viewId: string
  title: string
  icon: PluginIconName
  /** manifest 声明的帧入口（plugin:// 相对路径） */
  entry: string
  geometry: FloatGeometry
  minimized: boolean
  /** 焦点序，大者在上层 */
  z: number
}

/** float 视图声明（来自启用插件 manifest，开窗时由壳层传入） */
export interface FloatDecl {
  pluginId: string
  viewId: string
  title: string
  icon: PluginIconName
  entry: string
}

export interface FloatViewport {
  width: number
  height: number
}

interface FloatsState {
  /** 按 z 升序（渲染时后画的在上层） */
  floats: FloatState[]
  seq: number
}

const MIN_WIDTH = 280
const MIN_HEIGHT = 180
const DEFAULT_WIDTH = 520

let state: FloatsState = { floats: [], seq: 0 }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

/** 就地变更后统一走这里产出新快照（useSyncExternalStore 依赖新引用） */
function commit(): void {
  state = { floats: [...state.floats].sort((a, b) => a.z - b.z), seq: state.seq }
  emit()
}

export function floatKey(pluginId: string, viewId: string): string {
  return `${pluginId}:${viewId}`
}

export function clampGeometry(geom: FloatGeometry): FloatGeometry {
  return {
    ...geom,
    width: Math.max(MIN_WIDTH, Math.round(geom.width)),
    height: Math.max(MIN_HEIGHT, Math.round(geom.height))
  }
}

function clampToViewport(geom: FloatGeometry, viewport: FloatViewport): FloatGeometry {
  const clamped = clampGeometry(geom)
  const maxX = Math.max(0, viewport.width - MIN_WIDTH)
  const maxY = Math.max(0, viewport.height - 44)
  return {
    ...clamped,
    x: Math.min(Math.max(clamped.x, -clamped.width + 88), maxX),
    y: Math.min(Math.max(clamped.y, 0), maxY)
  }
}

function defaultGeometry(viewport: FloatViewport, openCount: number): FloatGeometry {
  const width = Math.min(DEFAULT_WIDTH, Math.max(MIN_WIDTH, viewport.width - 32))
  const height = Math.max(MIN_HEIGHT, Math.min(Math.round(viewport.height * 0.72), 720))
  const cascade = (openCount % 6) * 28
  return clampToViewport(
    { x: viewport.width - width - 24 - cascade, y: 16 + cascade, width, height },
    viewport
  )
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
  return state.floats.some((f) => f.key === key)
}

/** 已开浮窗的 key 集合（ActivityBar toggle 激活态） */
export function openFloatKeys(): Set<string> {
  return new Set(state.floats.map((f) => f.key))
}

/** 打开（已开则置顶并还原）；重复打开幂等 */
export function openFloat(decl: FloatDecl, viewport: FloatViewport): void {
  const key = floatKey(decl.pluginId, decl.viewId)
  const existing = state.floats.find((f) => f.key === key)
  state.seq += 1
  if (existing) {
    existing.minimized = false
    existing.z = state.seq
    commit()
    return
  }
  state.floats.push({
    key,
    pluginId: decl.pluginId,
    viewId: decl.viewId,
    title: decl.title,
    icon: decl.icon,
    entry: decl.entry,
    geometry: defaultGeometry(viewport, state.floats.length),
    minimized: false,
    z: state.seq
  })
  commit()
}

export function closeFloat(key: string): void {
  const before = state.floats.length
  state.floats = state.floats.filter((f) => f.key !== key)
  if (state.floats.length !== before) commit()
}

/** 开/关切换（ActivityBar toggle 语义：激活态=浮窗打开） */
export function toggleFloat(decl: FloatDecl, viewport: FloatViewport): void {
  if (isOpen(floatKey(decl.pluginId, decl.viewId))) {
    closeFloat(floatKey(decl.pluginId, decl.viewId))
    return
  }
  openFloat(decl, viewport)
}

export function minimizeFloat(key: string): void {
  const float = state.floats.find((f) => f.key === key)
  if (!float || float.minimized) return
  float.minimized = true
  commit()
}

/** 从 chip 还原并置顶 */
export function restoreFloat(key: string): void {
  const float = state.floats.find((f) => f.key === key)
  if (!float) return
  state.seq += 1
  float.minimized = false
  float.z = state.seq
  commit()
}

/** 点按窗口置顶 */
export function focusFloat(key: string): void {
  const float = state.floats.find((f) => f.key === key)
  if (!float || float.minimized) return
  const top = topFloat()
  if (top && top.key === key) return
  state.seq += 1
  float.z = state.seq
  commit()
}

export function moveFloat(key: string, x: number, y: number, viewport: FloatViewport): void {
  const float = state.floats.find((f) => f.key === key)
  if (!float) return
  float.geometry = clampToViewport({ ...float.geometry, x, y }, viewport)
  commit()
}

export function resizeFloat(key: string, geometry: FloatGeometry, viewport: FloatViewport): void {
  const float = state.floats.find((f) => f.key === key)
  if (!float) return
  float.geometry = clampToViewport(geometry, viewport)
  commit()
}

/** 最顶层未最小化浮窗（「聚焦浮窗」，Esc 关闭对象） */
export function topFloat(): FloatState | undefined {
  return [...state.floats].filter((f) => !f.minimized).sort((a, b) => a.z - b.z).pop()
}

export function resetFloatsForTests(): void {
  state = { floats: [], seq: 0 }
  emit()
}
