'use client'

/**
 * 左栏菜单栏（两栏布局）：48px 图标 rail ↔ ~220px 图标+文字展开态，瞬时切换（禁 width 过渡）。
 * 纯导航不承载内容：菜单项选中态切换右栏页面（路由段），toggle 项开/关浮窗（aria-pressed）。
 * 底部固定：设置入口 + 用户占位区（品牌标 + 版本号，无用户体系不造假入口）。
 * 能力沿袭：徽标（数字 99+ / dot）、data-tip 自绘 tooltip（仅收起态）、左缘激活指示条。
 */
import { useEffect, useRef, useState } from 'react'
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
        <strong>{t('pop.user')}</strong>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          v{APP_VERSION} · {t('pop.userHint')}
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
    <MenuButton key={item.id} item={item} active={item.id === props.active} expanded={expanded} onChange={props.onChange} />
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
      {/* 底部系统区：仅用户入口（展开/收起控件已并入其快捷面板，快捷键 Cmd/Ctrl+B 常驻） */}
      <Group $expanded={expanded} $tail>
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
                  <strong>wuh-site</strong>
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
              />
            )}
          </UserAnchor>
        </UserWrap>
      </Group>
    </Nav>
  )
}
