// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import { IconHome, IconInbox, IconFolderOpen, IconPuzzle } from '../components/icons'
import type { PluginTreeViewRef } from '../components/menu/PluginTree'
import { Rail } from '../components/rail'

/**
 * Rail（工作台壳层导航列，20261015-feature-workbench-shell）：
 * 恒 48px 图标列（SideMenu 展开态退役，文字导航让位命令面板）——
 * 主导航项（激活指示 aria-current / 徽标 / data-tip）、插件条目 popover
 * （复用 PluginTree 行语义：main 视图导航 + 浮窗开关）、底部用户/设置两项。
 * 点外关走 target 归属守卫（20260924-fix-capsule-self-close 先例）。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/'
}))

const ITEMS = [
  { id: 'home', icon: IconHome, title: '新建博客' },
  { id: 'projects', icon: IconFolderOpen, title: '项目' },
  { id: 'drafts', icon: IconInbox, title: '草稿箱' }
]

const MAIN_VIEWS: PluginTreeViewRef[] = [
  { pluginId: 'git-history', view: { id: 'git', title: 'Git 历史', icon: 'git-branch' } }
]
const FLOAT_VIEWS: PluginTreeViewRef[] = [
  { pluginId: 'preview-markdown', view: { id: 'preview', title: 'Markdown 预览', icon: 'eye' } }
]

function renderRail(overrides?: {
  active?: string
  mainViews?: PluginTreeViewRef[]
  floatViews?: PluginTreeViewRef[]
  openKeys?: Set<string>
}): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <Rail
        items={ITEMS}
        active={overrides?.active ?? 'home'}
        onChange={vi.fn()}
        plugins={{
          mainViews: overrides?.mainViews ?? MAIN_VIEWS,
          floatViews: overrides?.floatViews ?? FLOAT_VIEWS,
          openKeys: overrides?.openKeys ?? new Set<string>(),
          onToggleFloat: vi.fn()
        }}
        userActive={false}
        settingsActive={false}
        onOpenUser={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    </LocaleProvider>
  )
}

describe('Rail（工作台导航列）', () => {
  beforeEach(() => {
    resetRenderEnv()
    pushMock.mockClear()
  })

  it('渲染主导航项与底部用户/设置两项（aria-label 可达）', () => {
    const console_ = captureRenderConsole()
    try {
      renderRail()
      expect(screen.getByRole('button', { name: '新建博客' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '项目' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '草稿箱' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '插件' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '用户' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '设置' })).toBeTruthy()
      expect(console_.errors).toEqual([])
    } finally {
      console_.restore()
    }
  })

  it('激活项 aria-current="page"，非激活项无', () => {
    renderRail({ active: 'drafts' })
    expect(screen.getByRole('button', { name: '草稿箱' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: '新建博客' }).getAttribute('aria-current')).toBeNull()
  })

  it('点击导航项回调 onChange(id)', () => {
    const onChange = vi.fn()
    render(
      <LocaleProvider>
        <Rail
          items={ITEMS}
          active="home"
          onChange={onChange}
          plugins={{ mainViews: [], floatViews: [], openKeys: new Set(), onToggleFloat: vi.fn() }}
          userActive={false}
          settingsActive={false}
          onOpenUser={vi.fn()}
          onOpenSettings={vi.fn()}
        />
      </LocaleProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: '项目' }))
    expect(onChange).toHaveBeenCalledWith('projects')
  })

  it('徽标：数字投影且 >99 折叠 99+', () => {
    render(
      <LocaleProvider>
        <Rail
          items={[{ id: 'drafts', icon: IconInbox, title: '草稿箱', badge: { count: 120 } }]}
          active=""
          onChange={vi.fn()}
          plugins={{ mainViews: [], floatViews: [], openKeys: new Set(), onToggleFloat: vi.fn() }}
          userActive={false}
          settingsActive={false}
          onOpenUser={vi.fn()}
          onOpenSettings={vi.fn()}
        />
      </LocaleProvider>
    )
    expect(screen.getByRole('button', { name: '草稿箱' }).textContent).toContain('99+')
  })

  it('data-tip 承载条目标题（hover 提示）', () => {
    renderRail()
    expect(screen.getByRole('button', { name: '新建博客' }).getAttribute('data-tip')).toBe('新建博客')
  })

  it('插件条目 aria-expanded 开合 popover', () => {
    renderRail()
    const pluginsBtn = screen.getByRole('button', { name: '插件' })
    expect(pluginsBtn.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(pluginsBtn)
    expect(pluginsBtn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'Git 历史' })).toBeTruthy()
    fireEvent.click(pluginsBtn)
    expect(pluginsBtn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Git 历史' })).toBeNull()
  })

  it('popover 列出 main 视图导航行（点击路由并收起）与浮窗开关行（aria-pressed）', () => {
    renderRail({ openKeys: new Set(['plugin:preview-markdown:preview']) })
    fireEvent.click(screen.getByRole('button', { name: '插件' }))
    const floatRow = screen.getByRole('button', { name: 'Markdown 预览' })
    expect(floatRow.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Git 历史' }))
    expect(pushMock).toHaveBeenCalledWith('/plugin/git-history/git')
    expect(screen.queryByRole('button', { name: 'Git 历史' })).toBeNull()
  })

  it('popover 点外关（target 归属守卫）', () => {
    renderRail()
    fireEvent.click(screen.getByRole('button', { name: '插件' }))
    expect(screen.getByRole('button', { name: 'Git 历史' })).toBeTruthy()
    fireEvent.click(document.body)
    expect(screen.queryByRole('button', { name: 'Git 历史' })).toBeNull()
  })

  it('popover Esc 关闭', () => {
    renderRail()
    fireEvent.click(screen.getByRole('button', { name: '插件' }))
    expect(screen.getByRole('button', { name: 'Git 历史' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Git 历史' })).toBeNull()
  })

  it('双列表皆空显示「无启用插件」空态行', () => {
    renderRail({ mainViews: [], floatViews: [] })
    fireEvent.click(screen.getByRole('button', { name: '插件' }))
    expect(screen.getByText('无启用插件')).toBeTruthy()
  })
})
