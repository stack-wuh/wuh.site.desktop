import { implement } from './ipc'
import { getGit, getWorkspace } from './workspace'
import { getToken } from './credentials'
import type {
  CommitSummary,
  GitFileState,
  GitStatusSummary
} from '@shared/types'

function mapState(f: {
  index: string
  working_dir: string
}): GitFileState {
  const c = f.index !== ' ' && f.index !== '?' ? f.index : f.working_dir
  switch (c) {
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
      return 'renamed'
    case 'M':
    case 'T':
      return 'modified'
    case '?':
      return 'untracked'
    case 'U':
      return 'conflicted'
    default:
      return 'modified'
  }
}

export async function getUpstreamRef(): Promise<string | null> {
  const git = getGit()
  try {
    const ref = await git.raw([
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      '@{u}'
    ])
    return ref.trim() || null
  } catch {
    return null
  }
}

/** 无 token 时走用户本机既有凭证；有 token 时按 https + x-access-token 推送，不落配置 */
async function pushWithCredential(): Promise<void> {
  const git = getGit()
  const ws = getWorkspace()
  const token = await getToken()
  if (!token || !ws?.github || !ws.branch) {
    await git.push()
    return
  }
  const url = `https://x-access-token:${token}@github.com/${ws.github.owner}/${ws.github.repo}.git`
  await git.raw(['push', url, `HEAD:${ws.branch}`])
}

implement('gitStatus', async (): Promise<GitStatusSummary> => {
  const git = getGit()
  const st = await git.status()
  return {
    branch: st.current ?? null,
    upstream: st.tracking ?? null,
    ahead: st.ahead ?? 0,
    behind: st.behind ?? 0,
    files: st.files.map((f) => ({
      path: f.path,
      state: mapState(f),
      staged: f.index !== ' ' && f.index !== '?'
    }))
  }
})

implement('gitStage', async ([paths]) => {
  const git = getGit()
  await git.add(paths)
})

implement('gitCommit', async ([message, paths]) => {
  const git = getGit()
  if (paths && paths.length > 0) {
    await git.add(paths)
  } else {
    await git.add('-A')
  }
  const res = await git.commit(message, paths && paths.length > 0 ? paths : undefined)
  return { hash: res.commit }
})

implement('gitPush', () => pushWithCredential())

implement('gitPull', async () => {
  const git = getGit()
  await git.pull()
})

implement('gitLog', async ([opts]): Promise<CommitSummary[]> => {
  const git = getGit()
  const args = ['log', `--max-count=${opts?.limit ?? 50}`, '--format=%H%x1f%h%x1f%s%x1f%an%x1f%aI']
  if (opts?.path) args.push('--', opts.path)
  const raw = await git.raw(args)
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [hash, shortHash, message, author, date] = line.split('\x1f')
      return { hash, shortHash, message, author, date }
    })
})

implement('gitShow', async ([commitHash, path]) => {
  const git = getGit()
  const args = ['show', '--format=short', '--patch', '--unified=3', commitHash]
  if (path) args.push('--', path)
  return git.raw(args)
})
