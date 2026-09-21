/**
 * 左栏菜单栏（两栏布局）：48px 图标 rail ↔ ~220px 图标+文字展开态，瞬时切换（禁 width 过渡）。
 * 纯导航不承载内容：菜单项选中态切换右栏页面（rightRoute），toggle 项开/关浮窗（aria-pressed）。
 * 底部固定：设置入口 + 用户占位区（品牌标 + 版本号，无用户体系不造假入口）。
 * 能力沿袭 ActivityBar：徽标（数字 99+ / dot）、data-tip 自绘 tooltip（仅收起态）、左缘激活指示条。
 */
import { AppIcon, type IconComponent } from './ui/AppIcon'
import { IconLogo, IconPanelCollapse, IconPanelExpand } from './icons'

// electron-vite renderer define 注入（electron.vite.config.ts），构建期常量
declare const __APP_VERSION__: string

/** 徽标：数字（>99 折叠为 99+）或无数圆点 */
export interface SideMenuBadge {
  count?: number
  dot?: boolean
}

export interface SideMenuItem {
  id: string
  icon: IconComponent
  title: string
  badge?: SideMenuBadge
}

function MenuButton(props: {
  item: SideMenuItem
  active: boolean
  expanded: boolean
  onChange: (id: string) => void
}): React.JSX.Element {
  const { item, active, expanded, onChange } = props
  const badge = item.badge
  const showCount = typeof badge?.count === 'number' && badge.count > 0
  const showDot = badge?.dot === true && !showCount
  return (
    <button
      type="button"
      className={`menu-item${active ? ' active' : ''}`}
      data-tip={item.title}
      aria-label={item.title}
      aria-current={active ? 'page' : undefined}
      onClick={() => onChange(item.id)}
    >
      <AppIcon icon={item.icon} size="md" />
      {expanded && <span className="menu-label">{item.title}</span>}
      {(showCount || showDot) && (
        <span className={`menu-badge${showDot ? ' dot' : ''}`} aria-hidden="true">
          {showCount ? (badge && badge.count !== undefined && badge.count > 99 ? '99+' : badge?.count) : ''}
        </span>
      )}
    </button>
  )
}

export function SideMenu(props: {
  expanded: boolean
  onToggleExpanded: () => void
  items: SideMenuItem[]
  /** toggle 型 item（浮窗开关）：激活态=浮窗打开，区别于菜单选中态 */
  toggleItems?: SideMenuItem[]
  openToggleKeys?: Set<string>
  onToggle?: (id: string) => void
  /** 底部固定分组（设置入口） */
  tailItems?: SideMenuItem[]
  active: string
  onChange: (id: string) => void
}): React.JSX.Element {
  const { expanded } = props
  const render = (item: SideMenuItem): React.JSX.Element => (
    <MenuButton key={item.id} item={item} active={item.id === props.active} expanded={expanded} onChange={props.onChange} />
  )
  const renderToggle = (item: SideMenuItem): React.JSX.Element => {
    const open = props.openToggleKeys?.has(item.id) ?? false
    return (
      <button
        key={item.id}
        type="button"
        className={`menu-item${open ? ' active' : ''}`}
        data-tip={item.title}
        aria-label={item.title}
        aria-pressed={open}
        onClick={() => props.onToggle?.(item.id)}
      >
        <AppIcon icon={item.icon} size="md" />
        {expanded && <span className="menu-label">{item.title}</span>}
      </button>
    )
  }
  return (
    <nav className={`side-menu${expanded ? ' expanded' : ''}`} aria-label="主菜单">
      <div className="menu-group">
        <button
          type="button"
          className="menu-item menu-toggle"
          data-tip={expanded ? undefined : '展开菜单'}
          aria-label={expanded ? '收起菜单' : '展开菜单'}
          aria-expanded={expanded}
          onClick={props.onToggleExpanded}
        >
          <AppIcon icon={expanded ? IconPanelCollapse : IconPanelExpand} size="md" />
          {expanded && <span className="menu-label">收起</span>}
        </button>
        {props.items.map(render)}
      </div>
      {props.toggleItems && props.toggleItems.length > 0 && (
        <div className="menu-group">{props.toggleItems.map(renderToggle)}</div>
      )}
      <div className="menu-group tail">
        {props.tailItems?.map(render)}
        <div className="menu-user" aria-label="应用信息">
          <IconLogo width={expanded ? 42 : 26} height={expanded ? 21 : 13} />
          {expanded && (
            <span className="menu-user-meta">
              <strong>wuh-site</strong>
              <span className="menu-user-version">v{__APP_VERSION__}</span>
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}
