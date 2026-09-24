// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { DraftsPage } from '../app/(shell)/drafts/page'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import type { DraftMeta } from '@shared/drafts'

/**
 * 草稿箱页渲染冒烟（20260924-feature-editor-simplify-draft-box）：
 * 真实 DOM 环境断言渲染期零 React 告警 + 列表/空态/编辑中高亮结构 +
 * 「继续编辑」经 readDraft → openDraft 的联动（router 走 mock）。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() })
}))

const DRAFTS: DraftMeta[] = [
  {
    id: 'd1',
    title: '未存稿的灵感',
    excerpt: '关于草稿箱的一段开头',
    updatedAt: Date.now() - 60_000,
    chars: 120
  },
  { id: 'd2', title: '', excerpt: '', updatedAt: Date.now() - 120_000, chars: 8 }
]

function installApi(patch: Record<string, unknown>): void {
  ;(window as unknown as { api: unknown }).api = {
    listDrafts: vi.fn(async () => DRAFTS),
    readDraft: vi.fn(async (id: string) => (id === 'd1' ? '# 未存稿的灵感\n正文' : null)),
    removeDraft: vi.fn(async () => undefined),
    getWorkspace: vi.fn(async () => null),
    ...patch
  }
}

beforeEach(() => {
  resetRenderEnv()
  installApi({})
  workspaceStore.switchWorkspace(null)
})

function renderPage(): ReturnType<typeof render> {
  return render(<LocaleProvider>{<DraftsPage />}</LocaleProvider>)
}

describe('草稿箱页渲染冒烟', () => {
  it('列表：标题/摘要/元信息齐备，空标题回落「无标题草稿」，零 React 告警', async () => {
    const console_ = captureRenderConsole()
    const { container } = renderPage()
    expect(await screen.findByText('未存稿的灵感')).toBeTruthy()
    console_.restore()

    expect(screen.getByText('关于草稿箱的一段开头')).toBeTruthy()
    expect(screen.getByText('无标题草稿')).toBeTruthy()
    expect(screen.getByText(/2 篇草稿/)).toBeTruthy()
    // 结构约束：行内两个按钮为兄弟节点，无 button 嵌套
    expect(container.querySelectorAll('button button').length).toBe(0)
    expect(container.querySelectorAll('li button')).toHaveLength(4)
  })

  it('空态：展示引导文案，零 React 告警', async () => {
    installApi({ listDrafts: vi.fn(async () => []) })
    const console_ = captureRenderConsole()
    renderPage()
    expect(await screen.findByText('还没有草稿。在首页写下第一个字，它会自动暂存在这里。')).toBeTruthy()
    console_.restore()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('编辑中草稿高亮「编辑中」标记，零 React 告警', async () => {
    workspaceStore.openDraft('# 未存稿的灵感', 'd1')
    const console_ = captureRenderConsole()
    renderPage()
    expect(await screen.findByText('编辑中')).toBeTruthy()
    console_.restore()
  })

  it('点击行经 readDraft 载入草稿并跳首页（openDraft 归属会话）', async () => {
    const console_ = captureRenderConsole()
    const { container } = renderPage()
    const row = await screen.findByText('未存稿的灵感')
    await act(async () => {
      fireEvent.click(row)
      await Promise.resolve()
    })
    console_.restore()

    expect(container.querySelectorAll('button button').length).toBe(0)
    expect(workspaceStore.get().activeDraftId).toBe('d1')
    expect(workspaceStore.get().activePath).toBeNull()
    expect(workspaceStore.get().content).toBe('# 未存稿的灵感\n正文')
    expect(workspaceStore.get().dirty).toBe(false)
    expect(pushMock).toHaveBeenCalledWith('/')
  })
})
