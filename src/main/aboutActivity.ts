import { net } from 'electron'
import { implement } from './ipc'
import { loadSettings } from './credentials'
import type { AboutActivityHeatmap } from '@shared/types'

/**
 * 首页综合活动热力图数据源：
 * 站点公开接口 GET /api/about/activity（契约见 shared/types.ts 的 AboutActivityHeatmap）。
 * 缓存策略对齐站点 repos 模块——内存缓存 5 分钟，请求失败回退过期缓存，无缓存时抛明确错误。
 * 纯逻辑（URL 解析 / 缓存 / 降级）与 Electron 装配分离，便于 vitest 直测。
 */

export const DEFAULT_SITE_BASE_URL = 'https://wuh.site'

const CACHE_TTL_MS = 5 * 60 * 1000

/** siteBaseUrl → 活动接口绝对地址：trim 空白、去尾斜杠、空值回退默认主域名 */
export function resolveActivityUrl(siteBaseUrl: string | null | undefined): string {
  const raw = (siteBaseUrl ?? '').trim()
  const base = raw.length > 0 ? raw.replace(/\/+$/, '') : DEFAULT_SITE_BASE_URL
  if (!/^https?:\/\//.test(base)) {
    throw new Error(`站点地址必须是 http(s) URL: ${base}`)
  }
  return `${base}/api/about/activity`
}

export interface ActivityFetcherResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

export type ActivityFetcher = (url: string) => Promise<ActivityFetcherResponse>

export interface AboutActivityServiceOptions {
  fetcher: ActivityFetcher
  now?: () => number
  ttlMs?: number
}

export function createAboutActivityService({
  fetcher,
  now = Date.now,
  ttlMs = CACHE_TTL_MS
}: AboutActivityServiceOptions): {
  getAboutActivity(siteBaseUrl: string | null): Promise<AboutActivityHeatmap>
} {
  let cache: { url: string; at: number; data: AboutActivityHeatmap } | null = null

  return {
    async getAboutActivity(siteBaseUrl: string | null): Promise<AboutActivityHeatmap> {
      const url = resolveActivityUrl(siteBaseUrl)
      const hit = cache
      if (hit !== null && hit.url === url && now() - hit.at < ttlMs) {
        return hit.data
      }
      try {
        const res = await fetcher(url)
        if (!res.ok) throw new Error(`站点活动接口返回 ${res.status}`)
        const data = (await res.json()) as AboutActivityHeatmap
        if (!data || !Array.isArray(data.days)) throw new Error('站点活动数据格式异常')
        cache = { url, at: now(), data }
        return data
      } catch (err) {
        // 过期缓存回退：站点不可达时首页仍展示最后一次成功数据
        if (hit !== null && hit.url === url) return hit.data
        throw err instanceof Error ? err : new Error(String(err))
      }
    }
  }
}

/** 主进程装配：net.fetch 走系统网络栈（代理/证书行为与 Chromium 一致） */
const service = createAboutActivityService({ fetcher: (url) => net.fetch(url) })

implement('getAboutActivity', async () => {
  const { siteBaseUrl } = await loadSettings()
  return service.getAboutActivity(siteBaseUrl)
})
