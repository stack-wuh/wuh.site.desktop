// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'
import { Capsule } from '../components/capsule/Capsule'
import { upsertTask } from '../lib/tasks'
import { resetDockForTests } from '../lib/dock'

/**
 * 胶囊单形态（20261017-feature-app-layout-workbench D5 Dock 退役改造，原双形态
 * 20261015-feature-workbench-shell task-5）：chip（微进度环 + ghost 药丸 + mono
 * 计数）信号位原样保留；控制中心下拉是唯一展开面——「停靠到底部 Dock」按钮与
 * 底部 Dock 全部退役（控制中心承接聚合职责，不设第二聚合点）。开合状态在
 * lib/dock 注册表（进程内，跨路由不丢）。
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/'
}))

function renderCapsule(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <Capsule />
    </LocaleProvider>
  )
}

describe('胶囊单形态（控制中心下拉）', () => {
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

  it('chip 点击开控制中心面板（aria-expanded 同步），再点收起', () => {
    renderCapsule()
    const chip = screen.getByTestId('capsule')
    fireEvent.click(chip)
    expect(chip.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('capsule-panel')).toBeTruthy()
    fireEvent.click(chip)
    expect(chip.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('capsule-panel')).toBeNull()
  })

  it('Dock 退役：无「停靠」按钮、无 dockbar/dock-panel/dock 页签残留（D5）', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    expect(screen.queryByTestId('capsule-dock-btn')).toBeNull()
    expect(screen.queryByTestId('dockbar')).toBeNull()
    expect(screen.queryByTestId('dock-panel')).toBeNull()
    expect(screen.queryByTestId('dock-tab-tasks')).toBeNull()
  })

  it('Esc 收面板（单形态恒可收，无停靠豁免）', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(screen.queryByTestId('capsule-panel')).toBeNull()
    expect(screen.getByTestId('capsule').getAttribute('aria-expanded')).toBe('false')
  })

  it('点外关守卫：点外关收面板（target 归属豁免面板内点击）', () => {
    renderCapsule()
    fireEvent.click(screen.getByTestId('capsule'))
    fireEvent.click(document.body)
    expect(screen.queryByTestId('capsule-panel')).toBeNull()
    fireEvent.click(screen.getByTestId('capsule'))
    const panel = document.querySelector('[data-testid="capsule-panel"]')!
    fireEvent.click(panel)
    expect(screen.queryByTestId('capsule-panel')).not.toBeNull()
  })

  it('有任务时 chip 显 mono 聚合计数，面板任务分区同名呈现', () => {
    upsertTask('git-history', 't1', { title: '提交推送', status: 'in_progress', progress: { current: 1, total: 2 } })
    upsertTask('git-history', 't2', { title: '拉取', status: 'done' })
    renderCapsule()
    expect(screen.getByTestId('capsule').textContent).toContain('1/2')
    fireEvent.click(screen.getByTestId('capsule'))
    expect(screen.getByText('提交推送')).toBeTruthy()
  })
})
