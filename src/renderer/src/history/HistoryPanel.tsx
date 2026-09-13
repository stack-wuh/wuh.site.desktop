import { useCallback, useEffect, useState } from 'react'
import type { CommitSummary, GitStatusSummary } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Empty } from '../components/ui/Empty'
import { uiConfirm } from '../components/ui/Dialog'
import { useWorkspaceStore } from '../store'

export function GitPanel(): React.JSX.Element {
  const { activePath } = useWorkspaceStore()
  const [status, setStatus] = useState<GitStatusSummary | null>(null)
  const [log, setLog] = useState<CommitSummary[]>([])
  const [diff, setDiff] = useState('')
  const [message, setMessage] = useState('')
  const [scope, setScope] = useState<'all' | 'file'>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (fn: () => Promise<void>): Promise<void> => {
      setBusy(true)
      setError(null)
      try {
        await fn()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    []
  )

  const logPath = scope === 'file' && activePath ? activePath : undefined

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setStatus(await window.api.gitStatus())
      setLog(await window.api.gitLog({ path: logPath, limit: 30 }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [logPath])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const commit = (): void =>
    void run(async () => {
      const msg = message.trim() || `docs: update ${activePath ?? 'workspace'}`
      const paths = scope === 'file' && activePath ? [activePath] : undefined
      await window.api.gitCommit(msg, paths)
      setMessage('')
      await refresh()
    })

  const push = (): void =>
    void run(async () => {
      await window.api.gitPush()
      await refresh()
    })

  const pull = (): void =>
    void run(async () => {
      await window.api.gitPull()
      await refresh()
    })

  const revertFile = (): void =>
    void run(async () => {
      if (!activePath) return
      const plan = await window.api.planRevert({
        mode: 'file',
        fileDirty: false,
        fileHasUnpushedCommits: false,
        fileHasPushedCommits: false,
        path: activePath
      })
      if (plan.action === 'blocked') {
        setError(plan.reason)
        return
      }
      const ok = await uiConfirm({
        title: '回退文件',
        message: `确认回退「${activePath}」？\n${plan.reason}`,
        okText: '回退',
        danger: true
      })
      if (!ok) return
      await window.api.executeRevert(plan)
      await refresh()
    })

  const revertCommit = (hash: string): void =>
    void run(async () => {
      const plan = await window.api.planRevert({
        mode: 'commit',
        fileDirty: false,
        fileHasUnpushedCommits: false,
        fileHasPushedCommits: true,
        hash
      })
      if (plan.action !== 'revertCommit') {
        setError('action' in plan ? plan.reason : '无法回退')
        return
      }
      const ok = await uiConfirm({
        title: 'Revert 提交',
        message: `确认 revert 提交 ${hash.slice(0, 7)}？\n将生成一个反向提交，不改写远端历史。`,
        okText: 'Revert',
        danger: true
      })
      if (!ok) return
      await window.api.executeRevert(plan)
      await refresh()
    })

  const showDiff = (hash: string): void =>
    void run(async () => {
      setDiff(await window.api.gitShow(hash, logPath))
    })

  return (
    <div className="git-panel">
      <div className="panel-section">
        <div className="section-head">
          <span>
            {status ? `${status.branch ?? '-'} ↑${status.ahead} ↓${status.behind}` : '…'}
          </span>
          <span className="scope-toggle">
            <Button
              variant="ghost"
              size="sm"
              className={scope === 'all' ? 'active' : ''}
              onClick={() => setScope('all')}
            >
              全仓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={scope === 'file' ? 'active' : ''}
              disabled={!activePath}
              onClick={() => setScope('file')}
            >
              当前文件
            </Button>
          </span>
        </div>
        <div className="commit-box">
          <Input
            placeholder="提交信息（留空自动生成）"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="primary" disabled={busy} onClick={commit}>
            Commit
          </Button>
        </div>
        <div className="row-actions">
          <Button disabled={busy} onClick={push}>
            Push ↑
          </Button>
          <Button disabled={busy} onClick={pull}>
            Pull ↓
          </Button>
          <Button variant="danger" disabled={busy || !activePath} onClick={revertFile}>
            回退当前文件
          </Button>
        </div>
        {error && <div className="error-text">{error}</div>}
        {status && status.files.length > 0 && (
          <ul className="status-list">
            {status.files.map((f) => (
              <li key={f.path + f.state} className={f.state}>
                {f.path} · {f.state}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel-section">
        <div className="section-head">
          <span>历史{logPath ? ` · ${logPath}` : ''}</span>
        </div>
        {log.length === 0 ? (
          <Empty title="暂无提交历史" />
        ) : (
          <ul className="log-list">
            {log.map((c) => (
              <li key={c.hash}>
                <div className="log-line">
                  <code>{c.shortHash}</code>
                  <span className="log-msg" title={c.message}>
                    {c.message}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => showDiff(c.hash)}>
                    diff
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => revertCommit(c.hash)}>
                    revert
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {diff && <pre className="diff-view">{diff}</pre>}
      </div>
    </div>
  )
}
