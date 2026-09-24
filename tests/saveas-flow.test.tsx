// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { EditorCommandHost } from '../components/capsule/sections/EditorSection'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { publishEditorCommand } from '../lib/editor-commands'
import { getFeedbackSnapshot, resetFeedbackForTests } from '../lib/feedback'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import type { WorkspaceInfo } from '@shared/types'

/**
 * saveAs 原生化流转（20260924-feature-native-save-dialog）：
 * 命令宿主认领 save/saveAs 后走「原生保存面板」四分支——
 * ① 无工作区 → openWorkspace 引导（取消则终止；成功则先捕获内容再切工作区，防 switchWorkspace 清文档）；
 * ② 面板取消 → 静默终止；③ 工作区外路径 → feedback Message 拒绝、会话保留；
 * ④ 成功 → writeFile + openDoc 转正 + 消费归属草稿。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() })
}))

const WS: WorkspaceInfo = {
  root: '/ws',
  name: 'ws',
  isGitRepo: false,
  branch: null,
  ahead: 0,
  behind: 0,
  github: null
}

function installApi(patch: Record<string, unknown>): void {
  ;(window as unknown as { api: unknown }).api = {
    openWorkspace: vi.fn(async () => WS),
    pickSaveLocation: vi.fn(async () => ({ canceled: true }) as const),
    writeFile: vi.fn(async (relPath: string, content: string) => ({ path: relPath, content, savedAt: 1 })),
    removeDraft: vi.fn(async () => undefined),
    listDrafts: vi.fn(async () => []),
    saveDraft: vi.fn(async (input: { id?: string | null; content: string }) => ({
      id: input.id ?? 'new-1',
      title: 't',
      excerpt: '',
      updatedAt: Date.now(),
      chars: input.content.length
    })),
    readDraft: vi.fn(async () => null),
    getWorkspace: vi.fn(async () => null),
    ...patch
  }
}

function apiMock<K extends string>(name: K): ReturnType<typeof vi.fn> {
  return (window as unknown as { api: Record<string, ReturnType<typeof vi.fn>> }).api[name]
}

beforeEach(() => {
  resetRenderEnv()
  resetFeedbackForTests()
  installApi({})
  workspaceStore.switchWorkspace(null)
})

function renderHost(): void {
  render(<LocaleProvider>{<EditorCommandHost />}</LocaleProvider>)
}

function fireSaveAs(): void {
  act(() => {
    publishEditorCommand({ kind: 'saveAs' })
  })
}

describe('saveAs 原生化流转', () => {
  it('无工作区：先 openWorkspace 引导（捕获内容防切换清文档），确认后相对化落盘并消费草稿', async () => {
    workspaceStore.openDraft('# 我的草稿\n\n正文', 'd1')
    apiMock('pickSaveLocation').mockImplementation(async () => ({ canceled: false, path: '/ws/posts/hello.md' }))
    const console_ = captureRenderConsole()
    renderHost()
    fireSaveAs()

    await waitFor(() => expect(workspaceStore.get().activePath).toBe('posts/hello.md'))
    console_.restore()

    expect(apiMock('openWorkspace')).toHaveBeenCalledTimes(1)
    expect(apiMock('pickSaveLocation')).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: '/ws', fileName: '我的草稿' })
    )
    expect(apiMock('writeFile')).toHaveBeenCalledWith('posts/hello.md', '# 我的草稿\n\n正文')
    // 归属草稿落盘后消费
    await waitFor(() => expect(apiMock('removeDraft')).toHaveBeenCalledWith('d1'))
    expect(workspaceStore.get().activeDraftId).toBeNull()
    expect(getFeedbackSnapshot().messages).toHaveLength(0)
  })

  it('无工作区但取消选目录：整个保存终止，内容保留', async () => {
    workspaceStore.openDraft('# 草稿', null)
    apiMock('openWorkspace').mockImplementation(async () => null)
    renderHost()
    fireSaveAs()

    await waitFor(() => expect(apiMock('openWorkspace')).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 10))
    expect(apiMock('pickSaveLocation')).not.toHaveBeenCalled()
    expect(apiMock('writeFile')).not.toHaveBeenCalled()
    expect(workspaceStore.get().content).toBe('# 草稿')
  })

  it('面板取消：静默终止，不落盘不提示', async () => {
    workspaceStore.switchWorkspace('/ws')
    workspaceStore.openDraft('# 草稿', null)
    renderHost()
    fireSaveAs()

    await waitFor(() => expect(apiMock('pickSaveLocation')).toHaveBeenCalledTimes(1))
    expect(apiMock('openWorkspace')).not.toHaveBeenCalled()
    expect(apiMock('writeFile')).not.toHaveBeenCalled()
    expect(workspaceStore.get().activePath).toBeNull()
    expect(workspaceStore.get().content).toBe('# 草稿')
    expect(getFeedbackSnapshot().messages).toHaveLength(0)
  })

  it('工作区外路径：feedback Message 拒绝、不落盘、会话保留', async () => {
    workspaceStore.switchWorkspace('/ws')
    workspaceStore.openDraft('# 草稿', 'd2')
    apiMock('pickSaveLocation').mockImplementation(async () => ({ canceled: false, path: '/elsewhere/x.md' }))
    renderHost()
    fireSaveAs()

    await waitFor(() => expect(getFeedbackSnapshot().messages).toHaveLength(1))
    expect(apiMock('writeFile')).not.toHaveBeenCalled()
    expect(workspaceStore.get().activePath).toBeNull()
    expect(workspaceStore.get().content).toBe('# 草稿')
    expect(workspaceStore.get().activeDraftId).toBe('d2')
  })

  it('有工作区成功保存：不带草稿归属时不触发 removeDraft', async () => {
    workspaceStore.switchWorkspace('/ws')
    workspaceStore.openDraft('# 独立稿', null)
    apiMock('pickSaveLocation').mockImplementation(async () => ({ canceled: false, path: '/ws/note.md' }))
    renderHost()
    fireSaveAs()

    await waitFor(() => expect(workspaceStore.get().activePath).toBe('note.md'))
    expect(apiMock('openWorkspace')).not.toHaveBeenCalled()
    expect(apiMock('removeDraft')).not.toHaveBeenCalled()
    expect(workspaceStore.get().dirty).toBe(false)
  })
})
