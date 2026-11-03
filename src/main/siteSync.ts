import { implement } from './ipc'
import { loadSettings } from './credentials'
import { DEFAULT_SITE_BASE_URL } from './aboutActivity'

/**
 * 站点同步（20261103-feature-publish-site-sync）：发布成功后直呼生产同步端点
 * `POST {site}/api/webhook/sync/{issueNumber}`，由 server syncIssue 从 GitHub
 * 拉取 upsert DB——负载只有 issue 号，内容以 GitHub 为单一事实源，重复调用幂等。
 *
 * 站点地址复用既有 AppSettings.siteBaseUrl（与 aboutActivity 同源推导约定：
 * origin + /api 映射 nest:3200/v2），空值回退 DEFAULT_SITE_BASE_URL。
 * 本地联调：siteBaseUrl 配 http://localhost:3200/v2 时 URL 为
 * /v2/webhook/sync/:n（server 全局前缀 v2）。CLI 自带 syncPing 硬编码 /v2
 * 路径只对本地 dev 有效，打不到生产——生产同步由本模块负责（失败可观测可重试，
 * 见 EditorCommandHost 横幅）。
 */

const SYNC_TIMEOUT_MS = 15_000
const SYNC_API_PREFIX = '/api'

export interface SiteSyncResult {
  ok: boolean
  status?: number
  error?: string
}

/** 站点源地址规范化：去尾斜杠；空/非 http(s) 一律回退默认（非法配置不静默打到奇怪地址） */
export function normalizeSiteBase(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '')
  if (/^https?:\/\/.+/.test(trimmed)) return trimmed
  return DEFAULT_SITE_BASE_URL
}

export function buildSyncUrl(siteBase: string | null | undefined, issueNumber: number): string {
  return `${normalizeSiteBase(siteBase)}${SYNC_API_PREFIX}/webhook/sync/${issueNumber}`
}

export async function syncIssueToSite(issueNumber: number, siteBase: string | null): Promise<SiteSyncResult> {
  const url = buildSyncUrl(siteBase, issueNumber)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-length': '0' },
      signal: controller.signal
    })
    if (res.ok) return { ok: true, status: res.status }
    return { ok: false, status: res.status, error: `同步端点返回 ${res.status}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      error: message.includes('abort') || message.includes('Abort') ? '同步请求超时（15s）' : message
    }
  } finally {
    clearTimeout(timer)
  }
}

implement('syncIssueToSite', async ([issueNumber]) => {
  const { siteBaseUrl } = await loadSettings()
  return syncIssueToSite(issueNumber, siteBaseUrl)
})
