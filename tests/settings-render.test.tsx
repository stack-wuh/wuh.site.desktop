// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PluginManagerSection } from '../components/settings/PluginManagerSection'
import { SettingsPage } from '../components/settings/SettingsPage'
import { LocaleProvider } from '../lib/i18n/context'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })
}))

/**
 * 设置页插件区块渲染冒烟（20260927-test-net-backfill）：
 * skeleton 加载态 → 空态（未发现插件）/ 卡片列表（名称/版本/权限 pill/来源）+
 * manifest 校验问题列表。数据经 window.pluginApi.list 桩注入；渲染期零 React 告警。
 */

function renderSection(): void {
  render(
    <LocaleProvider>
      <PluginManagerSection />
    </LocaleProvider>
  )
}

function pluginApiList(payload: unknown): void {
  ;(window as unknown as { pluginApi: Record<string, unknown> }).pluginApi = {
    list: () => Promise.resolve(payload)
  }
}

beforeEach(() => {
  resetRenderEnv()
  // 组件直接读 window.pluginApi.list（非 window.api.pluginApi）——默认空注册表
  pluginApiList({ records: [], problems: [] })
})

describe('PluginManagerSection 渲染冒烟', () => {
  it('无插件：skeleton 先行，加载完回落空态，渲染期零 React 告警', async () => {
    const console_ = captureRenderConsole()
    renderSection()
    expect(screen.getByText('插件加载中', { exact: false })).toBeTruthy()
    expect(await screen.findByText('未发现插件')).toBeTruthy()
    console_.restore()
    expect(console_.errors).toEqual([])
    expect(console_.warnings).toEqual([])
  })

  it('有插件：卡片呈现名称/版本/权限 pill/来源目录', async () => {
    pluginApiList({
      records: [
        {
          manifest: {
            id: 'demo',
            name: 'Demo 插件',
            version: '1.2.0',
            permissions: ['document.read.write'],
            views: []
          },
          enabled: true,
          approval: 'approved',
          dir: '/plugins/demo'
        }
      ],
      problems: []
    })
    renderSection()
    expect(await screen.findByText('Demo 插件')).toBeTruthy()
    expect(screen.getByText('v1.2.0')).toBeTruthy()
    expect(screen.getByText('document.read.write')).toBeTruthy()
    expect(screen.getByText('demo')).toBeTruthy()
    expect(screen.queryByText('未发现插件')).toBeNull()
  })

  it('manifest 校验失败目录：problems 列出目录名与错误', async () => {
    pluginApiList({
      records: [],
      problems: [{ dir: '/plugins/broken', errors: ['缺 name 字段'] }]
    })
    renderSection()
    expect(await screen.findByText(/broken：缺 name 字段/)).toBeTruthy()
  })
})

describe('SettingsPage 整页冒烟', () => {
  it('整页挂载：内嵌插件区块完成加载态到空态，渲染期零 React 告警', async () => {
    // SettingsPage 直接读 settings 字段（siteBaseUrl 等），且 dom-env 的 api 桩为
    // get 陷阱硬编码——覆盖须整对象替换
    ;(window as unknown as { api: unknown }).api = {
      getSettings: () =>
        Promise.resolve({
          hasToken: false,
          tokenKind: null,
          settings: {
            autoCommit: false,
            autoCommitDelayMs: 2000,
            uploadCommand: null,
            gitUserName: null,
            gitUserEmail: null,
            siteBaseUrl: null,
            siteRepo: null
          }
        }),
      setSettings: () =>
        Promise.resolve({
          hasToken: false,
          tokenKind: null,
          settings: {
            autoCommit: false,
            autoCommitDelayMs: 2000,
            uploadCommand: null,
            gitUserName: null,
            gitUserEmail: null,
            siteBaseUrl: null,
            siteRepo: null
          }
        })
    }
    const console_ = captureRenderConsole()
    render(
      <LocaleProvider>
        <SettingsPage />
      </LocaleProvider>
    )
    try {
      expect(await screen.findByText('未发现插件')).toBeTruthy()
      expect(screen.getByText('重载插件')).toBeTruthy()
    } catch (err) {
      throw new Error(
        `整页渲染未达空态；捕获 console=${JSON.stringify({ errors: console_.errors, warnings: console_.warnings })}；body=${document.body.innerHTML.slice(0, 600)}`,
        { cause: err }
      )
    } finally {
      console_.restore()
    }
    expect(console_.errors).toEqual([])
    expect(console_.warnings).toEqual([])
  })
})
