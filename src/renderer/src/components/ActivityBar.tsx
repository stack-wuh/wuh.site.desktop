export type PanelId = 'files' | 'git' | 'github' | 'settings'

import { Button } from './ui/Button'

const ITEMS: { id: PanelId; icon: string; title: string }[] = [
  { id: 'files', icon: '📄', title: '文件' },
  { id: 'git', icon: '⑂', title: 'Git 历史' },
  { id: 'github', icon: '◉', title: 'GitHub' },
  { id: 'settings', icon: '⚙', title: '设置' }
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
          {item.icon}
        </Button>
      ))}
    </nav>
  )
}
