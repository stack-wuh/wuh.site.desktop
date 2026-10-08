// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { documentEvents } from '../lib/store'
import { LocaleProvider, useLocale } from '../lib/i18n/context'

/**
 * 宿主语言切换经既有事件通道广播（20261007-feature-frontmatter-editor-hide）：
 * LocaleProvider.setLocale → documentEvents.emit('locale')，wireHostOnce 的
 * 自动透传订阅把事件送达全部插件帧（与 workspace 事件同通道同语义），
 * 帧侧 wuh.on('locale') 热切换文案。
 */

function Probe(): ReactElement {
  const { setLocale } = useLocale()
  return (
    <button type="button" onClick={() => setLocale('en')}>
      to-en
    </button>
  )
}

describe('locale 切换广播（documentEvents 既有通道）', () => {
  it('setLocale 触发 documentEvents("locale") 携带新语言', () => {
    const seen: Array<{ name: string; locale: unknown }> = []
    const off = documentEvents.subscribe((name, payload) => {
      seen.push({ name, locale: payload['locale'] })
    })
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    act(() => {
      screen.getByRole('button', { name: 'to-en' }).click()
    })
    off()
    expect(seen).toContainEqual({ name: 'locale', locale: 'en' })
  })

  it('初始两段式挂载读存储不经 setLocale——不误广播 locale 事件', () => {
    localStorage.setItem('wd.locale', 'ja')
    const seen: string[] = []
    const off = documentEvents.subscribe((name) => seen.push(name))
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    off()
    expect(seen).not.toContain('locale')
    localStorage.removeItem('wd.locale')
  })
})
