import { describe, expect, it } from 'vitest'
import { CAPABILITY_METHODS, authorizeCapability } from '@shared/plugin'

describe('CAPABILITY_METHODS 映射', () => {
  it('工作区文件方法映射到 fs 权限', () => {
    expect(CAPABILITY_METHODS['readFile']).toBe('fs.workspace.read')
    expect(CAPABILITY_METHODS['readTree']).toBe('fs.workspace.read')
    expect(CAPABILITY_METHODS['writeFile']).toBe('fs.workspace.write')
  })

  it('git 读方法/写方法分级', () => {
    expect(CAPABILITY_METHODS['gitStatus']).toBe('git.status.read')
    expect(CAPABILITY_METHODS['gitLog']).toBe('git.status.read')
    expect(CAPABILITY_METHODS['gitCommit']).toBe('git.history.write')
    expect(CAPABILITY_METHODS['executeRevert']).toBe('git.history.write')
  })

  it('host-only 方法绝不在映射表内', () => {
    for (const m of [
      'setGithubToken',
      'clearGithubToken',
      'ping',
      'openWorkspace',
      'getWorkspace',
      'savePastedImage',
      'uploadImage',
      'setSettings'
    ]) {
      expect(CAPABILITY_METHODS[m]).toBeUndefined()
      const res = authorizeCapability(['fs.workspace.read', 'git.history.write', 'net.github.api', 'settings.read', 'fs.workspace.write', 'git.status.read', 'document.read.write', 'render.rule.register', 'render.execute', 'publish.register'], m)
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.reason).toContain('不允许')
    }
  })
})

describe('authorizeCapability', () => {
  it('声明了映射权限 → 放行；未声明对应权限 → 拒绝', () => {
    // 只有其它权限时不生效（词表精确匹配，不做前缀/模糊）
    const res = authorizeCapability(['fs.workspace.read', 'settings.read'], 'githubListIssues')
    expect(res.ok).toBe(false)
    const ok = authorizeCapability(['net.github.api'], 'githubListIssues')
    expect(ok.ok).toBe(true)
    expect(ok.permission).toBe('net.github.api')
  })

  it('未声明映射所需权限 → 拒绝并返回所需权限名', () => {
    const res = authorizeCapability(['settings.read'], 'writeFile')
    expect(res.ok).toBe(false)
    expect(res.permission).toBe('fs.workspace.write')
  })

  it('未映射方法一律拒绝（默认拒绝原则）', () => {
    const res = authorizeCapability(
      ['fs.workspace.read', 'fs.workspace.write', 'git.status.read', 'git.history.write', 'net.github.api', 'settings.read', 'document.read.write', 'render.rule.register', 'render.execute', 'publish.register'],
      'deleteEverything'
    )
    expect(res.ok).toBe(false)
  })
})
