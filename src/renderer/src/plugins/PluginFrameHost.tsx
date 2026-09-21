/**
 * 插件帧宿主（渲染层）：会话建立、沙箱帧生命周期、host 侧服务与消息路由。
 *
 * 帧规则：iframe sandbox="allow-scripts"（不透明源，无 preload / 无宿主 DOM），
 * 逐帧 MessagePort 绑定插件身份；能力调用按 service 分流：
 * - cap → window.pluginApi.invoke(sessionId) → 主进程 broker 权限裁决；
 * - doc / render / ui → host 直接服务（同样先查 manifest 权限）。
 * sessionId 只在 host 内存中流转，绝不下发给插件帧。
 */
import { useEffect, useRef, useState } from 'react'
import type {
  PluginListResult,
  PluginPermission,
  PluginRecord,
  PluginSessionInfo,
  PluginViewContribution,
  ToHostMessage
} from '@shared/plugin'
import { pluginLogicUrl, pluginViewUrl, resolveApproval } from '@shared/plugin'
import type { WorkspaceInfo } from '@shared/types'
import { buildThemeCss } from '../theme/tokens'
import { uiConfirm } from '../components/ui/Dialog'
import { documentEvents, workspaceStore } from '../store'
import {
  clearPluginStatusItems,
  registerManifestStatusItems,
  removeStatusItem,
  updateStatusItem,
  type StatusItemPatch
} from './statusItems'
import { renderService } from './renderPipeline'

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
  onReady?: () => void
}

let records: PluginRecord[] = []
let sessions = new Map<string, PluginSessionInfo>()
const frames = new Map<string, FrameState>()
let hostWorkspace: WorkspaceInfo | null = null
let logicContainer: HTMLDivElement | null = null
let bootPromise: Promise<PluginListResult> | null = null

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
  service: 'cap' | 'doc' | 'render' | 'ui' | 'statusBar',
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
    iframe.addEventListener(
      'load',
      () => {
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
      closeFrame(key)
      reject(new Error(`插件帧未就绪（${HELLO_TIMEOUT_MS}ms 超时）: ${url}`))
    }, HELLO_TIMEOUT_MS)

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

/** 一次性接线：文档事件广播与 publisher 派发（动态查 frames，重载无需重挂） */
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

/**
 * 重载：主进程重扫目录，渲染层丢弃全部帧/规则/会话后重建。
 * 代际 +1 驱动 App 刷新 SideMenu/浮窗视图列表；开合中的浮窗由注册表保留，
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
  }
  hostGeneration.bump()
}

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
      <div className="plugin-view">
        <div className="error-text">插件视图加载失败：{error}</div>
      </div>
    )
  }
  return <div className="plugin-view" ref={hostRef} />
}
