import { describe, expect, it, vi } from 'vitest'
import {
  buildBuiltinRequest,
  isPublishAuthError,
  parseIssueNumber,
  publishBusy,
  publishPreflight,
  publishStateOf,
  shouldFallbackToBuiltin
} from '../lib/publish'

/**
 * 发布编排纯逻辑（20261020-feature-publish-interaction）：身份判定（frontmatter
 * issue 号）、预检禁用原因、内置通道请求构建（issue 不进 metadata 尾注）、
 * 降级规则（仅 CLI 不可用降级；执行错误不降级）与发布互斥信号。
 */

describe('parseIssueNumber', () => {
  it('正整数（数字/字符串/带空白）通过', () => {
    expect(parseIssueNumber(42)).toBe(42)
    expect(parseIssueNumber('42')).toBe(42)
    expect(parseIssueNumber(' 7 ')).toBe(7)
  })

  it('零/负数/小数/非数字/空值 → null', () => {
    expect(parseIssueNumber(0)).toBeNull()
    expect(parseIssueNumber(-1)).toBeNull()
    expect(parseIssueNumber(1.5)).toBeNull()
    expect(parseIssueNumber('abc')).toBeNull()
    expect(parseIssueNumber('')).toBeNull()
    expect(parseIssueNumber(undefined)).toBeNull()
    expect(parseIssueNumber(null)).toBeNull()
  })
})

describe('publishStateOf / publishPreflight', () => {
  it('读取 title 与 issue 号', () => {
    expect(publishStateOf('---\ntitle: T\nissue: 12\n---\n\nbody')).toEqual({
      issueNumber: 12,
      title: 'T'
    })
    expect(publishStateOf('---\ntitle: T\n---\n\nbody')).toEqual({ issueNumber: null, title: 'T' })
    expect(publishStateOf(null)).toEqual({ issueNumber: null, title: '' })
  })

  it('预检顺序：无文档 → 未保存草稿 → 缺 title → ok', () => {
    expect(publishPreflight({ activePath: null, content: null })).toEqual({ ok: false, reason: 'no-doc' })
    expect(publishPreflight({ activePath: null, content: 'x' })).toEqual({ ok: false, reason: 'no-path' })
    expect(publishPreflight({ activePath: 'a.md', content: '---\nlabels: [x]\n---\n\nbody' })).toEqual({
      ok: false,
      reason: 'no-title'
    })
    expect(publishPreflight({ activePath: 'a.md', content: '---\ntitle: T\n---\n\nbody' })).toEqual({ ok: true })
  })
})

describe('buildBuiltinRequest', () => {
  it('issue 号作为顶层 update 目标，且不进 metadata 尾注', () => {
    const req = buildBuiltinRequest(
      '---\ntitle: T\nlabels: [a, b]\nsummary: S\nissue: 7\n---\n\nbody',
      'posts/a.md'
    )
    expect(req).not.toBeNull()
    expect(req?.publisherId).toBe('github-issues')
    expect(req?.filePath).toBe('posts/a.md')
    expect(req?.title).toBe('T')
    expect(req?.labels).toEqual(['a', 'b'])
    expect(req?.issueNumber).toBe(7)
    expect(req?.metadata).toEqual({ summary: 'S' })
    expect(req?.metadata && 'issue' in req.metadata).toBe(false)
  })

  it('无 issue 号 → 不带 issueNumber（create 语义）', () => {
    const req = buildBuiltinRequest('---\ntitle: T\n---\n\nbody', 'posts/b.md')
    expect(req && 'issueNumber' in req).toBe(false)
  })

  it('缺 title → null', () => {
    expect(buildBuiltinRequest('---\nlabels: [x]\n---\n\nbody', 'posts/c.md')).toBeNull()
  })
})

describe('shouldFallbackToBuiltin（降级仅限不可用）', () => {
  it('CLI 不可用 → 降级', () => {
    expect(shouldFallbackToBuiltin({ ok: false, available: false })).toBe(true)
  })

  it('执行错误 → 不降级（防同一文档双建）', () => {
    expect(shouldFallbackToBuiltin({ ok: false, available: true })).toBe(false)
  })

  it('成功 → 不降级', () => {
    expect(shouldFallbackToBuiltin({ ok: true, available: true })).toBe(false)
  })
})

describe('isPublishAuthError（凭证失效映射）', () => {
  it('CLI 的 GITHUB_API_ERROR + Bad credentials 命中', () => {
    expect(isPublishAuthError('GITHUB_API_ERROR', 'Bad credentials')).toBe(true)
  })

  it('内置通道无 code、仅 Bad credentials 文案也命中', () => {
    expect(isPublishAuthError(undefined, 'Bad credentials')).toBe(true)
    expect(isPublishAuthError(null, 'Requires authentication')).toBe(true)
  })

  it('其他错误不命中', () => {
    expect(isPublishAuthError('BLOG_TITLE_REQUIRED', 'frontmatter must declare title')).toBe(false)
    expect(isPublishAuthError('GITHUB_API_ERROR', 'Not Found')).toBe(false)
    expect(isPublishAuthError(undefined, undefined)).toBe(false)
  })
})

describe('publishBusy（发布互斥信号）', () => {
  it('set 触发订阅且同值不重复通知', () => {
    const listener = vi.fn()
    const off = publishBusy.subscribe(listener)
    publishBusy.set(true)
    publishBusy.set(true)
    expect(publishBusy.get()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    publishBusy.set(false)
    expect(listener).toHaveBeenCalledTimes(2)
    off()
    publishBusy.set(true)
    expect(listener).toHaveBeenCalledTimes(2)
    publishBusy.set(false)
  })
})
