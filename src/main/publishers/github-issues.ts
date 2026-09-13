import { Octokit } from '@octokit/rest'
import { registerPublisher, type Publisher } from './types'
import { getWorkspace } from '../workspace'
import { getToken } from '../credentials'
import { buildIssueBody } from '@shared/frontmatter'
import type { PublishRequest, PublishResult } from '@shared/types'

export const githubIssuesPublisher: Publisher = {
  id: 'github-issues',
  label: 'GitHub Issues',
  async isAvailable(): Promise<boolean> {
    const ws = getWorkspace()
    if (!ws?.github) return false
    return Boolean(await getToken())
  },
  async publish(req: PublishRequest): Promise<PublishResult> {
    const ws = getWorkspace()
    if (!ws?.github) return { ok: false, error: '当前工作区没有 GitHub remote' }
    const token = await getToken()
    if (!token) return { ok: false, error: '未配置 GitHub Token' }

    const octokit = new Octokit({ auth: token })
    const { owner, repo } = ws.github
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
  }
}

registerPublisher(githubIssuesPublisher)
