import { useCallback, useEffect, useState } from 'react'
import type { IssueSummary } from '@shared/types'
import { toPublishFields } from '@shared/frontmatter'
import { Button } from '../components/ui/Button'
import { Empty } from '../components/ui/Empty'
import { useWorkspaceStore } from '../store'

export function IssuesPanel(): React.JSX.Element {
  const { activePath, content } = useWorkspaceStore()
  const [issues, setIssues] = useState<IssueSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setIssues(await window.api.githubListIssues())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const publish = (): void =>
    void (async () => {
      if (!activePath || content == null) return
      setBusy(true)
      setMsg(null)
      setError(null)
      try {
        const fields = toPublishFields(content)
        const existing = issues.find((i) => i.title === fields.title)
        const res = await window.api.publish({
          publisherId: 'github-issues',
          filePath: activePath,
          title: fields.title,
          labels: fields.labels,
          body: fields.body,
          metadata: fields.metadata,
          issueNumber: existing?.number
        })
        if (res.ok) {
          setMsg(`${existing ? '已更新' : '已发布'} Issue #${res.issueNumber}：${res.url ?? ''}`)
          await refresh()
        } else {
          setError(res.error ?? '发布失败')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    })()

  const missingTitle =
    activePath != null && content != null && toPublishFields(content).title === ''

  return (
    <div className="issues-panel">
      <div className="row-actions">
        <Button
          variant="primary"
          disabled={busy || !activePath || missingTitle}
          onClick={publish}
        >
          发布/更新当前文档为 Issue
        </Button>
        <Button onClick={() => void refresh()}>刷新</Button>
      </div>
      {msg && <div className="ok-text">{msg}</div>}
      {error && <div className="error-text">{error}</div>}
      {issues.length === 0 ? (
        <Empty title="当前仓库没有打开的 Issue" />
      ) : (
        <ul className="issue-list">
          {issues.map((i) => (
            <li key={i.number}>
              <span className="issue-num">#{i.number}</span>
              <span className="issue-title">{i.title}</span>
              <span className="issue-labels">
                {i.labels.map((l) => (
                  <em key={l}>{l}</em>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {missingTitle && (
        <div className="hint-text">当前文档缺少 frontmatter title，发布前请先在 frontmatter 面板补全。</div>
      )}
    </div>
  )
}
