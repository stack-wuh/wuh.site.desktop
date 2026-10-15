// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AppProviders from '../components/AppProviders'
import { resetRenderEnv } from './helpers/dom-env'
import { SettingsPage } from '../components/settings/SettingsPage'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })
}))

/**
 * 设置页「外观与语言」区段（20261015-feature-workbench-shell review 修复回归）：
 * 主题/明暗/语言三入口原挂 SideMenu 快捷面板，随 SideMenu 退役曾一度全仓无
 * setFamily/setScheme/setLocale 消费方——本套件锁定三控件存在且真实写穿
 * （localStorage 持久化键 wd.theme / wd.locale 为可观察锚点）。
 */

function renderSettings(): ReturnType<typeof render> {
  return render(
    <AppProviders>
      <SettingsPage />
    </AppProviders>
  )
}

beforeEach(() => {
  resetRenderEnv()
  ;(window as unknown as { api: unknown }).api = {
    getSettings: async () => ({
      settings: {
        autoCommit: false,
        autoCommitDelayMs: 2000,
        uploadCommand: null,
        gitUserName: null,
        gitUserEmail: null,
        siteBaseUrl: null,
        siteRepo: null,
        uploadMode: 'local',
        oss: null
      }
    }),
    setSettings: async (patch: Record<string, unknown>) => ({ settings: { ...patch } }),
    listRecentWorkspaces: async () => [],
    pluginApi: { list: async () => ({ records: [], problems: [] }), onDispatch: () => () => undefined }
  }
})

describe('设置页 · 外观与语言（SideMenu 退役回归修复）', () => {
  it('渲染主题/外观/语言三组控件（radiogroup）', () => {
    renderSettings()
    expect(screen.getByRole('radiogroup', { name: '主题' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: '外观' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: '语言' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '酒红' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '跟随系统' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'English' })).toBeTruthy()
  })

  it('初始选中态来自 provider 当前值（默认酒红/深色/中文）', () => {
    renderSettings()
    expect(screen.getByRole('radio', { name: '酒红' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: '深色' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: '中文' }).getAttribute('aria-checked')).toBe('true')
  })

  it('点「素雅」写穿主题家族（wd.theme 持久化锚点）', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('radio', { name: '素雅' }))
    expect(screen.getByRole('radio', { name: '素雅' }).getAttribute('aria-checked')).toBe('true')
    expect(localStorage.getItem('wd.theme')).toContain('plain')
  })

  it('点「深色」写穿明暗设置', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('radio', { name: '深色' }))
    expect(screen.getByRole('radio', { name: '深色' }).getAttribute('aria-checked')).toBe('true')
    expect(localStorage.getItem('wd.theme')).toContain('dark')
  })

  it('点「English」切换语言并即时反映标签（locale 持久化锚点）', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(localStorage.getItem('wd.locale')).toBe('en')
    // 即时生效：radiogroup 的 aria-label 随字典切到英文
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeTruthy()
  })
})
