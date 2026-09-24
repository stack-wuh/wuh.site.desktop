import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  alert,
  configureSystemNotify,
  dismissMessage,
  dismissToast,
  getFeedbackSnapshot,
  message,
  resetFeedbackForTests,
  resolveAlert,
  toast
} from '../lib/feedback'

/**
 * UI 反馈提示系统总线（20260924-feature-ui-feedback-system · Phase 1）：
 * 三机制按阻塞程度分层——Toast（非阻塞自动消退）/ Message（常驻可带操作）/
 * Alert（模态串行队列必须响应）。本文件验证纯逻辑：队列、护栏（上限/时长钳制/
 * 同文案去重）、Promise 语义（操作 id / 关闭 null / 按钮 id）、系统通知降级钩子。
 */

beforeEach(() => {
  resetFeedbackForTests()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  resetFeedbackForTests()
})

describe('toast（非阻塞自动消退）', () => {
  it('入队即可见，默认 3s 自动消退', () => {
    const id = toast({ text: '配置已保存', kind: 'success' })
    expect(id).not.toBeNull()
    expect(getFeedbackSnapshot().toasts).toEqual([
      { id, text: '配置已保存', kind: 'success' }
    ])
    vi.advanceTimersByTime(2999)
    expect(getFeedbackSnapshot().toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(getFeedbackSnapshot().toasts).toHaveLength(0)
  })

  it('非法 kind 归一为 info，空文案直接丢弃', () => {
    const id = toast({ text: 'x', kind: 'fancy' as never })
    expect(getFeedbackSnapshot().toasts[0].kind).toBe('info')
    expect(toast({ text: '   ' })).toBeNull()
    expect(getFeedbackSnapshot().toasts).toHaveLength(1)
    expect(id).not.toBeNull()
  })

  it('时长钳制到 [1000, 10000]，非法值取默认 3000', () => {
    const tooFast = toast({ text: 'a', duration: 10 })
    const tooLong = toast({ text: 'b', duration: 999999 })
    toast({ text: 'c', duration: Number.NaN })
    vi.advanceTimersByTime(999)
    expect(getFeedbackSnapshot().toasts.map((t) => t.text)).toEqual(['a', 'b', 'c'])
    vi.advanceTimersByTime(1) // a 于 1000ms 消退；b/c 仍在
    expect(getFeedbackSnapshot().toasts.map((t) => t.text)).toEqual(['b', 'c'])
    vi.advanceTimersByTime(2000) // c 于 3000ms 消退（tooFast 超期已移除）
    expect(getFeedbackSnapshot().toasts.map((t) => t.text)).toEqual(['b'])
    expect(tooFast).not.toBeNull()
    expect(tooLong).not.toBeNull()
  })

  it('同文案同 kind 去重：不叠加且计时重开', () => {
    const first = toast({ text: '已保存' })
    vi.advanceTimersByTime(2000)
    const again = toast({ text: '已保存' })
    expect(again).toBe(first)
    expect(getFeedbackSnapshot().toasts).toHaveLength(1)
    vi.advanceTimersByTime(2000) // 距重开仅 2000ms，不应消退
    expect(getFeedbackSnapshot().toasts).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(getFeedbackSnapshot().toasts).toHaveLength(0)
  })

  it('上限 4 条：溢出丢最旧', () => {
    for (let i = 1; i <= 5; i++) toast({ text: `第${i}条` })
    expect(getFeedbackSnapshot().toasts.map((t) => t.text)).toEqual([
      '第2条',
      '第3条',
      '第4条',
      '第5条'
    ])
  })

  it('dismissToast 主动移除', () => {
    const id = toast({ text: 'x' }) as string
    dismissToast(id)
    expect(getFeedbackSnapshot().toasts).toHaveLength(0)
  })
})

describe('message（常驻可带操作）', () => {
  it('常驻不自动消退，手动关闭 resolve null', async () => {
    const p = message({ title: '保存失败', text: '磁盘空间不足', kind: 'error' })
    expect(getFeedbackSnapshot().messages).toHaveLength(1)
    vi.advanceTimersByTime(60_000)
    expect(getFeedbackSnapshot().messages).toHaveLength(1)
    const id = getFeedbackSnapshot().messages[0].id
    dismissMessage(id)
    await expect(p).resolves.toBeNull()
    expect(getFeedbackSnapshot().messages).toHaveLength(0)
  })

  it('操作按钮 resolve 被点击的 action id', async () => {
    const p = message({
      text: '网络异常',
      actions: [
        { id: 'retry', label: '重试', variant: 'primary' },
        { id: 'ignore', label: '忽略' }
      ]
    })
    const [entry] = getFeedbackSnapshot().messages
    expect(entry.actions).toEqual([
      { id: 'retry', label: '重试', variant: 'primary' },
      { id: 'ignore', label: '忽略' }
    ])
    // 宿主点击按钮后的收敛入口
    dismissMessage(entry.id, 'retry')
    await expect(p).resolves.toBe('retry')
    expect(getFeedbackSnapshot().messages).toHaveLength(0)
  })

  it('actions 上限 3：溢出截断', () => {
    message({
      text: 'x',
      actions: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' }
      ]
    })
    expect(getFeedbackSnapshot().messages[0].actions.map((a) => a.id)).toEqual(['a', 'b', 'c'])
  })

  it('上限 3 条：溢出丢最旧并 resolve null', async () => {
    const first = message({ text: '一' })
    message({ text: '二' })
    message({ text: '三' })
    message({ text: '四' })
    await expect(first).resolves.toBeNull()
    expect(getFeedbackSnapshot().messages.map((m) => m.text)).toEqual(['二', '三', '四'])
  })
})

describe('alert（模态串行队列，必须响应）', () => {
  it('缺省按钮为单个 ok，resolve 按钮 id', async () => {
    const p = alert({ title: '连接中断', text: '服务不可达' })
    expect(getFeedbackSnapshot().alerts).toHaveLength(1)
    expect(getFeedbackSnapshot().alerts[0].buttons).toEqual([{ id: 'ok' }])
    const id = getFeedbackSnapshot().alerts[0].id
    resolveAlert(id, 'ok')
    await expect(p).resolves.toBe('ok')
    expect(getFeedbackSnapshot().alerts).toHaveLength(0)
  })

  it('串行：第二条排队，第一条响应后才展示', async () => {
    const first = alert({ text: '一' })
    const second = alert({ text: '二' })
    expect(getFeedbackSnapshot().alerts.map((a) => a.text)).toEqual(['一', '二'])
    resolveAlert(getFeedbackSnapshot().alerts[0].id, 'ok')
    await expect(first).resolves.toBe('ok')
    expect(getFeedbackSnapshot().alerts.map((a) => a.text)).toEqual(['二'])
    // 第二条尚未被响应
    let settled = false
    void second.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    resolveAlert(getFeedbackSnapshot().alerts[0].id, 'ok')
    await expect(second).resolves.toBe('ok')
  })

  it('自定义按钮与上限 5：溢出截断', () => {
    alert({
      text: 'x',
      buttons: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }]
    })
    expect(getFeedbackSnapshot().alerts[0].buttons.map((b) => b.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e'
    ])
  })

  it('队列上限 8：溢出的 alert 立即 resolve 首按钮并告警', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    for (let i = 1; i <= 8; i++) alert({ text: `第${i}条` })
    const overflow = alert({ text: '第9条' })
    await expect(overflow).resolves.toBe('ok')
    expect(warn).toHaveBeenCalled()
    expect(getFeedbackSnapshot().alerts).toHaveLength(8)
    warn.mockRestore()
  })
})

describe('系统通知降级钩子（失焦时 OS 通知，Phase 3 接线）', () => {
  it('alert 入队即回调 notifier（fire-and-forget）', () => {
    const notifier = vi.fn()
    configureSystemNotify(notifier)
    alert({ title: '服务中断', text: '连接已断开' })
    expect(notifier).toHaveBeenCalledTimes(1)
    expect(notifier).toHaveBeenCalledWith({ title: '服务中断', text: '连接已断开' })
  })

  it('systemNotify=false 不触发；notifier 抛错不影响 alert 入队', () => {
    const notifier = vi.fn(() => {
      throw new Error('ipc 失败')
    })
    configureSystemNotify(notifier)
    alert({ text: 'x', systemNotify: false })
    expect(notifier).not.toHaveBeenCalled()
    expect(getFeedbackSnapshot().alerts).toHaveLength(1)
    // 抛错的 notifier：入队不受影响
    alert({ text: 'y' })
    expect(getFeedbackSnapshot().alerts).toHaveLength(2)
  })

  it('toast / message 不触发系统通知', () => {
    const notifier = vi.fn()
    configureSystemNotify(notifier)
    toast({ text: 'x' })
    message({ text: 'y' })
    expect(notifier).not.toHaveBeenCalled()
  })
})

describe('快照与复位', () => {
  it('快照引用仅在变更时替换（useSyncExternalStore 依赖）', () => {
    const a = getFeedbackSnapshot()
    expect(getFeedbackSnapshot()).toBe(a)
    toast({ text: 'x' })
    expect(getFeedbackSnapshot()).not.toBe(a)
  })

  it('resetFeedbackForTests 清空三级队列与钩子并停表', async () => {
    toast({ text: 'x' })
    const msg = message({ text: 'y' })
    const al = alert({ text: 'z' })
    resetFeedbackForTests()
    await expect(msg).resolves.toBeNull()
    await expect(al).resolves.toBe('ok')
    expect(getFeedbackSnapshot()).toEqual({ toasts: [], messages: [], alerts: [] })
    // 计时器已清：推进时间不产生渲染变更
    const snap = getFeedbackSnapshot()
    vi.advanceTimersByTime(60_000)
    expect(getFeedbackSnapshot()).toBe(snap)
  })
})
