import type { RevertDecisionInput, RevertPlan } from './types'

/**
 * 回退决策（revert-only 语义）：
 * - 文件有未 push 提交 → 从 upstream 恢复该文件（优先，覆盖脏状态）
 * - 文件仅有未提交修改 → 从 HEAD 恢复
 * - 文件仅有已 push 历史 → 引导到历史面板按提交 revert
 * - commit 模式 → revert 新提交抵消，禁止改写远端历史
 */
export function planRevert(input: RevertDecisionInput): RevertPlan {
  if (input.mode === 'commit') {
    if (!input.hash) return { action: 'blocked', reason: '缺少要回退的提交 hash' }
    return {
      action: 'revertCommit',
      hash: input.hash,
      reason: '通过 revert 生成反向提交抵消该变更，不改写已 push 的历史'
    }
  }

  if (!input.path) return { action: 'blocked', reason: '缺少文件路径' }

  if (input.fileHasUnpushedCommits) {
    return {
      action: 'checkoutFile',
      path: input.path,
      from: 'upstream',
      reason: '该文件存在未 push 的提交，从上游分支恢复到已推送状态（含未提交修改）'
    }
  }

  if (input.fileDirty) {
    return {
      action: 'checkoutFile',
      path: input.path,
      from: 'HEAD',
      reason: '放弃该文件的未提交修改，恢复到最近一次提交'
    }
  }

  if (input.fileHasPushedCommits) {
    return {
      action: 'blocked',
      reason: '该文件仅有已 push 的历史，请在历史面板中选择具体提交执行 revert'
    }
  }

  return { action: 'blocked', reason: '该文件没有可回退的历史' }
}
