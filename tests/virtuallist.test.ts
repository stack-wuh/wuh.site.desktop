import { describe, expect, it } from 'vitest'
import { clampScrollTop, computeRange } from '@renderer/components/ui/virtual-range'

const H = 26

describe('computeRange（虚拟窗口计算）', () => {
  it('scrollTop=0 从首行开始，窗口 = 可见行数', () => {
    const r = computeRange({ scrollTop: 0, viewportHeight: 260, itemCount: 1000, itemHeight: H, overscan: 0 })
    expect(r.start).toBe(0)
    expect(r.end).toBe(10)
  })

  it('滚动位置映射到行索引：scrollTop 520 = 第 20 行顶部', () => {
    const r = computeRange({ scrollTop: 520, viewportHeight: 260, itemCount: 1000, itemHeight: H, overscan: 0 })
    expect(r.start).toBe(20)
    expect(r.end).toBe(30)
  })

  it('overscan 向上下两侧扩展窗口', () => {
    const r = computeRange({ scrollTop: 520, viewportHeight: 260, itemCount: 1000, itemHeight: H, overscan: 8 })
    expect(r.start).toBe(12)
    expect(r.end).toBe(38)
  })

  it('顶部钳制：start 不为负', () => {
    const r = computeRange({ scrollTop: 100, viewportHeight: 260, itemCount: 1000, itemHeight: H, overscan: 8 })
    expect(r.start).toBe(0)
  })

  it('底部钳制：end 不超过 itemCount', () => {
    // scrollTop 26000 > 最大滚动，越界后窗口仍收敛在内容内
    const r = computeRange({ scrollTop: 26000, viewportHeight: 260, itemCount: 1000, itemHeight: H, overscan: 8 })
    expect(r.start).toBe(992)
    expect(r.end).toBe(1000)
  })

  it('视口高于内容时窗口覆盖全部行', () => {
    const r = computeRange({ scrollTop: 0, viewportHeight: 9999, itemCount: 50, itemHeight: H, overscan: 8 })
    expect(r.start).toBe(0)
    expect(r.end).toBe(50)
  })

  it('itemCount=0 返回空窗口', () => {
    const r = computeRange({ scrollTop: 0, viewportHeight: 260, itemCount: 0, itemHeight: H })
    expect(r).toEqual({ start: 0, end: 0 })
  })

  it('视口未测量（0）返回空窗口，首帧不渲染', () => {
    const r = computeRange({ scrollTop: 0, viewportHeight: 0, itemCount: 1000, itemHeight: H })
    expect(r).toEqual({ start: 0, end: 0 })
  })

  it('非法 itemHeight（0）返回空窗口而非死循环', () => {
    const r = computeRange({ scrollTop: 0, viewportHeight: 260, itemCount: 1000, itemHeight: 0 })
    expect(r).toEqual({ start: 0, end: 0 })
  })
})

describe('clampScrollTop（数据变短后滚动位置钳制）', () => {
  it('超出最大滚动位置时钳制到内容底部', () => {
    // 10 行 × 26 = 260，viewport 260 → 最大滚动 0
    expect(clampScrollTop(500, 10, H, 260)).toBe(0)
    // 100 行 × 26 = 2600，viewport 260 → 最大 2340
    expect(clampScrollTop(2500, 100, H, 260)).toBe(2340)
  })

  it('负值钳制为 0', () => {
    expect(clampScrollTop(-100, 100, H, 260)).toBe(0)
  })

  it('合法范围内原样返回', () => {
    expect(clampScrollTop(1300, 100, H, 260)).toBe(1300)
  })

  it('viewport 未测量（0）不钳制', () => {
    expect(clampScrollTop(500, 10, H, 0)).toBe(500)
  })
})
