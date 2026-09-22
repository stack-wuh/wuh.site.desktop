/**
 * 全局身份 store 单测——侧栏/首页/用户中心共享的 GithubIdentity 快照注册表。
 * 覆盖：未配置 token → null；拉取异常吞掉 → null；写穿更新 + 订阅通知。
 */
import { describe, expect, it, vi } from 'vitest'
import type { GithubIdentity } from '@shared/types'
import {
  identityStore,
  refreshIdentity,
  resetIdentityForTests,
  setIdentityApiForTests
} from '../lib/identity'

const identity: GithubIdentity = {
  login: 'stack-wuh',
  name: '吴尔红',
  avatarUrl: 'https://avatars.githubusercontent.com/u/1',
  scopes: ['repo'],
  kind: 'oauth',
  stale: false
}

describe('identity store', () => {
  it('未配置 token（hasToken=false）时快照为 null（已确认无身份）', async () => {
    resetIdentityForTests()
    setIdentityApiForTests({
      getSettings: async () => ({ hasToken: false, tokenKind: null, settings: {} as never }),
      getGithubIdentity: async () => identity
    })
    await refreshIdentity()
    expect(identityStore.get()).toBeNull()
  })

  it('有 token 时拉取身份写入快照', async () => {
    resetIdentityForTests()
    setIdentityApiForTests({
      getSettings: async () => ({ hasToken: true, tokenKind: 'oauth', settings: {} as never }),
      getGithubIdentity: async () => identity
    })
    await refreshIdentity()
    expect(identityStore.get()).toEqual(identity)
  })

  it('getGithubIdentity 抛错时吞掉异常，快照回落 null', async () => {
    resetIdentityForTests()
    setIdentityApiForTests({
      getSettings: async () => ({ hasToken: true, tokenKind: 'oauth', settings: {} as never }),
      getGithubIdentity: async () => {
        throw new Error('network down')
      }
    })
    await refreshIdentity()
    expect(identityStore.get()).toBeNull()
  })

  it('写穿更新快照并通知订阅者', async () => {
    resetIdentityForTests()
    const listener = vi.fn()
    const unsub = identityStore.subscribe(listener)
    await refreshIdentity()
    expect(listener).toHaveBeenCalled()

    const stale: GithubIdentity = { ...identity, stale: true }
    setIdentityApiForTests({
      getSettings: async () => ({ hasToken: true, tokenKind: 'oauth', settings: {} as never }),
      getGithubIdentity: async () => stale
    })
    await refreshIdentity()
    expect(identityStore.get()?.stale).toBe(true)
    unsub()
  })

  it('reset 后快照回到「尚未拉取」', () => {
    resetIdentityForTests()
    expect(identityStore.get()).toBeUndefined()
  })
})
