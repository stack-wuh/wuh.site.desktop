'use client'

/**
 * 插件帧宿主·协议与会话（20260926 mega 拆分自单文件；20260927-refactor-frame-protocol-split
 * 起协议层与能力调用服务层分治）：本文件承载会话建立、沙箱帧生命周期、握手与消息
 * 路由、宿主代际/就绪信号、启停/重载/工作区切换与视图枚举 API；能力调用的权限
 * 裁决与方法路由在 ./frameServices（经内部访问器回读本文件状态）。
 * 视图槽位组件见 ./PluginView，对外入口见 ./index。
 *
 * 帧规则：iframe sandbox="allow-scripts"（不透明源，无 preload / 无宿主 DOM），
 * 逐帧 MessagePort 绑定插件身份；能力调用按 service 分流：
 * - cap → window.pluginApi.invoke(sessionId) → 主进程 broker 权限裁决；
 * - doc / render / ui → host 直接服务（同样先查 manifest 权限）。
 * sessionId 只在 host 内存中流转，绝不下发给插件帧。
 */
import { useSyncExternalStore } from 'react'
import type {
  PluginListResult,
  PluginRecord,
  PluginSessionInfo,
  PluginViewContribution,
  ToHostMessage
} from '@shared/plugin'
import { pluginLogicUrl, resolveApproval } from '@shared/plugin'
import type { WorkspaceInfo } from '@shared/types'
import { buildThemeCss } from '../../theme/tokens'
import { documentEvents, workspaceStore } from '../../../lib/store'
import { clearPluginStatusItems, registerManifestStatusItems } from '../../../lib/statusItems'
import { clearPluginTasks, registerManifestTasks } from '../../../lib/tasks'
import { clearPluginCapsule, registerManifestCapsule } from '../../../lib/capsule'
import { clearPluginEvents, onAnyEvent, subscribersFor } from '../../../lib/events'
import { renderService } from '../../../lib/renderPipeline'
import { handleFrameInvoke } from './frameServices'

export interface PendingCall {
  res: (v: unknown) => void
  rej: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface FrameState {
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

export const FRAME_KEY = (pluginId: string, frameKey: string): string => `${pluginId}#${frameKey}`
const HELLO_TIMEOUT_MS = 5000
const REQUEST_TIMEOUT_MS = 25_000

function enabledRecords(): PluginRecord[] {
  return records.filter((r) => r.enabled)
}

// 会话/权限/文档状态的内部访问器：仅供 ./frameServices 服务层回读（不经 index 汇出）
export function sessionOf(pluginId: string): PluginSessionInfo {
  const s = sessions.get(pluginId)
  if (!s) throw new Error(`插件 ${pluginId} 会话未建立`)
  return s
}

export function requirePermission(pluginId: string, permission: PluginSessionInfo['permissions'][number], action: string): void {
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

export function currentDocState(): { path: string | null; content: string | null; saved: string | null; dirty: boolean; root: string | null } {
  const s = workspaceStore.get()
  return { path: s.activePath, content: s.content, saved: s.saved, dirty: s.dirty, root: hostWorkspace?.root ?? s.root }
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

export function openFrame(pluginId: string, frameKey: string, url: string, hostEl: HTMLElement | null): Promise<FrameState> {
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

export function closeFrame(key: string): void {
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
