import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  webContents: { send: vi.fn() }
}))
vi.mock('electron', () => ({
  ipcMain: mocks.ipcMain,
  BrowserWindow: { getAllWindows: () => [{ webContents: mocks.webContents }] }
}))

import { initBroker, resetBrokerForTests, handlePluginInvoke, createSession, disposeSession } from '../src/main/plugins/broker'
import type { PluginRecord } from '@shared/plugin'

function record(pluginId: string, permissions: PluginRecord['manifest']['permissions']): PluginRecord {
  return {
    manifest: { id: pluginId, name: pluginId, version: '1.0.0', views: [], publishers: [], permissions },
    dir: `/plugins/${pluginId}`,
    enabled: true
  }
}

const callApi = vi.fn()
const getToken = vi.fn(async () => 'gh-secret-token')

beforeEach(() => {
  resetBrokerForTests()
  callApi.mockReset()
  getToken.mockResolvedValue('gh-secret-token')
  initBroker({
    getPlugin: (id) =>
      id === 'git-history'
        ? record('git-history', ['git.status.read', 'git.history.write'])
        : id === 'evil'
          ? record('evil', ['fs.workspace.read'])
          : id === 'gh'
            ? record('gh', ['net.github.api'])
            : undefined,
    callApi: callApi as never,
    getToken
  })
})

describe('createSession', () => {
  it('未启用/不存在的插件无法建立会话', async () => {
    await expect(createSession('ghost')).rejects.toThrow(/插件/)
  })

  it('会话返回 manifest 权限集', async () => {
    const info = await createSession('git-history')
    expect(info.pluginId).toBe('git-history')
    expect(info.permissions).toEqual(['git.status.read', 'git.history.write'])
    expect(info.sessionId).toBeTruthy()
  })

  it('同一插件重复建会话时旧会话失效（渲染层重载）', async () => {
    const old = await createSession('git-history')
    const next = await createSession('git-history')
    const res = await handlePluginInvoke(old.sessionId, 'gitStatus', [])
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/会话/)
    await expect(handlePluginInvoke(next.sessionId, 'gitStatus', [])).resolves.toEqual({ ok: true, data: undefined })
  })
})

describe('handlePluginInvoke 权限裁决', () => {
  it('声明过的方法 → 放行并透传参数到能力表', async () => {
    callApi.mockResolvedValue({ files: [] })
    const { sessionId } = await createSession('git-history')
    const res = await handlePluginInvoke(sessionId, 'gitStatus', [])
    expect(res.ok).toBe(true)
    expect(callApi).toHaveBeenCalledWith('gitStatus', [])
  })

  it('未声明权限的方法 → 拒绝且不调用能力表', async () => {
    const { sessionId } = await createSession('git-history')
    const res = await handlePluginInvoke(sessionId, 'writeFile', ['a.md', 'x'])
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('fs.workspace.write')
    expect(callApi).not.toHaveBeenCalled()
  })

  it('白名单外的 host-only 方法一律拒绝', async () => {
    const { sessionId } = await createSession('gh')
    const res = await handlePluginInvoke(sessionId, 'setGithubToken', ['x'])
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('不允许')
    expect(callApi).not.toHaveBeenCalled()
  })

  it('伪造 sessionId → 拒绝', async () => {
    const res = await handlePluginInvoke('made-up', 'gitStatus', [])
    expect(res.ok).toBe(false)
  })

  it('dispose 后调用失效', async () => {
    const { sessionId } = await createSession('gh')
    await disposeSession('gh')
    const res = await handlePluginInvoke(sessionId, 'githubListIssues', [])
    expect(res.ok).toBe(false)
  })

  it('错误消息中的凭证值被脱敏', async () => {
    callApi.mockRejectedValue(new Error('push failed for gh-secret-token token'))
    const { sessionId } = await createSession('git-history')
    const res = await handlePluginInvoke(sessionId, 'gitPush', [])
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).not.toContain('gh-secret-token')
      expect(res.error).toContain('***')
    }
  })
})
