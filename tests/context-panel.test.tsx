// @vitest-environment happy-dom
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FileNode, WorkspaceInfo } from '@shared/types'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { resetRenderEnv } from './helpers/dom-env'
import { ContextPanel } from '../components/contextpanel'

/**
 * 上下文面板（20261015-feature-workbench-shell task-3）：工作台左缘一等面板，
 * 承载 ProjectsTree（虚拟化/懒加载/失效重试能力沿袭，SideMenu 子树 → 通栏面板）
 * 与最近项目；头部 = 当前工作区名 +「当前」徽标 + 收起旋钮；fill 模式下
 * VirtualList 滚动容器以 height:100% 撑满面板（根元素即滚动容器约束不变）。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() })
}))

const WS_A: WorkspaceInfo = {
  root: '/a',
  name: 'proj-a',
  isGitRepo: false,
  branch: null,
  ahead: 0,
  behind: 0,
  github: null
}

const TREE_A: FileNode[] = [
  { name: 'a.md', path: 'a.md', type: 'file' },
  { name: 'b.md', path: 'b.md', type: 'file' }
]

const readTreeMock = vi.fn(async (root?: string) => (root === '/b' ? [] : TREE_A))

// 虚拟列表视口 stub（同 tests/projects-tree.test.tsx 口径）：大视口使全部行进窗口
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 800
  })
})

afterAll(() => {
  delete (HTMLElement.prototype as unknown as { clientHeight?: number }).clientHeight
})

function installApi(patch: Record<string, unknown>): void {
  ;(window as unknown as { api: unknown }).api = {
    getWorkspace: vi.fn(async () => WS_A),
    listRecentWorkspaces: vi.fn(async () => [{ path: '/b', name: 'proj-b', openedAt: 1 }]),
    readTree: readTreeMock,
    openWorkspace: vi.fn(async () => null),
    openWorkspaceByPath: vi.fn(async () => WS_A),
    readFile: vi.fn(async (relPath: string) => ({ path: relPath, content: `# ${relPath}` })),
    ...patch
  }
}

describe('ContextPanel（上下文面板）', () => {
  beforeEach(() => {
    resetRenderEnv()
    readTreeMock.mockClear()
    pushMock.mockClear()
    installApi({})
    workspaceStore.switchWorkspace(null)
  })

  it('面板根：aria-label 与 data-context-panel 稳定属性，头部有收起旋钮', () => {
    const panel = render(
      <LocaleProvider>
        <ContextPanel open onCollapse={vi.fn()} />
      </LocaleProvider>
    )
    const root = panel.container.querySelector('[data-context-panel]')
    expect(root).toBeTruthy()
    expect(root?.getAttribute('aria-label')).toBe('上下文面板')
    expect(screen.getByRole('button', { name: '收起上下文面板' })).toBeTruthy()
  })

  it('头部投影当前工作区名与「当前」徽标', async () => {
    render(
      <LocaleProvider>
        <ContextPanel open onCollapse={vi.fn()} />
      </LocaleProvider>
    )
    await waitFor(() => expect(screen.getAllByText('proj-a').length).toBeGreaterThan(0))
    expect(screen.getAllByText('当前').length).toBeGreaterThan(0)
  })

  it('收起旋钮回调 onCollapse（不冒泡触发树行点击）', () => {
    const onCollapse = vi.fn()
    render(
      <LocaleProvider>
        <ContextPanel open onCollapse={onCollapse} />
      </LocaleProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: '收起上下文面板' }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('fill 模式：VirtualList 滚动容器以 height:100% 撑满面板', async () => {
    const panel = render(
      <LocaleProvider>
        <ContextPanel open onCollapse={vi.fn()} />
      </LocaleProvider>
    )
    await waitFor(() => expect(screen.getAllByText('proj-a').length).toBeGreaterThan(0))
    const scroller = panel.container.querySelector<HTMLElement>('.virtual-list')
    expect(scroller).toBeTruthy()
    expect(scroller?.style.height).toBe('100%')
    expect(scroller?.style.overflowY).toBe('auto')
  })

  it('渲染项目分组：当前组置顶展开、最近项目组折叠', async () => {
    render(
      <LocaleProvider>
        <ContextPanel open onCollapse={vi.fn()} />
      </LocaleProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: '打开 a.md' })).toBeTruthy())
    expect(screen.getByText('proj-b')).toBeTruthy()
    // 懒加载：当前组首拉一次，最近组未展开不拉
    expect(readTreeMock).toHaveBeenCalledTimes(1)
    expect(readTreeMock).toHaveBeenCalledWith('/a')
    fireEvent.click(screen.getByText('proj-b'))
    await waitFor(() => expect(readTreeMock).toHaveBeenCalledWith('/b'))
  })

  it('点文件经共享 openProjectFile 流转并 push /editor', async () => {
    render(
      <LocaleProvider>
        <ContextPanel open onCollapse={vi.fn()} />
      </LocaleProvider>
    )
    await waitFor(() => expect(screen.getByRole('button', { name: '打开 a.md' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '打开 a.md' }))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/editor'))
  })

  it('大仓库窗口化：行数超视口时只渲染窗口行（clientHeight=104 → ~4 行）', async () => {
    const bigTree: FileNode[] = Array.from({ length: 40 }, (_, i) => ({
      name: `f${i}.md`,
      path: `f${i}.md`,
      type: 'file'
    }))
    installApi({ readTree: vi.fn(async () => bigTree) })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 104
    })
    try {
      const panel = render(
        <LocaleProvider>
          <ContextPanel open onCollapse={vi.fn()} />
        </LocaleProvider>
      )
      await waitFor(() => expect(screen.getAllByText('proj-a').length).toBeGreaterThan(0))
      const rows = panel.container.querySelectorAll('.virtual-list button').length
      expect(rows).toBeGreaterThan(0)
      expect(rows).toBeLessThan(40)
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get: () => 800
      })
    }
  })

  it('无工作区且无最近项目：面板内保留「打开目录」空态入口', async () => {
    installApi({
      getWorkspace: vi.fn(async () => null),
      listRecentWorkspaces: vi.fn(async () => [])
    })
    const openWorkspace = vi.fn(async () => null)
    installApi({
      getWorkspace: vi.fn(async () => null),
      listRecentWorkspaces: vi.fn(async () => []),
      openWorkspace
    })
    render(
      <LocaleProvider>
        <ContextPanel open onCollapse={vi.fn()} />
      </LocaleProvider>
    )
    const entry = await screen.findByRole('button', { name: '打开本地目录' })
    fireEvent.click(entry)
    await waitFor(() => expect(openWorkspace).toHaveBeenCalledTimes(1))
  })
})
