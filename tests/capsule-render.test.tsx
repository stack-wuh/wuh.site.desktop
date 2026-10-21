// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import type { ReactElement } from 'react'
import { CapsulePanel } from '../components/capsule/CapsulePanel'
import { Capsule } from '../components/capsule/Capsule'
import { EditorSection } from '../components/capsule/sections/EditorSection'
import { registerManifestCapsule, removeCapsuleTab, updateCapsule, updateCapsuleTab } from '../lib/capsule'
import { registerManifestTasks, upsertTask } from '../lib/tasks'
import { subscribeEditorCommands } from '../lib/editor-commands'
import { workspaceStore } from '../lib/store'
import { LocaleProvider } from '../lib/i18n/context'
import type { PluginManifest } from '@shared/plugin'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

/**
 * 控制中心渲染冒烟（20260923-test-dom-render-guard）：在真实 DOM 环境里挂载组件，
 * 断言渲染期零 React 告警（非法 DOM 嵌套/无效 props/缺失 key 都经 console.error
 * 报出——20260923-fix-capsule-doc-card-nesting 的 button 嵌套即此类）与关键结构约束。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() })
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

describe('控制中心渲染冒烟（20261017-feature-app-layout-workbench D4）', () => {
  it('空态：磁贴网格 + 任务空态 + 编辑器分区并存（无 tab 屏障），零告警且无 button 嵌套', () => {
    const console_ = captureRenderConsole()
    const { container } = renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(console_.errors).toEqual([])
    expect(console_.warnings).toEqual([])
    console_.restore()

    // 任务分区：空态与筛选 chips 直接可见
    expect(screen.getByText('等待插件任务')).toBeTruthy()
    expect(container.querySelector('[data-testid="capsule-timeline"]')).toBeNull()
    expect(screen.getByRole('button', { name: '全部' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '未完成' }).getAttribute('aria-pressed')).toBe('false')
    // 磁贴 4×2：开关磁贴带 aria-pressed（即时渲染/大纲跟随默认开）
    expect(screen.getByRole('button', { name: '即时渲染' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '大纲跟随' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '专注模式' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: '查找替换' })).toBeTruthy()
    // 编辑器分区并存：文档卡动作钮直接可达（旧模块 tab 屏障退役）
    expect(screen.getByRole('button', { name: '保存' })).toBeTruthy()
    expect(container.querySelectorAll('button button').length).toBe(0)
  })

  it('有任务与插件模块时：时间线行与插件 tile 分区并存渲染，零告警', () => {
    registerManifestTasks(MANIFEST)
    upsertTask('acme', 'publish', { status: 'in_progress', progress: { current: 1, total: 3 } })
    registerManifestCapsule(MANIFEST)
    updateCapsule('acme', 'issues', { value: 12, label: '个 open', detail: '2 分钟前同步' })

    const console_ = captureRenderConsole()
    const { container } = renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(console_.errors).toEqual([])
    console_.restore()

    // 任务分区：时间线（标题 + 来源徽标 + 进度计数），单插件不出现插件 pill
    expect(container.querySelector('[data-testid="capsule-timeline"]')).not.toBeNull()
    expect(screen.getByText('发布 Issue')).toBeTruthy()
    expect(screen.getByText('acme')).toBeTruthy()
    expect(screen.getByText('1/3')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'acme' })).toBeNull()

    // 插件模块分区并存渲染（宿主白名单模板），无需切 tab
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

  it('新草稿态：显示占位提示；开关磁贴上收控制中心（分区不再承载 switch），零 React 告警', () => {
    workspaceStore.startDraft()

    const console_ = captureRenderConsole()
    renderWithLocale(<EditorSection />)

    expect(console_.errors).toEqual([])
    console_.restore()

    expect(screen.getByText('新草稿')).toBeTruthy()
    expect(screen.queryByRole('switch', { name: '即时渲染' })).toBeNull()
  })
})


describe('胶囊插件 tab 追加分区渲染（20261017 D4：tabs 降为分区，契约不变）', () => {
  const TAB_MANIFEST: PluginManifest = {
    id: 'git-history',
    name: 'Git 历史',
    version: '1.0.0',
    views: [{ id: 'git', area: 'main', title: 'Git 历史', icon: 'git-branch', entry: 'view/index.html', order: 20 }],
    publishers: [],
    tabs: [{ id: 'git', title: 'Git', icon: 'git-branch' }],
    permissions: []
  }

  beforeEach(() => {
    pushMock.mockClear()
  })

  it('未上报（hidden）不出分区；运行时上报后追加分区渲染 sections/rows，零告警', () => {
    registerManifestCapsule(TAB_MANIFEST)
    const console_ = captureRenderConsole()
    const { container } = renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(screen.queryByText('Git')).toBeNull()

    act(() => {
      updateCapsuleTab('git-history', 'git', {
        sections: [
          {
            title: '变更文件',
            rows: [{ icon: 'file-text', text: 'M lib/capsule.ts', detail: '已修改', tone: 'primary', viewId: 'git' }]
          },
          { rows: [{ text: '9f71164 docs(shadow)…' }] }
        ]
      })
    })

    expect(screen.getByText('Git')).toBeTruthy()
    expect(screen.getByText('变更文件')).toBeTruthy()
    expect(screen.getByText('M lib/capsule.ts')).toBeTruthy()
    expect(screen.getByText('已修改')).toBeTruthy()
    expect(screen.getByText('9f71164 docs(shadow)…')).toBeTruthy()
    expect(container.querySelectorAll('button button').length).toBe(0)
    expect(console_.errors).toEqual([])
    expect(console_.warnings).toEqual([])
    console_.restore()
  })

  it('含 viewId 的行整行可点：跳来源插件视图并关面板', () => {
    registerManifestCapsule(TAB_MANIFEST)
    updateCapsuleTab('git-history', 'git', {
      sections: [{ rows: [{ text: 'M lib/capsule.ts', viewId: 'git' }] }]
    })
    const onClose = vi.fn()
    renderWithLocale(<CapsulePanel onClose={onClose} />)

    const row = screen.getByText('M lib/capsule.ts').closest('button')
    expect(row).toBeTruthy()
    act(() => {
      fireEvent.click(row!)
    })
    expect(pushMock).toHaveBeenCalledWith('/plugin/git-history/git')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('removeTab 后分区消失（任务分区不受影响）', () => {
    registerManifestCapsule(TAB_MANIFEST)
    updateCapsuleTab('git-history', 'git', { sections: [{ rows: [{ text: 'x' }] }] })
    renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(screen.getByText('x')).toBeTruthy()

    act(() => {
      removeCapsuleTab('git-history', 'git')
    })
    expect(screen.queryByText('Git')).toBeNull()
    // 任务分区仍在：空态可见
    expect(screen.getByText('等待插件任务')).toBeTruthy()
  })

  it('无 section 空数据：分区在但显示空态文案', () => {
    registerManifestCapsule(TAB_MANIFEST)
    updateCapsuleTab('git-history', 'git', { sections: [] })
    renderWithLocale(<CapsulePanel onClose={() => undefined} />)

    expect(screen.getByText('暂无数据')).toBeTruthy()
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

describe('发布磁贴（20261020-feature-publish-interaction）', () => {
  it('无文档：禁用并显示「无文档」', () => {
    workspaceStore.closeDoc()
    renderWithLocale(<CapsulePanel onClose={() => undefined} />)
    const tile = screen.getByTestId('publish-tile') as HTMLButtonElement
    expect(tile.disabled).toBe(true)
    expect(tile.textContent).toContain('无文档')
    expect(tile.textContent).toContain('GITHUB')
  })

  it('未保存草稿（有内容无路径）：禁用并提示先保存', () => {
    workspaceStore.startDraft()
    workspaceStore.setContent('---\ntitle: T\n---\n\nbody')
    renderWithLocale(<CapsulePanel onClose={() => undefined} />)
    const tile = screen.getByTestId('publish-tile') as HTMLButtonElement
    expect(tile.disabled).toBe(true)
    expect(tile.textContent).toContain('先保存文档')
  })

  it('缺 title：禁用并提示缺少 title', () => {
    workspaceStore.openDoc('notes/b.md', '---\nlabels: [x]\n---\n\nbody')
    renderWithLocale(<CapsulePanel onClose={() => undefined} />)
    const tile = screen.getByTestId('publish-tile') as HTMLButtonElement
    expect(tile.disabled).toBe(true)
    expect(tile.textContent).toContain('缺少 title')
  })

  it('已发布文档：显示已发布 #N，点击经命令通道发布 publishDoc', () => {
    workspaceStore.openDoc('notes/a.md', '---\ntitle: A\nissue: 12\n---\n\nbody')
    const seen: string[] = []
    const off = subscribeEditorCommands((cmd) => {
      seen.push(cmd.kind)
      return true
    })
    renderWithLocale(<CapsulePanel onClose={() => undefined} />)
    const tile = screen.getByTestId('publish-tile') as HTMLButtonElement
    expect(tile.disabled).toBe(false)
    expect(tile.textContent).toContain('已发布 #12')
    expect(tile.getAttribute('aria-pressed')).toBe('true')
    act(() => {
      fireEvent.click(tile)
    })
    expect(seen).toContain('publishDoc')
    off()
  })

  it('未发布文档：显示未发布态并可点击', () => {
    workspaceStore.openDoc('notes/c.md', '---\ntitle: C\n---\n\nbody')
    renderWithLocale(<CapsulePanel onClose={() => undefined} />)
    const tile = screen.getByTestId('publish-tile') as HTMLButtonElement
    expect(tile.disabled).toBe(false)
    expect(tile.textContent).toContain('未发布')
    expect(tile.getAttribute('aria-pressed')).toBe('false')
  })
})
