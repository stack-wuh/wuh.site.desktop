'use client'

/**
 * Rail（工作台壳层导航列，20261015-feature-workbench-shell）：恒 48px 图标列，
 * 取代 SideMenu 双形态菜单（展开态退役，文字导航让位 ⌘K 命令面板）。
 * 结构：顶部主导航项（激活指示/徽标/data-tip）→ 插件条目（popover 呈现 main
 * 视图导航 + 浮窗开关，复用 PluginTree 行语义；无独立路由页，点 popover 行即
 * 导航/开关并收起）→ 底部系统区两项【用户 / 设置】（纯导航直达 /account 与
 * /settings）。点外关走 target 归属守卫（20260924-fix-capsule-self-close 先例，
 * 禁传播时序判断）；Esc 只关本组件 popover，与其他浮层分治。
 */
import { useEffect, useRef, useState } from 'react'
import { AppIcon, type IconComponent } from '../ui/AppIcon'
import { IconLogo, IconPuzzle, IconSettings } from '../icons'
import { useLocale } from '../../lib/i18n/context'
import { PluginTree, type PluginTreeViewRef } from '../menu/PluginTree'
import { Badge, BottomGroup, Nav, PluginsWrap, PopCard, RailBtn } from './styles'

export interface RailBadge {
  count?: number
  dot?: boolean
}

export interface RailItem {
  id: string
  icon: IconComponent
  title: string
  badge?: RailBadge
}

function BadgeView(props: { badge?: RailBadge }): React.JSX.Element | null {
  const { badge } = props
  const showCount = typeof badge?.count === 'number' && badge.count > 0
  const showDot = badge?.dot === true && !showCount
  if (!showCount && !showDot) return null
  return (
    <Badge aria-hidden="true">
      {showCount ? (badge && badge.count !== undefined && badge.count > 99 ? '99+' : badge?.count) : ''}
    </Badge>
  )
}

export function Rail(props: {
  items: RailItem[]
  active: string
  onChange: (id: string) => void
  /** 插件条目数据：main 视图导航 + 浮窗开关（layout 按 hostGeneration 刷新传入） */
  plugins: {
    mainViews: PluginTreeViewRef[]
    floatViews: PluginTreeViewRef[]
    openKeys: Set<string>
    onToggleFloat: (key: string) => void
  }
  userActive?: boolean
  settingsActive?: boolean
  onOpenUser: () => void
  onOpenSettings: () => void
}): React.JSX.Element {
  const { t } = useLocale()
  const [pluginsOpen, setPluginsOpen] = useState(false)
  /** 根引用：点外关豁免 rail 内部点击（chip 同款 target 归属守卫） */
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!pluginsOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPluginsOpen(false)
    }
    const onClick = (e: MouseEvent): void => {
      const el = rootRef.current
      if (el && e.target instanceof Node && el.contains(e.target)) return
      setPluginsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
    }
  }, [pluginsOpen])

  const pluginCount = props.plugins.mainViews.length + props.plugins.floatViews.length

  return (
    <Nav ref={rootRef} data-chrome="rail" aria-label={t('menu.navAria')}>
      {props.items.map((item) => (
        <RailBtn
          key={item.id}
          type="button"
          $active={props.active === item.id}
          data-tip={item.title}
          aria-label={item.title}
          aria-current={props.active === item.id ? 'page' : undefined}
          onClick={() => props.onChange(item.id)}
        >
          <AppIcon icon={item.icon} size="md" />
          <BadgeView badge={item.badge} />
        </RailBtn>
      ))}

      {/* 插件条目：popover 承载 main 视图导航与浮窗开关（原 SideMenu 插件子树迁移） */}
      <PluginsWrap>
        <RailBtn
          type="button"
          $active={props.active.startsWith('plugin:')}
          data-tip={t('menu.plugins')}
          aria-label={t('menu.plugins')}
          aria-haspopup="true"
          aria-expanded={pluginsOpen}
          onClick={() => setPluginsOpen((v) => !v)}
        >
          <AppIcon icon={IconPuzzle} size="md" />
          {pluginCount > 0 && <Badge aria-hidden="true">{pluginCount}</Badge>}
        </RailBtn>
        {pluginsOpen && (
          <PopCard
            aria-label={t('menu.plugins')}
            onClickCapture={() => setPluginsOpen(false)}
          >
            <PluginTree
              mainViews={props.plugins.mainViews}
              floatViews={props.plugins.floatViews}
              openKeys={props.plugins.openKeys}
              onToggle={props.plugins.onToggleFloat}
            />
          </PopCard>
        )}
      </PluginsWrap>

      <BottomGroup>
        <RailBtn
          type="button"
          $active={props.userActive === true}
          data-tip={t('menu.userAria')}
          aria-label={t('menu.userAria')}
          aria-current={props.userActive ? 'page' : undefined}
          onClick={props.onOpenUser}
        >
          {/* 壳层禁止渲染远程头像图片：品牌标即头像占位（shell-chrome-design 卡） */}
          <AppIcon icon={IconLogo} size="md" />
        </RailBtn>
        <RailBtn
          type="button"
          $active={props.settingsActive === true}
          data-tip={t('menu.settings')}
          aria-label={t('menu.settings')}
          aria-current={props.settingsActive ? 'page' : undefined}
          onClick={props.onOpenSettings}
        >
          <AppIcon icon={IconSettings} size="md" />
        </RailBtn>
      </BottomGroup>
    </Nav>
  )
}
