// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { SideMenu, type SideMenuItem } from '../components/SideMenu'
import { IconCheck } from '../components/icons'
import { LocaleProvider } from '../lib/i18n/context'

/**
 * SideMenu 底部系统区两项制（20260924-feature-sidemenu-settings-item）：
 * 【用户】在上（点击 /account、hover 快捷面板）、【设置】在下（收起态点击仅
 * 展开菜单不导航；展开态直达 /settings 且 settingsActive 高亮）；收起态专属
 * 展开钮退役；快捷面板瘦身（无身份头部、无「设置」行，三组二级 popover 与
 * 「收起/展开菜单」行保留）。
 */

const ITEMS: SideMenuItem[] = [{ id: 'home', icon: IconCheck, title: '新建博客' }]

function renderMenu(overrides?: { expanded?: boolean; settingsActive?: boolean }): {
  onToggleExpanded: ReturnType<typeof vi.fn>
  onOpenSettings: ReturnType<typeof vi.fn>
  onOpenUser: ReturnType<typeof vi.fn>
  container: HTMLElement
} {
  const onToggleExpanded = vi.fn()
  const onOpenSettings = vi.fn()
  const onOpenUser = vi.fn()
  const { container } = render(
    <LocaleProvider>
      <SideMenu
        expanded={overrides?.expanded ?? true}
        onToggleExpanded={onToggleExpanded}
        items={ITEMS}
        active="home"
        onChange={vi.fn()}
        onOpenUser={onOpenUser}
        onOpenSettings={onOpenSettings}
        userActive={false}
        settingsActive={overrides?.settingsActive ?? false}
      />
    </LocaleProvider>
  )
  return { onToggleExpanded, onOpenSettings, onOpenUser, container }
}

beforeEach(() => {
  ;(document.body as HTMLElement).innerHTML = ''
})

describe('底部两项制', () => {
  it('展开态：用户项在上、设置项在下，设置带「设置」文字标签', () => {
    const { container } = renderMenu()
    const user = screen.getByLabelText('用户')
    const settings = screen.getByLabelText('设置')
    expect(user).toBeTruthy()
    expect(settings).toBeTruthy()
    // DOM 顺序：用户在前（上），设置在后（下）
    expect(user.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(settings).getByText('设置')).toBeTruthy()
    expect(container.textContent).toContain('wuh-site')
  })

  it('展开态点设置：直达 /settings（onOpenSettings），不触发展开', () => {
    const { onOpenSettings, onToggleExpanded } = renderMenu()
    fireEvent.click(screen.getByLabelText('设置'))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onToggleExpanded).not.toHaveBeenCalled()
  })

  it('settingsActive 时设置项高亮（aria-current=page）', () => {
    renderMenu({ settingsActive: true })
    expect(screen.getByLabelText('设置').getAttribute('aria-current')).toBe('page')
  })

  it('收起态点设置：仅展开菜单（onToggleExpanded），不导航', () => {
    const { onOpenSettings, onToggleExpanded } = renderMenu({ expanded: false })
    const settings = screen.getByLabelText('设置')
    fireEvent.click(settings)
    expect(onToggleExpanded).toHaveBeenCalledTimes(1)
    expect(onOpenSettings).not.toHaveBeenCalled()
  })

  it('收起态：收起态专属展开钮已退役（无「展开菜单」独立项），设置项 tooltip 复合展开提示', () => {
    renderMenu({ expanded: false })
    expect(screen.queryByLabelText('展开菜单')).toBeNull()
    expect(screen.getByLabelText('设置').getAttribute('data-tip')).toBe('设置 · 展开菜单')
  })

  it('用户点击直达用户中心（展开态）', () => {
    const { onOpenUser } = renderMenu()
    fireEvent.click(screen.getByLabelText('用户'))
    expect(onOpenUser).toHaveBeenCalledTimes(1)
  })
})

describe('快捷面板瘦身', () => {
  it('hover 用户入口：三组保留（主题/外观/语言）+ 收起/展开行；无身份头部、无「设置」行内项', async () => {
    renderMenu()
    fireEvent.mouseEnter(screen.getByLabelText('用户').parentElement as Element)
    const panel = await screen.findByRole('menu', { name: '外观与语言' })
    expect(within(panel).getByText('主题')).toBeTruthy()
    expect(within(panel).getByText('外观')).toBeTruthy()
    expect(within(panel).getByText('语言')).toBeTruthy()
    expect(within(panel).getByText('收起菜单')).toBeTruthy()
    // 设置已独立成底部导航项，面板内不再有「设置」行内项
    expect(within(panel).queryByText('设置')).toBeNull()
  })
})
