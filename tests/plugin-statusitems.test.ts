import { beforeEach, describe, expect, it } from 'vitest'
import type { PluginManifest } from '@shared/plugin'
import {
  clearPluginStatusItems,
  registerManifestStatusItems,
  removeStatusItem,
  resetStatusItemsForTests,
  statusItemKey,
  updateStatusItem,
  visibleStatusItems
} from '../lib/statusItems'

function manifest(id: string, statusItems: PluginManifest['statusItems']): PluginManifest {
  return {
    id,
    name: id,
    version: '1.0.0',
    views: [],
    publishers: [],
    permissions: [],
    statusItems
  }
}

const item = (id: string, text: string, order = 100, alignment: 'left' | 'right' = 'right') => ({
  id,
  icon: 'eye' as const,
  text,
  alignment,
  order
})

beforeEach(() => {
  resetStatusItemsForTests()
})

describe('statusItems 注册表', () => {
  it('manifest 声明注册为可见状态项，key 为 pluginId:itemTraceId', () => {
    registerManifestStatusItems(manifest('preview-markdown', [item('render-state', '预览就绪')]))
    const visible = visibleStatusItems()
    expect(visible).toHaveLength(1)
    expect(visible[0]?.key).toBe('preview-markdown:render-state')
    expect(visible[0]?.text).toBe('预览就绪')
  })

  it('重复注册幂等（不产生重复项）', () => {
    const m = manifest('p', [item('a', 'x')])
    registerManifestStatusItems(m)
    registerManifestStatusItems(m)
    expect(visibleStatusItems()).toHaveLength(1)
  })

  it('运行时 update 只允许改已声明项，可更新 text/title 并恢复隐藏', () => {
    registerManifestStatusItems(manifest('p', [item('a', 'x')]))
    updateStatusItem('p', 'a', { text: '渲染中…' })
    expect(visibleStatusItems()[0]?.text).toBe('渲染中…')

    removeStatusItem('p', 'a')
    expect(visibleStatusItems()).toHaveLength(0)

    updateStatusItem('p', 'a', { text: '就绪' })
    expect(visibleStatusItems()).toHaveLength(1)
    expect(visibleStatusItems()[0]?.text).toBe('就绪')
  })

  it('未声明的项 update/remove 报错', () => {
    registerManifestStatusItems(manifest('p', [item('a', 'x')]))
    expect(() => updateStatusItem('p', 'ghost', { text: 'y' })).toThrow(/未声明/)
    expect(() => removeStatusItem('p', 'ghost')).toThrow(/未声明/)
  })

  it('插件只能操作自己的项：跨插件 id 被拒绝', () => {
    registerManifestStatusItems(manifest('p1', [item('a', 'x')]))
    registerManifestStatusItems(manifest('p2', [item('a', 'y')]))
    expect(visibleStatusItems()).toHaveLength(2)
    expect(statusItemKey('p1', 'a')).toBe('p1:a')

    updateStatusItem('p2', 'a', { text: 'p2-updated' })
    const texts = visibleStatusItems().map((s) => `${s.key}=${s.text}`).sort()
    expect(texts).toEqual(['p1:a=x', 'p2:a=p2-updated'])
  })

  it('clearPluginStatusItems 移除该插件全部状态项（停用插件）', () => {
    registerManifestStatusItems(manifest('p1', [item('a', 'x')]))
    registerManifestStatusItems(manifest('p2', [item('b', 'y')]))
    clearPluginStatusItems('p1')
    const keys = visibleStatusItems().map((s) => s.key)
    expect(keys).toEqual(['p2:b'])
  })

  it('渲染顺序按 order 升序，同 order 按插件名/项 id 稳定排序', () => {
    registerManifestStatusItems(manifest('zeta', [item('b', 'z-b', 100)]))
    registerManifestStatusItems(manifest('alpha', [item('c', 'a-c', 200)]))
    registerManifestStatusItems(manifest('zeta', [item('a', 'z-a', 100)]))
    const keys = visibleStatusItems().map((s) => s.key)
    expect(keys).toEqual(['zeta:a', 'zeta:b', 'alpha:c'])
  })
})
