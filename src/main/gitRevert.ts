import { implement } from './ipc'
import { getGit, getWorkspace } from './workspace'
import { getUpstreamRef } from './git'
import { planRevert as decide } from '@shared/revert'
import type { RevertDecisionInput, RevertPlan } from '@shared/types'

implement('planRevert', async ([input]): Promise<RevertPlan> => {
  if (input.mode === 'commit') return decide(input)

  const path = input.path
  if (!path) return { action: 'blocked', reason: '缺少文件路径' }

  const git = getGit()
  const st = await git.status()
  const fileDirty = st.files.some((f) => f.path === path)

  let unpushed = false
  let pushed = false
  const upstream = await getUpstreamRef()
  if (upstream) {
    unpushed =
      (await git.raw(['log', `${upstream}..HEAD`, '--format=%h', '--', path])).trim()
        .length > 0
    pushed =
      (await git.raw(['log', upstream, '--format=%h', '-n', '1', '--', path])).trim()
        .length > 0
  } else {
    pushed = false
    unpushed =
      (await git.raw(['log', '--format=%h', '-n', '1', '--', path])).trim().length > 0
  }

  return decide({ ...input, fileDirty, fileHasUnpushedCommits: unpushed, fileHasPushedCommits: pushed })
})

implement('executeRevert', async ([plan]) => {
  const git = getGit()
  if (plan.action === 'checkoutFile') {
    if (plan.from === 'upstream') {
      const upstream = await getUpstreamRef()
      if (upstream) {
        await git.checkout([upstream, '--', plan.path])
        return
      }
    }
    await git.checkout(['--', plan.path])
    return
  }
  if (plan.action === 'revertCommit') {
    try {
      await git.raw(['revert', '--no-edit', plan.hash])
    } catch (err) {
      // revert 冲突时保留现场，提示用户手动处理
      await git.raw(['revert', '--abort']).catch(() => undefined)
      throw new Error(
        `revert 出现冲突已中止：${err instanceof Error ? err.message : String(err)}`
      )
    }
    return
  }
  throw new Error(plan.reason)
})

/** 当前工作区未 push 的提交数（供自动提交/推送联动参考） */
export async function aheadCount(): Promise<number> {
  const ws = getWorkspace()
  if (!ws) return 0
  try {
    const st = await getGit().status()
    return st.ahead ?? 0
  } catch {
    return 0
  }
}

export type { RevertDecisionInput }
