import { beforeEach, describe, expect, it } from 'vitest'
import {
  clampGeometry,
  closeFloat,
  closePluginFloats,
  floatKey,
  floatsStore,
  focusFloat,
  isOpen,
  minimizeFloat,
  moveFloat,
  openFloat,
  openFloatKeys,
  resetFloatsForTests,
  resizeFloat,
  restoreFloat,
  toggleFloat,
  topFloat,
  type FloatDecl
} from '../lib/floats'

/**
 * 浮窗注册表契约单测（20260927-test-net-backfill；lib/floats 测试网缺口为
 * 20260925-refactor-lib-create-store 偏差 3 的遗留）：开合/焦点序/最小化还原/
 * 视口钳制与「commit 产新引用」的快照语义。
 */

const VIEWPORT = { width: 1200, height: 800 }

const DECL_A: FloatDecl = {
  pluginId: 'demo',
  viewId: 'panel',
  title: 'Demo',
  icon: 'sparkles',
  entry: 'index.html'
}
const DECL_B: FloatDecl = { ...DECL_A, pluginId: 'other', viewId: 'panel', title: 'Other' }

beforeEach(() => {
  resetFloatsForTests()
})

describe('开合与注册', () => {
  it('openFloat 登记 key/几何，isOpen 与 openFloatKeys 同步', () => {
    openFloat(DECL_A, VIEWPORT)
    expect(isOpen(floatKey('demo', 'panel'))).toBe(true)
    expect(openFloatKeys()).toEqual(new Set(['demo:panel']))
    const f = floatsStore.get().floats[0]
    expect(f.title).toBe('Demo')
    expect(f.minimized).toBe(false)
    expect(f.geometry.width).toBeGreaterThanOrEqual(280)
  })

  it('openFloat 幂等：重复打开还原并置顶，不产生重复条目', () => {
    openFloat(DECL_A, VIEWPORT)
    minimizeFloat('demo:panel')
    openFloat(DECL_A, VIEWPORT)
    const state = floatsStore.get()
    expect(state.floats).toHaveLength(1)
    expect(state.floats[0].minimized).toBe(false)
    expect(state.floats[0].z).toBe(state.seq)
  })

  it('closeFloat / closePluginFloats 按条目与按插件移除', () => {
    openFloat(DECL_A, VIEWPORT)
    openFloat(DECL_B, VIEWPORT)
    closeFloat('demo:panel')
    expect(isOpen('demo:panel')).toBe(false)
    closePluginFloats('other')
    expect(floatsStore.get().floats).toHaveLength(0)
  })

  it('toggleFloat = 未开则开、已开则关', () => {
    toggleFloat(DECL_A, VIEWPORT)
    expect(isOpen('demo:panel')).toBe(true)
    toggleFloat(DECL_A, VIEWPORT)
    expect(isOpen('demo:panel')).toBe(false)
  })
})

describe('焦点序与最小化', () => {
  it('后开者 z 更大，topFloat 返回最上层', () => {
    openFloat(DECL_A, VIEWPORT)
    openFloat(DECL_B, VIEWPORT)
    expect(topFloat()?.key).toBe('other:panel')
  })

  it('focusFloat 置顶；已是顶层时幂等不增 seq', () => {
    openFloat(DECL_A, VIEWPORT)
    openFloat(DECL_B, VIEWPORT)
    focusFloat('demo:panel')
    expect(topFloat()?.key).toBe('demo:panel')
    const seq = floatsStore.get().seq
    focusFloat('demo:panel')
    expect(floatsStore.get().seq).toBe(seq)
  })

  it('minimizeFloat 收起、restoreFloat 还原并置顶', () => {
    openFloat(DECL_A, VIEWPORT)
    openFloat(DECL_B, VIEWPORT)
    minimizeFloat('demo:panel')
    const minimized = floatsStore.get().floats.find((f) => f.key === 'demo:panel')
    expect(minimized?.minimized).toBe(true)
    restoreFloat('demo:panel')
    const restored = floatsStore.get().floats.find((f) => f.key === 'demo:panel')
    expect(restored?.minimized).toBe(false)
    expect(topFloat()?.key).toBe('demo:panel')
  })
})

describe('几何钳制', () => {
  it('moveFloat 把窗口钳回视口内', () => {
    openFloat(DECL_A, VIEWPORT)
    moveFloat('demo:panel', 5000, 5000, VIEWPORT)
    const g = floatsStore.get().floats[0].geometry
    expect(g.x).toBeLessThanOrEqual(VIEWPORT.width - 280)
    expect(g.y).toBeLessThanOrEqual(VIEWPORT.height - 44)
  })

  it('resizeFloat 钳最小宽高并取整', () => {
    openFloat(DECL_A, VIEWPORT)
    resizeFloat('demo:panel', { x: 0, y: 0, width: 10.4, height: 20.6 }, VIEWPORT)
    const g = floatsStore.get().floats[0].geometry
    expect(g.width).toBe(280)
    expect(g.height).toBe(180)
  })

  it('clampGeometry 纯取整钳制不改动原点', () => {
    expect(clampGeometry({ x: -20, y: -5, width: 300.9, height: 400.2 })).toEqual({
      x: -20,
      y: -5,
      width: 301,
      height: 400
    })
  })
})

describe('快照语义', () => {
  it('commit 产新数组引用（useSyncExternalStore 依赖）', () => {
    openFloat(DECL_A, VIEWPORT)
    const before = floatsStore.get()
    openFloat(DECL_B, VIEWPORT)
    const after = floatsStore.get()
    expect(before).not.toBe(after)
    expect(before.floats).not.toBe(after.floats)
  })
})
