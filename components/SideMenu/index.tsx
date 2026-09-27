'use client'

/**
 * 左栏菜单栏（两栏布局）：48px 图标 rail ↔ ~220px 图标+文字展开态，瞬时切换（禁 width 过渡）。
 * 纯导航不承载内容：菜单项选中态切换右栏页面（路由段）。
 * 底部固定：用户入口（点击直达 /account，纯导航；已授权展开态投影 GitHub 用户名，未授权回落
 * 应用名，数据来自全局身份 store）+ 设置项（20260925-feature-sidemenu-settings-consolidation
 * 三态交互：收起态图标为右箭头、点击仅展开菜单；展开态左 Setting 图标直达 /settings、右缘
 * 收起旋钮收起菜单，hover/聚焦弹出外观与语言快捷面板——面板实现在 ./MenuPopovers，
 * 样式原子在 ./styles——20260926-refactor-mega-component-split 拆分）。
 * 能力沿袭：徽标（数字 99+ / dot）、data-tip 自绘 tooltip（仅收起态）、左缘激活指示条、
 * 条目子树（行尾旋钮展开子树，如左栏项目树/插件树，旋钮不冒泡导航）。
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import { AppIcon, type IconComponent } from '../ui/AppIcon'
import { IconChevronRight, IconLogo, IconPanelCollapse, IconSettings } from '../icons'
import { useLocale } from '../../lib/i18n/context'
import { useGithubIdentity } from '../../lib/identity'
import {
  Badge,
  Group,
  Item,
  Label,
  Nav,
  PopAnchor,
  TreeKnob,
  TreeWrap,
  User,
  UserMeta,
  UserVersion,
  UserWrap
} from './styles'
import { UserQuickPanel } from './MenuPopovers'

// 构建期内联应用版本（next.config.ts env，NEXT_PUBLIC_ 前缀），不走 preload/broker 通道
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

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
  /** 展开态下条目下方附加渲染的子树（如左栏项目树）；rail 收起态不渲染，条目回落纯导航 */
  tree?: React.ReactNode
  /** 子树展开态（受控，状态在调用方持有） */
  treeOpen?: boolean
  /** 行尾旋钮点击：只切换子树显隐，不触发 onChange 导航 */
  onToggleTree?: () => void
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
  const hasTree = expanded && item.tree != null
  const { t } = useLocale()
  /** 旋钮点击不冒泡到条目（避免既切子树又导航）；键盘 Enter/Space 等价点击 */
  const onKnobToggle = (e: React.SyntheticEvent): void => {
    e.stopPropagation()
    item.onToggleTree?.()
  }
  const onKnobKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onKnobToggle(e)
    }
  }
  return (
    <Item
      type="button"
      $expanded={expanded}
      $active={active}
      data-tip={item.title}
      aria-label={item.title}
      aria-current={active ? 'page' : undefined}
      onClick={() => onChange(item.id)}
    >
      <AppIcon icon={item.icon} size="md" />
      {expanded && <Label>{item.title}</Label>}
      {hasTree && (
        <TreeKnob
          $open={item.treeOpen === true}
          role="button"
          tabIndex={0}
          aria-label={t('menu.treeToggle')}
          aria-expanded={item.treeOpen === true}
          onClick={onKnobToggle}
          onKeyDown={onKnobKey}
        >
          <AppIcon icon={IconChevronRight} size="xs" decorative />
        </TreeKnob>
      )}
      {(showCount || showDot) && (
        <Badge $dot={showDot} $expanded={expanded} aria-hidden="true">
          {showCount ? (badge && badge.count !== undefined && badge.count > 99 ? '99+' : badge?.count) : ''}
        </Badge>
      )}
    </Item>
  )
}

export function SideMenu(props: {
  expanded: boolean
  onToggleExpanded: () => void
  items: SideMenuItem[]
  active: string
  onChange: (id: string) => void
  /** 用户入口点击去向（用户中心 /account） */
  onOpenUser: () => void
  /** 底部「设置」项去向（应用设置 /settings，展开态点击） */
  onOpenSettings: () => void
  /** 当前处于用户入口对应页面（用户中心）时高亮 */
  userActive?: boolean
  /** 当前处于 /settings 时高亮底部设置项 */
  settingsActive?: boolean
}): React.JSX.Element {
  const { expanded } = props
  const { t } = useLocale()
  const identity = useGithubIdentity()
  // 文本投影（用户名/问候）无网络依赖；头像 img 已回退——远程图片网络不可靠（见 PopIdentity 注）
  const authed = identity != null && !identity.stale
  const displayName = authed && identity ? identity.name || identity.login : null
  // 快捷面板开合：挂设置项（仅展开态弹出；180ms 延迟关允许指针移入面板）
  const [settingsPopOpen, setSettingsPopOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openSettingsPop = (): void => {
    if (!expanded) return
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setSettingsPopOpen(true)
  }
  const scheduleCloseSettings = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setSettingsPopOpen(false)
    }, 180)
  }
  useEffect(() => {
    if (!settingsPopOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setSettingsPopOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsPopOpen])
  // 展开态切换时收面板（收起态不承载面板）
  useEffect(() => {
    if (!expanded) setSettingsPopOpen(false)
  }, [expanded])
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  const render = (item: SideMenuItem): React.JSX.Element => (
    <Fragment key={item.id}>
      <MenuButton item={item} active={item.id === props.active} expanded={expanded} onChange={props.onChange} />
      {/* 子树仅展开态挂载（关闭即卸载，重开时懒加载刷新）；rail 收起态不渲染 */}
      {expanded && item.tree != null && item.treeOpen === true && <TreeWrap>{item.tree}</TreeWrap>}
    </Fragment>
  )
  /** 收起旋钮：不冒泡到条目（避免收起菜单的同时导航 /settings）；键盘 Enter/Space 等价点击 */
  const onKnobCollapse = (e: React.SyntheticEvent): void => {
    e.stopPropagation()
    props.onToggleExpanded()
  }
  const onKnobKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onKnobCollapse(e)
    }
  }
  return (
    <Nav $expanded={expanded} aria-label={t('menu.navAria')}>
      <Group $expanded={expanded}>{props.items.map(render)}</Group>
      {/* 底部系统区两项制（20260925-feature-sidemenu-settings-consolidation 重分工）：
          【用户】在上（纯导航直达 /account，快捷面板已迁走）、【设置】在下（收起态图标
          右箭头、点击仅展开菜单；展开态左 Setting 直达 /settings、右缘收起旋钮收起菜单；
          hover/聚焦弹外观与语言面板，仅展开态）。⌘/Ctrl+B 全局不变 */}
      <Group $expanded={expanded} $tail>
        <UserWrap $expanded={expanded}>
          <User
            type="button"
            $expanded={expanded}
            $active={props.userActive === true}
            aria-label={t('menu.userAria')}
            data-active={props.userActive === true ? 'true' : undefined}
            onClick={props.onOpenUser}
          >
            <IconLogo width={expanded ? 42 : 26} height={expanded ? 21 : 13} />
            {expanded && (
              <UserMeta>
                <strong>{displayName ?? 'wuh-site'}</strong>
                <UserVersion>v{APP_VERSION}</UserVersion>
              </UserMeta>
            )}
          </User>
        </UserWrap>
        <PopAnchor
          onMouseEnter={openSettingsPop}
          onMouseLeave={scheduleCloseSettings}
          onFocus={openSettingsPop}
          onBlur={scheduleCloseSettings}
        >
          <Item
            type="button"
            $expanded={expanded}
            $active={props.settingsActive === true}
            data-tip={`${t('menu.settings')} · ${t('pop.expandMenu')}`}
            aria-label={t('menu.settings')}
            aria-current={props.settingsActive === true ? 'page' : undefined}
            onClick={() => (expanded ? props.onOpenSettings() : props.onToggleExpanded())}
          >
            <AppIcon icon={expanded ? IconSettings : IconChevronRight} size="md" />
            {expanded && <Label>{t('menu.settings')}</Label>}
            {expanded && (
              <TreeKnob
                $open={false}
                role="button"
                tabIndex={0}
                aria-label={t('pop.collapseMenu')}
                onClick={onKnobCollapse}
                onKeyDown={onKnobKey}
              >
                <AppIcon icon={IconPanelCollapse} size="xs" decorative />
              </TreeKnob>
            )}
          </Item>
          {expanded && settingsPopOpen && <UserQuickPanel onClose={() => setSettingsPopOpen(false)} />}
        </PopAnchor>
      </Group>
    </Nav>
  )
}
