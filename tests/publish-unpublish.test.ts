import { describe, expect, it } from 'vitest'

import {
  parseIssueNumber,
  publishUnpublished,
  unpublishPreflight,
  markUnpublished,
  clearUnpublished
} from '../lib/publish'

/**
 * 下架编排纯逻辑（20261103-feature-doc-unpublish）：close 即下架——frontmatter
 * issue 号是唯一身份（无号=未发布不可下架）；下架成功后号保留（重新上架=再发布），
 * 会话内已下架态经 publishUnpublished 单状态源供磁贴呈现。
 */

describe('unpublishPreflight', () => {
  it('rejects no-doc / no-path / not-published (no issue number) with reasons', () => {
    expect(unpublishPreflight({ activePath: null, content: null })).toEqual({ ok: false, reason: 'no-doc' })
    expect(unpublishPreflight({ activePath: null, content: '---\ntitle: t\nissue: 3\n---\n\nx\n' })).toEqual({ ok: false, reason: 'no-path' })
    expect(unpublishPreflight({ activePath: 'a.md', content: '---\ntitle: t\n---\n\nx\n' })).toEqual({ ok: false, reason: 'not-published' })
  })

  it('accepts a saved document carrying a valid issue number', () => {
    const pre = unpublishPreflight({ activePath: 'posts/a.md', content: '---\ntitle: t\nissue: 42\n---\n\nx\n' })
    expect(pre.ok).toBe(true)
  })

  it('treats illegal issue numbers as unpublished', () => {
    expect(parseIssueNumber('0')).toBeNull()
    expect(parseIssueNumber('-2')).toBeNull()
    expect(parseIssueNumber('abc')).toBeNull()
    expect(unpublishPreflight({ activePath: 'a.md', content: '---\ntitle: t\nissue: abc\n---\n\nx\n' })).toEqual({ ok: false, reason: 'not-published' })
  })
})

describe('publishUnpublished session state', () => {
  it('marks a path as unpublished and reports membership for the tile', () => {
    expect(publishUnpublished.get().has('posts/a.md')).toBe(false)
    markUnpublished('posts/a.md')
    expect(publishUnpublished.get().has('posts/a.md')).toBe(true)
    // 下架态跟着文档路径走：切文档不影响既有记录
    markUnpublished('posts/b.md')
    expect(publishUnpublished.get().has('posts/a.md')).toBe(true)
  })

  it('clears on republish (identity reused, never duplicated)', () => {
    markUnpublished('posts/c.md')
    clearUnpublished('posts/c.md')
    expect(publishUnpublished.get().has('posts/c.md')).toBe(false)
    // 重复 clear 幂等
    expect(() => clearUnpublished('posts/c.md')).not.toThrow()
  })
})
