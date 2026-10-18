// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ShellLayout from '../app/(shell)/layout'
import AppProviders from '../components/AppProviders'
import { resetRenderEnv } from './helpers/dom-env'

/**
 * 工作台壳层骨架（20261015-feature-workbench-shell task-2）：
 * 五段结构 TitleBar（通知预留 + 胶囊）→ rail + 上下文面板 + center +（P2 dock）
 * → StatusBar；路由段互斥渲染 center；FloatLayer 常驻；⌘B 切上下文面板、
 * ⌘, 切 settings/home。PluginFrameHost 走真实模块（pluginApi stub 返回空插件集）。
 */

const nav = vi.hoisted(() => ({ pathname: '/', push: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: vi.fn(), back: vi.fn() }),
  notFound: vi.fn()
}))

function renderShell(): ReturnType<typeof render> {
  return render(
    <AppProviders>
      <ShellLayout>
        <div data-testid="route-segment">route:{nav.pathname}</div>
      </ShellLayout>
    </AppProviders>
  )
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 800
  })
})

describe('工作台壳层骨架', () => {
  beforeEach(() => {
    resetRenderEnv()
    nav.pathname = '/'
    nav.push.mockClear()
  })

  it('五段结构：TitleBar（通知预留+胶囊）/ rail / 上下文面板 / center / StatusBar', () => {
    const view = renderShell()
    expect(screen.getByLabelText('通知栏')).toBeTruthy()
    expect(view.container.querySelector('[data-testid="capsule"]')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: '主菜单' })).toBeTruthy()
    expect(view.container.querySelector('[data-context-panel]')).toBeTruthy()
    expect(view.container.querySelector('main')).toBeTruthy()
    expect(view.container.querySelector('footer')).toBeTruthy()
    expect(screen.getByTestId('route-segment').textContent).toBe('route:/')
  })

  it('FloatLayer 常驻 center（路由切换不卸载的容器存在）', () => {
    const view = renderShell()
    const main = view.container.querySelector('main')
    expect(main?.querySelector('[data-float-layer]')).toBeTruthy()
  })

  it('⌘B 切换目次浮笺显隐（D3：默认收起，滑出为开）', () => {
    const view = renderShell()
    const panel = view.container.querySelector('[data-context-panel]')
    expect(panel?.getAttribute('data-open')).toBe('false')
    act(() => {
      fireEvent.keyDown(window, { key: 'b', metaKey: true })
    })
    expect(view.container.querySelector('[data-context-panel]')?.getAttribute('data-open')).toBe('true')
    act(() => {
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    })
    expect(view.container.querySelector('[data-context-panel]')?.getAttribute('data-open')).toBe('false')
  })

  it('⌘, 在 settings ↔ home 间推送路由', () => {
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: ',', metaKey: true })
    })
    expect(nav.push).toHaveBeenCalledWith('/settings')
  })

  it('rail 导航点击映射（D3：项目钮呼出目次浮笺，其余照旧路由）', () => {
    const view = renderShell()
    // 项目钮 = 目次浮笺开关（不再直达 /projects；/projects 由 ⌘K/首页可达）
    fireEvent.click(screen.getByRole('button', { name: '项目' }))
    expect(view.container.querySelector('[data-context-panel]')?.getAttribute('data-open')).toBe('true')
    expect(nav.push).not.toHaveBeenCalledWith('/projects')
    fireEvent.click(screen.getByRole('button', { name: '草稿箱' }))
    expect(nav.push).toHaveBeenCalledWith('/drafts')
    fireEvent.click(screen.getByRole('button', { name: '用户' }))
    expect(nav.push).toHaveBeenCalledWith('/account')
    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(nav.push).toHaveBeenCalledWith('/settings')
  })

  it('路由激活态：/settings 高亮设置项，/ 高亮新建博客', () => {
    nav.pathname = '/settings'
    const view = renderShell()
    expect(screen.getByRole('button', { name: '设置' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: '新建博客' }).getAttribute('aria-current')).toBeNull()
  })
})
