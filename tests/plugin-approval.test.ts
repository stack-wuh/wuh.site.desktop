import { describe, expect, it } from 'vitest'
import { resolveApproval, samePermissions, type PluginManifest } from '@shared/plugin'

function manifest(permissions: string[]): PluginManifest {
  return {
    id: 'demo',
    name: '演示',
    version: '1.0.0',
    views: [{ id: 'v', area: 'main', title: '视图', icon: 'eye', entry: 'view/index.html', order: 10 }],
    publishers: [],
    permissions: permissions as PluginManifest['permissions']
  }
}

describe('resolveApproval', () => {
  it('无批准记录 → pending', () => {
    expect(resolveApproval(manifest(['fs.workspace.read']), {})).toBe('pending')
  })

  it('快照与当前权限一致 → approved（顺序无关）', () => {
    const approvals = { demo: ['document.read.write', 'fs.workspace.read'] }
    expect(resolveApproval(manifest(['fs.workspace.read', 'document.read.write']), approvals)).toBe('approved')
  })

  it('manifest 新增或减少权限 → changed', () => {
    const approvals = { demo: ['fs.workspace.read'] }
    expect(resolveApproval(manifest(['fs.workspace.read', 'git.status.read']), approvals)).toBe('changed')
    expect(resolveApproval(manifest([]), approvals)).toBe('changed')
  })

  it('重复权限去重后比较，不会误判 changed', () => {
    const approvals = { demo: ['fs.workspace.read', 'fs.workspace.read'] }
    expect(resolveApproval(manifest(['fs.workspace.read']), approvals)).toBe('approved')
  })
})

describe('samePermissions', () => {
  it('集合相等判定（顺序无关、去重）', () => {
    expect(samePermissions(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(samePermissions(['a', 'a'], ['a'])).toBe(true)
    expect(samePermissions(['a'], ['a', 'b'])).toBe(false)
    expect(samePermissions([], [])).toBe(true)
  })
})
