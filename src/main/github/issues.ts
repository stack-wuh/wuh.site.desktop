import { Octokit } from '@octokit/rest'
import { implement } from '../ipc'
import { getWorkspace } from '../workspace'
import { getToken } from '../credentials'
import { buildIssueBody } from '@shared/frontmatter'
import type {
  IssueComment,
  IssueSummary,
  LabelInfo,
  PublishRequest,
  PublishResult
} from '@shared/types'

async function client(): Promise<{ octokit: Octokit; owner: string; repo: string }> {
  const token = await getToken()
  if (!token) throw new Error('未配置 GitHub Token，请到设置中填入 PAT')
  const ws = getWorkspace()
  if (!ws?.github) throw new Error('当前工作区没有 GitHub remote')
  return {
    octokit: new Octokit({ auth: token }),
    owner: ws.github.owner,
    repo: ws.github.repo
  }
}

implement('githubListIssues', async (): Promise<IssueSummary[]> => {
  const { octokit, owner, repo } = await client()
  const res = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    per_page: 50,
    sort: 'updated',
    direction: 'desc'
  })
  return res.data
    .filter((i) => !('pull_request' in i && i.pull_request))
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state === 'closed' ? 'closed' : 'open',
      labels: i.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
      url: i.html_url,
      comments: i.comments,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }))
})

implement(
  'githubGetIssueComments',
  async ([issueNumber]): Promise<IssueComment[]> => {
    const { octokit, owner, repo } = await client()
    const res = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100
    })
    return res.data.map((c) => ({
      id: c.id,
      user: c.user?.login ?? 'unknown',
      avatarUrl: c.user?.avatar_url ?? '',
      body: c.body ?? '',
      createdAt: c.created_at
    }))
  }
)

implement(
  'githubAddIssueComment',
  async ([issueNumber, body]): Promise<IssueComment> => {
    const { octokit, owner, repo } = await client()
    const res = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body
    })
    return {
      id: res.data.id,
      user: res.data.user?.login ?? 'unknown',
      avatarUrl: res.data.user?.avatar_url ?? '',
      body: res.data.body ?? '',
      createdAt: res.data.created_at
    }
  }
)

implement('githubListLabels', async (): Promise<LabelInfo[]> => {
  const { octokit, owner, repo } = await client()
  const res = await octokit.issues.listLabelsForRepo({ owner, repo, per_page: 100 })
  return res.data.map((l) => ({
    name: l.name,
    color: l.color,
    description: l.description ?? null
  }))
})

implement('githubUpsertLabel', async ([label]) => {
  const { octokit, owner, repo } = await client()
  try {
    await octokit.issues.createLabel({
      owner,
      repo,
      name: label.name,
      color: label.color.replace('#', ''),
      description: label.description ?? undefined
    })
  } catch (err) {
    // 422 = 已存在，转为更新
    if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 422) {
      await octokit.issues.updateLabel({
        owner,
        repo,
        name: label.name,
        color: label.color.replace('#', ''),
        description: label.description ?? undefined
      })
      return
    }
    throw err
  }
})

implement('githubDeleteLabel', async ([name]) => {
  const { octokit, owner, repo } = await client()
  await octokit.issues.deleteLabel({ owner, repo, name })
})

/**
 * 创建/更新 Issue（原 publishers/github-issues 的执行端收编于此）。
 * metadata 以 HTML 注释尾注追加（站点 blog 消费规范），发布编排逻辑归插件。
 */
implement('githubUpsertIssue', async ([req]): Promise<PublishResult> => {
  const { octokit, owner, repo } = await client()
  const body = buildIssueBody(req.body, req.metadata)
  try {
    if (req.issueNumber) {
      const res = await octokit.issues.update({
        owner,
        repo,
        issue_number: req.issueNumber,
        title: req.title,
        body,
        labels: req.labels
      })
      return { ok: true, url: res.data.html_url, issueNumber: res.data.number, created: false }
    }
    if (!req.title) return { ok: false, error: 'frontmatter 缺少 title，无法发布' }
    const res = await octokit.issues.create({
      owner,
      repo,
      title: req.title,
      body,
      labels: req.labels
    })
    return { ok: true, url: res.data.html_url, issueNumber: res.data.number, created: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})
