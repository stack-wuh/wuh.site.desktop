import { describe, expect, it } from 'vitest'
import { validateManifest, PLUGIN_PERMISSIONS } from '@shared/plugin'

function validManifest(): Record<string, unknown> {
  return {
    id: 'preview-markdown',
    name: 'Markdown 预览',
    version: '1.0.0',
    logic: 'logic.js',
    views: [
      { id: 'preview', area: 'float', title: '预览', icon: 'eye', entry: 'view/index.html', order: 10 }
    ],
    publishers: [],
    permissions: ['render.execute', 'document.read.write']
  }
}

describe('validateManifest', () => {
  it('接受合法 manifest 并返回窄化类型', () => {
    const res = validateManifest(validManifest())
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.manifest.id).toBe('preview-markdown')
      expect(res.manifest.views[0]?.entry).toBe('view/index.html')
      expect(res.manifest.permissions).toContain('render.execute')
    }
  })

  it('拒绝非对象输入', () => {
    for (const bad of [null, undefined, 42, 'x', []]) {
      const res = validateManifest(bad)
      expect(res.ok).toBe(false)
    }
  })

  it('id 禁止路径字符', () => {
    for (const id of ['../evil', 'a/b', 'A_B 中', '']) {
      const res = validateManifest({ ...validManifest(), id })
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.errors.join(' ')).toMatch(/id/)
    }
  })

  it('未知权限被拒绝且错误信息指明权限名', () => {
    const res = validateManifest({ ...validManifest(), permissions: ['shell.exec'] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toContain('shell.exec')
  })

  it('视图入口必须是相对 .html 且禁止越界', () => {
    const bad = [
      { ...validManifest(), views: [{ id: 'v', area: 'float', title: 't', icon: 'eye', entry: '/abs.html' }] },
      { ...validManifest(), views: [{ id: 'v', area: 'float', title: 't', icon: 'eye', entry: '../escape.html' }] },
      { ...validManifest(), views: [{ id: 'v', area: 'float', title: 't', icon: 'eye', entry: 'view/no.ts' }] }
    ]
    for (const raw of bad) {
      const res = validateManifest(raw)
      expect(res.ok).toBe(false)
    }
  })

  it('float 区域视图合法且多 float 视图可共存', () => {
    const res = validateManifest({
      ...validManifest(),
      views: [
        { id: 'preview', area: 'float', title: '预览', icon: 'eye', entry: 'view/index.html', order: 10 },
        { id: 'outline', area: 'float', title: '大纲', icon: 'book', entry: 'outline.html', order: 20 }
      ]
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.manifest.views).toHaveLength(2)
  })

  it('main 区域视图合法（右栏页面宿主）', () => {
    const res = validateManifest({
      ...validManifest(),
      views: [{ id: 'board', area: 'main', title: '看板', icon: 'book', entry: 'view/board.html', order: 5 }]
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.manifest.views[0]?.area).toBe('main')
  })

  it('preview 区域已移除，声明即拒绝', () => {
    const res = validateManifest({
      ...validManifest(),
      views: [{ id: 'preview', area: 'preview', title: '预览', icon: 'eye', entry: 'view/index.html' }]
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/area/)
  })

  it('sidebar 区域已废弃，声明即拒绝并指引迁移 main', () => {
    const res = validateManifest({
      ...validManifest(),
      views: [{ id: 'list', area: 'sidebar', title: '列表', icon: 'tag', entry: 'view/list.html' }]
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/main/)
  })

  it('视图 id 与区域、图标受控', () => {
    const dup = validateManifest({
      ...validManifest(),
      views: [
        { id: 'x', area: 'main', title: 'a', icon: 'tag', entry: 'a.html' },
        { id: 'x', area: 'float', title: 'b', icon: 'tag', entry: 'b.html' }
      ]
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.errors.join(' ')).toMatch(/重复/)

    const badArea = validateManifest({
      ...validManifest(),
      views: [{ id: 'x', area: 'statusbar', title: 'a', icon: 'tag', entry: 'a.html' }]
    })
    expect(badArea.ok).toBe(false)

    const badIcon = validateManifest({
      ...validManifest(),
      views: [{ id: 'x', area: 'main', title: 'a', icon: '💀', entry: 'a.html' }]
    })
    expect(badIcon.ok).toBe(false)
  })

  it('publisher 贡献 id 唯一且字段完整', () => {
    const res = validateManifest({
      ...validManifest(),
      publishers: [
        { id: 'gh', label: 'GitHub' },
        { id: 'gh', label: 'dup' }
      ]
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/publisher/)
  })

  it('logic 入口必须是相对 .js 且禁止越界', () => {
    for (const logic of ['../x.js', '/abs.js', 'logic.ts']) {
      const res = validateManifest({ ...validManifest(), logic })
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.errors.join(' ')).toMatch(/logic/)
    }
  })

  it('statusItems 合法声明被接受且 alignment/order 补默认值', () => {
    const res = validateManifest({
      ...validManifest(),
      statusItems: [{ id: 'render-state', icon: 'eye', text: '预览就绪' }]
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.manifest.statusItems).toEqual([
        { id: 'render-state', icon: 'eye', text: '预览就绪', alignment: 'right', order: 100 }
      ])
    }
  })

  it('statusItems 缺省时 manifest 不携带该字段', () => {
    const res = validateManifest(validManifest())
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.manifest.statusItems).toBeUndefined()
  })

  it('statusItems 非法输入被拒绝：白名单外图标/空 text/非法 alignment/重复 id/超量', () => {
    const bad = [
      { icon: '💀', text: 'x' },
      { icon: 'eye', text: '' },
      { icon: 'eye', text: 'x', alignment: 'center' },
      { icon: 'eye', text: 'x', id: 'A_B 中' }
    ]
    for (const item of bad) {
      const res = validateManifest({ ...validManifest(), statusItems: [item] })
      expect(res.ok).toBe(false)
    }
    const dup = validateManifest({
      ...validManifest(),
      statusItems: [
        { id: 'a', icon: 'eye', text: 'x' },
        { id: 'a', icon: 'eye', text: 'y' }
      ]
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.errors.join(' ')).toMatch(/重复/)

    const tooMany = validateManifest({
      ...validManifest(),
      statusItems: Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, icon: 'eye', text: 'x' }))
    })
    expect(tooMany.ok).toBe(false)
  })

  it('statusItems 不是数组被拒绝', () => {
    const res = validateManifest({ ...validManifest(), statusItems: 'nope' })
    expect(res.ok).toBe(false)
  })

  // ---------- tasks（任务胶囊贡献点） ----------

  const withTaskViews = () => ({
    ...validManifest(),
    views: [
      { id: 'board', area: 'main', title: '看板', icon: 'book', entry: 'view/board.html', order: 5 },
      { id: 'mini', area: 'float', title: '浮窗', icon: 'eye', entry: 'view/mini.html', order: 6 }
    ]
  })

  it('tasks 合法声明被接受：viewId 指向 main 视图、缺省不携带字段', () => {
    const res = validateManifest({
      ...withTaskViews(),
      tasks: [{ id: 'publish', title: '发布 Issue', viewId: 'board' }]
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.manifest.tasks).toEqual([{ id: 'publish', title: '发布 Issue', viewId: 'board' }])

    const bare = validateManifest(withTaskViews())
    expect(bare.ok).toBe(true)
    if (bare.ok) expect(bare.manifest.tasks).toBeUndefined()
  })

  it('tasks id 非法或重复被拒绝', () => {
    const badId = validateManifest({ ...withTaskViews(), tasks: [{ id: 'A_B 中', title: 't' }] })
    expect(badId.ok).toBe(false)
    if (!badId.ok) expect(badId.errors.join(' ')).toMatch(/tasks/)

    const dup = validateManifest({
      ...withTaskViews(),
      tasks: [
        { id: 'a', title: 'x' },
        { id: 'a', title: 'y' }
      ]
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.errors.join(' ')).toMatch(/重复/)
  })

  it('tasks.title 必填', () => {
    const res = validateManifest({ ...withTaskViews(), tasks: [{ id: 'a', title: '  ' }] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/title/)
  })

  it('tasks.viewId 须指向本插件已声明的 main 视图（不存在或 float 均拒绝）', () => {
    const missing = validateManifest({ ...withTaskViews(), tasks: [{ id: 'a', title: 't', viewId: 'ghost' }] })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.errors.join(' ')).toMatch(/main/)

    const floatView = validateManifest({ ...withTaskViews(), tasks: [{ id: 'a', title: 't', viewId: 'mini' }] })
    expect(floatView.ok).toBe(false)
    if (!floatView.ok) expect(floatView.errors.join(' ')).toMatch(/main/)
  })

  it('tasks 超过 8 条被拒绝', () => {
    const res = validateManifest({
      ...withTaskViews(),
      tasks: Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, title: 'x' }))
    })
    expect(res.ok).toBe(false)
  })

  it('tasks 不是数组被拒绝', () => {
    const res = validateManifest({ ...withTaskViews(), tasks: 'nope' })
    expect(res.ok).toBe(false)
  })

  // ---------- tabs（胶囊面板插件 Tab 贡献点，20260925-feature-capsule-plugin-tab） ----------

  it('tabs 合法声明被接受，缺省不携带字段', () => {
    const res = validateManifest({ ...withTaskViews(), tabs: [{ id: 'git', title: 'Git', icon: 'git-branch' }] })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.manifest.tabs).toEqual([{ id: 'git', title: 'Git', icon: 'git-branch' }])

    const bare = validateManifest(withTaskViews())
    expect(bare.ok).toBe(true)
    if (bare.ok) expect(bare.manifest.tabs).toBeUndefined()
  })

  it('tabs 每插件最多 1 个，超过即拒绝', () => {
    const res = validateManifest({
      ...withTaskViews(),
      tabs: [
        { id: 'a', title: 'A', icon: 'eye' },
        { id: 'b', title: 'B', icon: 'tag' }
      ]
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/最多/)
  })

  it('tabs id 非法被拒绝；重复 id 场景被 ≤1 上限先行拦截', () => {
    const badId = validateManifest({ ...withTaskViews(), tabs: [{ id: 'A_B 中', title: 't', icon: 'eye' }] })
    expect(badId.ok).toBe(false)
    if (!badId.ok) expect(badId.errors.join(' ')).toMatch(/tabs/)

    const dup = validateManifest({
      ...withTaskViews(),
      tabs: [
        { id: 'a', title: 'x', icon: 'eye' },
        { id: 'a', title: 'y', icon: 'eye' }
      ]
    })
    expect(dup.ok).toBe(false)
    if (!dup.ok) expect(dup.errors.join(' ')).toMatch(/最多/)
  })

  it('tabs.title 须为 1-20 字符、icon 须在白名单', () => {
    const longTitle = validateManifest({ ...withTaskViews(), tabs: [{ id: 'a', title: 'x'.repeat(21), icon: 'eye' }] })
    expect(longTitle.ok).toBe(false)
    if (!longTitle.ok) expect(longTitle.errors.join(' ')).toMatch(/title/)

    const emptyTitle = validateManifest({ ...withTaskViews(), tabs: [{ id: 'a', title: '  ', icon: 'eye' }] })
    expect(emptyTitle.ok).toBe(false)

    const badIcon = validateManifest({ ...withTaskViews(), tabs: [{ id: 'a', title: 't', icon: '💀' }] })
    expect(badIcon.ok).toBe(false)
    if (!badIcon.ok) expect(badIcon.errors.join(' ')).toMatch(/白名单/)
  })

  it('tabs 不是数组被拒绝', () => {
    const res = validateManifest({ ...withTaskViews(), tabs: 'nope' })
    expect(res.ok).toBe(false)
  })

  it('权限枚举非空且唯一', () => {
    expect(PLUGIN_PERMISSIONS.length).toBeGreaterThan(0)
    expect(new Set(PLUGIN_PERMISSIONS).size).toBe(PLUGIN_PERMISSIONS.length)
  })

  // ---------- 工作台扩展（20261015-feature-workbench-shell task-12；20261017 D5 dock 退役）----------

  it('views.area 接受 context（书耳页签；dock 已退役）', () => {
    const m = validManifest()
    m.views = [
      { id: 'ctx', area: 'context', title: 'Git 上下文', icon: 'git-branch', entry: 'ctx.html', order: 21 }
    ]
    const res = validateManifest(m)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.manifest.views.map((v) => v.area)).toEqual(['context'])
    }
  })

  it('views.area=dock 被拒绝并指引迁移 main/context（20261017 D5 Dock 退役）', () => {
    const m = validManifest()
    m.views = [{ id: 'panel', area: 'dock', title: 'Git 面板', icon: 'git-branch', entry: 'panel.html', order: 20 }]
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.includes('dock 已随 Dock 退役'))).toBe(true)
  })

  it('views.area=sidebar 仍被拒绝并指引迁移 main', () => {
    const m = validManifest()
    m.views = [{ id: 'sb', area: 'sidebar', title: '侧栏', icon: 'eye', entry: 'sb.html', order: 10 }]
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.includes('sidebar 已废弃'))).toBe(true)
  })

  it('views.area 非法值被拒绝', () => {
    const m = validManifest()
    m.views = [{ id: 'x', area: 'floating', title: 'X', icon: 'eye', entry: 'x.html', order: 10 }]
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.includes('main/float/context'))).toBe(true)
  })

  it('容量护栏：context 页签每插件最多 1 个', () => {
    const m = validManifest()
    m.views = [
      { id: 'ctx-a', area: 'context', title: 'A', icon: 'git-branch', entry: 'a.html', order: 20 },
      { id: 'ctx-b', area: 'context', title: 'B', icon: 'git-branch', entry: 'b.html', order: 21 }
    ]
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.includes('area=context 最多声明 1 个'))).toBe(true)
  })

  it('context 页签 entry 仍须为相对 .html 路径', () => {
    const m = validManifest()
    m.views = [{ id: 'panel', area: 'context', title: 'P', icon: 'git-branch', entry: '/abs.html', order: 20 }]
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.includes('禁止绝对路径'))).toBe(true)
  })

  it('context 与 main/float 可共存声明（工作台全景 manifest）', () => {
    const m = validManifest()
    m.views = [
      { id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'view/index.html', order: 20 },
      { id: 'ctx', area: 'context', title: 'Git 上下文', icon: 'git-branch', entry: 'ctx.html', order: 22 }
    ]
    const res = validateManifest(m)
    expect(res.ok).toBe(true)
  })

  it('commands 合法声明被接受（缺省不携带字段）', () => {
    const m = validManifest()
    m.views = [{ id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'v.html', order: 20 }]
    m.commands = [{ id: 'open-history', title: 'Git · 打开历史与回退', viewId: 'git' }]
    const res = validateManifest(m)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.manifest.commands).toEqual([{ id: 'open-history', title: 'Git · 打开历史与回退', viewId: 'git' }])
    }
  })

  it('commands 每插件最多 8 个', () => {
    const m = validManifest()
    m.views = [{ id: 'git', area: 'main', title: 'G', icon: 'git-branch', entry: 'v.html', order: 20 }]
    m.commands = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, title: `命令${i}`, viewId: 'git' }))
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.includes('最多声明 8 个'))).toBe(true)
  })

  it('commands.viewId 须指向本插件 main 视图（v1 语义 = 视图快捷命令）', () => {
    const m = validManifest()
    m.views = [{ id: 'preview', area: 'float', title: '预览', icon: 'eye', entry: 'v.html', order: 10 }]
    m.commands = [{ id: 'open', title: '打开', viewId: 'nope' }]
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.some((e) => e.includes('viewId 须指向'))).toBe(true)
  })

  it('commands.title 须为 1-40 字符、id 须匹配规则', () => {
    const m = validManifest()
    m.views = [{ id: 'git', area: 'main', title: 'G', icon: 'git-branch', entry: 'v.html', order: 20 }]
    m.commands = [
      { id: 'Bad Id', title: 'x'.repeat(41), viewId: 'git' }
    ]
    const res = validateManifest(m)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors.some((e) => e.includes('id 非法'))).toBe(true)
      expect(res.errors.some((e) => e.includes('title 须为 1-40'))).toBe(true)
    }
  })
})
