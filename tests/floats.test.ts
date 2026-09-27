import { beforeEach, describe, expect, it } from 'vitest'
import {
  closeFloat,
  floatKey,
  floatsStore,
  focusFloat,
  minimizeFloat,
  moveFloat,
  openFloat,
  resizeFloat,
  restoreFloat,
  toggleFloat,
  resetFloatsForTests,
  viewportOf
} from '@renderer/plugins/floats'

const VP = { width: 1600, height: 1000 }

function win(key: string) {
  const w = floatsStore.get().windows.find((x) => x.key === key)
  expect(w).toBeDefined()
  return w!
}

beforeEach(() => resetFloatsForTests())

describe('floats 注册表', () => {
  it('open 打开浮窗并聚焦顶层；close 移除', () => {
    const key = floatKey('preview-markdown', 'preview')
    openFloat(key, VP)
    const w = win(key)
    expect(w.open).toBe(true)
    expect(w.minimized).toBe(false)
    expect(w.z).toBe(1)
    expect(floatsStore.get().topZ).toBe(1)

    closeFloat(key)
    expect(floatsStore.get().windows.some((x) => x.key === key)).toBe(false)
  })

  it('toggle：关闭态打开、打开态关闭、最小化态恢复', () => {
    const key = floatKey('a', 'f1')
    toggleFloat(key, VP)
    expect(win(key).open).toBe(true)

    minimizeFloat(key)
    expect(win(key).minimized).toBe(true)

    // 最小化态 toggle = 恢复（不是关闭）
    toggleFloat(key, VP)
    const w = win(key)
    expect(w.open).toBe(true)
    expect(w.minimized).toBe(false)

    toggleFloat(key, VP)
    expect(floatsStore.get().windows.some((x) => x.key === key)).toBe(false)
  })

  it('默认几何贴右侧且多窗级联不重叠；均被钳制在视口内', () => {
    const k1 = floatKey('a', 'f1')
    const k2 = floatKey('b', 'f2')
    openFloat(k1, VP)
    openFloat(k2, VP)
    const w1 = win(k1)
    const w2 = win(k2)
    for (const w of [w1, w2]) {
      expect(w.width).toBeGreaterThan(0)
      expect(w.x).toBeGreaterThanOrEqual(16)
      expect(w.y).toBeGreaterThanOrEqual(16)
      expect(w.x + w.width).toBeLessThanOrEqual(VP.width)
      expect(w.y + w.height).toBeLessThanOrEqual(VP.height)
    }
    // 级联偏移：后开窗不与先开窗完全重叠
    expect(w2.x).not.toBe(w1.x)
    expect(w2.y).not.toBe(w1.y)
  })

  it('小视口下几何钳制到最小尺寸与视口边界', () => {
    const key = floatKey('a', 'f1')
    const small = { width: 400, height: 300 }
    openFloat(key, small)
    const w = win(key)
    expect(w.x).toBeGreaterThanOrEqual(16)
    expect(w.y).toBeGreaterThanOrEqual(16)
    expect(w.x + w.width).toBeLessThanOrEqual(small.width)
    expect(w.y + w.height).toBeLessThanOrEqual(small.height)
  })

  it('move/resize 更新几何且越界被钳制', () => {
    const key = floatKey('a', 'f1')
    openFloat(key, VP)
    moveFloat(key, 100, 80, VP)
    expect(win(key)).toMatchObject({ x: 100, y: 80 })

    moveFloat(key, -50, -50, VP)
    expect(win(key)).toMatchObject({ x: 16, y: 16 })

    moveFloat(key, VP.width, VP.height, VP)
    const w = win(key)
    expect(w.x + w.width).toBeLessThanOrEqual(VP.width)
    expect(w.y + w.height).toBeLessThanOrEqual(VP.height)

    resizeFloat(key, 100, 100, VP)
    expect(win(key).width).toBeGreaterThanOrEqual(280)
    resizeFloat(key, 99999, 99999, VP)
    const r = win(key)
    expect(r.x + r.width).toBeLessThanOrEqual(VP.width)
    expect(r.y + r.height).toBeLessThanOrEqual(VP.height)
  })

  it('minimize 保留几何，restore 还原', () => {
    const key = floatKey('a', 'f1')
    openFloat(key, VP)
    moveFloat(key, 120, 90, VP)
    minimizeFloat(key)
    const m = win(key)
    expect(m.minimized).toBe(true)
    expect(m.open).toBe(true)
    expect(m).toMatchObject({ x: 120, y: 90 })

    restoreFloat(key)
    const r = win(key)
    expect(r.minimized).toBe(false)
    expect(r).toMatchObject({ x: 120, y: 90 })
  })

  it('focus 使目标窗口 z 序最高', () => {
    const k1 = floatKey('a', 'f1')
    const k2 = floatKey('b', 'f2')
    openFloat(k1, VP)
    openFloat(k2, VP)
    expect(win(k2).z).toBeGreaterThan(win(k1).z)

    focusFloat(k1)
    expect(win(k1).z).toBe(floatsStore.get().topZ)
    expect(win(k1).z).toBeGreaterThan(win(k2).z)

    // 未开窗的 focus 无副作用
    expect(() => focusFloat(floatKey('ghost', 'g'))).not.toThrow()
    expect(floatsStore.get().topZ).toBe(win(k1).z)
  })

  it('对不存在的 key 操作不抛错、不产生脏状态', () => {
    const ghost = floatKey('ghost', 'g')
    expect(() => {
      closeFloat(ghost)
      minimizeFloat(ghost)
      restoreFloat(ghost)
      toggleFloat(ghost, VP)
      moveFloat(ghost, 0, 0, VP)
      resizeFloat(ghost, 0, 0, VP)
    }).not.toThrow()
    // toggle 对 ghost 等价 open
    expect(win(ghost).open).toBe(true)
  })

  it('viewportOf 读取当前视口并兜底最小尺寸', () => {
    expect(viewportOf(1200, 800)).toEqual({ width: 1200, height: 800 })
    expect(viewportOf(0, 0).width).toBeGreaterThan(0)
  })
})
