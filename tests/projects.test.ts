import { describe, expect, it } from 'vitest'
import type { FileNode, RecentWorkspace, WorkspaceInfo } from '@shared/types'
import {
  buildProjectGroups,
  folderNodeKey,
  initialExpandedGroups,
  pruneMarkdownTree,
  projectNodeKey,
  toggleExpandedGroup,
  toggleNodeKey
} from '../lib/projects'
import { routeKeyFromPathname } from '../lib/routes'

/**
 * 项目纯逻辑（20260924-feature-projects-editor-page）：
 * 项目维度分组（当前工作区置顶 + 最近项目去重）与组展开态；/projects、/editor 路由 key；
 * 菜单树扩展（走查反馈修订）：树节点 key 命名空间 + pruneMarkdownTree 剪枝。
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

describe('树节点 key 与剪枝（菜单树）', () => {
  it('项目节点与目录节点 key 命名空间隔离', () => {
    expect(projectNodeKey('/a')).toBe('p:/a')
    expect(folderNodeKey('/a', 'notes/deep')).toBe('d:/a/notes/deep')
  })

  it('toggleNodeKey 切换展开态（返回新集合不改原集合）', () => {
    const expanded = new Set<string>([projectNodeKey('/a')])
    const opened = toggleNodeKey(expanded, folderNodeKey('/a', 'notes'))
    expect([...opened]).toEqual(['p:/a', 'd:/a/notes'])
    expect([...expanded]).toEqual(['p:/a'])
    const closed = toggleNodeKey(opened, projectNodeKey('/a'))
    expect([...closed]).toEqual(['d:/a/notes'])
  })

  it('pruneMarkdownTree：非 md 文件剪除，空目录整枝剪除，含 md 目录保留', () => {
    const tree: FileNode[] = [
      { name: 'a.md', path: 'a.md', type: 'file' },
      { name: 'x.txt', path: 'x.txt', type: 'file' },
      { name: 'empty', path: 'empty', type: 'dir', children: [] },
      {
        name: 'assets',
        path: 'assets',
        type: 'dir',
        children: [{ name: 'pic.png', path: 'assets/pic.png', type: 'file' }]
      },
      {
        name: 'notes',
        path: 'notes',
        type: 'dir',
        children: [
          { name: 'deep', path: 'notes/deep', type: 'dir', children: [{ name: 'c.md', path: 'notes/deep/c.md', type: 'file' }] },
          { name: 'readme.MD', path: 'notes/readme.MD', type: 'file' }
        ]
      }
    ]
    expect(pruneMarkdownTree(tree)).toEqual([
      { name: 'a.md', path: 'a.md', type: 'file' },
      {
        name: 'notes',
        path: 'notes',
        type: 'dir',
        children: [
          {
            name: 'deep',
            path: 'notes/deep',
            type: 'dir',
            children: [{ name: 'c.md', path: 'notes/deep/c.md', type: 'file' }]
          },
          { name: 'readme.MD', path: 'notes/readme.MD', type: 'file' }
        ]
      }
    ])
  })

  it('pruneMarkdownTree：无 children 的目录节点按空枝剪除', () => {
    expect(pruneMarkdownTree([{ name: 'd', path: 'd', type: 'dir' }])).toEqual([])
    expect(pruneMarkdownTree([])).toEqual([])
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
