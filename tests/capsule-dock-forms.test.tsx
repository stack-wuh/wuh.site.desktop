// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import { Capsule } from '../components/capsule/Capsule'
import { Dock } from '../components/dock'
import { upsertTask } from '../lib/tasks'
import { resetDockForTests } from '../lib/dock'

/**
 * 胶囊双形态（20261015-feature-workbench-shell task-5）：chip（微进度环 + ghost
 * 药丸 + mono 计数）信号位原样保留；任务中心面板保留下拉交互，新增「停靠到底部
 * Dock」——停靠后 chip 兼任 Dock 开关，「取消停靠」回退下拉。开合状态在 lib/dock
 * 注册表（进程内，跨路由不丢）。
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/'
}))

/** 按真实组合渲染：Capsule 挂 TitleBar、Dock 挂 Body 与 StatusBar 之间 */
function renderCapsule(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <Capsule />
      <Dock />
    </LocaleProvider>
  )
}

describe('胶囊双形态（下拉 ⇄ 停靠 Dock）', () => {
  beforeEach(() => {
    resetRenderEnv()
    resetDockForTests()
  })

  it('chip 渲染回归：testid/aria-expanded 初始 false、空态「就绪」', () => {
    const console_ = captureRenderConsole()
    try {
      renderCapsule()
      const chip = screen.getByTestId('capsule')
      expect(chip.getAttribute('aria-expanded')).toBe('false')
      expect(chip.textContent).toContain('就绪')
      expect(screen.queryByTestId('capsule-panel')).toBeNull()
      expect(console_.errors).toEqual([])
    } finally {
      console_.restore()
    }
  })

  it('chip 点击开下拉面板（aria-expanded 同步），再点收起', () => {
    renderCapsule()
    const chip = screen.getByTestId('capsule')
    fireEvent.click(chip)
    expect(chip.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('capsule-panel')).toBeTruthy()
    fireEvent.click(chip)
    expect(chip.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('capsule-panel')).toBeNull()
  })

  it('下拉面板底部有「停靠到底部 Dock」按钮', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    expect(screen.getByTestId('capsule-dock-btn')).toBeTruthy()
  })

  it('停靠：下拉关闭 → Dock 面板出现，chip aria-expanded 保持 true', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(screen.getByTestId('capsule-dock-btn'))
    expect(screen.queryByTestId('capsule-panel')).toBeNull()
    expect(screen.getByTestId('dock-panel')).toBeTruthy()
    expect(screen.getByTestId('capsule').getAttribute('aria-expanded')).toBe('true')
  })

  it('停靠态 chip 点击开合 Dock（收起回 dockbar，再点恢复）', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(screen.getByTestId('capsule-dock-btn'))
    fireEvent.click(screen.getByTestId('capsule'))
    expect(screen.queryByTestId('dock-panel')).toBeNull()
    expect(screen.getByTestId('dockbar')).toBeTruthy()
    fireEvent.click(screen.getByTestId('capsule'))
    expect(screen.getByTestId('dock-panel')).toBeTruthy()
  })

  it('取消停靠：Dock 面板消失、下拉面板重现（任务时间线跟着回下拉）', () => {
    upsertTask('image-host', 't1', { title: '上传截图', status: 'in_progress', progress: { current: 2, total: 6 } })
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(screen.getByTestId('capsule-dock-btn'))
    expect(screen.getByTestId('dock-tasks')).toBeTruthy()
    fireEvent.click(screen.getByTestId('dock-undock'))
    expect(screen.queryByTestId('dock-panel')).toBeNull()
    expect(screen.getByTestId('capsule-panel')).toBeTruthy()
    expect(screen.getByTestId('capsule-timeline')).toBeTruthy()
  })

  it('Esc 分层：未停靠收下拉；停靠态 Esc 不收 Dock（常驻面板，Esc 让位浮窗）', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(screen.queryByTestId('capsule-panel')).toBeNull()
    // 停靠态
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(screen.getByTestId('capsule-dock-btn'))
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(screen.getByTestId('dock-panel')).toBeTruthy()
  })

  it('点外关守卫：未停靠点外关收下拉；停靠态点外关不收 Dock', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(document.body)
    expect(screen.queryByTestId('capsule-panel')).toBeNull()
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(screen.getByTestId('capsule-dock-btn'))
    fireEvent.click(document.body)
    expect(screen.getByTestId('dock-panel')).toBeTruthy()
  })

  it('有任务时 chip 显 mono 聚合计数，停靠后 dock 任务页签同名呈现', () => {
    upsertTask('git-history', 't1', { title: '提交推送', status: 'in_progress', progress: { current: 1, total: 2 } })
    upsertTask('git-history', 't2', { title: '拉取', status: 'done' })
    renderCapsule()
    expect(screen.getByTestId('capsule').textContent).toContain('1/2')
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(screen.getByTestId('capsule-dock-btn'))
    expect(screen.getByTestId('dock-tab-tasks').getAttribute('aria-selected')).toBe('true')
  })
})
