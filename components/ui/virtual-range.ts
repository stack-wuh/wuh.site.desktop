export interface VirtualRange {
  /** 窗口首行索引（已含 overscan 并钳制到 [0, itemCount]） */
  start: number
  /** 窗口末行后一位（exclusive） */
  end: number
}

export interface ComputeRangeArgs {
  scrollTop: number
  viewportHeight: number
  itemCount: number
  itemHeight: number
  overscan?: number
}

/**
 * 由滚动位置计算可见窗口（含上下 overscan，边界钳制）。
 * 独立纯函数模块：窗口数学不依赖 DOM/React，可被 node 侧单测直接导入（.tsx 会被未设 jsx 的 tsconfig.node 拒绝编译）。
 */
export function computeRange({
  scrollTop,
  viewportHeight,
  itemCount,
  itemHeight,
  overscan = 8
}: ComputeRangeArgs): VirtualRange {
  if (itemCount <= 0 || itemHeight <= 0 || viewportHeight <= 0) return { start: 0, end: 0 }
  const firstVisible = Math.floor(scrollTop / itemHeight)
  const visibleCount = Math.ceil(viewportHeight / itemHeight)
  return {
    start: Math.max(0, firstVisible - overscan),
    end: Math.min(itemCount, firstVisible + visibleCount + overscan)
  }
}

/** 数据变短后允许的最大 scrollTop；viewport 未测量（0）时视为不限制 */
export function clampScrollTop(
  scrollTop: number,
  itemCount: number,
  itemHeight: number,
  viewportHeight: number
): number {
  const max =
    viewportHeight > 0 ? Math.max(0, itemCount * itemHeight - viewportHeight) : Number.POSITIVE_INFINITY
  return Math.min(Math.max(0, scrollTop), max)
}
