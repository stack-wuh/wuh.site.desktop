import { useLayoutEffect, useRef, useState } from 'react'
import { cx } from './cx'
import { clampScrollTop, computeRange } from './virtual-range'

export { clampScrollTop, computeRange, type VirtualRange } from './virtual-range'

interface VirtualListProps<T> {
  items: T[]
  /** 固定行高（px）：窗口数学的前提，行内容须自行收敛到该高度 */
  itemHeight: number
  itemKey: (item: T, index: number) => string
  renderItem: (item: T, index: number) => React.JSX.Element
  overscan?: number
  className?: string
}

/**
 * 固定行高虚拟滚动列表：滚动容器 + 总高 spacer + 绝对定位窗口行。
 * 只负责窗口定位，行样式与交互由 renderItem 提供；仅 Electron 渲染层使用，无 SSR 场景。
 */
export function VirtualList<T>(props: VirtualListProps<T>): React.JSX.Element {
  const { items, itemHeight, itemKey, renderItem, overscan = 8, className } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  // useLayoutEffect 首帧即测量，避免首屏空白一帧；容器尺寸变化（侧栏拖拽/折叠）跟随
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = (): void => setViewportHeight(el.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // items 变短后浏览器对 scrollTop 的钳制不保证触发 scroll 事件，渲染后兜底校准
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const clamped = clampScrollTop(el.scrollTop, items.length, itemHeight, el.clientHeight)
    if (el.scrollTop !== clamped) el.scrollTop = clamped
  })

  const { start, end } = computeRange({
    scrollTop,
    viewportHeight,
    itemCount: items.length,
    itemHeight,
    overscan
  })

  return (
    <div
      ref={containerRef}
      className={cx('virtual-list', className)}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ position: 'relative', height: items.length * itemHeight }}>
        {items.slice(start, end).map((item, i) => {
          const index = start + i
          return (
            <div
              key={itemKey(item, index)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: itemHeight,
                transform: `translateY(${index * itemHeight}px)`
              }}
            >
              {renderItem(item, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
