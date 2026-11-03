import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: {},
  dialog: {},
  ipcMain: {},
  app: { getPath: () => '/tmp/wuh-site-sync-userdata' }
}))

import {
  buildSyncUrl,
  normalizeSiteBase,
  syncIssueToSite
} from '../src/main/siteSync'

/**
 * 站点同步（20261103-feature-publish-site-sync）：发布成功后直呼生产同步端点。
 * 路由事实：server 全局前缀 v2，生产经宿主代理 /api → :3200/v2
 * （https://wuh.site/api/webhook/sync/:n，实测 500=可达）。
 * 站点地址复用 AppSettings.siteBaseUrl（与 aboutActivity 同源推导：origin + /api）。
 * 负载只有 issue 号（内容以 GitHub 为单一事实源），重复调用幂等。
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildSyncUrl', () => {
  it('derives {origin}/api/webhook/sync/{n} with trailing slashes stripped', () => {
    expect(buildSyncUrl('https://wuh.site', 42)).toBe('https://wuh.site/api/webhook/sync/42')
    expect(buildSyncUrl('https://wuh.site/', 42)).toBe('https://wuh.site/api/webhook/sync/42')
    // 本地联调：siteBaseUrl 直配 nest 源+v2 前缀（server 全局前缀）
    expect(buildSyncUrl('http://localhost:3200/v2', 7)).toBe('http://localhost:3200/v2/api/webhook/sync/7')
  })
})

describe('normalizeSiteBase', () => {
  it('falls back to the default site origin on empty or invalid input', () => {
    expect(normalizeSiteBase('')).toBe('https://wuh.site')
    expect(normalizeSiteBase('   ')).toBe('https://wuh.site')
    expect(normalizeSiteBase(undefined)).toBe('https://wuh.site')
    expect(normalizeSiteBase('wuh.site')).toBe('https://wuh.site') // 无协议拒绝
    expect(normalizeSiteBase('ftp://wuh.site')).toBe('https://wuh.site') // 非 http(s) 拒绝
  })

  it('keeps a valid http(s) origin trimmed of trailing slashes', () => {
    expect(normalizeSiteBase(' https://wuh.site/ ')).toBe('https://wuh.site')
    expect(normalizeSiteBase('http://localhost:3000')).toBe('http://localhost:3000')
  })
})

describe('syncIssueToSite', () => {
  it('returns ok:true with the status on 2xx', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await syncIssueToSite(42, 'https://wuh.site')
    expect(res.ok).toBe(true)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://wuh.site/api/webhook/sync/42',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('fails with the status code on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"boom"}', { status: 500 })))
    const res = await syncIssueToSite(42, 'https://wuh.site')
    expect(res.ok).toBe(false)
    expect(res.status).toBe(500)
  })

  it('fails gracefully on network errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    const res = await syncIssueToSite(42, 'https://wuh.site')
    expect(res.ok).toBe(false)
    expect(res.error).toContain('ECONNREFUSED')
  })

  it('times out after 15s (abort signal wired)', async () => {
    let capturedSignal: AbortSignal | null | undefined
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal
      return new Promise((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    }))
    vi.useFakeTimers()
    const pending = syncIssueToSite(42, 'https://wuh.site')
    await vi.advanceTimersByTimeAsync(15_000)
    const res = await pending
    vi.useRealTimers()
    expect(res.ok).toBe(false)
    expect(res.error).toBeTruthy()
    expect(capturedSignal).toBeDefined()
  })
})
