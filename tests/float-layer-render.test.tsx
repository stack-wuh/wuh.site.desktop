// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { FloatLayer } from '../components/FloatLayer'
import { minimizeFloat, openFloat, resetFloatsForTests } from '../lib/floats'
import { LocaleProvider } from '../lib/i18n/context'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

/**
 * 浮窗层渲染冒烟（20260927-test-net-backfill）：
 * 空层零窗口零 chip；seed 单窗后窗口 chrome（dialog/标题/最小化/关闭）与
 * 最小化 chip 条（role=toolbar）互斥呈现；渲染期零 React 告警。
 * PluginView 以桩替换——沙箱帧导航（plugin:// 协议）不在 happy-dom 支持范围，
 * 帧生命周期由 plugin-broker/protocol 契约测试覆盖。
 * （20260927-fix-shell-ux-defects 合并适配：浮窗 chrome 文案走 i18n，渲染包 LocaleProvider）
 */

vi.mock('../components/plugins/PluginFrameHost', () => ({
  PluginView: () => <div data-testid="plugin-view-stub" />
}))

function seed(): void {
  openFloat(
    { pluginId: 'demo', viewId: 'panel', title: 'Demo 窗口', icon: 'sparkles', entry: 'index.html' },
    { width: 1200, height: 800 }
  )
}

beforeEach(() => {
  resetRenderEnv()
  resetFloatsForTests()
})

describe('FloatLayer 渲染冒烟', () => {
  it('空层：无窗口无 chip，渲染期零 React 告警', () => {
    const console_ = captureRenderConsole()
    const { container, unmount } = render(
      <LocaleProvider>
        <FloatLayer containerRef={createRef()} />
      </LocaleProvider>
    )
    expect(container.querySelector('[role="toolbar"]')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    unmount()
    console_.restore()
    expect(console_.errors).toEqual([])
    expect(console_.warnings).toEqual([])
  })

  it('seed 单窗：窗口 chrome 就位（标题/最小化/关闭）', () => {
    seed()
    render(
      <LocaleProvider>
        <FloatLayer containerRef={createRef()} />
      </LocaleProvider>
    )
    expect(screen.getByRole('dialog', { name: 'Demo 窗口' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '最小化 Demo 窗口' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '关闭 Demo 窗口' })).toBeTruthy()
    expect(screen.queryByRole('toolbar')).toBeNull()
  })

  it('最小化后窗口整体隐藏（退出可访问树），chip 条接管入口', () => {
    seed()
    render(
      <LocaleProvider>
        <FloatLayer containerRef={createRef()} />
      </LocaleProvider>
    )
    expect(screen.getByRole('dialog', { name: 'Demo 窗口' })).toBeTruthy()
    act(() => {
      minimizeFloat('demo:panel')
    })
    const toolbar = screen.getByRole('toolbar', { name: '最小化浮窗' })
    expect(toolbar).toBeTruthy()
    // 窗口仍保持挂载（display:none）但退出可访问树——「帧保持挂载，窗口整体隐藏」
    expect(screen.queryByRole('dialog', { name: 'Demo 窗口' })).toBeNull()
  })
})
