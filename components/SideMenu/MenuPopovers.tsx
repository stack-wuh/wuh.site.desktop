'use client'

/**
 * 侧栏菜单弹出面板（拆分自 SideMenu 单文件，20260926-refactor-mega-component-split）：
 * PopSubmenu（二级 popover，主题/外观/语言共用，menuitemradio 勾选态）与
 * UserQuickPanel（设置项悬停快捷面板，仅展开态弹出）。nav 不设 overflow:hidden
 * 的弹出契约在此类面板的定位注释中原样保留。
 */
import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../ui/AppIcon'
import { IconCheck, IconChevronRight } from '../icons'
import { useTheme, type SchemeSetting } from '../theme/ThemeProvider'
import type { ThemeFamily } from '../theme/tokens'
import { useLocale } from '../../lib/i18n/context'
import { localeLabels, localeOrder, type Locale } from '../../lib/i18n/locales'
import { PopGroup, PopItem, SubAnchor, SubPop, UserPop } from './styles'

/** 二级 popover 行：hover/聚焦弹出手风琴选项（menuitemradio，当前项勾选），主题/外观/语言共用 */
export function PopSubmenu(props: {
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

/** 设置项的悬停快捷面板（20260925-feature-sidemenu-settings-consolidation 自用户入口迁来）：
 * 仅主题/外观/语言三组二级 popover——「收起/展开菜单」行退役（展开态右缘收起旋钮 +
 * 收起态点击展开已双向覆盖；⌘/Ctrl+B 全局快捷键不变）；面板仅展开态弹出，
 * 收起态保留 data-tip 单一职责（tooltip 与面板同锚右侧会重叠）。 */
export function UserQuickPanel(props: {
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
    <UserPop role="menu" aria-label={t('pop.quickAria')} onClick={(e) => e.stopPropagation()}>
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
    </UserPop>
  )
}
