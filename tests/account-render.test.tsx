// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountPage } from '../components/account/AccountPage'
import { LocaleProvider } from '../lib/i18n/context'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

/**
 * 用户中心渲染冒烟（20260927-test-net-backfill）：
 * 三态结构——未授权（开始授权入口）/ 已授权（身份卡 + scopes）——渲染期零 React
 * 告警；PAT 折叠区常驻。身份/设置数据经 window.api 桩注入。
 */

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() })
}))

function renderPage(): void {
  render(
    <LocaleProvider>
      <AccountPage />
    </LocaleProvider>
  )
}

beforeEach(() => {
  resetRenderEnv()
})

describe('AccountPage 渲染冒烟', () => {
  it('未授权：开始授权入口 + PAT 折叠区，渲染期零 React 告警', async () => {
    const console_ = captureRenderConsole()
    renderPage()
    expect(await screen.findByText('使用 GitHub 授权')).toBeTruthy()
    expect(screen.getByText('GitHub 账号')).toBeTruthy()
    console_.restore()
    expect(console_.errors).toEqual([])
    expect(console_.warnings).toEqual([])
  })

  it('已授权：身份卡（名称/kind 标签/scopes）+ 断开按钮', async () => {
    const console_ = captureRenderConsole()
    // dom-env 的 api 桩为 get 陷阱硬编码，覆盖须整对象替换
    ;(window as unknown as { api: unknown }).api = {
      getGitIdentityDefault: () => Promise.resolve(null),
      getSettings: () =>
        Promise.resolve({
          hasToken: true,
          tokenKind: 'oauth',
          settings: { siteRepo: null, gitUserName: '', gitUserEmail: '' }
        }),
      getGithubIdentity: () =>
        Promise.resolve({
          name: '吴尒红',
          login: 'stack-wuh',
          avatarUrl: 'https://example.test/a.png',
          scopes: ['repo', 'workflow'],
          kind: 'oauth',
          stale: false
        }),
      listUserRepos: () => Promise.resolve([])
    }
    renderPage()
    expect(await screen.findByText('吴尒红')).toBeTruthy()
    expect(screen.getByText('stack-wuh')).toBeTruthy()
    expect(screen.getByText('repo')).toBeTruthy()
    expect(screen.getByText('OAuth 授权')).toBeTruthy()
    console_.restore()
    expect(console_.errors).toEqual([])
  })

  it('身份加载中：占位 spinner 文案，无身份卡', async () => {
    ;(window as unknown as { api: unknown }).api = {
      getGitIdentityDefault: () => Promise.resolve(null),
      getSettings: () => new Promise(() => undefined),
      getGithubIdentity: () => Promise.resolve(null),
      listUserRepos: () => Promise.resolve([])
    }
    renderPage()
    expect(await screen.findByText('等待授权中…')).toBeTruthy()
    expect(screen.queryByText('使用 GitHub 授权')).toBeNull()
  })
})
