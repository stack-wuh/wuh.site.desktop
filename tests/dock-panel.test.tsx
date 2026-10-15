// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { resetRenderEnv } from './helpers/dom-env'
import { Dock } from '../components/dock'
import { dockTaskCenter, resetDockForTests, setDockOpen } from '../lib/dock'
import {
  clearPluginPanelTabs,
  registerManifestPanelTabs,
  removePanelTab,
  resetPanelTabsForTests,
  updatePanelTab,
  visiblePanelTabs
} from '../lib/panelTabs'
import { upsertTask } from '../lib/tasks'

/**
 * 底部 Dock（20261015-feature-workbench-shell task-6）：收起态细条 ↔ 展开态面板。
 * 任务中心页签（停靠态本体）+ 插件 dock 页签（manifest views.area='dock' 声明制，
 * sections/rows 结构化上报，viewId 行可跳来源视图）；空态不渲染不占高。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/'
}))

function manifestWith(views: unknown[]): Parameters<typeof registerManifestPanelTabs>[0] {
  return {
    id: 'git-history',
    name: 'Git 历史与回退',
    version: '1.1.0',
    views: views as never,
    publishers: [],
    permissions: []
  }
}

const DOCK_VIEWS = [
  { id: 'panel', area: 'dock', title: 'Git 面板', icon: 'git-branch', entry: 'panel.html', order: 20 },
  { id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'view.html', order: 20 }
]

function renderDock(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <Dock />
    </LocaleProvider>
  )
}

describe('底部 Dock（停靠条 ⇄ 面板 + 插件页签）', () => {
  beforeEach(() => {
    resetRenderEnv()
    resetDockForTests()
    resetPanelTabsForTests()
    pushMock.mockClear()
  })

  it('空态：未停靠且无插件页签时不渲染（不占高）', () => {
    const view = renderDock()
    expect(view.container.querySelector('[data-testid="dockbar"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="dock-panel"]')).toBeNull()
  })

  it('插件页签声明并首次上报后，收起条出现且含页签按钮', () => {
    registerManifestPanelTabs(manifestWith(DOCK_VIEWS))
    expect(visiblePanelTabs('dock')).toEqual([])
    const view = renderDock()
    expect(view.container.querySelector('[data-testid="dockbar"]')).toBeNull()
    act(() => {
      updatePanelTab('git-history', 'dock', 'panel', {
        sections: [{ rows: [{ text: 'main · 3 未提交', tone: 'warning' }] }]
      })
    })
    expect(screen.getByTestId('dockbar')).toBeTruthy()
    expect(screen.getByTestId('dock-tab-dock:git-history:panel')).toBeTruthy()
  })

  it('收起条页签点击展开面板并选中该页签', () => {
    registerManifestPanelTabs(manifestWith(DOCK_VIEWS))
    updatePanelTab('git-history', 'dock', 'panel', { sections: [{ rows: [{ text: 'main' }] }] })
    renderDock()
    fireEvent.click(screen.getByTestId('dock-tab-dock:git-history:panel'))
    expect(screen.getByTestId('dock-panel')).toBeTruthy()
    expect(screen.getByTestId('dock-tab-dock:git-history:panel').getAttribute('aria-selected')).toBe('true')
  })

  it('停靠后任务页签渲染时间线（进行中在前、完成分组）', () => {
    upsertTask('image-host', 't1', { title: '上传截图', status: 'in_progress', progress: { current: 2, total: 6 } })
    upsertTask('git-history', 't2', { title: '提交推送', status: 'done' })
    dockTaskCenter()
    renderDock()
    expect(screen.getByTestId('dock-tasks')).toBeTruthy()
    expect(screen.getByTestId('capsule-timeline')).toBeTruthy()
    expect(screen.getByTestId('dock-tab-tasks').getAttribute('aria-selected')).toBe('true')
  })

  it('插件页签 sections/rows 渲染，viewId 行整行可点跳来源视图并保持 Dock 常驻', async () => {
    registerManifestPanelTabs(manifestWith(DOCK_VIEWS))
    updatePanelTab('git-history', 'dock', 'panel', {
      sections: [{ title: '分支', rows: [{ text: 'main · 3 未提交', tone: 'warning', viewId: 'git' }] }]
    })
    dockTaskCenter()
    setDockOpen(true)
    renderDock()
    fireEvent.click(screen.getByTestId('dock-tab-dock:git-history:panel'))
    const row = screen.getByText('main · 3 未提交')
    fireEvent.click(row.closest('button') ?? row)
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/plugin/git-history/git'))
    expect(screen.getByTestId('dock-panel')).toBeTruthy()
  })

  it('插件停用清页签：面板/收起条随之消失', () => {
    registerManifestPanelTabs(manifestWith(DOCK_VIEWS))
    updatePanelTab('git-history', 'dock', 'panel', { sections: [{ rows: [{ text: 'main' }] }] })
    renderDock()
    expect(screen.getByTestId('dockbar')).toBeTruthy()
    act(() => {
      clearPluginPanelTabs('git-history')
    })
    expect(screen.queryByTestId('dockbar')).toBeNull()
  })

  it('收起钮：停靠态面板收回收起条；removePanelTab 后任务中心仍可停靠', () => {
    registerManifestPanelTabs(manifestWith(DOCK_VIEWS))
    dockTaskCenter()
    renderDock()
    fireEvent.click(screen.getByTestId('dock-collapse'))
    expect(screen.getByTestId('dockbar')).toBeTruthy()
    expect(screen.queryByTestId('dock-panel')).toBeNull()
    // 隐藏页签不影响任务中心停靠
    removePanelTab('git-history', 'dock', 'panel')
    fireEvent.click(screen.getByTestId('dock-tab-tasks'))
    expect(screen.getByTestId('dock-panel')).toBeTruthy()
  })
})
