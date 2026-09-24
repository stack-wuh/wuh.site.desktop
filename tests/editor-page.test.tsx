// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { resetEditorLiveStateForTests } from '../lib/editor-state'
import { subscribeEditorCommands, type EditorCommand } from '../lib/editor-commands'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import { EditorPage } from '../app/(shell)/editor/page'

/**
 * 统一编辑页渲染冒烟（20260924-feature-projects-editor-page）：
 * 页面 chrome（极简顶栏/面包屑两态/保存可用性/冷启动自动新草稿）+ 零 React 告警。
 * 20260924-feature-breadcrumb-doc-ops 起面包屑可交互：完整路径渲染、目录段发
 * transferDoc、文件名段原地改名发 renameDoc、草稿态禁用。
 * CM6 内核在 happy-dom 下从未挂载过（无既有先例），本页测试 mock MarkdownEditor——
 * 编辑器内核行为由 tests/editor-codemirror.test.ts（纯逻辑）与手动走查覆盖。
 */

const { pushMock, backMock } = vi.hoisted(() => ({ pushMock: vi.fn(), backMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: backMock })
}))

vi.mock('../components/editor/MarkdownEditor', () => ({
  MarkdownEditor: (): React.JSX.Element => <div data-testid="editor-mount" />
}))

function installApi(patch: Record<string, unknown>): void {
  ;(window as unknown as { api: unknown }).api = {
    getWorkspace: vi.fn(async () => ({
      root: '/a',
      name: 'proj-a',
      isGitRepo: false,
      branch: null,
      ahead: 0,
      behind: 0,
      github: null
    })),
    ...patch
  }
}

const apiMock = (): Record<string, ReturnType<typeof vi.fn>> =>
  (window as unknown as { api: Record<string, ReturnType<typeof vi.fn>> }).api

/** 订阅命令通道收集发布记录（页面只发布、宿主在胶囊常驻，测试里用订阅者截获） */
function captureCommands(): { commands: EditorCommand[]; unsubscribe: () => void } {
  const commands: EditorCommand[] = []
  const unsubscribe = subscribeEditorCommands((cmd) => {
    commands.push(cmd)
    return true
  })
  return { commands, unsubscribe }
}

beforeEach(() => {
  resetRenderEnv()
  installApi({})
  workspaceStore.switchWorkspace(null)
  resetEditorLiveStateForTests()
  pushMock.mockClear()
  backMock.mockClear()
})

function renderPage(): ReturnType<typeof render> {
  return render(<LocaleProvider>{<EditorPage />}</LocaleProvider>)
}

describe('统一编辑页渲染冒烟', () => {
  it('冷启动：自动进入新草稿会话，面包屑「无项目 / 新草稿」，保存禁用，零 React 告警', async () => {
    installApi({ getWorkspace: vi.fn(async () => null) })
    const console_ = captureRenderConsole()
    renderPage()
    await screen.findByText('新草稿')
    await screen.findByText('无项目')
    console_.restore()

    expect(workspaceStore.get().activePath).toBeNull()
    expect(workspaceStore.get().content).toBe('')
    expect(workspaceStore.get().dirty).toBe(false)
    expect(screen.getByText('/')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存当前文档' })).toHaveProperty('disabled', true)
    expect(screen.getByTestId('editor-mount')).toBeTruthy()
  })

  it('文档会话：面包屑为完整相对路径「项目名 / 目录段 / 文件名」，脏点随编辑出现', async () => {
    workspaceStore.openDoc('posts/hello.md', '# hello')
    const console_ = captureRenderConsole()
    renderPage()
    await screen.findByText('hello.md')
    // 项目名来自挂载后异步 getWorkspace：必须 findByText 等待渲染提交（getByText 在整包负载下 flake）
    await screen.findByText('proj-a')
    console_.restore()

    // 完整路径：目录段独立成段（posts），分隔符 2 个
    expect(screen.getByText('posts')).toBeTruthy()
    expect(screen.getAllByText('/')).toHaveLength(2)
    // 干净文档不可保存（与首页面板 canSave 语义一致）
    expect(screen.queryByTitle('有未保存更改')).toBeNull()
    expect(screen.getByRole('button', { name: '保存当前文档' })).toHaveProperty('disabled', true)
    await act(async () => {
      workspaceStore.setContent('# hello 改')
    })
    expect(screen.getByTitle('有未保存更改')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存当前文档' })).toHaveProperty('disabled', false)
  })

  it('点目录段经命令通道发布 transferDoc（迁移/复制入口在宿主）', async () => {
    workspaceStore.openDoc('posts/2026/hello.md', '# hello')
    const { commands, unsubscribe } = captureCommands()
    const console_ = captureRenderConsole()
    renderPage()
    await screen.findByText('hello.md')
    console_.restore()

    await act(async () => {
      fireEvent.click(screen.getByText('2026'))
    })
    expect(commands.some((c) => c.kind === 'transferDoc')).toBe(true)
    unsubscribe()
  })

  it('点文件名原地变输入框，Enter 提交 renameDoc，Esc 取消', async () => {
    workspaceStore.openDoc('posts/hello.md', '# hello')
    const { commands, unsubscribe } = captureCommands()
    const console_ = captureRenderConsole()
    renderPage()
    await screen.findByText('hello.md')
    console_.restore()

    await act(async () => {
      fireEvent.click(screen.getByText('hello.md'))
    })
    const input = screen.getByRole('textbox', { name: '重命名文档' })
    await act(async () => {
      fireEvent.change(input, { target: { value: 'world.md' } })
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    const rename = commands.find((c): c is Extract<EditorCommand, { kind: 'renameDoc' }> => c.kind === 'renameDoc')
    expect(rename?.newName).toBe('world.md')
    expect(screen.queryByRole('textbox', { name: '重命名文档' })).toBeNull()

    // Esc 取消：再进编辑态改值后按 Esc，输入框消失且不发布命令
    // （click 与查询必须分属两个 act：离散事件的状态刷新在 act 收尾才提交）
    await act(async () => {
      fireEvent.click(screen.getByText('hello.md'))
    })
    const input2 = screen.getByRole('textbox', { name: '重命名文档' })
    await act(async () => {
      fireEvent.change(input2, { target: { value: 'other.md' } })
      fireEvent.keyDown(input2, { key: 'Escape' })
    })
    expect(screen.queryByRole('textbox', { name: '重命名文档' })).toBeNull()
    const renames = commands.filter((c) => c.kind === 'renameDoc')
    expect(renames).toHaveLength(1)
    unsubscribe()
  })

  it('草稿会话：文件名段为纯文本「新草稿」不可点，无目录段', async () => {
    workspaceStore.openDraft('# 未存稿', 'd1')
    const console_ = captureRenderConsole()
    renderPage()
    await screen.findByText('新草稿')
    console_.restore()

    expect(screen.queryByRole('button', { name: '新草稿' })).toBeNull()
    expect(screen.getAllByText('/')).toHaveLength(1)
  })

  it('草稿会话：继续编辑草稿时面包屑仍为新草稿，有内容即可保存', async () => {
    workspaceStore.openDraft('# 未存稿', 'd1')
    const console_ = captureRenderConsole()
    renderPage()
    await screen.findByText('新草稿')
    await screen.findByText('proj-a')
    console_.restore()

    expect(screen.getByRole('button', { name: '保存当前文档' })).toHaveProperty('disabled', false)
  })

  it('返回：有历史时 router.back，冷启动直达（无历史）回首页', () => {
    const console_ = captureRenderConsole()
    renderPage()
    console_.restore()

    const backBtn = screen.getByRole('button', { name: '返回' })
    window.history.pushState({}, '', '/editor')
    fireEvent.click(backBtn)
    expect(backMock).toHaveBeenCalled()

    // 模拟无历史：history.length === 1 时回首页
    vi.stubGlobal('history', { length: 1, pushState: window.history.pushState })
    fireEvent.click(backBtn)
    expect(pushMock).toHaveBeenCalledWith('/')
    vi.unstubAllGlobals()
  })

  it('顶栏动作经命令通道发布（新建/保存按钮可点击不抛错）', async () => {
    const console_ = captureRenderConsole()
    renderPage()
    await screen.findByText('新草稿')
    console_.restore()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '新建' }))
      fireEvent.click(screen.getByRole('button', { name: '保存当前文档' }))
      await Promise.resolve()
    })
    expect(screen.getByTestId('editor-mount')).toBeTruthy()
    expect(apiMock().getWorkspace).toHaveBeenCalled()
  })
})
