import { describe, expect, it } from 'vitest'
import { formatBuildTime, formatBuildTimeShort } from '../lib/buildInfo'

/**
 * 构建时间确定性 UTC 格式化（20260923-feature-build-time-visibility）：
 * 禁 toLocaleString——SSR/客户端 locale 差异会造成 hydration mismatch，
 * 输出必须与运行环境 locale/时区设置无关。
 */
describe('formatBuildTime（完整格式 YYYY-MM-DD HH:mm UTC）', () => {
  it('按 UTC 格式化 ISO 时间戳', () => {
    expect(formatBuildTime('2026-09-23T13:26:00.000Z')).toBe('2026-09-23 13:26 UTC')
  })

  it('月/日/时/分补零', () => {
    expect(formatBuildTime('2026-01-05T08:07:00.000Z')).toBe('2026-01-05 08:07 UTC')
  })

  it('无效输入返回空串（env 未注入/坏值时静默降级）', () => {
    expect(formatBuildTime('')).toBe('')
    expect(formatBuildTime('not-a-date')).toBe('')
  })
})

describe('formatBuildTimeShort（短格式 YYYYMMDD-HHmmZ）', () => {
  it('输出紧凑时间戳', () => {
    expect(formatBuildTimeShort('2026-09-23T13:26:00.000Z')).toBe('20260923-1326Z')
  })

  it('无效输入返回空串', () => {
    expect(formatBuildTimeShort('nope')).toBe('')
  })
})
