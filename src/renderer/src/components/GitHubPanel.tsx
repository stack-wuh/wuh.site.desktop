import { useState } from 'react'
import { IssuesPanel } from '../issues/IssuesPanel'
import { LabelsPanel } from '../labels/LabelsPanel'
import { CommentsPanel } from '../comments/CommentsPanel'

type Tab = 'issues' | 'labels' | 'comments'

const TABS: { id: Tab; label: string }[] = [
  { id: 'issues', label: 'Issues' },
  { id: 'labels', label: '标签' },
  { id: 'comments', label: '评论' }
]

export function GitHubPanel(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('issues')

  return (
    <div className="github-panel">
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'issues' && <IssuesPanel />}
      {tab === 'labels' && <LabelsPanel />}
      {tab === 'comments' && <CommentsPanel />}
    </div>
  )
}
