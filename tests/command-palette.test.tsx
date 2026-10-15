// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ShellLayout from '../app/(shell)/layout'
import AppProviders from '../components/AppProviders'
import { registerPaletteCommands, resetPaletteForTests } from '../lib/commands'
import { resetPaletteUiForTests } from '../lib/palette'
import { resetEditorLiveStateForTests, getEditorLiveState } from '../lib/editor-state'
import { workspaceStore } from '../lib/store'
import { resetRenderEnv } from './helpers/dom-env'

/**
 * ⌘K 命令面板（20261015-feature-workbench-shell task-10）：全局动作入口——
 * 导航/文档动作/插件命令/模式四组；输入过滤、键盘上下选择、Enter 执行、
 * Esc/点外关关闭。壳层命令在 layout 注册（run 闭包持 router 等）。
 */

const nav = vi.hoisted(() => ({ pathname: '/', push: vi.fn() }))

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

function renderShell(): ReturnType<typeof render> {
  return render(
    <AppProviders>
      <ShellLayout>
        <div>route:{nav.pathname}</div>
      </ShellLayout>
    </AppProviders>
  )
}

beforeEach(() => {
  resetRenderEnv()
  resetPaletteForTests()
  resetPaletteUiForTests()
  resetEditorLiveStateForTests()
  workspaceStore.switchWorkspace(null)
  nav.pathname = '/'
  nav.push.mockClear()
})

describe('⌘K 命令面板', () => {
  it('⌘K / Ctrl+K 打开，Esc 关闭', () => {
    const view = renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    expect(screen.getByTestId('palette')).toBeTruthy()
    const input = screen.getByTestId('palette-input')
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByTestId('palette')).toBeNull()
    void view
  })

  it('TitleBar 搜索按钮打开面板', () => {
    renderShell()
    fireEvent.click(screen.getByTestId('palette-open-btn'))
    expect(screen.getByTestId('palette')).toBeTruthy()
  })

  it('渲染导航/文档/模式三组壳层命令（插件组空时不渲染组头）', () => {
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    })
    expect(screen.getByText('导航')).toBeTruthy()
    expect(screen.getByText('文档动作')).toBeTruthy()
    expect(screen.getByText('模式')).toBeTruthy()
    expect(screen.queryByText('插件命令')).toBeNull()
  })

  it('输入过滤：无匹配显示空态', () => {
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    const input = screen.getByTestId('palette-input')
    fireEvent.change(input, { target: { value: '不存在的命令xyz' } })
    expect(screen.getByTestId('palette-empty')).toBeTruthy()
    fireEvent.change(input, { target: { value: '专注' } })
    expect(screen.queryByTestId('palette-empty')).toBeNull()
    expect(screen.getByText('进入专注模式')).toBeTruthy()
  })

  it('键盘上下选择 + Enter 执行导航命令', () => {
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    const list = screen.getByTestId('palette-list')
    // 首项默认 hot；下移到「项目列表」再 Enter（按注册顺序导航组内第二项）
    fireEvent.keyDown(list, { key: 'ArrowDown' })
    fireEvent.keyDown(list, { key: 'Enter' })
    expect(nav.push).toHaveBeenCalledWith('/projects')
  })

  it('点击「进入专注模式」执行 focusMode 翻转并关闭面板', () => {
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    fireEvent.click(screen.getByText('进入专注模式'))
    expect(getEditorLiveState().focusMode).toBe(true)
    expect(screen.queryByTestId('palette')).toBeNull()
  })

  it('点外关（target 归属守卫）', () => {
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    expect(screen.getByTestId('palette')).toBeTruthy()
    fireEvent.click(document.body)
    expect(screen.queryByTestId('palette')).toBeNull()
  })

  it('插件命令经注册表进入「插件命令」组并可执行', () => {
    const run = vi.fn()
    registerPaletteCommands([
      { id: 'git:commit', group: 'plugin', title: 'Git · 提交并推送', keywords: 'git commit push git-history', run }
    ])
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    expect(screen.getByText('插件命令')).toBeTruthy()
    fireEvent.click(screen.getByText('Git · 提交并推送'))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('保存命令发布到命令通道（文档动作组）', async () => {
    const { subscribeEditorCommands } = await import('../lib/editor-commands')
    const seen: unknown[] = []
    const unsubscribe = subscribeEditorCommands((cmd) => {
      seen.push(cmd)
      return true
    })
    renderShell()
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    fireEvent.click(screen.getByText('保存文档'))
    await Promise.resolve()
    expect(seen.some((c) => (c as { kind: string }).kind === 'save')).toBe(true)
    unsubscribe()
  })
})
