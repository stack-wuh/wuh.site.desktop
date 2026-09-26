import { beforeEach, describe, expect, it } from 'vitest'
import { validateManifest, type PluginManifest } from '../src/shared/plugin'
import {
  capsuleStore,
  clearPluginCapsule,
  registerManifestCapsule,
  removeCapsule,
  removeCapsuleTab,
  resetCapsuleForTests,
  updateCapsule,
  updateCapsuleTab,
  visibleCapsuleModules,
  visibleCapsuleTabs
} from '../lib/capsule'

/**
 * capsule 插件贡献点契约（20260923-feature-capsule-control-center）：
 * manifest 声明制模块槽位（count/status 两类模板）+ 运行时 SDK 单向上报
 * （只能更新自己声明过的模块，跨插件/未声明/非法数据一律拒绝）。
 * 与 tasks/statusItems 同构的安全模型，宿主按白名单模板渲染。
 */

const baseManifest = {
  id: 'acme',
  name: 'Acme',
  version: '1.0.0',
  views: [
    { id: 'main', area: 'main', title: 'Main', icon: 'tag', entry: 'view/index.html' }
  ],
  publishers: [],
  permissions: []
}

describe('validateManifest：capsule 贡献点', () => {
  it('合法 count 模块通过校验并归一化', () => {
    const result = validateManifest({
      ...baseManifest,
      capsule: [{ id: 'issues', title: 'GitHub Issues', icon: 'github', template: 'count', viewId: 'main' }]
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.manifest.capsule).toEqual([
        { id: 'issues', title: 'GitHub Issues', icon: 'github', template: 'count', viewId: 'main' }
      ])
    }
  })

  it('非法模板被拒绝', () => {
    const result = validateManifest({
      ...baseManifest,
      capsule: [{ id: 'x', title: 'X', icon: 'tag', template: 'chart' }]
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join('\n')).toContain('template')
  })

  it('图标不在白名单被拒绝；viewId 须指向本插件 main 视图', () => {
    const bad = validateManifest({
      ...baseManifest,
      capsule: [{ id: 'a', title: 'A', icon: 'rocket', template: 'count' }]
    })
    expect(bad.ok).toBe(false)

    const badView = validateManifest({
      ...baseManifest,
      capsule: [{ id: 'a', title: 'A', icon: 'tag', template: 'count', viewId: 'float-view' }]
    })
    expect(badView.ok).toBe(false)
    if (!badView.ok) expect(badView.errors.join('\n')).toContain('main 视图')
  })

  it('最多声明 2 个模块；id 重复被拒绝', () => {
    const tooMany = validateManifest({
      ...baseManifest,
      capsule: [
        { id: 'a', title: 'A', icon: 'tag', template: 'count' },
        { id: 'b', title: 'B', icon: 'tag', template: 'count' },
        { id: 'c', title: 'C', icon: 'tag', template: 'count' }
      ]
    })
    expect(tooMany.ok).toBe(false)
    if (!tooMany.ok) expect(tooMany.errors.join('\n')).toContain('最多声明 2')

    const dup = validateManifest({
      ...baseManifest,
      capsule: [
        { id: 'a', title: 'A', icon: 'tag', template: 'count' },
        { id: 'a', title: 'A2', icon: 'tag', template: 'status' }
      ]
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.errors.join('\n')).toContain('重复')
  })
})

const manifestWithCapsule: PluginManifest = {
  id: 'acme',
  name: 'Acme',
  version: '1.0.0',
  views: [
    { id: 'main', area: 'main', title: 'Main', icon: 'tag', entry: 'view/index.html', order: 100 }
  ],
  publishers: [],
  capsule: [
    { id: 'issues', title: 'GitHub Issues', icon: 'github', template: 'count', viewId: 'main' },
    { id: 'sync', title: '同步状态', icon: 'sparkles', template: 'status' }
  ],
  permissions: []
}

beforeEach(() => resetCapsuleForTests())

describe('capsule 注册表（声明制槽位）', () => {
  it('注册 manifest 声明：默认隐藏（未上报前不出现在胶囊）', () => {
    registerManifestCapsule(manifestWithCapsule)
    expect(visibleCapsuleModules()).toEqual([])
    const mods = capsuleStore.get().modules
    expect(mods).toHaveLength(2)
    expect(mods[0]).toMatchObject({ pluginId: 'acme', id: 'issues', title: 'GitHub Issues', template: 'count', hidden: true })
  })

  it('重复注册幂等，不覆盖运行时数据', () => {
    registerManifestCapsule(manifestWithCapsule)
    updateCapsule('acme', 'issues', { value: 12, label: 'open' })
    registerManifestCapsule(manifestWithCapsule)
    expect(capsuleStore.get().modules.find((m) => m.id === 'issues')?.value).toBe(12)
  })

  it('count 模块：数值上报后可见；非法数据拒绝', () => {
    registerManifestCapsule(manifestWithCapsule)
    updateCapsule('acme', 'issues', { value: 12, label: '个 open', detail: '3 个指派给我' })
    const visible = visibleCapsuleModules()
    expect(visible).toHaveLength(1)
    expect(visible[0]).toMatchObject({ value: 12, label: '个 open', detail: '3 个指派给我', hidden: false })

    expect(() => updateCapsule('acme', 'issues', { value: -1 })).toThrow()
    expect(() => updateCapsule('acme', 'issues', { value: 'many' })).toThrow()
    expect(() => updateCapsule('acme', 'issues', { text: '文本' })).toThrow(/value/)
  })

  it('status 模块：文本必填、tone 白名单', () => {
    registerManifestCapsule(manifestWithCapsule)
    updateCapsule('acme', 'sync', { text: '同步完成', tone: 'success', detail: '2 分钟前' })
    expect(visibleCapsuleModules()[0]).toMatchObject({ text: '同步完成', tone: 'success' })

    expect(() => updateCapsule('acme', 'sync', { text: '' })).toThrow()
    expect(() => updateCapsule('acme', 'sync', { text: 'x', tone: 'rainbow' })).toThrow(/tone/)
    expect(() => updateCapsule('acme', 'sync', { value: 3 })).toThrow(/text/)
  })

  it('remove 隐藏模块；未声明/跨插件一律拒绝', () => {
    registerManifestCapsule(manifestWithCapsule)
    updateCapsule('acme', 'issues', { value: 1 })
    removeCapsule('acme', 'issues')
    expect(visibleCapsuleModules()).toHaveLength(0)

    expect(() => updateCapsule('acme', 'ghost', { value: 1 })).toThrow(/未声明/)
    expect(() => removeCapsule('other', 'issues')).toThrow(/未声明/)
  })

  it('clearPluginCapsule 移除插件全部模块', () => {
    registerManifestCapsule(manifestWithCapsule)
    updateCapsule('acme', 'issues', { value: 5 })
    clearPluginCapsule('acme')
    expect(capsuleStore.get().modules).toHaveLength(0)
  })
})

// ---------- 插件 Tab（20260925-feature-capsule-plugin-tab） ----------

const manifestWithTab: PluginManifest = {
  id: 'git-history',
  name: 'Git 历史',
  version: '1.0.0',
  views: [
    { id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'view/index.html', order: 20 },
    { id: 'peek', area: 'float', title: '浮窗', icon: 'eye', entry: 'view/peek.html', order: 21 }
  ],
  publishers: [],
  tabs: [{ id: 'git', title: 'Git', icon: 'git-branch' }],
  permissions: []
}

describe('capsule tab 注册表（声明制，20260925-feature-capsule-plugin-tab）', () => {
  it('注册 manifest tab：默认隐藏（未上报前不出 tab 按钮），固化 main 视图集合', () => {
    registerManifestCapsule(manifestWithTab)
    expect(visibleCapsuleTabs()).toEqual([])
    const tabs = capsuleStore.get().tabs
    expect(tabs).toHaveLength(1)
    expect(tabs[0]).toMatchObject({ pluginId: 'git-history', id: 'git', title: 'Git', hidden: true })
    expect(tabs[0]?.viewIds).toEqual(['git'])
  })

  it('updateTab 合法上报后可见；重复注册幂等不覆盖数据', () => {
    registerManifestCapsule(manifestWithTab)
    updateCapsuleTab('git-history', 'git', {
      sections: [
        {
          title: '变更文件',
          rows: [
            { icon: 'file-text', text: 'M lib/capsule.ts', detail: '已修改', tone: 'primary', viewId: 'git' },
            { text: 'A tests/plugin-capsule.test.ts' }
          ]
        },
        { title: '最近提交', rows: [{ text: '9f71164 docs(shadow)…' }] }
      ]
    })
    const visible = visibleCapsuleTabs()
    expect(visible).toHaveLength(1)
    expect(visible[0]?.hidden).toBe(false)
    expect(visible[0]?.sections).toHaveLength(2)
    expect(visible[0]?.sections[0]?.rows[0]).toMatchObject({ text: 'M lib/capsule.ts', tone: 'primary', viewId: 'git' })

    registerManifestCapsule(manifestWithTab)
    expect(capsuleStore.get().tabs[0]?.sections).toHaveLength(2)
  })

  it('removeTab 隐藏；未声明/跨插件拒绝；再 update 恢复', () => {
    registerManifestCapsule(manifestWithTab)
    updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x' }] }] })
    removeCapsuleTab('git-history', 'git')
    expect(visibleCapsuleTabs()).toHaveLength(0)

    expect(() => updateCapsuleTab('git-history', 'ghost', { sections: [] })).toThrow(/未声明/)
    expect(() => removeCapsuleTab('other', 'git')).toThrow(/未声明/)

    updateCapsuleTab('git-history', 'git', { sections: [] })
    expect(visibleCapsuleTabs()).toHaveLength(1)
  })

  it('护栏：sections ≤3、每段 rows ≤8、序列化 ≤4KB', () => {
    registerManifestCapsule(manifestWithTab)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: Array.from({ length: 4 }, () => ({ rows: [] })) })).toThrow(/最多 3/)
    expect(() =>
      updateCapsuleTab('git-history', 'git', { sections: [{ rows: Array.from({ length: 9 }, () => ({ text: 'x' })) }] })
    ).toThrow(/最多 8/)
    expect(() =>
      updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x'.repeat(5000) }] }] })
    ).toThrow(/4096/)
  })

  it('严格 typeof：text 必填 1-60、icon 白名单、detail/tone/title 类型与上限', () => {
    registerManifestCapsule(manifestWithTab)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: 'nope' })).toThrow(/数组/)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: '' }] }] })).toThrow(/text/)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 42 }] }] })).toThrow(/text/)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x', icon: '💀' }] }] })).toThrow(/白名单/)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x', detail: 'd'.repeat(81) }] }] })).toThrow(/detail/)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x', tone: 'rainbow' }] }] })).toThrow(/tone/)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ title: 't'.repeat(21), rows: [] }] })).toThrow(/title/)
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ rows: ['x'] }] })).toThrow(/对象/)
    // 非法调用不产生可见 tab（校验抛错前未 commit）
    expect(visibleCapsuleTabs()).toHaveLength(0)
  })

  it('row.viewId 须指向本插件已声明的 main 视图（float 视图拒绝）', () => {
    registerManifestCapsule(manifestWithTab)
    expect(() =>
      updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x', viewId: 'ghost' }] }] })
    ).toThrow(/main 视图/)
    expect(() =>
      updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x', viewId: 'peek' }] }] })
    ).toThrow(/main 视图/)

    updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x', viewId: 'git' }] }] })
    expect(visibleCapsuleTabs()[0]?.sections[0]?.rows[0]?.viewId).toBe('git')
  })

  it('clearPluginCapsule 移除插件 tab；停用即消失', () => {
    registerManifestCapsule(manifestWithTab)
    updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x' }] }] })
    clearPluginCapsule('git-history')
    expect(capsuleStore.get().tabs).toHaveLength(0)
    expect(visibleCapsuleTabs()).toHaveLength(0)
  })

  it('tab payload 须可 JSON 序列化', () => {
    registerManifestCapsule(manifestWithTab)
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(() => updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: cyclic as unknown as string }] }] })).toThrow(/序列化/)
  })
})
