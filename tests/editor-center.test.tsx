// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { resetEditorLiveStateForTests } from '../lib/editor-state'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import { HomePage } from '../components/home/HomePage'
import { EditorPage } from '../app/(shell)/editor/page'

/**
 * 编辑器中央单挂载（20261015-feature-workbench-shell task-7）：首页 EditorPanel
 * 退役，/editor 成为中央一等编辑面——双挂载点路由互斥模型收敛为单挂载
 * （workspaceStore/命令通道/EditorCommandHost 常驻机制不变，见 knowledge/editor.md）。
 * 编辑器内核行为仍由 editor-codemirror/editor-page 既有套件覆盖，此处断言挂载拓扑。
 */

const { pushMock, backMock } = vi.hoisted(() => ({ pushMock: vi.fn(), backMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: backMock })
}))

vi.mock('../components/editor/MarkdownEditor', () => ({
  MarkdownEditor: (): React.JSX.Element => <div data-testid="editor-mount" />
}))

beforeEach(() => {
  resetRenderEnv()
  ;(window as unknown as { api: unknown }).api = {
    getWorkspace: vi.fn(async () => null),
    listRecentWorkspaces: vi.fn(async () => []),
    readTree: vi.fn(async () => []),
    getAboutActivity: vi.fn(async () => null),
    getGithubIdentity: vi.fn(async () => null)
  }
  workspaceStore.switchWorkspace(null)
  resetEditorLiveStateForTests()
  pushMock.mockClear()
  backMock.mockClear()
})

describe('编辑器中央单挂载（EditorPanel 退役）', () => {
  it('首页不再挂载编辑器实例（EditorPanel 退役）', () => {
    const view = render(
      <LocaleProvider>
        <HomePage />
      </LocaleProvider>
    )
    expect(view.container.querySelector('[data-testid="editor-mount"]')).toBeNull()
    expect(view.container.querySelector('.cm-editor')).toBeNull()
  })

  it('首页保留热力图锚点卡片（回归）', () => {
    const console_ = captureRenderConsole()
    try {
      render(
        <LocaleProvider>
          <HomePage />
        </LocaleProvider>
      )
      expect(screen.getByLabelText('综合活动热力图')).toBeTruthy()
      expect(console_.errors).toEqual([])
    } finally {
      console_.restore()
    }
  })

  it('/editor 挂载编辑器（中央一等编辑面）', () => {
    render(
      <LocaleProvider>
        <EditorPage />
      </LocaleProvider>
    )
    expect(screen.getByTestId('editor-mount')).toBeTruthy()
  })

  it('/editor 与首页互斥：同树内仅一处编辑器挂载（单挂载守卫）', () => {
    const view = render(
      <LocaleProvider>
        <div>
          <HomePage />
          <EditorPage />
        </div>
      </LocaleProvider>
    )
    const mounts = view.container.querySelectorAll('[data-testid="editor-mount"]')
    expect(mounts.length).toBe(1)
  })

  it('/editor 返回按钮回首页（保留语义）', () => {
    render(
      <LocaleProvider>
        <EditorPage />
      </LocaleProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: /返回/ }))
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('/editor 冷启动无文档自动进入草稿会话（保留语义）', () => {
    render(
      <LocaleProvider>
        <EditorPage />
      </LocaleProvider>
    )
    expect(workspaceStore.get().activeDraftId ?? workspaceStore.get().content != null).toBeTruthy()
  })
})
