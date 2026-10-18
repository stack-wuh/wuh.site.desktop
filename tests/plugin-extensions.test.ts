import { beforeEach, describe, expect, it } from 'vitest'
import type { PluginManifest } from '@shared/plugin'
import {
  clearPluginPanelTabs,
  panelTabsStore,
  registerManifestPanelTabs,
  removePanelTab,
  resetPanelTabsForTests,
  updatePanelTab,
  visiblePanelTabs,
  type PanelTabKind,
  type PanelTabState
} from '../lib/panelTabs'

/**
 * Dock / 上下文侧栏插件页签注册表纯逻辑（20261015-feature-workbench-shell
 * task-6/12/13）：manifest views.area='context' 声明制注册（默认 hidden）、
 * 运行时 updatePanelTab/removePanelTab（护栏与 capsule tabs 同源：parseTabSections）、
 * 停用清除、kind 键空间隔离。Node 侧只测纯逻辑，不导入组件。
 */

function manifest(views: Record<string, unknown>[]): PluginManifest {
  return {
    id: 'git-history',
    name: 'Git 历史与回退',
    version: '1.1.0',
    views: views as unknown as PluginManifest['views'],
    publishers: [],
    permissions: []
  }
}

const FULL = [
  { id: 'ctx-panel', area: 'context', title: 'Git 上下文', icon: 'git-branch', entry: 'c.html', order: 21 },
  { id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'v.html', order: 20 }
]

function tabs(): PanelTabState[] {
  return panelTabsStore.get().tabs
}

describe('panelTabs 注册表（context 页签）', () => {
  beforeEach(() => {
    resetPanelTabsForTests()
  })

  it('manifest 声明注册且默认 hidden（不出页签按钮）', () => {
    registerManifestPanelTabs(manifest(FULL))
    expect(tabs().length).toBe(1)
    expect(visiblePanelTabs('context')).toEqual([])
  })

  it('updatePanelTab 上报后可见，sections 经 parseTabSections 解析', () => {
    registerManifestPanelTabs(manifest(FULL))
    updatePanelTab('git-history', 'context', 'ctx-panel', {
      sections: [{ title: '分支', rows: [{ text: 'main · 3 未提交', tone: 'warning' }] }]
    })
    const visible = visiblePanelTabs('context')
    expect(visible.length).toBe(1)
    expect(visible[0].sections[0].rows[0].text).toBe('main · 3 未提交')
    expect(visible[0].viewIds).toEqual(['git'])
  })

  it('未声明页签上报/隐藏一律报错', () => {
    registerManifestPanelTabs(manifest(FULL))
    expect(() => updatePanelTab('git-history', 'context', 'nope', {})).toThrow(/未声明/)
    expect(() => removePanelTab('git-history', 'context', 'nope')).toThrow(/未声明/)
    expect(() => updatePanelTab('other-plugin', 'context', 'ctx-panel', {})).toThrow(/未声明/)
  })

  it('dock kind 已退役：上报/隐藏一律未声明报错（D5 词表收窄 context）', () => {
    registerManifestPanelTabs(manifest(FULL))
    expect(() => updatePanelTab('git-history', 'dock' as PanelTabKind, 'ctx-panel', { sections: [{ rows: [{ text: 'x' }] }] })).toThrow(
      /未声明/
    )
    expect(() => removePanelTab('git-history', 'dock' as PanelTabKind, 'ctx-panel')).toThrow(/未声明/)
  })

  it('removePanelTab 隐藏（声明仍在，再上报恢复）', () => {
    registerManifestPanelTabs(manifest(FULL))
    updatePanelTab('git-history', 'context', 'ctx-panel', { sections: [{ rows: [{ text: 'x' }] }] })
    removePanelTab('git-history', 'context', 'ctx-panel')
    expect(visiblePanelTabs('context')).toEqual([])
    updatePanelTab('git-history', 'context', 'ctx-panel', { sections: [{ rows: [{ text: 'x' }] }] })
    expect(visiblePanelTabs('context').length).toBe(1)
  })

  it('页签 key 命名空间：`context:<pluginId>:<id>`', () => {
    registerManifestPanelTabs(manifest(FULL))
    updatePanelTab('git-history', 'context', 'ctx-panel', { sections: [{ rows: [{ text: 'ctx' }] }] })
    expect(visiblePanelTabs('context').length).toBe(1)
    expect(visiblePanelTabs('context')[0].key).toBe('context:git-history:ctx-panel')
  })

  it('viewId 归属护栏：row.viewId 须为本插件 main 视图', () => {
    registerManifestPanelTabs(manifest(FULL))
    expect(() =>
      updatePanelTab('git-history', 'context', 'ctx-panel', {
        sections: [{ rows: [{ text: 'x', viewId: 'not-a-view' }] }]
      })
    ).toThrow(/viewId/)
    updatePanelTab('git-history', 'context', 'ctx-panel', {
      sections: [{ rows: [{ text: 'x', viewId: 'git' }] }]
    })
    expect(visiblePanelTabs('context')[0].sections[0].rows[0].viewId).toBe('git')
  })

  it('payload 序列化超 4KB 报错', () => {
    registerManifestPanelTabs(manifest(FULL))
    const big = 'x'.repeat(5000)
    expect(() =>
      updatePanelTab('git-history', 'context', 'ctx-panel', { sections: [{ rows: [{ text: big }] }] })
    ).toThrow(/4096/)
  })

  it('icon 白名单护栏', () => {
    registerManifestPanelTabs(manifest(FULL))
    expect(() =>
      updatePanelTab('git-history', 'context', 'ctx-panel', {
        sections: [{ rows: [{ text: 'x', icon: 'rocket' }] }]
      })
    ).toThrow(/白名单/)
  })

  it('停用清除：clearPluginPanelTabs 移除该插件全部页签', () => {
    registerManifestPanelTabs(manifest(FULL))
    updatePanelTab('git-history', 'context', 'ctx-panel', { sections: [{ rows: [{ text: 'ctx' }] }] })
    clearPluginPanelTabs('git-history')
    expect(tabs()).toEqual([])
  })

  it('无 context 视图的 manifest 不注册', () => {
    registerManifestPanelTabs(
      manifest([{ id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'v.html', order: 20 }])
    )
    expect(tabs()).toEqual([])
  })
})
