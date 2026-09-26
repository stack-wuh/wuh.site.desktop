/**
 * 渲染层事件总线（host 侧纯逻辑，可独立测试）——与 tasks/statusItems/floats
 * 同构的快照注册表 + 派发钩子。
 *
 * 模型：插件帧经 events.publish 发布事件，宿主按帧身份盖章归属（信封 pluginId
 * 由宿主写入，调用方不可冒名），插件事件名强制 `<pluginId>:<name>` 命名空间；
 * 宿主内转事件（如任务服务）可发系统级类型（如 tasks:upsert），信封归属为
 * 数据所属插件。订阅按模式匹配：精确类型 / `<ns>:*` 前缀通配 / `*` 全通配。
 *
 * 护栏承接原声明制的注入面收敛职责：事件名/类型字符集校验、payload 可序列化
 * 且 ≤4KB、每插件订阅模式数上限、环形缓冲仅保留最近 200 条。快照只含缓冲
 * （渲染相关部分）；订阅表是纯路由状态，不进快照。
 */

import { createStore } from './createStore'

export const EVENT_BUFFER_LIMIT = 200
export const MAX_PAYLOAD_BYTES = 4096
export const MAX_SUBSCRIPTIONS_PER_PLUGIN = 16

/** 插件事件名：不含冒号（命名空间由宿主拼接），≤64 字符 */
const EVENT_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/
/** 完整事件类型（宿主内转路径直发）：小写 + 点/冒号/横线/下划线 */
const EVENT_TYPE_RE = /^[a-z0-9][a-z0-9._:-]*$/
/** 订阅模式：精确类型 / `<ns>:*` / `*` */
const SUBSCRIBE_PATTERN_RE = /^(?:\*|[a-z0-9][a-z0-9._:-]*(?::\*)?)$/

export interface EventEnvelope {
  id: string
  type: string
  /** 宿主盖章的事件归属：插件发布 = 发布者；宿主内转 = 数据所属插件 */
  pluginId: string
  payload: unknown
  ts: number
}

interface EventsState {
  events: EventEnvelope[]
}

const store = createStore<EventsState>({ events: [] })
/** pluginId → 订阅模式列表（路由状态，不进快照） */
const subs = new Map<string, string[]>()
/** 宿主派发钩子（PluginFrameHost 接线，投递到订阅帧） */
const dispatchListeners = new Set<(env: EventEnvelope) => void>()
let eventSeq = 0

export const eventsStore = {
  get: store.get,
  subscribe: store.subscribe
}

/** 快照消费：最近事件（旧 → 新） */
export function recentEvents(): EventEnvelope[] {
  return store.get().events
}

function assertPayload(payload: unknown): void {
  let json: string
  try {
    json = JSON.stringify(payload ?? null)
  } catch {
    throw new Error('payload 须可 JSON 序列化')
  }
  if (new TextEncoder().encode(json).length > MAX_PAYLOAD_BYTES) {
    throw new Error(`payload 超限（≤${MAX_PAYLOAD_BYTES} 字节）`)
  }
}

/** 宿主内转/系统路径：直发完整类型，归属为数据所属插件 */
export function publishEvent(type: string, pluginId: string, payload: unknown): EventEnvelope {
  if (!EVENT_TYPE_RE.test(type)) throw new Error(`非法事件类型: ${String(type)}`)
  assertPayload(payload)
  eventSeq += 1
  const env: EventEnvelope = { id: `ev${eventSeq}`, type, pluginId, payload: payload ?? null, ts: Date.now() }
  store.commit((cur) => ({ events: [...cur.events, env].slice(-EVENT_BUFFER_LIMIT) }))
  dispatchListeners.forEach((l) => l(env))
  return env
}

/** 插件帧路径：事件名强制 `<pluginId>:<name>` 命名空间，归属盖章为发布者 */
export function publishPluginEvent(pluginId: string, name: string, payload: unknown): EventEnvelope {
  if (!EVENT_NAME_RE.test(name)) throw new Error(`非法事件名: ${String(name)}`)
  return publishEvent(`${pluginId}:${name}`, pluginId, payload)
}

export function matchesPattern(pattern: string, type: string): boolean {
  if (pattern === '*') return true
  if (pattern.endsWith(':*')) return type.startsWith(pattern.slice(0, -1))
  return pattern === type
}

function normalizePatterns(patterns: unknown): string[] {
  if (!Array.isArray(patterns)) throw new Error('订阅模式须为字符串数组')
  return patterns.map((p) => {
    if (typeof p !== 'string' || !SUBSCRIBE_PATTERN_RE.test(p)) {
      throw new Error(`非法订阅模式: ${String(p)}`)
    }
    return p
  })
}

export function subscribePlugin(pluginId: string, patterns: unknown): void {
  const next = normalizePatterns(patterns)
  const current = subs.get(pluginId) ?? []
  const merged = [...current]
  for (const p of next) {
    if (!merged.includes(p)) {
      if (merged.length >= MAX_SUBSCRIPTIONS_PER_PLUGIN) {
        throw new Error(`订阅数超限（每插件 ≤${MAX_SUBSCRIPTIONS_PER_PLUGIN} 个模式）`)
      }
      merged.push(p)
    }
  }
  subs.set(pluginId, merged)
}

export function unsubscribePlugin(pluginId: string, patterns: unknown): void {
  const next = normalizePatterns(patterns)
  const current = subs.get(pluginId)
  if (!current) return
  const remaining = current.filter((p) => !next.includes(p))
  if (remaining.length === 0) subs.delete(pluginId)
  else subs.set(pluginId, remaining)
}

/** 匹配该类型的去重订阅者 pluginId 列表 */
export function subscribersFor(type: string): string[] {
  const result: string[] = []
  for (const [pluginId, patterns] of subs) {
    if (patterns.some((p) => matchesPattern(p, type)) && !result.includes(pluginId)) {
      result.push(pluginId)
    }
  }
  return result
}

/** 停用/卸载插件：清其订阅 + 从缓冲清除其归属事件 */
export function clearPluginEvents(pluginId: string): void {
  subs.delete(pluginId)
  const cur = store.get()
  const filtered = cur.events.filter((e) => e.pluginId !== pluginId)
  if (filtered.length !== cur.events.length) {
    store.commit({ events: filtered })
  }
}

/** 宿主接线派发钩子（信封产生时同步回调）；返回退订函数 */
export function onAnyEvent(listener: (env: EventEnvelope) => void): () => void {
  dispatchListeners.add(listener)
  return () => {
    dispatchListeners.delete(listener)
  }
}

export function resetEventsForTests(): void {
  store.commit({ events: [] })
  subs.clear()
  dispatchListeners.clear()
  eventSeq = 0
}
