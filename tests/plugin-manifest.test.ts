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

  it('preview 区域已移除，声明即拒绝', () => {
    const res = validateManifest({
      ...validManifest(),
      views: [{ id: 'preview', area: 'preview', title: '预览', icon: 'eye', entry: 'view/index.html' }]
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/area/)
  })

  it('视图 id 与区域、图标受控', () => {
    const dup = validateManifest({
      ...validManifest(),
      views: [
        { id: 'x', area: 'sidebar', title: 'a', icon: 'tag', entry: 'a.html' },
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
      views: [{ id: 'x', area: 'sidebar', title: 'a', icon: '💀', entry: 'a.html' }]
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

  it('权限枚举非空且唯一', () => {
    expect(PLUGIN_PERMISSIONS.length).toBeGreaterThan(0)
    expect(new Set(PLUGIN_PERMISSIONS).size).toBe(PLUGIN_PERMISSIONS.length)
  })
})
