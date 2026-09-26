/**
 * UI 反馈提示系统总线（20260924-feature-ui-feedback-system · host 侧纯逻辑）。
 *
 * 三机制按阻塞程度分层（单状态源，宿主与插件共用）：
 * - Toast   非阻塞自动消退（默认 3s），无按钮——确认性反馈；
 * - Message 非阻塞常驻到手动关闭，可带 ≤3 个操作按钮——影响用户操作的提示；
 * - Alert   模态串行队列、必须明确响应（Promise 收敛按钮 id）——系统级推送。
 *
 * 消费面：组件经 useFeedback() 订阅（useSyncExternalStore 快照引用仅在变更时
 * 替换）；非组件上下文（store、插件桥、主进程回调）直接调命令式函数。
 * 护栏：队列上限（Toast 4 / Message 3 / Alert 8）、Toast 时长钳制 [1s,10s]、
 * 同文案同 kind 去重（计时重开）；Alert 满队即刻 resolve 首按钮防调用方挂起。
 * 插件侧真正的防刷屏在帧协议频率护栏（Phase 2），此处只做宿主安全网。
 *
 * 系统通知降级：Alert 入队即回调 notifier（fire-and-forget）——是否真正弹
 * OS 通知由主进程按窗口焦点裁决（Phase 3 经 configureSystemNotify 接线）；
 * toast/message 不触发；notifier 抛错不影响应用内 Alert 入队。
 */
import { useSyncExternalStore } from 'react'

export type FeedbackKind = 'info' | 'success' | 'warning' | 'error'

/** 操作按钮/按钮语义（label 缺省由宿主按 i18n 兜底；variant 见 components/ui/Button） */
export interface FeedbackAction {
  id: string
  label?: string
  variant?: 'primary' | 'danger' | 'ghost'
}

export interface ToastOptions {
  text: string
  kind?: FeedbackKind
  /** 消退时长 ms（钳制到 [1000, 10000]，默认 3000） */
  duration?: number
}

export interface MessageOptions {
  title?: string
  text: string
  kind?: FeedbackKind
  /** 操作按钮（≤3）；点击后 Promise resolve 对应 id，关闭 resolve null */
  actions?: FeedbackAction[]
}

export interface AlertOptions {
  title?: string
  text: string
  kind?: FeedbackKind
  /** 响应按钮（≤5，缺省单个 ok）；Promise resolve 被点按钮 id */
  buttons?: FeedbackAction[]
  /** false 时不走系统通知降级（默认 true） */
  systemNotify?: boolean
}

export interface ToastState {
  id: string
  text: string
  kind: FeedbackKind
}

export interface MessageState {
  id: string
  title?: string
  text: string
  kind: FeedbackKind
  actions: FeedbackAction[]
}

export interface AlertState {
  id: string
  title?: string
  text: string
  kind: FeedbackKind
  buttons: FeedbackAction[]
}

export interface FeedbackSnapshot {
  toasts: ToastState[]
  /** 常驻横幅（按入队序） */
  messages: MessageState[]
  /** 模态队列（[0] 为当前展示，其余排队） */
  alerts: AlertState[]
}

const KINDS: readonly FeedbackKind[] = ['info', 'success', 'warning', 'error']
const VARIANTS: readonly NonNullable<FeedbackAction['variant']>[] = ['primary', 'danger', 'ghost']

export const MAX_TOASTS = 4
export const MAX_MESSAGES = 3
export const MAX_ALERTS = 8
export const MAX_MESSAGE_ACTIONS = 3
export const MAX_ALERT_BUTTONS = 5
export const DEFAULT_TOAST_MS = 3000
export const MIN_TOAST_MS = 1000
export const MAX_TOAST_MS = 10_000

let seq = 0
let toasts: ToastState[] = []
let messages: MessageState[] = []
let alerts: AlertState[] = []
let snapshot: FeedbackSnapshot = { toasts, messages, alerts }

const listeners = new Set<() => void>()
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()
const messageResolvers = new Map<string, (actionId: string | null) => void>()
const alertResolvers = new Map<string, (buttonId: string) => void>()
let systemNotifier: ((payload: { title?: string; text: string }) => void) | null = null

function nextId(): string {
  seq += 1
  return `fb-${seq}`
}

function normalizeKind(kind: unknown): FeedbackKind {
  return KINDS.includes(kind as FeedbackKind) ? (kind as FeedbackKind) : 'info'
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTitle(value: unknown): string | undefined {
  const title = normalizeText(value)
  return title || undefined
}

/** 按钮/操作数组归一：剔除非字符串 id、截断上限、variant 白名单 */
function normalizeActions(actions: unknown, limit: number): FeedbackAction[] {
  if (!Array.isArray(actions)) return []
  const out: FeedbackAction[] = []
  for (const raw of actions.slice(0, limit)) {
    const id = normalizeText((raw as FeedbackAction | undefined)?.id)
    if (!id) continue
    const label = normalizeText((raw as FeedbackAction).label) || undefined
    const variantRaw = (raw as FeedbackAction).variant
    const variant = VARIANTS.includes(variantRaw as NonNullable<FeedbackAction['variant']>)
      ? (variantRaw as FeedbackAction['variant'])
      : undefined
    out.push({ id, label, variant })
  }
  return out
}

function resolveToastDuration(duration: unknown): number {
  const n = typeof duration === 'number' && Number.isFinite(duration) ? duration : DEFAULT_TOAST_MS
  return Math.min(MAX_TOAST_MS, Math.max(MIN_TOAST_MS, Math.round(n)))
}

/** 未收敛到 lib/createStore：此处需逐监听器异常隔离（不上抛），与公共件广播语义不同 */
function commit(): void {
  snapshot = { toasts: [...toasts], messages: [...messages], alerts: [...alerts] }
  listeners.forEach((l) => {
    try {
      l()
    } catch (err) {
      console.error('反馈总线订阅者异常', err)
    }
  })
}

function clearToastTimer(id: string): void {
  const timer = toastTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    toastTimers.delete(id)
  }
}

function scheduleToastDismiss(id: string, ms: number): void {
  clearToastTimer(id)
  const timer = setTimeout(() => {
    toastTimers.delete(id)
    const idx = toasts.findIndex((t) => t.id === id)
    if (idx < 0) return
    toasts.splice(idx, 1)
    commit()
  }, ms)
  toastTimers.set(id, timer)
}

/** 轻提示入队；返回条目 id（空文案丢弃返回 null；同文案同 kind 去重并重开计时） */
export function toast(opts: ToastOptions): string | null {
  const text = normalizeText(opts?.text)
  if (!text) return null
  const kind = normalizeKind(opts?.kind)
  const existing = toasts.find((t) => t.kind === kind && t.text === text)
  if (existing) {
    scheduleToastDismiss(existing.id, resolveToastDuration(opts?.duration))
    return existing.id
  }
  const id = nextId()
  toasts.push({ id, text, kind })
  while (toasts.length > MAX_TOASTS) {
    const dropped = toasts.shift()
    if (dropped) clearToastTimer(dropped.id)
  }
  scheduleToastDismiss(id, resolveToastDuration(opts?.duration))
  commit()
  return id
}

export function dismissToast(id: string): void {
  clearToastTimer(id)
  const idx = toasts.findIndex((t) => t.id === id)
  if (idx < 0) return
  toasts.splice(idx, 1)
  commit()
}

/** 常驻消息入队；resolve 被点操作 id 或关闭 null（溢出丢最旧并 resolve null） */
export function message(opts: MessageOptions): Promise<string | null> {
  const text = normalizeText(opts?.text)
  if (!text) return Promise.resolve(null)
  const id = nextId()
  messages.push({
    id,
    title: normalizeTitle(opts?.title),
    text,
    kind: normalizeKind(opts?.kind),
    actions: normalizeActions(opts?.actions, MAX_MESSAGE_ACTIONS)
  })
  while (messages.length > MAX_MESSAGES) {
    const dropped = messages.shift()
    if (!dropped) continue
    const resolve = messageResolvers.get(dropped.id)
    messageResolvers.delete(dropped.id)
    resolve?.(null)
  }
  const promise = new Promise<string | null>((resolve) => {
    messageResolvers.set(id, resolve)
  })
  commit()
  return promise
}

/** 关闭消息（可选携带被点击的 action id，缺省 null） */
export function dismissMessage(id: string, actionId?: string | null): void {
  const idx = messages.findIndex((m) => m.id === id)
  if (idx < 0) return
  messages.splice(idx, 1)
  const resolve = messageResolvers.get(id)
  messageResolvers.delete(id)
  resolve?.(actionId ?? null)
  commit()
}

/** 模态告警入队（串行：仅 [0] 展示）；满队即刻 resolve 首按钮防调用方挂起 */
export function alert(opts: AlertOptions): Promise<string> {
  const text = normalizeText(opts?.text)
  const title = normalizeTitle(opts?.title)
  const normalized = normalizeActions(opts?.buttons, MAX_ALERT_BUTTONS)
  const buttons = normalized.length > 0 ? normalized : [{ id: 'ok' }]
  if (alerts.length >= MAX_ALERTS) {
    console.warn('反馈提示：Alert 队列已满，忽略新弹窗')
    return Promise.resolve(buttons[0].id)
  }
  const id = nextId()
  alerts.push({ id, title, text, kind: normalizeKind(opts?.kind), buttons })
  const promise = new Promise<string>((resolve) => {
    alertResolvers.set(id, resolve)
  })
  if (opts?.systemNotify !== false && (title || text) && systemNotifier) {
    try {
      systemNotifier({ title, text })
    } catch {
      // 系统通知失败不影响应用内 Alert
    }
  }
  commit()
  return promise
}

/** 宿主在用户点击按钮后调用；Promise 收敛为按钮 id */
export function resolveAlert(id: string, buttonId: string): void {
  const idx = alerts.findIndex((a) => a.id === id)
  if (idx < 0) return
  alerts.splice(idx, 1)
  const resolve = alertResolvers.get(id)
  alertResolvers.delete(id)
  resolve?.(buttonId)
  commit()
}

/** 系统通知降级钩子接线（Phase 3 由壳层注入 window.api.notifySystem；null 卸下） */
export function configureSystemNotify(fn: ((payload: { title?: string; text: string }) => void) | null): void {
  systemNotifier = fn
}

export function getFeedbackSnapshot(): FeedbackSnapshot {
  return snapshot
}

export function subscribeFeedback(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 组件侧标准消费口（Toast 栈 / 横幅 / 模态宿主共用） */
export function useFeedback(): FeedbackSnapshot {
  return useSyncExternalStore(subscribeFeedback, getFeedbackSnapshot, getFeedbackSnapshot)
}

export function resetFeedbackForTests(): void {
  toastTimers.forEach((timer) => clearTimeout(timer))
  toastTimers.clear()
  messageResolvers.forEach((resolve) => resolve(null))
  messageResolvers.clear()
  alertResolvers.forEach((resolve, id) => {
    const entry = alerts.find((a) => a.id === id)
    resolve(entry?.buttons[0]?.id ?? 'ok')
  })
  alertResolvers.clear()
  toasts = []
  messages = []
  alerts = []
  systemNotifier = null
  commit()
}
