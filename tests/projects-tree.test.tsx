// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FileNode, FileContent, WorkspaceInfo } from '@shared/types'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import { ProjectsTree } from '../components/menu/ProjectsTree'

/**
 * 左栏项目树渲染冒烟（20260924 走查反馈修订）：
 * 一级项目节点（当前置顶带「当前」徽标、默认展开自动拉树）、二级文件夹 + .md 递归树、
 * 懒加载（非当前组首次展开才 readTree）、失效组「无法访问」+ 重试、空态「打开目录」入口、
 * 点文件流转（脏确认/切工作区收口在共享 openProjectFile，此处断言流转结果），router 走 mock。
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

function renderTree(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <ProjectsTree />
    </LocaleProvider>
  )
}

describe('左栏项目树渲染冒烟', () => {
  it('当前组置顶带「当前」徽标且默认展开直显文件；非当前组收起；零 React 告警', async () => {
    const console_ = captureRenderConsole()
    const { container } = renderTree()
    expect(await screen.findByText('proj-a')).toBeTruthy()
    expect(screen.getByText('当前')).toBeTruthy()
    expect(screen.getByText('proj-b')).toBeTruthy()
    // 当前组自动首拉：非 md 不入树
    expect(await screen.findByRole('button', { name: '打开 a.md' })).toBeTruthy()
    expect(screen.queryByText('x.txt')).toBeNull()
    // 非当前组收起：不渲染其文件
    expect(screen.queryByRole('button', { name: '打开 b.md' })).toBeNull()
    // 结构约束：无 button 嵌套
    expect(container.querySelectorAll('button button').length).toBe(0)
    console_.restore()
  })

  it('懒加载：非当前组首次展开才 readTree(root)；目录行再展开显子文件', async () => {
    renderTree()
    expect(await screen.findByRole('button', { name: '打开 a.md' })).toBeTruthy()
    expect(apiMock().readTree).not.toHaveBeenCalledWith('/b')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /proj-b/ }))
      await Promise.resolve()
    })
    expect(await screen.findByRole('button', { name: '打开 b.md' })).toBeTruthy()
    expect(apiMock().readTree).toHaveBeenCalledWith('/b')
    // 目录默认收起：c.md 尚不可见，点目录行后出现
    expect(screen.queryByRole('button', { name: '打开 notes/c.md' })).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'notes' }))
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: '打开 notes/c.md' })).toBeTruthy()
  })

  it('当前组点文件：不切工作区，readFile → openDoc → 跳 /editor', async () => {
    renderTree()
    const row = await screen.findByRole('button', { name: '打开 a.md' })
    await act(async () => {
      fireEvent.click(row)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(apiMock().openWorkspaceByPath).not.toHaveBeenCalled()
    expect(apiMock().readFile).toHaveBeenCalledWith('a.md')
    expect(workspaceStore.get().activePath).toBe('a.md')
    expect(workspaceStore.get().content).toBe('# a.md')
    expect(pushMock).toHaveBeenCalledWith('/editor')
  })

  it('非当前组点文件：先切工作区再读取并跳 /editor', async () => {
    renderTree()
    expect(await screen.findByRole('button', { name: '打开 a.md' })).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /proj-b/ }))
      await Promise.resolve()
    })
    const row = await screen.findByRole('button', { name: '打开 b.md' })
    await act(async () => {
      fireEvent.click(row)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(apiMock().openWorkspaceByPath).toHaveBeenCalledWith('/b')
    expect(apiMock().readFile).toHaveBeenCalledWith('b.md')
    expect(pushMock).toHaveBeenCalledWith('/editor')
  })

  it('失效组：呈「无法访问」，再次点击重试成功后显文件', async () => {
    let bCalls = 0
    const readTree = vi.fn(async (root?: string) => {
      if (root !== '/b') return TREE_A
      bCalls += 1
      if (bCalls === 1) throw new Error('项目目录不存在或不可访问')
      return TREE_B
    })
    installApi({ readTree })
    renderTree()
    expect(await screen.findByRole('button', { name: '打开 a.md' })).toBeTruthy()

    // 首次展开：拉取失败 →「无法访问」
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /proj-b/ }))
      await Promise.resolve()
    })
    expect(await screen.findByText('无法访问')).toBeTruthy()
    // 收起后再次展开：重试成功 → 文件可见
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /proj-b/ }))
      await Promise.resolve()
    })
    expect(screen.queryByText('无法访问')).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /proj-b/ }))
      await Promise.resolve()
    })
    await waitFor(() => expect(screen.getByRole('button', { name: '打开 b.md' })).toBeTruthy())
    // readTree 共 3 次：挂载首拉 /a + /b 失败 + /b 重试成功
    expect(readTree).toHaveBeenCalledTimes(3)
    expect(bCalls).toBe(2)
  })

  it('空项目：展开后呈「没有 Markdown 文件」引导', async () => {
    installApi({ readTree: vi.fn(async () => []) })
    renderTree()
    expect(await screen.findByRole('button', { name: /proj-a/ })).toBeTruthy()
    expect(await screen.findByText('该项目下没有 Markdown 文件')).toBeTruthy()
  })

  it('空态：无工作区无最近项目时给「打开本地目录」入口，点击走 openWorkspace', async () => {
    installApi({
      getWorkspace: vi.fn(async () => null),
      listRecentWorkspaces: vi.fn(async () => [])
    })
    const console_ = captureRenderConsole()
    renderTree()
    const entry = await screen.findByRole('button', { name: '打开本地目录' })
    await act(async () => {
      fireEvent.click(entry)
      await Promise.resolve()
    })
    console_.restore()
    expect(apiMock().openWorkspace).toHaveBeenCalled()
  })
})
