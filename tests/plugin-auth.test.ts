import { describe, expect, it } from 'vitest'
import { CAPABILITY_METHODS, PLUGIN_PERMISSIONS, authorizeCapability } from '@shared/plugin'

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

describe('图床能力映射（20261007-feature-image-host-plugin）', () => {
  it('picker/listImages → fs.picker.read；uploadImages → net.oss.write；clipboardWrite → ui.clipboard.write', () => {
    expect(CAPABILITY_METHODS['pickImages']).toBe('fs.picker.read')
    expect(CAPABILITY_METHODS['pickDirectory']).toBe('fs.picker.read')
    expect(CAPABILITY_METHODS['listImages']).toBe('fs.picker.read')
    expect(CAPABILITY_METHODS['uploadImages']).toBe('net.oss.write')
    expect(CAPABILITY_METHODS['clipboardWrite']).toBe('ui.clipboard.write')
  })

  it('OSS 凭证写入/清除/连接测试保持 host-only', () => {
    for (const m of ['setOssCredentials', 'clearOssCredentials', 'testOssConnection']) {
      expect(CAPABILITY_METHODS[m]).toBeUndefined()
    }
  })

  it('插件声明对应权限后可调用；缺权限拒绝并回报所需权限', () => {
    const denied = authorizeCapability([], 'uploadImages')
    expect(denied.ok).toBe(false)
    if (!denied.ok) expect(denied.permission).toBe('net.oss.write')
    expect(authorizeCapability(['net.oss.write'], 'uploadImages').ok).toBe(true)
    expect(authorizeCapability(['fs.picker.read'], 'pickImages').ok).toBe(true)
    expect(authorizeCapability(['fs.picker.read'], 'pickDirectory').ok).toBe(true)
    expect(authorizeCapability(['fs.picker.read'], 'listImages').ok).toBe(true)
    expect(authorizeCapability(['ui.clipboard.write'], 'clipboardWrite').ok).toBe(true)
  })

  it('权限词表包含图床三项新权限', () => {
    expect(PLUGIN_PERMISSIONS).toContain('fs.picker.read')
    expect(PLUGIN_PERMISSIONS).toContain('net.oss.write')
    expect(PLUGIN_PERMISSIONS).toContain('ui.clipboard.write')
  })
})
