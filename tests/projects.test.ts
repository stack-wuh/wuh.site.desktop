import { describe, expect, it } from 'vitest'
import type { RecentWorkspace, WorkspaceInfo } from '@shared/types'
import { buildProjectGroups, initialExpandedGroups, toggleExpandedGroup } from '../lib/projects'
import { routeKeyFromPathname } from '../lib/routes'

/**
 * 项目页纯逻辑（20260924-feature-projects-editor-page）：
 * 项目维度分组（当前工作区置顶 + 最近项目去重）与组展开态；/projects、/editor 路由 key。
 */

const ws = (root: string, name: string): WorkspaceInfo => ({
  root,
  name,
  isGitRepo: false,
  branch: null,
  ahead: 0,
  behind: 0,
  github: null
})

const recent = (path: string, name: string): RecentWorkspace => ({ path, name, openedAt: 1 })

describe('buildProjectGroups', () => {
  it('当前工作区组置顶并标记 current', () => {
    const groups = buildProjectGroups(ws('/a', 'a'), [recent('/b', 'b')])
    expect(groups).toEqual([
      { root: '/a', name: 'a', current: true },
      { root: '/b', name: 'b', current: false }
    ])
  })

  it('最近项目去重当前工作区（同 root 不重复成组）', () => {
    const groups = buildProjectGroups(ws('/a', 'a'), [recent('/a', 'a2'), recent('/b', 'b')])
    expect(groups.map((g) => g.root)).toEqual(['/a', '/b'])
    expect(groups[0]?.current).toBe(true)
    expect(groups[1]?.current).toBe(false)
  })

  it('最近项目内部按 path 去重，保持 MRU 顺序', () => {
    const groups = buildProjectGroups(null, [recent('/b', 'b'), recent('/a', 'a'), recent('/b', 'b2')])
    expect(groups.map((g) => g.root)).toEqual(['/b', '/a'])
    expect(groups[0]?.name).toBe('b')
  })

  it('无当前工作区：仅最近项目组', () => {
    const groups = buildProjectGroups(null, [recent('/a', 'a')])
    expect(groups).toEqual([{ root: '/a', name: 'a', current: false }])
  })

  it('两者皆空：空组列表', () => {
    expect(buildProjectGroups(null, [])).toEqual([])
  })
})

describe('组展开态', () => {
  it('初始仅展开当前组；无当前组则全收起', () => {
    const groups = buildProjectGroups(ws('/a', 'a'), [recent('/b', 'b')])
    expect([...initialExpandedGroups(groups)]).toEqual(['/a'])
    expect([...initialExpandedGroups(buildProjectGroups(null, [recent('/b', 'b')]))]).toEqual([])
  })

  it('toggle 收起已展开组、展开未展开组（返回新集合不改原集合）', () => {
    const expanded = initialExpandedGroups(buildProjectGroups(ws('/a', 'a'), []))
    const opened = toggleExpandedGroup(expanded, '/b')
    expect([...opened]).toEqual(['/a', '/b'])
    expect([...expanded]).toEqual(['/a'])
    const closed = toggleExpandedGroup(opened, '/a')
    expect([...closed]).toEqual(['/b'])
  })
})

describe('routeKeyFromPathname 扩展', () => {
  it('/projects → projects（菜单 key）', () => {
    expect(routeKeyFromPathname('/projects')).toBe('projects')
  })

  it('/editor → editor（非菜单路由 key，不高亮任何菜单项）', () => {
    expect(routeKeyFromPathname('/editor')).toBe('editor')
  })

  it('既有 key 回归不变', () => {
    expect(routeKeyFromPathname('/')).toBe('home')
    expect(routeKeyFromPathname('/drafts')).toBe('drafts')
    expect(routeKeyFromPathname('/settings')).toBe('settings')
  })
})
