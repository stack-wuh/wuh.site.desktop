import { describe, expect, it } from 'vitest'
import { planRevert } from '@shared/revert'

describe('planRevert 决策（revert-only 语义：禁止改写已 push 历史）', () => {
  it('文件有未提交改动 → checkout 自 HEAD', () => {
    const plan = planRevert({
      mode: 'file',
      fileDirty: true,
      fileHasUnpushedCommits: false,
      fileHasPushedCommits: true,
      path: 'docs/a.md'
    })
    expect(plan).toEqual({
      action: 'checkoutFile',
      path: 'docs/a.md',
      from: 'HEAD',
      reason: expect.stringContaining('未提交')
    })
  })

  it('文件存在未 push 提交（优先于脏状态）→ checkout 自 upstream', () => {
    const plan = planRevert({
      mode: 'file',
      fileDirty: true,
      fileHasUnpushedCommits: true,
      fileHasPushedCommits: true,
      path: 'docs/a.md'
    })
    expect(plan).toMatchObject({ action: 'checkoutFile', from: 'upstream' })
  })

  it('文件干净且仅有已 push 历史 → blocked，提示用历史面板 revert', () => {
    const plan = planRevert({
      mode: 'file',
      fileDirty: false,
      fileHasUnpushedCommits: false,
      fileHasPushedCommits: true,
      path: 'docs/a.md'
    })
    expect(plan.action).toBe('blocked')
    if (plan.action === 'blocked') {
      expect(plan.reason).toContain('revert')
    }
  })

  it('文件无任何历史 → blocked', () => {
    const plan = planRevert({
      mode: 'file',
      fileDirty: false,
      fileHasUnpushedCommits: false,
      fileHasPushedCommits: false,
      path: 'docs/new.md'
    })
    expect(plan.action).toBe('blocked')
  })

  it('commit 模式 → revert 新提交抵消', () => {
    const plan = planRevert({
      mode: 'commit',
      fileDirty: false,
      fileHasUnpushedCommits: false,
      fileHasPushedCommits: true,
      hash: 'abc1234'
    })
    expect(plan).toEqual({
      action: 'revertCommit',
      hash: 'abc1234',
      reason: expect.stringContaining('revert')
    })
  })
})
