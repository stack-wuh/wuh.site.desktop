import { describe, expect, it } from 'vitest'
import {
  createFeedbackRateLimiter,
  FEEDBACK_ACTION_ID_MAX,
  FEEDBACK_LABEL_MAX,
  FEEDBACK_MAX_ACTIONS,
  FEEDBACK_MAX_BUTTONS,
  FEEDBACK_TEXT_MAX,
  FEEDBACK_TITLE_MAX,
  sanitizeAlertArgs,
  sanitizeMessageArgs,
  sanitizeToastArgs
} from '@shared/plugin'

/**
 * 插件反馈入参校验与频率护栏（20260924-feature-ui-feedback-system · Phase 2）：
 * 帧协议 ui service 三方法（toast/message/alert）的纯逻辑边界——kind 白名单、
 * 文本长度钳制、actions/buttons 上限、必填校验（toast/message 要 text、
 * alert 要 text 或 title）、每插件滑动窗口额度。
 */

describe('sanitizeToastArgs', () => {
  it('合法入参原样保留（含数组形态）', () => {
    expect(sanitizeToastArgs([{ text: '已同步', kind: 'success', duration: 2000 }])).toEqual({
      text: '已同步',
      kind: 'success',
      duration: 2000
    })
    expect(sanitizeToastArgs({ text: '直接对象形态' })).toEqual({
      text: '直接对象形态',
      kind: undefined,
      duration: undefined
    })
  })

  it('text 必填：缺失/空白/非字符串一律拒绝', () => {
    expect(sanitizeToastArgs([{}])).toBeNull()
    expect(sanitizeToastArgs([{ text: '   ' }])).toBeNull()
    expect(sanitizeToastArgs([{ text: 42 }])).toBeNull()
    expect(sanitizeToastArgs([])).toBeNull()
    expect(sanitizeToastArgs(null)).toBeNull()
  })

  it('文本截断到上限；非法 kind / duration 归一为缺省', () => {
    const long = 'x'.repeat(FEEDBACK_TEXT_MAX + 50)
    const out = sanitizeToastArgs([{ text: long, kind: 'fancy', duration: 'soon' }])
    expect(out?.text).toHaveLength(FEEDBACK_TEXT_MAX)
    expect(out?.kind).toBeUndefined()
    expect(out?.duration).toBeUndefined()
  })
})

describe('sanitizeMessageArgs', () => {
  it('title 截断、actions 归一（id 必需、label 截断、variant 白名单）', () => {
    const out = sanitizeMessageArgs([
      {
        title: 't'.repeat(FEEDBACK_TITLE_MAX + 10),
        text: '网络异常',
        kind: 'error',
        actions: [
          { id: 'retry', label: 'l'.repeat(FEEDBACK_LABEL_MAX + 10), variant: 'primary' },
          { id: '', label: '无效 id 剔除' },
          { label: '缺 id 剔除' },
          { id: 'x'.repeat(FEEDBACK_ACTION_ID_MAX + 10), variant: 'weird' }
        ]
      }
    ])
    expect(out?.title).toHaveLength(FEEDBACK_TITLE_MAX)
    expect(out?.kind).toBe('error')
    expect(out?.actions).toHaveLength(2)
    expect(out?.actions?.[0]).toEqual({
      id: 'retry',
      label: 'l'.repeat(FEEDBACK_LABEL_MAX),
      variant: 'primary'
    })
    expect(out?.actions?.[1].id).toHaveLength(FEEDBACK_ACTION_ID_MAX)
    expect(out?.actions?.[1].variant).toBeUndefined()
  })

  it('actions 数量上限 3；非数组忽略；text 必填', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ id: `a${i}`, label: `A${i}` }))
    expect(sanitizeMessageArgs([{ text: 'x', actions: many }])?.actions).toHaveLength(
      FEEDBACK_MAX_ACTIONS
    )
    expect(sanitizeMessageArgs([{ text: 'x', actions: 'nope' }])?.actions).toBeUndefined()
    expect(sanitizeMessageArgs([{ title: '只有标题' }])).toBeNull()
  })
})

describe('sanitizeAlertArgs', () => {
  it('text 或 title 至少其一：纯标题允许', () => {
    expect(sanitizeAlertArgs([{ title: '仅标题' }])).toEqual({
      title: '仅标题',
      text: '',
      kind: undefined,
      buttons: undefined,
      systemNotify: undefined
    })
    expect(sanitizeAlertArgs([{ text: '仅正文' }])?.text).toBe('仅正文')
    expect(sanitizeAlertArgs([{ title: '  ', text: ' ' }])).toBeNull()
    expect(sanitizeAlertArgs(['字符串'])).toBeNull()
  })

  it('buttons 上限 5；systemNotify 仅在显式 false 时保留', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `b${i}` }))
    expect(sanitizeAlertArgs([{ text: 'x', buttons: many }])?.buttons).toHaveLength(
      FEEDBACK_MAX_BUTTONS
    )
    expect(sanitizeAlertArgs([{ text: 'x', systemNotify: false }])?.systemNotify).toBe(false)
    expect(sanitizeAlertArgs([{ text: 'x', systemNotify: true }])?.systemNotify).toBeUndefined()
  })
})

describe('createFeedbackRateLimiter（每插件滑动窗口）', () => {
  it('额度内放行，超限拒绝；窗口滑过后恢复', () => {
    let now = 1_000
    const limiter = createFeedbackRateLimiter({ max: 3, windowMs: 10_000, now: () => now })
    expect(limiter.allow('p1')).toBe(true)
    expect(limiter.allow('p1')).toBe(true)
    expect(limiter.allow('p1')).toBe(true)
    expect(limiter.allow('p1')).toBe(false)
    now += 9_999
    expect(limiter.allow('p1')).toBe(false)
    now += 2 // 首条滑出窗口
    expect(limiter.allow('p1')).toBe(true)
  })

  it('按插件隔离；reset 支持单键与全清', () => {
    const limiter = createFeedbackRateLimiter({ max: 1, windowMs: 10_000 })
    expect(limiter.allow('p1', 0)).toBe(true)
    expect(limiter.allow('p1', 0)).toBe(false)
    // 另一插件不受 p1 额度影响
    expect(limiter.allow('p2', 0)).toBe(true)
    limiter.reset('p1')
    expect(limiter.allow('p1', 0)).toBe(true)
    limiter.reset()
    expect(limiter.allow('p2', 0)).toBe(true)
  })

  it('默认额度与窗口（5 条 / 10s）', () => {
    const limiter = createFeedbackRateLimiter()
    for (let i = 0; i < 5; i++) expect(limiter.allow('p', 0)).toBe(true)
    expect(limiter.allow('p', 0)).toBe(false)
    expect(limiter.allow('p', 10_001)).toBe(true)
  })
})
