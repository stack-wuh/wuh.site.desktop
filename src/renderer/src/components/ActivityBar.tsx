export type PanelId = 'files' | 'git' | 'github' | 'settings'

import { FileText, GitBranch, Settings } from 'lucide-react'
import { GithubIcon } from './ui/GithubIcon'
import { Button } from './ui/Button'
import { AppIcon } from './ui/AppIcon'

import type { IconComponent } from './ui/AppIcon'

const ITEMS: { id: PanelId; icon: IconComponent; title: string }[] = [
  { id: 'files', icon: FileText, title: '文件' },
  { id: 'git', icon: GitBranch, title: 'Git 历史' },
  { id: 'github', icon: GithubIcon, title: 'GitHub' },
  { id: 'settings', icon: Settings, title: '设置' }
]

export function ActivityBar(props: {
  active: PanelId
  onChange: (id: PanelId) => void
}): React.JSX.Element {
  return (
    <nav className="activity-bar">
      {ITEMS.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          className={item.id === props.active ? 'active' : ''}
          title={item.title}
          onClick={() => props.onChange(item.id)}
        >
          <AppIcon icon={item.icon} size="lg" />
        </Button>
      ))}
    </nav>
  )
}
