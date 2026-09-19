import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  netFetch: vi.fn(),
  appGetPath: vi.fn((): string => '/tmp/shadow-desktop-test-userdata')
}))
vi.mock('electron', () => ({
  ipcMain: mocks.ipcMain,
  net: { fetch: mocks.netFetch },
  app: { getPath: mocks.appGetPath },
  safeStorage: {}
}))

import { callHandler } from '../src/main/ipc'
import {
  createAboutActivityService,
  DEFAULT_SITE_BASE_URL,
  resolveActivityUrl
} from '../src/main/aboutActivity'
import type { AboutActivityHeatmap } from '@shared/types'

// ---------- 测试素材 ----------

const ZERO_COUNTS = {
  visits: 0,
  published: 0,
  updated: 0,
  comments: 0,
  guestbook: 0,
  projectUpdates: 0,
  githubContributions: 0
}

function fixture(): AboutActivityHeatmap {
  return {
    startDate: '2025-09-20',
    endDate: '2026-09-19',
    timezone: 'Asia/Shanghai',
    total: 3,
    days: [
      { date: '2026-09-17', total: 1, level: 1, counts: { ...ZERO_COUNTS, visits: 1 } },
      {
        date: '2026-09-18',
        total: 2,
        level: 2,
        counts: { ...ZERO_COUNTS, githubContributions: 2 }
      },
      { date: '2026-09-19', total: 0, level: 0, counts: { ...ZERO_COUNTS } }
    ]
  }
}

function okResponse(data: unknown): {
  ok: boolean
  status: number
  json: () => Promise<unknown>
} {
  return { ok: true, status: 200, json: async () => data }
}

/** 可拨快进的时钟 */
function fakeClock(start = 1_000_000): { now: () => number; advance: (ms: number) => void } {
  let t = start
  return {
    now: () => t,
    advance: (ms) => {
      t += ms
    }
  }
}

beforeEach(() => {
  mocks.netFetch.mockReset()
})

// ---------- URL 解析 ----------

describe('resolveActivityUrl', () => {
  it('空值回退默认主域名 wuh.site', () => {
    expect(resolveActivityUrl(null)).toBe(`${DEFAULT_SITE_BASE_URL}/api/about/activity`)
    expect(resolveActivityUrl(undefined)).toBe(`${DEFAULT_SITE_BASE_URL}/api/about/activity`)
    expect(resolveActivityUrl('')).toBe(`${DEFAULT_SITE_BASE_URL}/api/about/activity`)
    expect(DEFAULT_SITE_BASE_URL).toBe('https://wuh.site')
  })

  it('trim 空白并去掉尾斜杠', () => {
    expect(resolveActivityUrl('  https://x.wuh.site/  ')).toBe('https://x.wuh.site/api/about/activity')
    expect(resolveActivityUrl('http://localhost:3000///')).toBe('http://localhost:3000/api/about/activity')
  })

  it('非 http(s) 协议直接拒绝', () => {
    expect(() => resolveActivityUrl('ftp://example.com')).toThrow(/http\(s\)/)
    expect(() => resolveActivityUrl('file:///etc')).toThrow(/http\(s\)/)
  })
})

// ---------- 服务：缓存与降级 ----------

describe('createAboutActivityService', () => {
  it('成功拉取并请求解析后的 URL（settings 为 null 时用默认域名）', async () => {
    const clock = fakeClock()
    const fetcher = vi.fn(async () => okResponse(fixture()))
    const service = createAboutActivityService({ fetcher, now: clock.now })

    const data = await service.getAboutActivity(null)
    expect(data.total).toBe(3)
    expect(data.days).toHaveLength(3)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('https://wuh.site/api/about/activity')
  })

  it('TTL 内命中内存缓存，不重复请求', async () => {
    const clock = fakeClock()
    const fetcher = vi.fn(async () => okResponse(fixture()))
    const service = createAboutActivityService({ fetcher, now: clock.now, ttlMs: 5 * 60_000 })

    await service.getAboutActivity(null)
    clock.advance(4 * 60_000)
    await service.getAboutActivity(null)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('超过 TTL 后重新拉取', async () => {
    const clock = fakeClock()
    const fetcher = vi.fn(async () => okResponse(fixture()))
    const service = createAboutActivityService({ fetcher, now: clock.now, ttlMs: 5 * 60_000 })

    await service.getAboutActivity(null)
    clock.advance(5 * 60_000 + 1)
    await service.getAboutActivity(null)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('请求失败时回退过期缓存（对齐 repos-api 缓存降级）', async () => {
    const clock = fakeClock()
    const fetcher = vi.fn(async () => okResponse(fixture()))
    const service = createAboutActivityService({ fetcher, now: clock.now, ttlMs: 5 * 60_000 })

    const first = await service.getAboutActivity(null)
    clock.advance(10 * 60_000)
    fetcher.mockRejectedValueOnce(new Error('网络断开'))
    const second = await service.getAboutActivity(null)

    expect(second).toEqual(first)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('无缓存且请求失败时抛出明确错误', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('网络断开')
    })
    const service = createAboutActivityService({ fetcher, now: fakeClock().now })

    await expect(service.getAboutActivity(null)).rejects.toThrow('网络断开')
  })

  it('站点地址变更后不复用旧站缓存', async () => {
    const clock = fakeClock()
    const fetcher = vi.fn(async () => okResponse(fixture()))
    const service = createAboutActivityService({ fetcher, now: clock.now })

    await service.getAboutActivity(null)
    await service.getAboutActivity('https://x.wuh.site')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenLastCalledWith('https://x.wuh.site/api/about/activity')
  })

  it('非 2xx 响应抛出带状态码的错误', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500, json: async () => null }))
    const service = createAboutActivityService({ fetcher, now: fakeClock().now })

    await expect(service.getAboutActivity(null)).rejects.toThrow('500')
  })

  it('响应缺少 days 数组视为数据格式异常', async () => {
    const fetcher = vi.fn(async () => okResponse({ foo: 'bar' }))
    const service = createAboutActivityService({ fetcher, now: fakeClock().now })

    await expect(service.getAboutActivity(null)).rejects.toThrow('格式异常')
  })
})

// ---------- IPC 装配 ----------

describe('getAboutActivity IPC', () => {
  it('经 callHandler 走通：settings.siteBaseUrl=null → 默认域名 → net.fetch → 契约数据', async () => {
    mocks.netFetch.mockResolvedValue(okResponse(fixture()))
    const data = (await callHandler('getAboutActivity', [])) as AboutActivityHeatmap
    expect(data.endDate).toBe('2026-09-19')
    expect(mocks.netFetch).toHaveBeenCalledWith('https://wuh.site/api/about/activity')
    expect(mocks.appGetPath).toHaveBeenCalledWith('userData')
  })
})
