import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }))
vi.mock('../src/main/workspace', () => ({ getGit: vi.fn(), getWorkspace: vi.fn() }))
vi.mock('../src/main/credentials', () => ({
  getToken: vi.fn(() => null),
  loadSettings: vi.fn(async () => ({}))
}))

import { readGlobalGitIdentity } from '../src/main/git'

function runner(outputs: Record<string, string | Error>) {
  return {
    raw: vi.fn(async (args: string[]) => {
      const key = args[args.length - 1]
      const out = outputs[key]
      if (out instanceof Error) throw out
      return out
    })
  }
}

describe('readGlobalGitIdentity', () => {
  it('读取全局 user.name / user.email 并去除首尾空白', async () => {
    const git = runner({ 'user.name': '  Wu Hong\n', 'user.email': 'w@x.com' })
    await expect(readGlobalGitIdentity(git)).resolves.toEqual({
      name: 'Wu Hong',
      email: 'w@x.com'
    })
    expect(git.raw).toHaveBeenCalledWith(['config', '--global', '--get', 'user.name'])
    expect(git.raw).toHaveBeenCalledWith(['config', '--global', '--get', 'user.email'])
  })

  it('git config 非 0 退出（未设置）时对应字段为 null', async () => {
    const git = runner({
      'user.name': 'Wu Hong',
      'user.email': new Error('exit code 1')
    })
    await expect(readGlobalGitIdentity(git)).resolves.toEqual({
      name: 'Wu Hong',
      email: null
    })
  })

  it('空输出视为未配置', async () => {
    const git = runner({ 'user.name': '   ', 'user.email': '' })
    await expect(readGlobalGitIdentity(git)).resolves.toEqual({ name: null, email: null })
  })

  it('两个字段都未配置返回双 null', async () => {
    const git = runner({
      'user.name': new Error('exit code 1'),
      'user.email': new Error('exit code 1')
    })
    await expect(readGlobalGitIdentity(git)).resolves.toEqual({ name: null, email: null })
  })
})
