'use client'

/**
 * 左栏菜单栏（两栏布局）：48px 图标 rail ↔ ~220px 图标+文字展开态，瞬时切换（禁 width 过渡）。
 * 纯导航不承载内容：菜单项选中态切换右栏页面（路由段），toggle 项开/关浮窗（aria-pressed）。
 * 底部固定：用户入口（已授权投影 GitHub 头像/用户名，未授权回落品牌标 + 应用名，数据来自全局身份 store）。
 * 能力沿袭：徽标（数字 99+ / dot）、data-tip 自绘 tooltip（仅收起态）、左缘激活指示条、
 * 条目子树（20260924 走查反馈修订：行尾旋钮展开子树，如左栏项目树，旋钮不冒泡导航）。
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { AppIcon, type IconComponent } from './ui/AppIcon'
import {
  IconCheck,
  IconChevronRight,
  IconLogo,
  IconPanelCollapse,
  IconPanelExpand,
  IconSettings
} from './icons'
import { useTheme, type SchemeSetting } from './theme/ThemeProvider'
import type { ThemeFamily } from './theme/tokens'
import { useLocale } from '../lib/i18n/context'
import { localeLabels, localeOrder, type Locale } from '../lib/i18n/locales'
import { useGithubIdentity } from '../lib/identity'
import { BUILD_TIME, formatBuildTimeShort } from '../lib/buildInfo'

// 构建期内联应用版本（next.config.ts env，NEXT_PUBLIC_ 前缀），不走 preload/broker 通道
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'
// 构建时间短格式与版本并排展示：显示值与当前会话对不上 = 渲染层是旧页面
const BUILD_TIME_SHORT = formatBuildTimeShort(BUILD_TIME)

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

const Nav = styled.nav<{ $expanded: boolean }>`
  width: ${(props) => (props.$expanded ? '220px' : '48px')};
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  background: var(--background-color);
  border-right: 1px solid var(--chrome-border);
  /* 不设 overflow:hidden：tooltip 与用户快捷面板需溢出 rail 显示 */
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

const Group = styled.div<{ $expanded: boolean; $tail?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 6px;
  align-items: stretch;

  ${(props) =>
    !props.$expanded &&
    `
    align-items: center;
    gap: 4px;
    padding: 0;
  `}

  /* tail 组吸附底部：设置入口 + 用户占位区 */
  ${(props) =>
    props.$tail &&
    `
    margin-top: auto;
  `}
`

const Item = styled.button<{ $expanded: boolean; $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-base);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--transition-fast) ease,
    background var(--transition-fast) ease;

  ${(props) =>
    props.$expanded &&
    `
    width: auto;
    height: 36px;
    justify-content: flex-start;
    gap: 10px;
    padding: 0 10px;
  `}

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  ${(props) =>
    props.$active &&
    `
    color: var(--primary-color);
    background: color-mix(in oklab, var(--primary-color) 12%, transparent);

    /* 左缘激活指示条（贴 rail 左缘） */
    &::before {
      background: var(--primary-color);
    }
  `}

  /* 指示条槽位（默认透明） */
  &::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    border-radius: 1px;
    background: transparent;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  /* 自绘 tooltip：仅收起态（展开态已有文字标签），hover/键盘聚焦可见 */
  ${(props) =>
    !props.$expanded &&
    `
    &::after {
      content: attr(data-tip);
      position: absolute;
      left: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
      padding: 4px 10px;
      border-radius: var(--border-radius-sm);
      background: var(--chrome-raised);
      border: 1px solid var(--chrome-border);
      color: var(--text-primary);
      font-size: 12px;
      font-family: var(--font-sans);
      white-space: nowrap;
      box-shadow: var(--elevation-soft);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-fast) ease;
      z-index: 60;
    }

    &:hover::after,
    &:focus-visible::after {
      opacity: 1;
    }
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::after {
      transition: none;
    }
  }
`

const labelIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

/** 条目子树容器：仅展开态渲染在条目行下方；高度封顶自滚动，避免撑破 nav（nav 不设 overflow） */
const TreeWrap = styled.div`
  margin: 0 2px 4px;
  max-height: min(52vh, 560px);
  overflow-y: auto;
  overscroll-behavior: contain;
`

/** 子树展开旋钮：span 仿按钮（Item 本体是 button，避免 button 嵌套），点击不冒泡到条目导航 */
const TreeKnob = styled.span<{ $open: boolean }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    background var(--transition-fast) ease,
    color var(--transition-fast) ease;
  transform: rotate(${(props) => (props.$open ? 90 : 0)}deg);

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Label = styled.span`
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 13px;
  font-family: var(--font-sans);
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 展开态文字仅 opacity 淡入（布局切换本身瞬时，遵守禁 width 过渡约束） */
  animation: ${labelIn} 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Badge = styled.span<{ $dot: boolean; $expanded: boolean }>`
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--primary-color);
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  font-weight: 700;
  text-align: center;

  ${(props) =>
    props.$expanded
      ? `
    position: static;
    flex-shrink: 0;
  `
      : `
    position: absolute;
    top: 4px;
    right: 3px;
  `}

  ${(props) =>
    props.$dot &&
    `
    width: 8px;
    min-width: 8px;
    padding: 0;
    ${props.$expanded ? '' : 'top: 6px; right: 5px;'}
  `}
`

/* 用户入口（底部单一入口，取代「设置项 + 品牌占位区」两栏）：
   品牌标作为头像占位；点击进入设置页（用户模块接入前的替身），悬停/聚焦弹出快捷面板 */
const UserAnchor = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
`

const User = styled.button<{ $expanded: boolean; $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$expanded ? 'flex-start' : 'center')};
  gap: 10px;
  width: 100%;
  height: 42px;
  padding: ${(props) => (props.$expanded ? '0 10px' : '0 4px')};
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: background var(--transition-fast) ease;

  &:hover,
  &:focus-visible {
    background: var(--chrome-hover);
    outline: none;
  }

  ${(props) =>
    props.$active &&
    `
    background: color-mix(in oklab, var(--primary-color) 12%, transparent);
    color: var(--primary-color);
  `}
`

const UserWrap = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
  padding-top: 6px;
  border-top: 1px solid var(--chrome-border);
`

/* 悬停快捷面板：底部入口右侧弹出（nav 不得 overflow:hidden，否则被裁剪） */
const UserPop = styled.div`
  position: absolute;
  bottom: 0;
  left: calc(100% + 8px);
  z-index: 70;
  min-width: 200px;
  padding: 6px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
`

const PopHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--chrome-border);

  & > strong {
    font-size: 13px;
    color: var(--text-primary);
  }
`

const PopGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;

  & + & {
    border-top: 1px solid var(--chrome-border);
  }
`

const PopHint = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  flex-shrink: 0;
`

const PopItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  padding: 5px 10px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  text-align: left;

  &:hover:not(:disabled) {
    background: var(--chrome-hover);
  }

  &:disabled {
    color: var(--text-muted);
    cursor: default;
  }

  & > svg,
  & > span.icon {
    color: var(--primary-color);
  }
`

const UserMeta = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  animation: ${labelIn} 200ms ease-out;

  & > strong {
    font-size: 12px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** GitHub 头像不再入壳层：远程图片（avatars.githubusercontent.com）网络不可靠时常破损，
 * 图标恒为品牌标，头像显示待 Settings「用户设置」本地接管；此处仅保留用户名文本投影。 */

/** 快捷面板头部的身份行：仅用户名文本（未授权时回落「用户」标题） */
const PopIdentity = styled.span`
  display: flex;
  align-items: center;
  min-width: 0;

  & > strong {
    font-size: 13px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const UserVersion = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

/* 二级 popover：锚定触发行右侧（锚点相对定位，nav 不设 overflow:hidden 不裁剪） */
const SubAnchor = styled.div`
  position: relative;
`

const SubPop = styled.div`
  position: absolute;
  top: 0;
  left: calc(100% + 8px);
  z-index: 80;
  min-width: 128px;
  padding: 6px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
`

/** 二级 popover 行：hover/聚焦弹出手风琴选项（menuitemradio，当前项勾选），主题/外观/语言共用 */
function PopSubmenu(props: {
  label: string
  items: { key: string; label: string; checked: boolean; onSelect: () => void }[]
  /** 选中后是否关闭整个快捷面板（语言=是；主题/外观=否，便于连续试选） */
  closeOnSelect?: boolean
  onPanelClose?: () => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openNow = (): void => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setOpen(true)
  }
  /** 延迟关闭：允许指针移入二级 popover（与面板 180ms 语义一致） */
  const scheduleClose = (): void => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      setOpen(false)
    }, 180)
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  return (
    <SubAnchor onMouseEnter={openNow} onMouseLeave={scheduleClose} onFocus={openNow} onBlur={scheduleClose}>
      <PopItem
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {props.label}
        <span style={{ display: 'inline-flex' }}>
          <AppIcon icon={IconChevronRight} size="sm" />
        </span>
      </PopItem>
      {open && (
        <SubPop role="menu" aria-label={props.label} onClick={(e) => e.stopPropagation()}>
          {props.items.map((item) => (
            <PopItem
              key={item.key}
              role="menuitemradio"
              aria-checked={item.checked}
              onClick={() => {
                item.onSelect()
                if (props.closeOnSelect) {
                  setOpen(false)
                  props.onPanelClose?.()
                }
              }}
            >
              {item.label}
              {item.checked && <AppIcon icon={IconCheck} size="sm" />}
            </PopItem>
          ))}
        </SubPop>
      )}
    </SubAnchor>
  )
}

/** 用户入口的悬停快捷面板：主题/外观/语言均为二级 popover 行 */
function UserQuickPanel(props: {
  expanded: boolean
  onToggleExpanded: () => void
  /** 面板头部/品牌区点击：进入用户中心 */
  onOpenUser: () => void
  onOpenSettings: () => void
  onClose: () => void
  /** 已授权身份的文本投影（null = 未授权，头部回落「用户」标题） */
  displayName: string | null
}): React.JSX.Element {
  const { t, locale, setLocale } = useLocale()
  const { family, scheme, setFamily, setScheme } = useTheme()

  const families: { id: ThemeFamily; label: string }[] = [
    { id: 'wine', label: t('pop.themeWine') },
    { id: 'plain', label: t('pop.themePlain') }
  ]
  const schemes: { id: SchemeSetting; label: string }[] = [
    { id: 'system', label: t('pop.system') },
    { id: 'light', label: t('pop.light') },
    { id: 'dark', label: t('pop.dark') }
  ]
  return (
    <UserPop role="menu" aria-label={t('pop.user')} onClick={(e) => e.stopPropagation()}>
      <PopHead>
        <PopIdentity>
          <strong>{props.displayName ?? t('pop.user')}</strong>
        </PopIdentity>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {`v${APP_VERSION}${BUILD_TIME_SHORT ? ` · ${BUILD_TIME_SHORT}` : ''} · ${t('pop.userHint')}`}
        </span>
      </PopHead>
      <PopGroup role="group" aria-label={t('pop.theme')}>
        <PopSubmenu
          label={t('pop.theme')}
          items={families.map((f) => ({
            key: f.id,
            label: f.label,
            checked: family === f.id,
            onSelect: () => setFamily(f.id)
          }))}
        />
      </PopGroup>
      <PopGroup role="group" aria-label={t('pop.appearance')}>
        <PopSubmenu
          label={t('pop.appearance')}
          items={schemes.map((s) => ({
            key: s.id,
            label: s.label,
            checked: scheme === s.id,
            onSelect: () => setScheme(s.id)
          }))}
        />
      </PopGroup>
      <PopGroup role="group" aria-label={t('pop.language')}>
        <PopSubmenu
          label={t('pop.language')}
          closeOnSelect
          onPanelClose={props.onClose}
          items={localeOrder.map((id: Locale) => ({
            key: id,
            label: localeLabels[id].native,
            checked: locale === id,
            onSelect: () => setLocale(id)
          }))}
        />
      </PopGroup>
      <PopGroup>
        <PopItem
          role="menuitem"
          onClick={() => {
            props.onToggleExpanded()
            props.onClose()
          }}
        >
          <span className="icon" style={{ display: 'inline-flex' }}>
            <AppIcon icon={props.expanded ? IconPanelCollapse : IconPanelExpand} size="sm" />
          </span>
          {props.expanded ? t('pop.collapseMenu') : t('pop.expandMenu')}
          <PopHint>⌘/Ctrl+B</PopHint>
        </PopItem>
        <PopItem
          role="menuitem"
          onClick={() => {
            props.onOpenSettings()
            props.onClose()
          }}
        >
          <span className="icon" style={{ display: 'inline-flex' }}>
            <AppIcon icon={IconSettings} size="sm" />
          </span>
          {t('pop.settings')}
        </PopItem>
      </PopGroup>
    </UserPop>
  )
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
          aria-label={t('projects.treeToggle')}
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
  /** toggle 型 item（浮窗开关）：激活态=浮窗打开，区别于菜单选中态 */
  toggleItems?: SideMenuItem[]
  openToggleKeys?: Set<string>
  onToggle?: (id: string) => void
  active: string
  onChange: (id: string) => void
  /** 用户入口点击去向（用户中心 /account） */
  onOpenUser: () => void
  /** 快捷面板「设置」项去向（应用设置 /settings） */
  onOpenSettings: () => void
  /** 当前处于用户入口对应页面（用户中心）时高亮 */
  userActive?: boolean
}): React.JSX.Element {
  const { expanded } = props
  const { t } = useLocale()
  const identity = useGithubIdentity()
  // 文本投影（用户名/问候）无网络依赖；头像 img 已回退——远程图片网络不可靠（见 PopIdentity 注）
  const authed = identity != null && !identity.stale
  const displayName = authed && identity ? identity.name || identity.login : null
  const [userOpen, setUserOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openUser = (): void => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setUserOpen(true)
  }
  /** 延迟关闭：允许指针从入口移入面板 */
  const scheduleCloseUser = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setUserOpen(false)
    }, 180)
  }
  useEffect(() => {
    if (!userOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setUserOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [userOpen])
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
  const renderToggle = (item: SideMenuItem): React.JSX.Element => {
    const open = props.openToggleKeys?.has(item.id) ?? false
    return (
      <Item
        key={item.id}
        type="button"
        $expanded={expanded}
        $active={open}
        data-tip={item.title}
        aria-label={item.title}
        aria-pressed={open}
        onClick={() => props.onToggle?.(item.id)}
      >
        <AppIcon icon={item.icon} size="md" />
        {expanded && <Label>{item.title}</Label>}
      </Item>
    )
  }
  return (
    <Nav $expanded={expanded} aria-label={t('menu.navAria')}>
      <Group $expanded={expanded}>{props.items.map(render)}</Group>
      {props.toggleItems && props.toggleItems.length > 0 && (
        <Group $expanded={expanded}>{props.toggleItems.map(renderToggle)}</Group>
      )}
      {/* 底部系统区两行制（20260924-feature-sidemenu-bottom-toggle；走查修订：
          展开钮在上、**用户入口 IconLogo 恒为底部最后一项**——设置/用户区永远
          占底，不被任何图标压在下发）。收起态展开钮一击直达展开菜单（复用导航项
          样式基命中区 + tooltip 复合快捷键提示）；展开态不渲染该钮，收起仍走
          快捷面板行与 ⌘/Ctrl+B；用户入口行为不变（hover 快捷面板 / 点击 /account） */}
      <Group $expanded={expanded} $tail>
        {!expanded && (
          <Item
            type="button"
            $expanded={expanded}
            $active={false}
            data-tip={`${t('pop.expandMenu')} ⌘/Ctrl+B`}
            aria-label={t('pop.expandMenu')}
            onClick={props.onToggleExpanded}
          >
            <AppIcon icon={IconPanelExpand} size="md" />
          </Item>
        )}
        <UserWrap $expanded={expanded}>
          <UserAnchor
            onMouseEnter={openUser}
            onMouseLeave={scheduleCloseUser}
            onFocus={openUser}
            onBlur={scheduleCloseUser}
          >
            <User
              type="button"
              $expanded={expanded}
              $active={props.userActive === true}
              aria-label={t('menu.userAria')}
              aria-haspopup="menu"
              aria-expanded={userOpen}
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
            {userOpen && (
              <UserQuickPanel
                expanded={expanded}
                onToggleExpanded={props.onToggleExpanded}
                onOpenUser={props.onOpenUser}
                onOpenSettings={props.onOpenSettings}
                onClose={() => setUserOpen(false)}
                displayName={displayName}
              />
            )}
          </UserAnchor>
        </UserWrap>
      </Group>
    </Nav>
  )
}
