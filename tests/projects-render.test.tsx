// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { FileNode, FileContent, WorkspaceInfo } from '@shared/types'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import { ProjectsPage } from '../app/(shell)/projects/page'

/**
 * 项目页渲染冒烟（20260924-feature-projects-editor-page）：
 * 真实 DOM 环境断言渲染期零 React 告警 + 分组结构（当前组徽标/失效组/空态）+
 * 点击文件流转（脏确认 → 按需切工作区 → openDoc → 跳 /editor，router 走 mock）。
 * 收起组不渲染文件列表；默认仅当前组展开。
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
  { name: 'x.txt', path: 'x.txt', type: 'file' }
]

const TREE_B: FileNode[] = [
  {
    name: 'notes',
    path: 'notes',
    type: 'dir',
    children: [{ name: 'c.md', path: 'notes/c.md', type: 'file' }]
  },
  { name: 'b.md', path: 'b.md', type: 'file' }
]

function installApi(patch: Record<string, unknown>): void {
  ;(window as unknown as { api: unknown }).api = {
    getWorkspace: vi.fn(async () => WS_A),
    listRecentWorkspaces: vi.fn(async () => [
      { path: '/a', name: 'proj-a', openedAt: 2 },
      { path: '/b', name: 'proj-b', openedAt: 1 }
    ]),
    readTree: vi.fn(async (root?: string) => (root === '/b' ? TREE_B : TREE_A)),
    openWorkspace: vi.fn(async () => null),
    openWorkspaceByPath: vi.fn(async (p: string) => ({ ...WS_A, root: p, name: `proj-${p}` })),
    readFile: vi.fn(
      async (relPath: string): Promise<FileContent> => ({ path: relPath, content: `# ${relPath}` })
    ),
    ...patch
  }
}

const apiMock = (): Record<string, ReturnType<typeof vi.fn>> =>
  (window as unknown as { api: Record<string, ReturnType<typeof vi.fn>> }).api

beforeEach(() => {
  resetRenderEnv()
  installApi({})
  workspaceStore.switchWorkspace(null)
  pushMock.mockClear()
})

function renderPage(): ReturnType<typeof render> {
  return render(<LocaleProvider>{<ProjectsPage />}</LocaleProvider>)
}

describe('项目页渲染冒烟', () => {
  it('分组：当前组置顶带「当前」徽标且默认展开，其余组收起；非 md 不入列；零 React 告警', async () => {
    const console_ = captureRenderConsole()
    const { container } = renderPage()
    expect(await screen.findByText('proj-a')).toBeTruthy()
    console_.restore()

    expect(screen.getByText('当前')).toBeTruthy()
    expect(screen.getByText('proj-b')).toBeTruthy()
    expect(screen.getByRole('button', { name: '打开 a.md' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '打开 b.md' })).toBeNull()
    expect(screen.queryByText('x.txt')).toBeNull()
    // 结构约束：无 button 嵌套
    expect(container.querySelectorAll('button button').length).toBe(0)
  })

  it('组展开/收起：点击组头切换文件列表可见性', async () => {
    renderPage()
    const header = await screen.findByRole('button', { name: /proj-b/ })
    expect(screen.queryByRole('button', { name: '打开 b.md' })).toBeNull()
    await act(async () => {
      fireEvent.click(header)
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: '打开 b.md' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '打开 notes/c.md' })).toBeTruthy()
  })

  it('空态：无工作区无最近项目时展示引导与打开目录入口', async () => {
    installApi({
      getWorkspace: vi.fn(async () => null),
      listRecentWorkspaces: vi.fn(async () => [])
    })
    const console_ = captureRenderConsole()
    renderPage()
    expect(await screen.findByText('还没有项目。打开一个目录开始写作。')).toBeTruthy()
    console_.restore()
  })

  it('失效组：readTree 拒绝后呈「无法访问」态，其余组不受影响', async () => {
    installApi({
      readTree: vi.fn(async (root?: string) => {
        if (root === '/b') throw new Error('项目目录不存在或不可访问')
        return TREE_A
      })
    })
    const console_ = captureRenderConsole()
    renderPage()
    expect(await screen.findByText(/无法访问/)).toBeTruthy()
    console_.restore()
    expect(screen.getByRole('button', { name: '打开 a.md' })).toBeTruthy()
  })

  it('当前组点击文件：不切工作区，readFile → openDoc → 跳 /editor', async () => {
    const console_ = captureRenderConsole()
    renderPage()
    const row = await screen.findByRole('button', { name: '打开 a.md' })
    await act(async () => {
      fireEvent.click(row)
      await Promise.resolve()
      await Promise.resolve()
    })
    console_.restore()

    expect(apiMock().openWorkspaceByPath).not.toHaveBeenCalled()
    expect(apiMock().readFile).toHaveBeenCalledWith('a.md')
    expect(workspaceStore.get().activePath).toBe('a.md')
    expect(workspaceStore.get().content).toBe('# a.md')
    expect(workspaceStore.get().dirty).toBe(false)
    expect(pushMock).toHaveBeenCalledWith('/editor')
  })

  it('非当前组点击文件：先切工作区再读取并跳 /editor', async () => {
    renderPage()
    const header = await screen.findByRole('button', { name: /proj-b/ })
    await act(async () => {
      fireEvent.click(header)
      await Promise.resolve()
    })
    const row = screen.getByRole('button', { name: '打开 b.md' })
    await act(async () => {
      fireEvent.click(row)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(apiMock().openWorkspaceByPath).toHaveBeenCalledWith('/b')
    expect(apiMock().readFile).toHaveBeenCalledWith('b.md')
    expect(workspaceStore.get().activePath).toBe('b.md')
    expect(pushMock).toHaveBeenCalledWith('/editor')
  })

  it('脏文档：确认弹窗取消则不打开；确认后正常进入编辑页', async () => {
    workspaceStore.openDoc('/cur.md', '# 旧稿')
    await act(async () => {
      workspaceStore.setContent('# 旧稿改')
    })
    const confirmSpy = vi.fn((): boolean => false)
    ;(window as unknown as { confirm: unknown }).confirm = confirmSpy

    renderPage()
    const row = await screen.findByRole('button', { name: '打开 a.md' })
    await act(async () => {
      fireEvent.click(row)
      await Promise.resolve()
    })
    expect(confirmSpy).toHaveBeenCalled()
    expect(apiMock().readFile).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    await act(async () => {
      fireEvent.click(row)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(apiMock().readFile).toHaveBeenCalledWith('a.md')
    expect(pushMock).toHaveBeenCalledWith('/editor')
    ;(window as unknown as { confirm: unknown }).confirm = undefined
  })
})
