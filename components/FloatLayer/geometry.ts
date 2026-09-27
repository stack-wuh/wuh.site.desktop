/**
 * 浮窗几何纯函数（拆分自 FloatLayer 单文件，20260927-refactor-midsize-component-split）：
 * 拖拽/8 向缩放的几何推演与视口量测；钳制委托 lib/floats 的 clampGeometry。
 */
import { clampGeometry, type FloatGeometry } from '../../lib/floats'

export const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
export type ResizeDir = (typeof RESIZE_DIRS)[number]

export const MIN_WIDTH = 280
export const MIN_HEIGHT = 180

export interface DragContext {
  key: string
  pointerId: number
  startX: number
  startY: number
  origin: FloatGeometry
  dir?: ResizeDir
}

export function viewportOf(el: HTMLElement | null): { width: number; height: number } {
  const rect = el?.getBoundingClientRect()
  return { width: rect?.width ?? window.innerWidth, height: rect?.height ?? window.innerHeight }
}

export function nextGeometry(
  dir: ResizeDir,
  origin: FloatGeometry,
  dx: number,
  dy: number
): FloatGeometry {
  let { x, y, width, height } = origin
  if (dir.includes('e')) width = origin.width + dx
  if (dir.includes('s')) height = origin.height + dy
  if (dir.includes('w')) {
    width = origin.width - dx
    x = origin.x + dx
    if (width < MIN_WIDTH) {
      width = MIN_WIDTH
      x = origin.x + origin.width - MIN_WIDTH
    }
  }
  if (dir.includes('n')) {
    height = origin.height - dy
    y = origin.y + dy
    if (height < MIN_HEIGHT) {
      height = MIN_HEIGHT
      y = origin.y + origin.height - MIN_HEIGHT
    }
  }
  return clampGeometry({ x, y, width, height })
}
