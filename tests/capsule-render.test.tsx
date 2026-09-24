// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import type { ReactElement } from 'react'
import { CapsulePanel } from '../components/capsule/CapsulePanel'
import { Capsule } from '../components/capsule/Capsule'
import { EditorSection } from '../components/capsule/sections/EditorSection'
import { registerManifestCapsule, updateCapsule } from '../lib/capsule'
import { registerManifestTasks, upsertTask } from '../lib/tasks'
import { workspaceStore } from '../lib/store'
import { LocaleProvider } from '../lib/i18n/context'
import type { PluginManifest } from '@shared/plugin'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

/**
 * 控制中心渲染冒烟（20260923-test-dom-render-guard）：在真实 DOM 环境里挂载组件，
 * 断言渲染期零 React 告警（非法 DOM 嵌套/无效 props/缺失 key 都经 console.error
 * 报出——20260923-fix-capsule-doc-card-nesting 的 button 嵌套即此类）与关键结构约束。
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

const MANIFEST: PluginManifest = {
  id: 'acme',
  name: 'Acme',
  version: '1.0.0',
  views: [{ id: 'main', area: 'main', title: 'Main', icon: 'tag', entry: 'view/index.html', order: 100 }],
  publishers: [],
  tasks: [{ id: 'publish', title: '发布 Issue', viewId: 'main' }],
  capsule: [{ id: 'issues', title: 'GitHub Issues', icon: 'github', template: 'count', viewId: 'main' }],
  permissions: []
}

beforeEach(() => resetRenderEnv())

/** 经 LocaleProvider 渲染：t() 才走真实字典（默认 context 直接回显 key） */
function renderWithLocale(ui: ReactElement): ReturnType<typeof render> {
  return render(<LocaleProvider>{ui}</LocaleProvider>)
}

/** 文档卡 = 控制中心内唯一含原生按钮的 role=group 容器 */
function docCardOf(container: HTMLElement): HTMLElement | null {
  const groups = Array.from(container.querySelectorAll<HTMLElement>('[role="group"]'))
  return groups.find((g) => g.querySelector('button') != null) ?? null
}

describe('任务中心渲染冒烟', () => {
  it('空态：默认任务 tab 显示等待空态与筛选 chips，零 React 告警且无 button 嵌套', () => {
    const console_ = captureRenderConsole()
    const { container } = renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(console_.errors).toEqual([])
    expect(console_.warnings).toEqual([])
    console_.restore()

    // 默认任务 tab：空态可见，时间线与模块 tab 内容未渲染
    expect(screen.getByText('等待插件任务')).toBeTruthy()
    expect(container.querySelector('[data-testid="capsule-timeline"]')).toBeNull()
    expect(screen.queryByText('保存')).toBeNull()
    // 筛选 chips：默认「全部」按下
    expect(screen.getByRole('button', { name: '全部' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '未完成' }).getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelectorAll('button button').length).toBe(0)
  })

  it('有任务与插件模块时：任务 tab 渲染时间线行，切模块 tab 渲染插件 tile，零告警', () => {
    registerManifestTasks(MANIFEST)
    upsertTask('acme', 'publish', { status: 'in_progress', progress: { current: 1, total: 3 } })
    registerManifestCapsule(MANIFEST)
    updateCapsule('acme', 'issues', { value: 12, label: '个 open', detail: '2 分钟前同步' })

    const console_ = captureRenderConsole()
    const { container } = renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(console_.errors).toEqual([])
    console_.restore()

    // 任务 tab：时间线（标题 + 来源徽标 + 进度计数），单插件不出现插件 pill
    expect(container.querySelector('[data-testid="capsule-timeline"]')).not.toBeNull()
    expect(screen.getByText('发布 Issue')).toBeTruthy()
    expect(screen.getByText('acme')).toBeTruthy()
    expect(screen.getByText('1/3')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'acme' })).toBeNull()

    // 切到模块 tab：插件 tile 渲染（宿主白名单模板）
    act(() => {
      fireEvent.click(screen.getByRole('tab', { name: '模块' }))
    })
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('个 open')).toBeTruthy()
    expect(container.querySelectorAll('button button').length).toBe(0)
  })

  it('已完成任务归入「最近完成」段并可一键清空，零告警', () => {
    registerManifestTasks(MANIFEST)
    upsertTask('acme', 'publish', { status: 'done' })

    const console_ = captureRenderConsole()
    const { container } = renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(console_.errors).toEqual([])
    console_.restore()

    expect(screen.getByText('最近完成 · 1')).toBeTruthy()
    act(() => {
      fireEvent.click(screen.getByTestId('capsule-clear-done'))
    })
    // 清空后任务隐藏，回到等待空态
    expect(screen.getByText('等待插件任务')).toBeTruthy()
    expect(container.querySelectorAll('button button').length).toBe(0)
  })
})

describe('编辑器模块区渲染冒烟', () => {
  it('已打开文档：显示路径，文档卡内 4 个动作钮，零 React 告警', () => {
    workspaceStore.openDoc('notes/2026/writing.md', '# 写作')

    const console_ = captureRenderConsole()
    const { container } = renderWithLocale(<EditorSection />)

    expect(console_.errors).toEqual([])
    console_.restore()

    expect(screen.getByText('notes/2026/writing.md')).toBeTruthy()
    expect(container.querySelectorAll('button button').length).toBe(0)
    const docCard = docCardOf(container)
    expect(docCard?.tagName).toBe('DIV')
    expect(Array.from(docCard?.querySelectorAll('button') ?? []).map((b) => b.textContent?.trim())).toEqual([
      '保存',
      '另存为',
      '新建',
      '关闭'
    ])
  })

  it('新草稿态：显示占位提示与开关 tile，零 React 告警', () => {
    workspaceStore.startDraft()

    const console_ = captureRenderConsole()
    renderWithLocale(<EditorSection />)

    expect(console_.errors).toEqual([])
    console_.restore()

    expect(screen.getByText('新草稿')).toBeTruthy()
    expect(screen.getByRole('switch', { name: '即时渲染' })).toBeTruthy()
  })
})


describe('胶囊 chip 开合与点外关语义（20260924-fix-capsule-self-close）', () => {
  function openCapsule(): {
    chip: HTMLButtonElement
    container: HTMLElement
    cleanup: () => void
  } {
    workspaceStore.startDraft()
    const rendered = renderWithLocale(<Capsule />)
    const chip = rendered.container.querySelector<HTMLButtonElement>('[data-testid="capsule"]')
    if (!chip) throw new Error('chip 未渲染')
    act(() => {
      fireEvent.click(chip)
    })
    return { chip, container: rendered.container, cleanup: rendered.unmount }
  }

  it('点 chip 打开面板；点面板内不关闭（点外关不得误伤胶囊内部）', () => {
    const { chip, cleanup: unmount } = openCapsule()
    expect(document.querySelector('[data-testid="capsule-panel"]')).not.toBeNull()

    const panel = document.querySelector('[data-testid="capsule-panel"]')!
    act(() => {
      fireEvent.click(panel)
    })
    expect(chip.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[data-testid="capsule-panel"]')).not.toBeNull()
    unmount()
    cleanup()
  })

  it('点胶囊外区域关闭面板', () => {
    const { cleanup: unmount } = openCapsule()
    expect(document.querySelector('[data-testid="capsule-panel"]')).not.toBeNull()

    act(() => {
      fireEvent.click(document.body)
    })
    expect(document.querySelector('[data-testid="capsule-panel"]')).toBeNull()
    unmount()
    cleanup()
  })

  it('面板打开时再点 chip：toggle 关闭且不因外关监听器重入', () => {
    const { chip, cleanup: unmount } = openCapsule()
    act(() => {
      fireEvent.click(chip)
    })
    expect(document.querySelector('[data-testid="capsule-panel"]')).toBeNull()
    expect(chip.getAttribute('aria-expanded')).toBe('false')
    unmount()
    cleanup()
  })

  it('Esc 关闭面板', () => {
    const { chip, cleanup: unmount } = openCapsule()
    expect(document.querySelector('[data-testid="capsule-panel"]')).not.toBeNull()

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(document.querySelector('[data-testid="capsule-panel"]')).toBeNull()
    expect(chip.getAttribute('aria-expanded')).toBe('false')
    unmount()
    cleanup()
  })
})
