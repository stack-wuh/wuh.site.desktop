'use client'

/**
 * 插件帧宿主（渲染层）：会话建立、沙箱帧生命周期、host 侧服务与消息路由。
 *
 * 帧规则：iframe sandbox="allow-scripts"（不透明源，无 preload / 无宿主 DOM），
 * 逐帧 MessagePort 绑定插件身份；能力调用按 service 分流：
 * - cap → window.pluginApi.invoke(sessionId) → 主进程 broker 权限裁决；
 * - doc / render / ui → host 直接服务（同样先查 manifest 权限）。
 * sessionId 只在 host 内存中流转，绝不下发给插件帧。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type {
  PluginListResult,
  PluginPermission,
  PluginRecord,
  PluginSessionInfo,
  PluginViewContribution,
  ToHostMessage
} from '@shared/plugin'
import { pluginLogicUrl, pluginViewUrl, resolveApproval } from '@shared/plugin'
import {
  createFeedbackRateLimiter,
  sanitizeAlertArgs,
  sanitizeMessageArgs,
  sanitizeToastArgs
} from '@shared/plugin'
import type { WorkspaceInfo } from '@shared/types'
import { buildThemeCss } from '../theme/tokens'
import { uiConfirm } from '../ui/Dialog'
import { alert, message, toast } from '../../lib/feedback'
import { documentEvents, workspaceStore } from '../../lib/store'
import {
  clearPluginStatusItems,
  registerManifestStatusItems,
  removeStatusItem,
  updateStatusItem,
  type StatusItemPatch
} from '../../lib/statusItems'
import {
  clearPluginTasks,
  registerManifestTasks,
  removeTask,
  upsertTask,
  type TaskPatch
} from '../../lib/tasks'
import {
  clearPluginCapsule,
  registerManifestCapsule,
  removeCapsule,
  updateCapsule
} from '../../lib/capsule'
import {
  clearPluginEvents,
  onAnyEvent,
  publishEvent,
  publishPluginEvent,
  subscribePlugin,
  subscribersFor,
  unsubscribePlugin
} from '../../lib/events'
import { renderService } from '../../lib/renderPipeline'
import styled from 'styled-components'

interface PendingCall {
  res: (v: unknown) => void
  rej: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface FrameState {
  pluginId: string
  frameKey: string
  iframe: HTMLIFrameElement
  port: MessagePort
  pending: Map<number | string, PendingCall>
  hostSeq: number
  closed: boolean
  /** 握手超时定时器：closeFrame 必须取消，否则 StrictMode 双挂载下旧帧的定时器会误杀接管同 key 的后继帧 */
  helloTimer?: ReturnType<typeof setTimeout>
  onReady?: () => void
}

let records: PluginRecord[] = []
let sessions = new Map<string, PluginSessionInfo>()
const frames = new Map<string, FrameState>()
let hostWorkspace: WorkspaceInfo | null = null
let logicContainer: HTMLDivElement | null = null
let bootPromise: Promise<PluginListResult> | null = null

/** 插件反馈频率护栏（全 kind 共享额度：10s 内 5 条；宿主内部调用不经此闸） */
const feedbackGuard = createFeedbackRateLimiter()

const FRAME_KEY = (pluginId: string, frameKey: string): string => `${pluginId}#${frameKey}`
const HELLO_TIMEOUT_MS = 5000
const REQUEST_TIMEOUT_MS = 25_000

function enabledRecords(): PluginRecord[] {
  return records.filter((r) => r.enabled)
}

function sessionOf(pluginId: string): PluginSessionInfo {
  const s = sessions.get(pluginId)
  if (!s) throw new Error(`插件 ${pluginId} 会话未建立`)
  return s
}

function requirePermission(pluginId: string, permission: PluginPermission, action: string): void {
  if (!sessionOf(pluginId).permissions.includes(permission)) {
    throw new Error(`插件未声明/未授予权限 ${permission}，禁止${action}`)
  }
}

function themePayload(): { css: string; attrs: Record<string, string> } {
  const rootEl = document.documentElement
  const attrs: Record<string, string> = {}
  const family = rootEl.getAttribute('data-theme-family')
  const scheme = rootEl.getAttribute('data-color-scheme')
  if (family) attrs['data-theme-family'] = family
  if (scheme) attrs['data-color-scheme'] = scheme
  return { css: buildThemeCss(), attrs }
}

function sendHello(frame: FrameState, viewId: string | null): void {
  const record = records.find((r) => r.manifest.id === frame.pluginId)
  frame.port.postMessage({
    kind: 'event',
    name: 'hello',
    payload: {
      pluginId: frame.pluginId,
      manifest: record
        ? { id: record.manifest.id, name: record.manifest.name, version: record.manifest.version }
        : null,
      permissions: sessions.get(frame.pluginId)?.permissions ?? [],
      frame: frame.frameKey === 'logic' ? 'logic' : viewId,
      theme: themePayload()
    }
  })
}

function currentDocState(): { path: string | null; content: string | null; saved: string | null; dirty: boolean; root: string | null } {
  const s = workspaceStore.get()
  return { path: s.activePath, content: s.content, saved: s.saved, dirty: s.dirty, root: hostWorkspace?.root ?? s.root }
}

async function handleFrameInvoke(
  pluginId: string,
  service: 'cap' | 'doc' | 'render' | 'ui' | 'statusBar' | 'tasks' | 'capsule' | 'events',
  method: string,
  args: unknown[]
): Promise<unknown> {
  switch (service) {
    case 'cap': {
      const s = sessionOf(pluginId)
      return await window.pluginApi.invoke(s.sessionId, method, args)
    }
    case 'doc': {
      requirePermission(pluginId, 'document.read.write', '文档访问')
      if (method === 'get') return currentDocState()
      if (method === 'set') {
        workspaceStore.setContent(String(args[0] ?? ''))
        return null
      }
      if (method === 'save') {
        await workspaceStore.saveActive()
        return null
      }
      throw new Error(`未知文档方法: ${method}`)
    }
    case 'render': {
      if (method === 'execute') {
        requirePermission(pluginId, 'render.execute', '渲染调用')
        const doc = currentDocState()
        return await renderService.execute(
          { root: doc.root, docPath: doc.path },
          String(args[0] ?? '')
        )
      }
      if (method === 'register') {
        requirePermission(pluginId, 'render.rule.register', '注册渲染规则')
        const meta = (args[0] ?? { order: 100 }) as { order?: number; preprocess?: boolean; postRender?: boolean }
        return renderService.register(pluginId, {
          order: typeof meta.order === 'number' ? meta.order : 100,
          preprocess: meta.preprocess === true,
          postRender: meta.postRender === true
        })
      }
      if (method === 'unregister') {
        renderService.unregister(Number(args[0]))
        return null
      }
      throw new Error(`未知渲染方法: ${method}`)
    }
    case 'ui': {
      if (method === 'confirm') {
        const opts = (args[0] ?? { message: '' }) as { title?: string; message: string; okText?: string; cancelText?: string; danger?: boolean }
        return await uiConfirm(opts)
      }
      if (method === 'openExternal') {
        const url = String(args[0] ?? '')
        if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener')
        return null
      }
      // 反馈提示三方法（toast/message/alert）：与宿主共用 lib/feedback 总线；
      // 入参经 shared 校验器钳制，频率护栏全 kind 共享额度（防插件刷屏）
      if (method === 'toast' || method === 'message' || method === 'alert') {
        if (!feedbackGuard.allow(pluginId)) {
          throw new Error('反馈提示过于频繁，请稍后再试')
        }
        if (method === 'toast') {
          const opts = sanitizeToastArgs(args)
          if (!opts) throw new Error('toast 参数无效：text 必填')
          toast(opts)
          return null
        }
        if (method === 'message') {
          const opts = sanitizeMessageArgs(args)
          if (!opts) throw new Error('message 参数无效：text 必填')
          return await message(opts)
        }
        const opts = sanitizeAlertArgs(args)
        if (!opts) throw new Error('alert 参数无效：text 与 title 至少提供一个')
        return await alert(opts)
      }
      throw new Error(`未知 UI 方法: ${method}`)
    }
    case 'statusBar': {
      // 状态项为 manifest 声明制：运行时仅允许更新/隐藏自己声明的项，无额外权限
      if (method === 'update') {
        const [itemId, patch] = args as [string, StatusItemPatch]
        updateStatusItem(pluginId, String(itemId), patch ?? {})
        return null
      }
      if (method === 'remove') {
        removeStatusItem(pluginId, String(args[0] ?? ''))
        return null
      }
      throw new Error(`未知状态栏方法: ${method}`)
    }
    case 'tasks': {
      // 任务状态单一写方 = 插件 SDK（视图帧与逻辑帧同链路），无额外权限。
      // 声明制退役为可选预置：未声明 id 首报 title 即动态创建（≤8/插件护栏在注册表）。
      // 写穿后内转 tasks:* 事件供订阅者观察（信封归属 = 任务所属插件）。
      if (method === 'upsert') {
        const [taskId, patch] = args as [string, TaskPatch]
        const id = String(taskId)
        upsertTask(pluginId, id, patch ?? {})
        publishEvent('tasks:upsert', pluginId, { taskId: id, patch: patch ?? {} })
        return null
      }
      if (method === 'remove') {
        const id = String(args[0] ?? '')
        removeTask(pluginId, id)
        publishEvent('tasks:remove', pluginId, { taskId: id })
        return null
      }
      throw new Error(`未知任务方法: ${method}`)
    }
    case 'capsule': {
      // 胶囊模块为 manifest 声明制：运行时仅允许更新/隐藏自己声明的模块（数据按模板白名单校验），无额外权限
      if (method === 'update') {
        const [moduleId, data] = args as [string, unknown]
        updateCapsule(pluginId, String(moduleId), data)
        return null
      }
      if (method === 'remove') {
        removeCapsule(pluginId, String(args[0] ?? ''))
        return null
      }
      throw new Error(`未知胶囊模块方法: ${method}`)
    }
    case 'events': {
      // 事件总线：归属由宿主按帧身份盖章（调用方不可冒名），事件名强制 <pluginId>:<name>；
      // 订阅只登记路由，实际投递经 onAnyEvent 钩子（wireHostOnce 接线）
      if (method === 'publish') {
        const [name, payload] = args as [string, unknown]
        publishPluginEvent(pluginId, String(name), payload)
        return null
      }
      if (method === 'subscribe') {
        subscribePlugin(pluginId, args[0])
        return null
      }
      if (method === 'unsubscribe') {
        unsubscribePlugin(pluginId, args[0])
        return null
      }
      throw new Error(`未知事件方法: ${method}`)
    }
    default:
      throw new Error(`未知服务: ${String(service)}`)
  }
}

function onFrameMessage(frame: FrameState, ev: MessageEvent): void {
  if (frame.closed) return
  const m = ev.data as ToHostMessage | null
  if (!m || typeof m !== 'object' || typeof m.kind !== 'string') return
  if (m.kind === 'ready') {
    frame.onReady?.()
    return
  }
  if (m.kind === 'response') {
    const entry = frame.pending.get(m.id)
    if (!entry) return
    frame.pending.delete(m.id)
    clearTimeout(entry.timer)
    if (m.ok) entry.res(m.data)
    else entry.rej(new Error(m.error ?? '插件请求失败'))
    return
  }
  // kind === 'invoke'
  void handleFrameInvoke(frame.pluginId, m.service, m.method, m.args).then(
    (data) => {
      if (!frame.closed) frame.port.postMessage({ kind: 'result', id: m.id, ok: true, data })
    },
    (err: unknown) => {
      if (!frame.closed)
        frame.port.postMessage({
          kind: 'result',
          id: m.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        })
    }
  )
}

function openFrame(pluginId: string, frameKey: string, url: string, hostEl: HTMLElement | null): Promise<FrameState> {
  return new Promise((resolve, reject) => {
    const key = FRAME_KEY(pluginId, frameKey)
    closeFrame(key)

    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('title', `plugin:${pluginId}:${frameKey}`)
    iframe.src = url

    const channel = new MessageChannel()
    const frame: FrameState = {
      pluginId,
      frameKey,
      iframe,
      port: channel.port1,
      pending: new Map(),
      hostSeq: 0,
      closed: false
    }
    frames.set(key, frame)

    channel.port1.onmessage = (ev) => onFrameMessage(frame, ev)
    channel.port1.start()

    let settled = false
    // load 监听在 appendChild 之前注册（不会漏事件）；loaded 用于超时后的分层归因
    let loaded = false
    iframe.addEventListener(
      'load',
      () => {
        loaded = true
        iframe.contentWindow?.postMessage({ kind: 'wuh:connect' }, '*', [channel.port2])
        sendHello(frame, frameKey === 'logic' ? null : frameKey)
      },
      { once: true }
    )
    frame.onReady = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(frame)
    }
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      // 只关自己：若同 key 已被后继帧接管（StrictMode 双挂载/快速重挂），不得误杀
      if (frames.get(key) === frame) closeFrame(key)
      // 分层归因：load 未触发属导航层；已 load 却无 ready 属帧内脚本层（协议 CORS 资格/脚本报错）
      const layer = loaded
        ? '帧文档已加载但未完成握手——帧内脚本未执行（查协议 CORS 资格与脚本报错）'
        : '帧文档未触发 load——导航未完成（查协议注册与页面 CSP frame-src）'
      reject(new Error(`插件帧未就绪（${HELLO_TIMEOUT_MS}ms 超时，${layer}）: ${url}`))
    }, HELLO_TIMEOUT_MS)
    frame.helloTimer = timer

    if (hostEl) {
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.border = '0'
      iframe.style.display = 'block'
      hostEl.appendChild(iframe)
    } else {
      ensureLogicContainer().appendChild(iframe)
    }
  })
}

function ensureLogicContainer(): HTMLDivElement {
  if (logicContainer) return logicContainer
  logicContainer = document.createElement('div')
  logicContainer.id = 'wuh-plugin-logic'
  logicContainer.style.display = 'none'
  document.body.appendChild(logicContainer)
  return logicContainer
}

function closeFrame(key: string): void {
  const frame = frames.get(key)
  if (!frame) return
  frames.delete(key)
  frame.closed = true
  if (frame.helloTimer) clearTimeout(frame.helloTimer)
  frame.pending.forEach((p) => {
    clearTimeout(p.timer)
    p.rej(new Error('插件帧已关闭'))
  })
  frame.pending.clear()
  frame.port.close()
  frame.iframe.remove()
}

/** host → 插件帧请求（渲染规则 / publisher 派发） */
function requestFrame(
  pluginId: string,
  frameKey: string,
  service: 'renderRule' | 'publisher',
  method: string,
  args: unknown[]
): Promise<unknown> {
  const key = FRAME_KEY(pluginId, frameKey)
  const frame = frames.get(key)
  if (!frame) return Promise.reject(new Error(`插件帧不存在: ${pluginId}/${frameKey}`))
  const id = ++frame.hostSeq
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      frame.pending.delete(id)
      reject(new Error(`插件 ${pluginId} 响应超时`))
    }, REQUEST_TIMEOUT_MS)
    frame.pending.set(id, { res: resolve, rej: reject, timer })
    frame.port.postMessage({ kind: 'request', id, service, method, args })
  })
}

function broadcast(name: string, payload?: unknown): void {
  frames.forEach((frame) => {
    if (!frame.closed) frame.port.postMessage({ kind: 'event', name, payload })
  })
}

export async function bootstrapPluginsHost(): Promise<PluginListResult> {
  if (bootPromise) return bootPromise
  bootPromise = startHost()
  return bootPromise
}

/** 一次性接线：文档事件广播、事件总线投递与 publisher 派发（动态查 frames，重载无需重挂） */
let hostWired = false
function wireHostOnce(): void {
  if (hostWired) return
  hostWired = true
  window.pluginApi.onDispatch((dispatch) => {
    requestFrame(dispatch.pluginId, 'logic', 'publisher', 'publish', dispatch.args).then(
      (data) => {
        void window.pluginApi.dispatchReply(dispatch.requestId, { ok: true, data })
      },
      (err: unknown) => {
        void window.pluginApi.dispatchReply(dispatch.requestId, {
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    )
  })
  // 事件总线投递：信封按订阅路由推送订阅插件的全部帧（SDK wuh.on('event', cb) 接收）
  onAnyEvent((env) => {
    const targets = subscribersFor(env.type)
    if (targets.length === 0) return
    frames.forEach((frame) => {
      if (!frame.closed && targets.includes(frame.pluginId)) {
        frame.port.postMessage({ kind: 'event', name: 'event', payload: env })
      }
    })
  })
  documentEvents.subscribe((name, payload) => broadcast(name, payload))
}

/** 引导核心：拉列表 → 建会话 → 开逻辑帧 → 接渲染派发（bootstrap 与 reload 共用） */
async function startHost(): Promise<PluginListResult> {
  const result = await window.pluginApi.list()
  records = result.records
  sessions = new Map()

  await Promise.all(
    enabledRecords().map(async (record) => {
      const { id } = record.manifest
      sessions.set(id, await window.pluginApi.createSession(id))
      registerManifestStatusItems(record.manifest)
      registerManifestTasks(record.manifest)
      registerManifestCapsule(record.manifest)
      if (record.manifest.logic) {
        try {
          await openFrame(id, 'logic', pluginLogicUrl(id), null)
        } catch (err) {
          console.error(`插件 ${id} 逻辑帧启动失败`, err)
        }
      }
    })
  )

  renderService.setRuleDispatcher(async (pluginId, token, method, payload) =>
    String(await requestFrame(pluginId, 'logic', 'renderRule', method, [token, payload]))
  )
  wireHostOnce()
  bootStore.set(true)
  return result
}

// ---------- 宿主代际：启停/重载后壳层刷新视图列表的信号 ----------

let generationSeq = 0
const generationListeners = new Set<() => void>()

export const hostGeneration = {
  get: (): number => generationSeq,
  subscribe(l: () => void): () => void {
    generationListeners.add(l)
    return () => {
      generationListeners.delete(l)
    }
  },
  bump(): void {
    generationSeq += 1
    generationListeners.forEach((l) => l())
  }
}

// ---------- 插件就绪快照（引导完成的渲染层信号，路由/菜单守门用） ----------

let pluginsReady = false
const readyListeners = new Set<() => void>()

const bootStore = {
  get: (): boolean => pluginsReady,
  subscribe(l: () => void): () => void {
    readyListeners.add(l)
    return () => {
      readyListeners.delete(l)
    }
  },
  set(v: boolean): void {
    if (pluginsReady === v) return
    pluginsReady = v
    readyListeners.forEach((l) => l())
  }
}

export function usePluginsReady(): boolean {
  return useSyncExternalStore(bootStore.subscribe, bootStore.get, bootStore.get)
}

/**
 * 重载：主进程重扫目录，渲染层丢弃全部帧/规则/会话后重建。
 * 代际 +1 驱动壳层刷新 SideMenu/浮窗视图列表；开合中的浮窗由注册表保留，
 * 帧随 PluginView 重挂载重建。
 */
export async function rebootstrapPluginsHost(): Promise<PluginListResult> {
  const result = await window.pluginApi.reload()
  records = result.records
  sessions = new Map()
  for (const key of [...frames.keys()]) closeFrame(key)
  renderService.reset()
  bootPromise = null
  await startHost()
  hostGeneration.bump()
  return result
}

export function setWorkspaceInfo(info: WorkspaceInfo | null): void {
  hostWorkspace = info
}

/**
 * 工作区切换生效链（打开本地目录 / clone / 最近项目打开共用）：
 * 重入 seed 宿主信息 + doc 状态失效 + workspace 事件广播
 * （wireHostOnce 后 documentEvents 自动透传进全部插件帧，SDK wuh.on 可感知）。
 */
export function applyWorkspaceSwitch(info: WorkspaceInfo): void {
  setWorkspaceInfo(info)
  workspaceStore.switchWorkspace(info.root)
  documentEvents.emit('workspace', {
    root: info.root,
    name: info.name,
    isGitRepo: info.isGitRepo,
    branch: info.branch
  })
}

export function broadcastTheme(): void {
  broadcast('theme', themePayload())
}

export function listMainViews(): { pluginId: string; view: PluginViewContribution }[] {
  return enabledRecords()
    .flatMap((r) => r.manifest.views.filter((v) => v.area === 'main').map((view) => ({ pluginId: r.manifest.id, view })))
    .sort((a, b) => a.view.order - b.view.order)
}

export function listFloatViews(): { pluginId: string; view: PluginViewContribution }[] {
  return enabledRecords()
    .flatMap((r) => r.manifest.views.filter((v) => v.area === 'float').map((view) => ({ pluginId: r.manifest.id, view })))
    .sort((a, b) => a.view.order - b.view.order)
}

export async function togglePlugin(
  pluginId: string,
  enabled: boolean,
  approvedPermissions?: string[]
): Promise<void> {
  await window.pluginApi.setEnabled(pluginId, enabled, approvedPermissions)
  const record = records.find((r) => r.manifest.id === pluginId)
  if (!record) return
  record.enabled = enabled
  record.approval = resolveApproval(record.manifest, {
    [pluginId]: approvedPermissions ?? record.manifest.permissions
  })

  if (enabled) {
    // 运行时启用：补建会话与逻辑帧（bootstrap 只处理启动时已启用的插件）
    sessions.set(pluginId, await window.pluginApi.createSession(pluginId))
    registerManifestStatusItems(record.manifest)
    registerManifestTasks(record.manifest)
    registerManifestCapsule(record.manifest)
    if (record.manifest.logic) {
      try {
        await openFrame(pluginId, 'logic', pluginLogicUrl(pluginId), null)
      } catch (err) {
        console.error(`插件 ${pluginId} 逻辑帧启动失败`, err)
      }
    }
  } else {
    closeFrame(FRAME_KEY(pluginId, 'logic'))
    sessions.delete(pluginId)
    clearPluginStatusItems(pluginId)
    clearPluginTasks(pluginId)
    clearPluginCapsule(pluginId)
    clearPluginEvents(pluginId)
  }
  hostGeneration.bump()
}

// ---------- 视图槽位 ----------

const ViewSlot = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
`

const ViewError = styled.p`
  color: var(--danger-color);
  font-size: 12px;
  margin: 6px 0;
  word-break: break-all;
`

/** 插件视图槽位：挂载/卸载沙箱帧 */
export function PluginView(props: {
  pluginId: string
  view: PluginViewContribution
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { pluginId, view } = props

  useEffect(() => {
    let alive = true
    setError(null)
    const el = hostRef.current
    if (!el) return
    void openFrame(pluginId, view.id, pluginViewUrl(pluginId, view.entry), el).catch((err: unknown) => {
      if (alive) setError(err instanceof Error ? err.message : String(err))
    })
    return () => {
      alive = false
      closeFrame(FRAME_KEY(pluginId, view.id))
    }
  }, [pluginId, view.id, view.entry])

  if (error) {
    return (
      <ViewSlot>
        <ViewError>插件视图加载失败：{error}</ViewError>
      </ViewSlot>
    )
  }
  return <ViewSlot ref={hostRef} />
}
