// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { workspaceStore } from '../lib/store'
import { resetEditorLiveStateForTests } from '../lib/editor-state'
import { subscribeEditorCommands, type EditorCommand } from '../lib/editor-commands'
import {
  registerManifestPanelTabs,
  resetPanelTabsForTests,
  updatePanelTab
} from '../lib/panelTabs'
import { resetRenderEnv } from './helpers/dom-env'
import { EditorPage } from '../app/(shell)/editor/page'

/**
 * 编辑器右缘上下文侧栏（20261015-feature-workbench-shell task-9）：与当前文档
 * 相关的上下文工具停靠——大纲（跳转经命令通道）、元数据（只读快照，编辑入口
 * 归 Frontmatter 插件视图——editor.md 约束：壳层不重建元数据表单）、图床（入口
 * 跳转）+ 插件 area=context 页签（声明制，sections/rows 结构化）。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() })
}))

const DOC = '---\ntitle: 重新设计工作台\ntags: [design]\n---\n\n# 为什么要推翻\n\n正文\n\n## 停靠区与插件契约\n\n正文'

function installApi(): void {
  ;(window as unknown as { api: unknown }).api = {
    getWorkspace: vi.fn(async () => null),
    listRecentWorkspaces: vi.fn(async () => [])
  }
}

function renderPage(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <EditorPage />
    </LocaleProvider>
  )
}

beforeEach(() => {
  resetRenderEnv()
  resetPanelTabsForTests()
  installApi()
  workspaceStore.switchWorkspace(null)
  resetEditorLiveStateForTests()
  pushMock.mockClear()
})

describe('编辑器上下文侧栏（右缘停靠）', () => {
  it('书耳浮笺默认收起（D3 假定 f），顶栏书耳钮开合并联动书口让位', () => {
    workspaceStore.openDoc('posts/a.md', DOC)
    renderPage()
    const paneEl = document.querySelector('[data-editor-sidepane]')
    expect(paneEl?.getAttribute('data-open')).toBe('false')
    // 书口让位链：收起时 Spine 在场，展开即让位
    expect(document.querySelector('[data-testid="editor-spine"]')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '书耳' }))
    expect(document.querySelector('[data-editor-sidepane]')?.getAttribute('data-open')).toBe('true')
    expect(document.querySelector('[data-testid="editor-spine"]')).toBeNull()
  })

  it('渲染三壳层页签（大纲/元数据/图床），默认展示大纲', () => {
    workspaceStore.openDoc('posts/a.md', DOC)
    renderPage()
    // 书耳默认收起（D3 f）：内容页签断言统一在展开态进行
    fireEvent.click(screen.getByRole('button', { name: '书耳' }))
    expect(screen.getByRole('tab', { name: '大纲' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: '元数据' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '图床' })).toBeTruthy()
    // 大纲条目在侧栏内（CM6 源码区同样含标题文本，需圈定范围）
    const paneEl = document.querySelector('[data-editor-sidepane]')
    expect(paneEl?.textContent).toContain('为什么要推翻')
  })

  it('大纲条目点击发 scrollToHeading 命令（命令通道消费契约）', () => {
    const seen: EditorCommand[] = []
    const unsubscribe = subscribeEditorCommands((cmd) => {
      seen.push(cmd)
      return true
    })
    workspaceStore.openDoc('posts/a.md', DOC)
    renderPage()
    const paneEl2 = document.querySelector('[data-editor-sidepane]')
    const target = Array.from(paneEl2?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes('停靠区与插件契约'))
    expect(target).toBeTruthy()
    fireEvent.click(target as HTMLElement)
    expect(seen.some((c) => c.kind === 'scrollToHeading')).toBe(true)
    unsubscribe()
  })

  it('元数据页签只读展示 frontmatter 键值，编辑入口跳 Frontmatter 插件视图', () => {
    workspaceStore.openDoc('posts/a.md', DOC)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '书耳' }))
    fireEvent.click(screen.getByRole('tab', { name: '元数据' }))
    expect(screen.getByText('重新设计工作台')).toBeTruthy()
    // 壳层不重建元数据表单（editor.md 约束）：侧栏内不得出现输入控件
    //（CM6 编辑器本体在其外，不在此断言范围）
    const pane = document.querySelector('[data-editor-sidepane]')
    expect(pane?.querySelector('input, textarea')).toBeNull()
    const open = screen.getByTestId('sidepane-meta-open')
    fireEvent.click(open)
    expect(pushMock).toHaveBeenCalledWith('/plugin/frontmatter/frontmatter')
  })

  it('图床页签给上传引导入口（跳图床插件视图）', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '书耳' }))
    fireEvent.click(screen.getByRole('tab', { name: '图床' }))
    fireEvent.click(screen.getByTestId('sidepane-image-open'))
    expect(pushMock).toHaveBeenCalledWith('/plugin/image-host/image-host')
  })

  it('插件 area=context 页签声明并上报后出现在侧栏（sections/rows 渲染）', () => {
    registerManifestPanelTabs({
      id: 'git-history',
      name: 'Git 历史与回退',
      version: '1.1.0',
      views: [
        { id: 'ctx', area: 'context', title: 'Git 上下文', icon: 'git-branch', entry: 'c.html', order: 21 },
        { id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'v.html', order: 20 }
      ],
      publishers: [],
      permissions: []
    })
    act(() => {
      updatePanelTab('git-history', 'context', 'ctx', {
        sections: [{ rows: [{ text: 'main · 3 未提交', tone: 'warning' }] }]
      })
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '书耳' }))
    const tab = screen.getByRole('tab', { name: 'Git 上下文' })
    fireEvent.click(tab)
    expect(screen.getByText('main · 3 未提交')).toBeTruthy()
  })

  it('页签切换 aria-selected 同步', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '书耳' }))
    fireEvent.click(screen.getByRole('tab', { name: '元数据' }))
    expect(screen.getByRole('tab', { name: '元数据' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: '大纲' }).getAttribute('aria-selected')).toBe('false')
  })

  it('书耳钮开合浮笺（aria-pressed 同步；收起时页签离开可访问树）', () => {
    renderPage()
    const toggle = screen.getByRole('button', { name: '书耳' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('tab', { name: '大纲' })).toBeTruthy()
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('tab', { name: '大纲' })).toBeNull()
  })
})
