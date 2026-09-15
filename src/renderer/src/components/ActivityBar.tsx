import { BookOpen, Eye, FileText, GitBranch, MessageSquare, Settings, Sparkles, Tag } from 'lucide-react'
import type { PluginIconName } from '@shared/plugin'
import { GithubIcon } from './ui/GithubIcon'
import { Button } from './ui/Button'
import { AppIcon, type IconComponent } from './ui/AppIcon'

export interface ActivityItem {
  id: string
  icon: IconComponent
  title: string
}

/** 插件 manifest 图标白名单 → 宿主同源图标组件（图标资源由核心自持，插件不携带） */
const PLUGIN_ICON_COMPONENTS: Record<PluginIconName, IconComponent> = {
  'file-text': FileText,
  'git-branch': GitBranch,
  github: GithubIcon,
  tag: Tag,
  message: MessageSquare,
  eye: Eye,
  sparkles: Sparkles,
  book: BookOpen
}

export function pluginIcon(name: PluginIconName): IconComponent {
  return PLUGIN_ICON_COMPONENTS[name]
}

export function ActivityBar(props: {
  items: ActivityItem[]
  active: string
  onChange: (id: string) => void
}): React.JSX.Element {
  return (
    <nav className="activity-bar">
      {props.items.map((item) => (
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
