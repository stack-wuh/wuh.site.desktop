import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EVENT_BUFFER_LIMIT,
  MAX_PAYLOAD_BYTES,
  MAX_SUBSCRIPTIONS_PER_PLUGIN,
  clearPluginEvents,
  eventsStore,
  matchesPattern,
  onAnyEvent,
  publishEvent,
  publishPluginEvent,
  recentEvents,
  resetEventsForTests,
  subscribePlugin,
  subscribersFor,
  unsubscribePlugin
} from '../lib/events'

beforeEach(() => {
  resetEventsForTests()
})

describe('events 事件总线', () => {
  it('publishPluginEvent 盖章归属并强制 pluginId:type 命名空间', () => {
    const env = publishPluginEvent('github-issues', 'publish-started', { step: 1 })
    expect(env.type).toBe('github-issues:publish-started')
    expect(env.pluginId).toBe('github-issues')
    expect(env.payload).toEqual({ step: 1 })
    expect(env.id).toBeTruthy()
    expect(typeof env.ts).toBe('number')
    // 宿主内转路径可发系统级类型（如 tasks:upsert）
    const sys = publishEvent('tasks:upsert', 'github-issues', { taskId: 'a' })
    expect(sys.type).toBe('tasks:upsert')
  })

  it('护栏：插件事件名非法（冒号/大写/空）与系统类型非法均拒绝', () => {
    expect(() => publishPluginEvent('p', 'Has:Colon', {})).toThrow(/事件名/)
    expect(() => publishPluginEvent('p', 'UPPER', {})).toThrow(/事件名/)
    expect(() => publishPluginEvent('p', '', {})).toThrow(/事件名/)
    expect(() => publishEvent('Bad:Type', 'p', {})).toThrow(/事件类型/)
    expect(() => publishEvent('has space', 'p', {})).toThrow(/事件类型/)
  })

  it('护栏：payload 须可序列化且 ≤4KB', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => publishPluginEvent('p', 'bad', circular)).toThrow(/payload/)
    expect(() => publishPluginEvent('p', 'big', 'x'.repeat(MAX_PAYLOAD_BYTES + 1))).toThrow(/payload/)
    // JSON 序列化含引号，边界取 MAX_PAYLOAD_BYTES - 2 恰好不超
    expect(() => publishPluginEvent('p', 'edge', 'x'.repeat(MAX_PAYLOAD_BYTES - 2))).not.toThrow()
  })

  it(`环形缓冲保留最近 ${EVENT_BUFFER_LIMIT} 条，最旧被丢弃`, () => {
    for (let i = 0; i < EVENT_BUFFER_LIMIT + 20; i += 1) {
      publishPluginEvent('p', `e${i}`, null)
    }
    const events = recentEvents()
    expect(events).toHaveLength(EVENT_BUFFER_LIMIT)
    expect(events[0]?.type).toBe('p:e20')
    expect(events[events.length - 1]?.type).toBe(`p:e${EVENT_BUFFER_LIMIT + 19}`)
  })

  it('发布后 commit 产出新快照引用；未发布不触发订阅回调', () => {
    const before = eventsStore.get()
    publishPluginEvent('p', 'a', null)
    expect(eventsStore.get()).not.toBe(before)

    const listener = vi.fn()
    const unsub = eventsStore.subscribe(listener)
    unsub()
    publishPluginEvent('p', 'b', null)
    expect(listener).not.toHaveBeenCalled()
  })

  it('订阅匹配：精确 / 前缀通配 ns:* / 全通配 *，subscribersFor 去重', () => {
    subscribePlugin('p1', ['github-issues:done'])
    subscribePlugin('p2', ['github-issues:*'])
    subscribePlugin('p3', ['*'])
    // 重复模式去重，不占订阅额度
    subscribePlugin('p3', ['*'])

    expect(matchesPattern('github-issues:done', 'github-issues:done')).toBe(true)
    expect(matchesPattern('github-issues:*', 'github-issues:done')).toBe(true)
    expect(matchesPattern('github-issues:*', 'other:x')).toBe(false)
    expect(matchesPattern('*', 'anything')).toBe(true)

    expect(subscribersFor('github-issues:done').sort()).toEqual(['p1', 'p2', 'p3'])
    expect(subscribersFor('other:x')).toEqual(['p3'])
  })

  it('订阅模式非法或超额（每插件上限）拒绝', () => {
    expect(() => subscribePlugin('p', ['Has:Colon:*'])).toThrow(/订阅/)
    expect(() => subscribePlugin('p', ['ns:*:deep'])).toThrow(/订阅/)
    const patterns = Array.from({ length: MAX_SUBSCRIPTIONS_PER_PLUGIN }, (_, i) => `ns${i}:*`)
    subscribePlugin('p', patterns)
    expect(() => subscribePlugin('p', ['one-more:*'])).toThrow(/订阅/)
    // 已订阅模式重复添加不占额度
    expect(() => subscribePlugin('p', patterns)).not.toThrow()
  })

  it('unsubscribe 退订后不再派发；onAnyEvent 钩子退订后停止', () => {
    const seen: string[] = []
    // 模拟宿主派发语义：钩子收到全部信封，仅向有订阅者的类型投递
    const off = onAnyEvent((env) => {
      if (subscribersFor(env.type).includes('watcher')) seen.push(env.type)
    })

    subscribePlugin('watcher', ['p:*'])
    publishPluginEvent('p', 'e1', null)
    expect(seen).toEqual(['p:e1'])
    expect(subscribersFor('p:e1')).toEqual(['watcher'])

    unsubscribePlugin('watcher', ['p:*'])
    expect(subscribersFor('p:e1')).toEqual([])
    publishPluginEvent('p', 'e2', null)
    expect(seen).toEqual(['p:e1'])

    // 钩子自身退订：即使重新有订阅者也不再回调
    subscribePlugin('watcher', ['p:*'])
    off()
    publishPluginEvent('p', 'e3', null)
    expect(seen).toEqual(['p:e1'])
  })

  it('clearPluginEvents 清订阅与该插件缓冲事件（停用插件）', () => {
    subscribePlugin('p1', ['*'])
    publishPluginEvent('p1', 'a', null)
    publishPluginEvent('p2', 'b', null)
    clearPluginEvents('p1')
    expect(subscribersFor('p1:a')).toEqual([])
    expect(recentEvents().map((e) => e.type)).toEqual(['p2:b'])
  })
})
