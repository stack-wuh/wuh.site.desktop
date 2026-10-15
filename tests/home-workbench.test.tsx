// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { upsertTask, resetTasksForTests } from '../lib/tasks'
import { resetEditorLiveStateForTests } from '../lib/editor-state'
import { resetRenderEnv } from './helpers/dom-env'
import { HomePage } from '../components/home/HomePage'

/**
 * 首页任务流（20261015-feature-workbench-shell task-11）：热力图首屏锚点保留 +
 * 任务导向卡组——继续写作（活跃文档一等入口）、草稿箱、插件动态（tasks 聚合）。
 * 信息架构从「按功能分区」转向「按任务流组织」（brief 决策 6）。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() })
}))

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 800
  })
})

function installApi(patch: Record<string, unknown> = {}): void {
  ;(window as unknown as { api: unknown }).api = {
    getWorkspace: vi.fn(async () => null),
    listRecentWorkspaces: vi.fn(async () => [{ path: '/a', name: 'proj-a', openedAt: 1 }]),
    readTree: vi.fn(async () => []),
    getAboutActivity: vi.fn(async () => null),
    getGithubIdentity: vi.fn(async () => null),
    listDrafts: vi.fn(async () => [
      { id: 'd1', title: '甲', excerpt: '', updatedAt: 1, chars: 10 },
      { id: 'd2', title: '乙', excerpt: '', updatedAt: 2, chars: 20 }
    ]),
    saveDraft: vi.fn(async (input: { id?: string | null; content: string }) => ({
      id: input.id ?? 'd-new',
      title: 't',
      excerpt: '',
      updatedAt: Date.now(),
      chars: input.content.length
    })),
    removeDraft: vi.fn(async () => undefined),
    ...patch
  }
}

function renderHome(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <HomePage />
    </LocaleProvider>
  )
}

beforeEach(() => {
  resetRenderEnv()
  resetTasksForTests()
  resetEditorLiveStateForTests()
  workspaceStore.switchWorkspace(null)
  installApi()
  pushMock.mockClear()
})

describe('首页任务流', () => {
  it('热力图锚点卡保留在首屏（回归）', () => {
    renderHome()
    expect(screen.getByLabelText('综合活动热力图')).toBeTruthy()
  })

  it('问候语渲染（未授权回落纯问候）', () => {
    renderHome()
    expect(screen.getByText(/好/)).toBeTruthy()
  })

  it('有活跃文档：继续写作卡显示文档路径与「打开」入口', () => {
    workspaceStore.openDoc('posts/重新设计工作台.md', '# t')
    renderHome()
    expect(screen.getByText('posts/重新设计工作台.md')).toBeTruthy()
    fireEvent.click(screen.getByTestId('home-continue-open'))
    expect(pushMock).toHaveBeenCalledWith('/editor')
  })

  it('无活跃文档：继续写作卡不渲染（避免空态卡占位）', () => {
    renderHome()
    expect(screen.queryByTestId('home-continue-open')).toBeNull()
  })

  it('草稿箱卡显示草稿数并直达草稿箱', async () => {
    renderHome()
    const card = await screen.findByTestId('home-drafts-card')
    await waitFor(() => expect(card.textContent).toContain('2'))
    fireEvent.click(card)
    expect(pushMock).toHaveBeenCalledWith('/drafts')
  })

  it('插件动态区聚合 tasks 来源插件与进行中计数', () => {
    upsertTask('image-host', 't1', { title: '上传截图', status: 'in_progress', progress: { current: 2, total: 6 } })
    upsertTask('git-history', 't2', { title: '提交推送', status: 'done' })
    renderHome()
    expect(screen.getByText('image-host')).toBeTruthy()
    expect(screen.getByTestId('home-plugins-card').textContent).toContain('git-history')
  })
})
