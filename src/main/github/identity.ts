import { clipboard, shell } from 'electron'
import { Octokit } from '@octokit/rest'
import { implement } from '../ipc'
import { getTokenInfo, setToken } from '../credentials'
import { beginDeviceFlow, type DeviceFlowOutcome, type DeviceFlowRun } from '../device-flow'
import type { DeviceFlowState, GithubIdentity, RepoSummary } from '@shared/types'

// ---- Device Flow 装配：token 经 safeStorage 落盘（kind=oauth），user_code 自动进剪贴板并打开浏览器 ----

let runRef: DeviceFlowRun | null = null
let lastState: DeviceFlowState = { phase: 'idle' }

function toState(outcome: DeviceFlowOutcome): DeviceFlowState {
  if (outcome.ok) return { phase: 'success' }
  return { phase: outcome.reason, message: outcome.message }
}

implement('startGithubDeviceFlow', async () => {
  const run = await beginDeviceFlow({
    fetch: globalThis.fetch,
    onToken: (token) => setToken(token, 'oauth')
  })
  runRef = run
  lastState = { phase: 'polling' }
  void run.done
    .then((outcome) => {
      if (runRef === run) {
        lastState = toState(outcome)
        runRef = null
      }
    })
    .catch((err: unknown) => {
      if (runRef === run) {
        lastState = {
          phase: 'error',
          message: err instanceof Error ? err.message : String(err)
        }
        runRef = null
      }
    })
  clipboard.writeText(run.start.userCode)
  void shell.openExternal(run.start.verificationUri).catch(() => {})
  return run.start
})

implement('getGithubDeviceFlowStatus', async (): Promise<DeviceFlowState> => lastState)

implement('cancelGithubDeviceFlow', async () => {
  runRef?.cancel()
})

// ---- 身份与仓库 ----

function octokitFor(token: string): Octokit {
  return new Octokit({ auth: token })
}

const STALE_IDENTITY: Omit<GithubIdentity, 'kind'> = {
  login: '',
  name: null,
  avatarUrl: '',
  scopes: [],
  stale: true
}

implement('getGithubIdentity', async (): Promise<GithubIdentity> => {
  const info = await getTokenInfo()
  if (!info) throw new Error('未配置 GitHub Token，请到用户中心完成授权')
  try {
    const res = await octokitFor(info.token).users.getAuthenticated()
    const scopes = String(res.headers['x-oauth-scopes'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return {
      login: res.data.login,
      name: res.data.name,
      avatarUrl: res.data.avatar_url,
      scopes,
      kind: info.kind,
      stale: false
    }
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 401) {
      return { ...STALE_IDENTITY, kind: info.kind }
    }
    throw err
  }
})

/** 仓库列表上限：个人工具场景分页聚合的合理边界 */
const REPO_CAP = 500

implement('listUserRepos', async (): Promise<RepoSummary[]> => {
  const info = await getTokenInfo()
  if (!info) throw new Error('未配置 GitHub Token，请到用户中心完成授权')
  const repos = await octokitFor(info.token).paginate(octokitFor(info.token).repos.listForAuthenticatedUser, {
    affiliation: 'owner,collaborator',
    sort: 'pushed',
    direction: 'desc',
    per_page: 100
  })
  return repos.slice(0, REPO_CAP).map((r) => ({
    fullName: r.full_name,
    private: r.private,
    description: r.description,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at ?? ''
  }))
})

// ---- 外链：仅允许 http(s)，交给系统浏览器 ----

implement('openExternal', async ([url]) => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('非法链接')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('仅允许打开 http(s) 链接')
  }
  await shell.openExternal(parsed.toString())
})
