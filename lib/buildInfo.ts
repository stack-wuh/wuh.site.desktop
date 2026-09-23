/**
 * 构建元数据（20260923-feature-build-time-visibility）：渲染层构建时间戳。
 * 值由 next.config.ts 的 env.NEXT_PUBLIC_BUILD_TIME 构建期内联——dev 下 =
 * dev 服务器启动时刻，build 下 = 构建时刻；与 NEXT_PUBLIC_APP_VERSION 同源
 * 同规则（shell-chrome-design 卡：构建元数据走 env 内联，不走 preload/broker）。
 *
 * 页面展示的时刻与当前会话对不上 = 渲染层是旧页面（僵尸实例检测：
 * 长跑 dev 的 HMR 断链会让页面停留旧模块，靠症状无法发现）。
 */

/** 构建期内联的 ISO 时间戳；未注入（非常规环境）时为空串 */
export const BUILD_TIME: string = process.env.NEXT_PUBLIC_BUILD_TIME ?? ''

function utcParts(iso: string): { date: string; hm: string; compactDate: string } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number): string => String(n).padStart(2, '0')
  return {
    date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
    hm: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    compactDate: `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`
  }
}

/**
 * 完整格式 `2026-09-23 13:26 UTC`。确定性 UTC 输出——禁 toLocaleString：
 * SSR/客户端 locale 差异会造成 hydration mismatch（渲染零告警守卫会拦）。
 * 无效输入返回空串，调用方按空值静默隐藏展示位。
 */
export function formatBuildTime(iso: string): string {
  const parts = utcParts(iso)
  return parts ? `${parts.date} ${parts.hm} UTC` : ''
}

/** 紧凑格式 `20260923-1326Z`（快捷面板版本行用，宽度敏感） */
export function formatBuildTimeShort(iso: string): string {
  const parts = utcParts(iso)
  return parts ? `${parts.compactDate}-${parts.hm.replace(':', '')}Z` : ''
}
