// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
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
  /** 受控开合的有状态壳：点击真实翻转 pluginsOpen（D3 起开合态收壳层） */
  function StatefulRail(props: {
    items: typeof ITEMS
    active: string
    mainViews?: PluginTreeViewRef[]
    floatViews?: PluginTreeViewRef[]
    openKeys?: Set<string>
  }): React.JSX.Element {
    const [open, setOpen] = useState(false)
    return (
      <Rail
        items={props.items}
        active={props.active}
        onChange={vi.fn()}
        plugins={{
          mainViews: props.mainViews ?? MAIN_VIEWS,
          floatViews: props.floatViews ?? FLOAT_VIEWS,
          openKeys: props.openKeys ?? new Set<string>(),
          onToggleFloat: vi.fn()
        }}
        userActive={false}
        settingsActive={false}
        onOpenUser={vi.fn()}
        onOpenSettings={vi.fn()}
        pluginsOpen={open}
        onPluginsOpenChange={setOpen}
      />
    )
  }
  return render(
    <LocaleProvider>
      <StatefulRail
        items={ITEMS}
        active={overrides?.active ?? 'home'}
        mainViews={overrides?.mainViews}
        floatViews={overrides?.floatViews}
        openKeys={overrides?.openKeys}
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
        pluginsOpen={false}
        onPluginsOpenChange={vi.fn()}
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
        pluginsOpen={false}
        onPluginsOpenChange={vi.fn()}
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

/**
 * 书脊/案面/素笺样式守卫（20261017-feature-app-layout-workbench Phase 1，源码级，
 * globals-scrollbar 同范式）：D1 书脊（布纹织理 + normal-900 墨底 + 朱砂装订线）、
 * D2 案面（五层渐变）与素笺纸面配方（paperSurface 双投影 + 纸页叠口）是本轮定稿
 * 语言——源码锁定防下个 change 复辟成普通 chrome-panel 栏。
 */
const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('书脊/案面/素笺样式守卫（D1/D2，源码级）', () => {
  const read = (p: string): string => readFileSync(join(sourceRoot, p), 'utf8')

  it('书脊：48px 布纹墨底 + spine-ink 双主题路由 + 朱砂装订线（D1，暗色不倒置）', () => {
    const css = read('components/rail/styles.ts')
    expect(css).toMatch(/width:\s*48px/)
    expect(css).toMatch(/repeating-linear-gradient\(0deg,\s*rgba\(255,\s*255,\s*255,\s*0\.03\)/)
    expect(css).toMatch(/repeating-linear-gradient\(90deg,\s*rgba\(0,\s*0,\s*0,\s*0\.045\)/)
    expect(css).toMatch(/color-mix\(in oklab,\s*var\(--spine-ink\) 94%,\s*#000\)/)
    expect(css).toMatch(/var\(--spine-paper\) 62%,\s*transparent\)/)
    const tokens = read('components/theme/tokens.ts')
    expect(tokens).toMatch(/--spine-ink:\s*var\(--normal-900\)/)
    expect(tokens).toMatch(/--spine-ink:\s*color-mix\(in oklab,\s*var\(--background-color\) 86%,\s*#000 14%\)/)
    expect(css).toMatch(/--primary-400\) 85%,\s*transparent\) 12%/)
    expect(css).toMatch(/--primary-500\) 85%,\s*transparent\) 85%,\s*transparent\s*\)/)
  })

  it('书脊 Nav 带 data-chrome="rail"（INV-2 专注退场锚点）', () => {
    const src = read('components/rail/index.tsx')
    expect(src).toMatch(/data-chrome="rail"/)
  })

  it('案面：main 容器五层渐变（窗光扫/双暖晕/纸纹竖纹/底色）（D2）', () => {
    const src = read('app/(shell)/layout.tsx')
    expect(src).toMatch(/--normal-100\) 34%,\s*transparent\),?\s*\n?\s*transparent 26%\)/)
    expect(src).toMatch(/--normal-100\) 30%,\s*transparent\),\s*transparent 55%\)/)
    expect(src).toMatch(/--background-200\) 70%,\s*transparent\),\s*transparent 60%\)/)
    expect(src).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.012\) 0 1px,\s*transparent 1px 4px/)
  })

  it('浮笺画芯：非编辑页 Sheet 包裹 + /editor 不套（D2）', () => {
    const src = read('app/(shell)/layout.tsx')
    expect(src).toMatch(/pathname\.startsWith\('\/editor'\) \? children : <Sheet/)
    expect(src).toMatch(/data-testid="page-sheet"/)
  })

  it('素笺纸面配方：paperSurface 双投影 + 顶部内高光 + 纸页叠口（纸只有一种）', () => {
    const sheet = read('components/ui/Sheet.tsx')
    expect(sheet).toMatch(/0 24px 60px rgba\(0,\s*0,\s*0,\s*0\.13\)/)
    expect(sheet).toMatch(/inset 0 1px 0 color-mix\(in oklab,\s*var\(--normal-100\) 60%,\s*transparent\)/)
    expect(sheet).toMatch(/5px 0 0 -3px/)
    const editor = read('app/(shell)/editor/page.tsx')
    expect(editor).toMatch(/\$\{paperSurface\}/)
  })
})
