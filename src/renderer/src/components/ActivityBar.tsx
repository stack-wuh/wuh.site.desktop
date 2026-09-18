import { AppIcon, type IconComponent } from './ui/AppIcon'

/** 徽标：数字（>99 折叠为 99+）或无数圆点 */
export interface ActivityBadge {
  count?: number
  dot?: boolean
}

export interface ActivityItem {
  id: string
  icon: IconComponent
  title: string
  badge?: ActivityBadge
}

function ActivityButton(props: {
  item: ActivityItem
  active: boolean
  onChange: (id: string) => void
}): React.JSX.Element {
  const { item, active, onChange } = props
  const badge = item.badge
  const showCount = typeof badge?.count === 'number' && badge.count > 0
  const showDot = badge?.dot === true && !showCount
  return (
    <button
      type="button"
      className={`activity-item${active ? ' active' : ''}`}
      data-tip={item.title}
      aria-label={item.title}
      aria-pressed={active}
      onClick={() => onChange(item.id)}
    >
      <AppIcon icon={item.icon} size="md" />
      {(showCount || showDot) && (
        <span className={`activity-badge${showDot ? ' dot' : ''}`} aria-hidden="true">
          {showCount ? (badge && badge.count !== undefined && badge.count > 99 ? '99+' : badge?.count) : ''}
        </span>
      )}
    </button>
  )
}

export function ActivityBar(props: {
  items: ActivityItem[]
  /** 固定底部分组（如设置） */
  tailItems?: ActivityItem[]
  active: string
  onChange: (id: string) => void
}): React.JSX.Element {
  const render = (item: ActivityItem): React.JSX.Element => (
    <ActivityButton key={item.id} item={item} active={item.id === props.active} onChange={props.onChange} />
  )
  return (
    <nav className="activity-bar" aria-label="侧栏切换">
      <div className="activity-group">{props.items.map(render)}</div>
      {props.tailItems && <div className="activity-group tail">{props.tailItems.map(render)}</div>}
    </nav>
  )
}
