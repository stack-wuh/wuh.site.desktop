// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { clampGeometry } from '../lib/floats'
import { nextGeometry, viewportOf } from '../components/FloatLayer/geometry'

/**
 * 浮窗几何纯函数单测（20260927-test-net-backfill）：
 * viewportOf 的 null/元素两态回退与 nextGeometry 的 8 向缩放推演、
 * 最小宽高钳制（钳制语义由 lib/floats 的 clampGeometry 提供，一并锁定）。
 */

const ORIGIN = { x: 100, y: 80, width: 520, height: 360 }

describe('viewportOf', () => {
  it('null 元素回退 window 视口', () => {
    const vp = viewportOf(null)
    expect(vp.width).toBe(window.innerWidth)
    expect(vp.height).toBe(window.innerHeight)
  })

  it('有元素时读 getBoundingClientRect', () => {
    const el = {
      getBoundingClientRect: () => ({ width: 800, height: 600 })
    } as unknown as HTMLElement
    expect(viewportOf(el)).toEqual({ width: 800, height: 600 })
  })
})

describe('nextGeometry', () => {
  it('e/s 只增宽高，原点不动', () => {
    expect(nextGeometry('e', ORIGIN, 40, 0)).toEqual({ x: 100, y: 80, width: 560, height: 360 })
    expect(nextGeometry('s', ORIGIN, 0, 40)).toEqual({ x: 100, y: 80, width: 520, height: 400 })
  })

  it('w 缩放同时左移原点，x 随宽度联动', () => {
    const g = nextGeometry('w', ORIGIN, 60, 0)
    expect(g.width).toBe(460)
    expect(g.x).toBe(160)
  })

  it('n 缩放同时下移原点，y 随高度联动', () => {
    const g = nextGeometry('n', ORIGIN, 0, 40)
    expect(g.height).toBe(320)
    expect(g.y).toBe(120)
  })

  it('w/n 越过最小值时宽度钳制、原点回贴', () => {
    const g = nextGeometry('w', ORIGIN, 1000, 0)
    expect(g.width).toBe(280)
    expect(g.x).toBe(100 + 520 - 280)
    const g2 = nextGeometry('n', ORIGIN, 0, 1000)
    expect(g2.height).toBe(180)
    expect(g2.y).toBe(80 + 360 - 180)
  })

  it('四角组合（se/sw/ne/nw）走分量叠加', () => {
    const se = nextGeometry('se', ORIGIN, 10, 10)
    expect(se.width).toBe(530)
    expect(se.height).toBe(370)
    const nw = nextGeometry('nw', ORIGIN, -10, -10)
    expect(nw.width).toBe(530)
    expect(nw.height).toBe(370)
    expect(nw.x).toBe(90)
    expect(nw.y).toBe(70)
  })

  it('clampGeometry 取整并钳最小尺寸', () => {
    expect(clampGeometry({ x: 0, y: 0, width: 100.6, height: 50.4 })).toEqual({
      x: 0,
      y: 0,
      width: 280,
      height: 180
    })
  })
})
