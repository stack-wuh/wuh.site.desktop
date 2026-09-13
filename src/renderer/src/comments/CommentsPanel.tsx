import { useCallback, useEffect, useState } from 'react'
import type { IssueComment, IssueSummary } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import { Empty } from '../components/ui/Empty'

export function CommentsPanel(): React.JSX.Element {
  const [issues, setIssues] = useState<IssueSummary[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void window.api
      .githubListIssues()
      .then((list) => {
        setIssues(list)
        if (list.length > 0 && selected == null) setSelected(list[0].number)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    // 仅首挂载拉取一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadComments = useCallback(async (n: number): Promise<void> => {
    try {
      setComments(await window.api.githubGetIssueComments(n))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    if (selected != null) void loadComments(selected)
  }, [selected, loadComments])

  const send = (): void =>
    void (async () => {
      if (selected == null || !draft.trim()) return
      setBusy(true)
      try {
        await window.api.githubAddIssueComment(selected, draft.trim())
        setDraft('')
        await loadComments(selected)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    })()

  return (
    <div className="comments-panel">
      <Select
        value={selected ?? ''}
        onChange={(e) => setSelected(Number(e.target.value))}
        style={{ width: '100%', margin: '8px 0' }}
      >
        {issues.map((i) => (
          <option key={i.number} value={i.number}>
            #{i.number} {i.title}
          </option>
        ))}
      </Select>
      {error && <div className="error-text">{error}</div>}
      {comments.length === 0 ? (
        <Empty title="暂无评论" hint="选中 Issue 后可直接回复" />
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id}>
              <div className="comment-head">
                <strong>{c.user}</strong>
                <time>{new Date(c.createdAt).toLocaleString()}</time>
              </div>
              <div className="comment-body">{c.body}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="comment-editor">
        <Textarea
          rows={3}
          placeholder="回复该 Issue…（Markdown）"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button variant="primary" disabled={busy || !draft.trim() || selected == null} onClick={send}>
          发送
        </Button>
      </div>
    </div>
  )
}
