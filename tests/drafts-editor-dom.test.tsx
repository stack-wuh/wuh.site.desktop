// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { act } from 'react'
import type { ReactElement } from 'react'
import { EditorPanel } from '../components/home/EditorPanel'
import { LocaleProvider } from '../lib/i18n/context'
import { installDraftAutosave } from '../lib/drafts'
import { workspaceStore } from '../lib/store'
import { publishEditorCommand } from '../lib/editor-commands'
import { resetRenderEnv } from './helpers/dom-env'

/**
 * 首页编辑器 → 草稿箱端到端集成（20260924 草稿不同步 bug 复现用）：
 * 真 CM6（EditorPanel 挂载）+ 真 store + 真 installDraftAutosave + 真实计时器。
 * 命令通道 insert 驱动 CM 事务（与生产 updateListener 同路径），断言 saveDraft 落盘调用。
 */

beforeEach(() => {
  resetRenderEnv()
  ;(window as unknown as { api: unknown }).api = {
    listDrafts: vi.fn(async () => []),
    saveDraft: vi.fn(async (input: { id?: string | null; content: string }) => ({
      id: input.id ?? 'e2e-1',
      title: 't',
      excerpt: '',
      updatedAt: Date.now(),
      chars: input.content.length
    })),
    removeDraft: vi.fn(async () => undefined),
    getWorkspace: vi.fn(async () => null),
    listRecentWorkspaces: vi.fn(async () => [])
  }
  workspaceStore.switchWorkspace(null)
})

function renderPanel(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>{<EditorPanel />}</LocaleProvider> as unknown as ReactElement
  )
}

describe('首页编辑器 → 草稿箱联动（真实组件链路）', () => {
  it('CM6 挂载成功且命令插入经 updateListener 同步 store', async () => {
    const uninstall = installDraftAutosave()
    const { container } = renderPanel()
    const cm = container.querySelector('.cm-content')
    expect(cm).not.toBeNull()

    await act(async () => {
      const consumed = publishEditorCommand({ kind: 'insert', snippet: 'table' })
      expect(consumed).toBe(true)
      await Promise.resolve()
    })
    expect(workspaceStore.get().content).toContain('| Header |')
    expect(workspaceStore.get().dirty).toBe(true)
    uninstall()
  })

  it('输入后真实计时链路：300ms doc.changed + 800ms 防抖后 saveDraft 被调用', async () => {
    vi.useRealTimers()
    const saveDraft = (window as unknown as { api: { saveDraft: ReturnType<typeof vi.fn> } }).api.saveDraft
    const uninstall = installDraftAutosave()
    renderPanel()

    await act(async () => {
      publishEditorCommand({ kind: 'insert', snippet: 'table' })
      await Promise.resolve()
    })
    // 300ms 防抖未到：不应触发
    await new Promise((r) => setTimeout(r, 150))
    expect(saveDraft).not.toHaveBeenCalled()
    // 300 + 800 + 余量
    await new Promise((r) => setTimeout(r, 1300))
    expect(saveDraft).toHaveBeenCalledTimes(1)
    expect(String(saveDraft.mock.calls[0][0].content)).toContain('| Header |')
    uninstall()
  }, 15000)
})
