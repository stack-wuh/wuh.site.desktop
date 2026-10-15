// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ShellLayout from '../app/(shell)/layout'
import AppProviders from '../components/AppProviders'
import { workspaceStore } from '../lib/store'
import { getEditorLiveState, publishEditorLiveState, resetEditorLiveStateForTests } from '../lib/editor-state'
import { resetRenderEnv } from './helpers/dom-env'

/**
 * 专注模式（20261015-feature-workbench-shell task-8）：复用既有 editor-state
 * focusMode 总线（编辑页顶栏淡出已用），升格为壳层 chrome 退场——TitleBar/rail/
 * 上下文面板/Dock/状态栏全部隐藏，编辑器满幅 + 顶部浮条（文档名/保存态/字数/退出）。
 * 入口 ⌘⇧F；Esc 退出（确认框/胶囊面板打开时让位）；路由切换自动退出。
 */

const nav = vi.hoisted(() => ({ pathname: '/editor', push: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, replace: vi.fn(), back: vi.fn() })
}))

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 800
  })
})

function renderShell(): ReturnType<typeof render> & { rerender: () => void } {
  const view = render(
    <AppProviders>
      <ShellLayout>
        <div data-testid="route-segment">route:{nav.pathname}</div>
      </ShellLayout>
    </AppProviders>
  )
  return {
    ...view,
    rerender: () => {
      view.rerender(
        <AppProviders>
          <ShellLayout>
            <div data-testid="route-segment">route:{nav.pathname}</div>
          </ShellLayout>
        </AppProviders>
      )
    }
  }
}

beforeEach(() => {
  resetRenderEnv()
  nav.pathname = '/editor'
  nav.push.mockClear()
  workspaceStore.switchWorkspace(null)
  resetEditorLiveStateForTests()
})

describe('专注模式（壳层 chrome 退场）', () => {
  it('⌘⇧F 进入：Shell data-focus=true 且浮条渲染，chrome 容器隐藏', () => {
    const view = renderShell()
    expect(view.container.querySelector('[data-focus="true"]')).toBeNull()
    act(() => {
      fireEvent.keyDown(window, { key: 'f', metaKey: true, shiftKey: true })
    })
    expect(getEditorLiveState().focusMode).toBe(true)
    expect(view.container.querySelector('[data-focus="true"]')).toBeTruthy()
    expect(screen.getByTestId('focus-bar')).toBeTruthy()
  })

  it('再按 ⌘⇧F 退出', () => {
    const view = renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'f', metaKey: true, shiftKey: true })
    })
    act(() => {
      fireEvent.keyDown(window, { key: 'f', metaKey: true, shiftKey: true })
    })
    expect(getEditorLiveState().focusMode).toBe(false)
    expect(view.container.querySelector('[data-focus="true"]')).toBeNull()
    expect(screen.queryByTestId('focus-bar')).toBeNull()
  })

  it('浮条显示文档路径与字数', () => {
    workspaceStore.openDoc('posts/重新设计工作台.md', '# 标题\n\n正文一二三')
    const view = renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'f', ctrlKey: true, shiftKey: true })
    })
    const bar = screen.getByTestId('focus-bar')
    expect(bar.textContent).toContain('posts/重新设计工作台.md')
    const words = bar.textContent ?? ''
    expect(/\d/.test(words)).toBe(true)
  })

  it('退出按钮退出专注', () => {
    const view = renderShell()
    act(() => {
      publishEditorLiveState({ focusMode: true })
    })
    fireEvent.click(screen.getByTestId('focus-exit'))
    expect(getEditorLiveState().focusMode).toBe(false)
    expect(view.container.querySelector('[data-focus="true"]')).toBeNull()
  })

  it('Esc 退出专注（无更高层浮层时）', () => {
    const view = renderShell()
    act(() => {
      publishEditorLiveState({ focusMode: true })
    })
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(getEditorLiveState().focusMode).toBe(false)
    expect(view.container.querySelector('[data-focus="true"]')).toBeNull()
  })

  it('确认框打开时 Esc 让位（不退专注）', () => {
    renderShell()
    act(() => {
      publishEditorLiveState({ focusMode: true })
    })
    const overlay = document.createElement('div')
    overlay.setAttribute('data-dialog-overlay', '')
    document.body.appendChild(overlay)
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(getEditorLiveState().focusMode).toBe(true)
    overlay.remove()
  })

  it('路由切换自动退出专注', () => {
    const view = renderShell()
    act(() => {
      publishEditorLiveState({ focusMode: true })
    })
    expect(view.container.querySelector('[data-focus="true"]')).toBeTruthy()
    nav.pathname = '/'
    act(() => {
      view.rerender()
    })
    expect(getEditorLiveState().focusMode).toBe(false)
    expect(view.container.querySelector('[data-focus="true"]')).toBeNull()
  })

  it('chrome 退场只锚 data-chrome（内容区不误伤：编辑页 section/首页卡片不带该属性）', () => {
    const view = renderShell()
    // 壳层 chrome 全部带稳定属性（focus CSS 只匹配 [data-chrome]）
    expect(view.container.querySelector('[data-chrome="titlebar"]')).toBeTruthy()
    expect(view.container.querySelector('[data-chrome="rail"]')).toBeTruthy()
    expect(view.container.querySelector('[data-chrome="ctx"]')).toBeTruthy()
    expect(view.container.querySelector('[data-chrome="status"]')).toBeTruthy()
    // 路由子内容（children）不带 data-chrome——专注模式不会隐藏编辑主体
    const seg = view.container.querySelector('[data-testid="route-segment"]')
    expect(seg?.closest('[data-chrome]')).toBeNull()
  })
})
