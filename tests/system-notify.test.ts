import { describe, expect, it, vi } from 'vitest'
import {
  createSystemNotifier,
  shouldSystemNotify,
  type NotifiableWindow,
  type SystemNotifyDeps
} from '../src/main/systemNotify'

/**
 * 系统通知降级裁决（20260924-feature-ui-feedback-system · Phase 3）：
 * Alert 失焦时发 OS 通知、聚焦时 no-op；点击通知聚焦主窗。
 * 依赖全部注入假窗口/假通知器，不触达真实 Electron。
 */

function fakeWindow(state: { focused: boolean; minimized: boolean; destroyed?: boolean }): NotifiableWindow & {
  calls: string[]
} {
  const calls: string[] = []
  return {
    calls,
    isDestroyed: () => state.destroyed === true,
    isFocused: () => state.focused,
    isMinimized: () => state.minimized,
    restore: () => calls.push('restore'),
    show: () => calls.push('show'),
    focus: () => calls.push('focus')
  }
}

function deps(patch: Partial<SystemNotifyDeps> = {}): SystemNotifyDeps & { shownInputs: unknown[] } {
  const shownInputs: unknown[] = []
  return {
    shownInputs,
    getWindow: () => fakeWindow({ focused: false, minimized: false }),
    isSupported: () => true,
    show: (input) => {
      shownInputs.push(input)
    },
    appName: () => 'wuh.site',
    ...patch
  }
}

describe('shouldSystemNotify（纯函数裁决）', () => {
  it('聚焦且未最小化 → 不发；失焦或最小化 → 发', () => {
    expect(shouldSystemNotify({ focused: true, minimized: false })).toBe(false)
    expect(shouldSystemNotify({ focused: false, minimized: false })).toBe(true)
    expect(shouldSystemNotify({ focused: true, minimized: true })).toBe(true)
    expect(shouldSystemNotify({ focused: false, minimized: true })).toBe(true)
  })
})

describe('createSystemNotifier', () => {
  it('失焦时发 OS 通知（标题回退应用名，正文回退标题）', () => {
    const d = deps()
    const notify = createSystemNotifier(d)
    expect(notify({ text: '连接已断开' })).toEqual({ shown: true })
    expect(d.shownInputs).toEqual([
      expect.objectContaining({ title: 'wuh.site', body: '连接已断开' })
    ])
    expect(notify({ title: '服务中断', text: '' })).toEqual({ shown: true })
    expect(d.shownInputs[1]).toEqual(expect.objectContaining({ title: '服务中断', body: '服务中断' }))
  })

  it('聚焦时 no-op（应用内 Alert 已可达）', () => {
    const d = deps({ getWindow: () => fakeWindow({ focused: true, minimized: false }) })
    const notify = createSystemNotifier(d)
    expect(notify({ text: 'x' })).toEqual({ shown: false, reason: 'focused' })
    expect(d.shownInputs).toHaveLength(0)
  })

  it('无窗 / 窗已销毁 / 通知不受支持 / 空载荷 → 各自降级且不抛错', () => {
    expect(createSystemNotifier(deps({ getWindow: () => null }))({ text: 'x' })).toEqual({
      shown: false,
      reason: 'no-window'
    })
    expect(
      createSystemNotifier(deps({ getWindow: () => fakeWindow({ focused: false, minimized: false, destroyed: true }) }))(
        { text: 'x' }
      )
    ).toEqual({ shown: false, reason: 'no-window' })
    expect(createSystemNotifier(deps({ isSupported: () => false }))({ text: 'x' })).toEqual({
      shown: false,
      reason: 'unsupported'
    })
    const notify = createSystemNotifier(deps())
    expect(notify({ text: '   ' })).toEqual({ shown: false, reason: 'empty' })
    expect(notify({} as never)).toEqual({ shown: false, reason: 'empty' })
  })

  it('点击通知：最小化先 restore 再 show/focus；窗已销毁则 no-op', () => {
    const win = fakeWindow({ focused: false, minimized: true })
    const d = deps({ getWindow: () => win })
    const notify = createSystemNotifier(d)
    notify({ text: 'x' })
    const onClick = (d.shownInputs[0] as { onClick: () => void }).onClick
    onClick()
    expect(win.calls).toEqual(['restore', 'show', 'focus'])

    const destroyed = fakeWindow({ focused: false, minimized: true, destroyed: true })
    const d2 = deps({ getWindow: () => destroyed })
    const notify2 = createSystemNotifier(d2)
    // 销毁窗连通知都不发；这里模拟点击后窗被销毁的场景
    const win3 = fakeWindow({ focused: false, minimized: false })
    const d3 = deps({ getWindow: () => win3 })
    const notify3 = createSystemNotifier(d3)
    notify3({ text: 'y' })
    const onClick3 = (d3.shownInputs[0] as { onClick: () => void }).onClick
    const spy = vi.spyOn(win3, 'isDestroyed').mockReturnValue(true)
    onClick3()
    expect(win3.calls).toEqual([])
    spy.mockRestore()
  })
})
