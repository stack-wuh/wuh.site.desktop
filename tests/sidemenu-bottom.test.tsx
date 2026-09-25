// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SideMenu, type SideMenuItem } from '../components/SideMenu'
import { PluginTree } from '../components/menu/PluginTree'
import { IconCheck } from '../components/icons'
import { LocaleProvider } from '../lib/i18n/context'

/**
 * SideMenu 底部系统区（20260925-feature-sidemenu-settings-consolidation 重分工）：
 * 【用户】在上（纯导航直达 /account，快捷面板已迁走）、【设置】在下——收起态图标
 * 右箭头、点击仅展开菜单；展开态左 Setting 直达 /settings（settingsActive 高亮）、
 * 右缘收起旋钮收起菜单（不冒泡导航）；快捷面板挂设置项（仅展开态弹出），仅
 * 主题/外观/语言三组（「收起/展开菜单」行退役）。另覆盖【插件】条目子树
 * （main 视图导航行 + 浮窗开关行）与旋钮开合。
 */

const { pushMock, pathnameMock } = vi.hoisted(() => ({ pushMock: vi.fn(), pathnameMock: vi.fn(() => '/') }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => pathnameMock()
}))

const ITEMS: SideMenuItem[] = [{ id: 'home', icon: IconCheck, title: '新建博客' }]

const PLUGIN_ITEMS = (treeOpen: boolean, overrides?: { onToggleTree?: () => void }): SideMenuItem[] => [
  {
    id: 'plugins',
    icon: IconCheck,
    title: '插件',
    tree: (
      <PluginTree
        mainViews={[{ pluginId: 'git-history', view: { id: 'git', title: 'Git 历史', icon: 'git-branch' } }]}
        floatViews={[{ pluginId: 'preview-markdown', view: { id: 'preview', title: '预览', icon: 'eye' } }]}
        openKeys={new Set(['plugin:preview-markdown:preview'])}
        onToggle={vi.fn()}
      />
    ),
    treeOpen,
    onToggleTree: overrides?.onToggleTree
  }
]

function renderMenu(overrides?: {
  expanded?: boolean
  settingsActive?: boolean
  userActive?: boolean
  items?: SideMenuItem[]
}): {
  onToggleExpanded: ReturnType<typeof vi.fn>
  onOpenSettings: ReturnType<typeof vi.fn>
  onOpenUser: ReturnType<typeof vi.fn>
  onChange: ReturnType<typeof vi.fn>
  onToggleTree: ReturnType<typeof vi.fn>
  container: HTMLElement
} {
  const onToggleExpanded = vi.fn()
  const onOpenSettings = vi.fn()
  const onOpenUser = vi.fn()
  const onChange = vi.fn()
  const onToggleTree = vi.fn()
  const { container } = render(
    <LocaleProvider>
      <SideMenu
        expanded={overrides?.expanded ?? true}
        onToggleExpanded={onToggleExpanded}
        items={overrides?.items ?? ITEMS}
        active="home"
        onChange={onChange}
        onOpenUser={onOpenUser}
        onOpenSettings={onOpenSettings}
        userActive={overrides?.userActive ?? false}
        settingsActive={overrides?.settingsActive ?? false}
      />
    </LocaleProvider>
  )
  return { onToggleExpanded, onOpenSettings, onOpenUser, onChange, onToggleTree, container }
}

beforeEach(() => {
  ;(document.body as HTMLElement).innerHTML = ''
  pushMock.mockClear()
  pathnameMock.mockClear()
  pathnameMock.mockImplementation(() => '/')
})

describe('底部两项制（重分工）', () => {
  it('展开态：用户项在上、设置项在下，设置带「设置」文字标签与用户名投影', () => {
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

  it('userActive 时用户项高亮（data-active 稳定属性）', () => {
    renderMenu({ userActive: true })
    expect(screen.getByLabelText('用户').getAttribute('data-active')).toBe('true')
  })

  it('用户项纯导航：点击直达 /account，无快捷面板挂点（hover 不出面板）', () => {
    const { onOpenUser } = renderMenu()
    const user = screen.getByLabelText('用户')
    fireEvent.mouseEnter(user.parentElement as Element)
    fireEvent.click(user)
    expect(onOpenUser).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu', { name: '外观与语言' })).toBeNull()
  })
})

describe('设置项三态交互', () => {
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

  it('收起态：无收起旋钮、无子树行，设置项 tooltip 复合展开提示', () => {
    renderMenu({ expanded: false })
    expect(screen.queryByLabelText('收起菜单')).toBeNull()
    expect(screen.getByLabelText('设置').getAttribute('data-tip')).toBe('设置 · 展开菜单')
  })

  it('展开态：右缘收起旋钮存在，点击仅收起菜单（stopPropagation 不导航）', () => {
    const { onOpenSettings, onToggleExpanded } = renderMenu()
    const knob = screen.getByLabelText('收起菜单')
    fireEvent.click(knob)
    expect(onToggleExpanded).toHaveBeenCalledTimes(1)
    expect(onOpenSettings).not.toHaveBeenCalled()
  })
})

describe('快捷面板挂设置项', () => {
  it('展开态 hover 设置锚点：面板弹出，三组保留（主题/外观/语言），「收起菜单」行退役', () => {
    renderMenu()
    fireEvent.mouseEnter(screen.getByLabelText('设置').parentElement as Element)
    const panel = screen.getByRole('menu', { name: '外观与语言' })
    expect(within(panel).getByText('主题')).toBeTruthy()
    expect(within(panel).getByText('外观')).toBeTruthy()
    expect(within(panel).getByText('语言')).toBeTruthy()
    expect(within(panel).queryByText('收起菜单')).toBeNull()
    expect(within(panel).queryByText('展开菜单')).toBeNull()
  })

  it('Esc 关闭面板', () => {
    renderMenu()
    fireEvent.mouseEnter(screen.getByLabelText('设置').parentElement as Element)
    expect(screen.getByRole('menu', { name: '外观与语言' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('menu', { name: '外观与语言' })).toBeNull()
  })

  it('收起态 hover 设置：不弹面板（data-tip 单一职责，面板与 tooltip 同锚右侧）', () => {
    renderMenu({ expanded: false })
    fireEvent.mouseEnter(screen.getByLabelText('设置').parentElement as Element)
    expect(screen.queryByRole('menu', { name: '外观与语言' })).toBeNull()
  })
})

describe('插件条目子树', () => {
  it('展开态：旋钮开子树后 main 视图行与浮窗开关行渲染，开着的浮窗行 aria-pressed', () => {
    renderMenu({ items: PLUGIN_ITEMS(true) })
    const gitRow = screen.getByText('Git 历史').closest('button') as HTMLButtonElement
    expect(gitRow).toBeTruthy()
    const previewRow = screen.getByText('预览').closest('button') as HTMLButtonElement
    expect(previewRow.getAttribute('aria-pressed')).toBe('true')
  })

  it('点 main 视图行：router.push 直达 /plugin/<id>/<view>', () => {
    renderMenu({ items: PLUGIN_ITEMS(true) })
    fireEvent.click(screen.getByText('Git 历史'))
    expect(pushMock).toHaveBeenCalledWith('/plugin/git-history/git')
  })

  it('收起态：子树不渲染（rail 无子树），插件条目回落纯导航项', () => {
    renderMenu({ expanded: false, items: PLUGIN_ITEMS(true) })
    expect(screen.queryByText('Git 历史')).toBeNull()
    expect(screen.getByLabelText('插件')).toBeTruthy()
  })

  it('点条目行尾旋钮：只切子树显隐（onToggleTree），不触发 onChange 导航', () => {
    const onToggleTree = vi.fn()
    const { onChange } = renderMenu({ items: PLUGIN_ITEMS(false, { onToggleTree }) })
    fireEvent.click(screen.getByLabelText('展开或收起子树'))
    expect(onToggleTree).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('空子树：无插件视图显示「无启用插件」空态行', () => {
    const items: SideMenuItem[] = [
      {
        id: 'plugins',
        icon: IconCheck,
        title: '插件',
        tree: <PluginTree mainViews={[]} floatViews={[]} openKeys={new Set()} onToggle={vi.fn()} />,
        treeOpen: true,
        onToggleTree: vi.fn()
      }
    ]
    renderMenu({ items })
    expect(screen.getByText('无启用插件')).toBeTruthy()
  })
})
