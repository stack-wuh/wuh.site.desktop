/**
 * 插件能力 broker（主进程）：session 签发 + 权限裁决 + 能力表复用。
 *
 * 信任链：插件帧为 sandbox="allow-scripts" 不透明源，无 node、无 preload；
 * 能力调用由 host（核心渲染层代码）逐帧 MessagePort 绑定 sessionId 中继进来，
 * 主进程以 session→manifest 权限裁决后复用 ipc.ts 的 implement() 能力表。
 * host 的完整度等同今日渲染层（拥有完整 window.api），不引入新信任面。
 */
import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { authorizeCapability, type PluginPermission, type PluginRecord, type PluginSessionInfo } from '@shared/plugin'
import type { IpcResult } from '@shared/types'

interface BrokerDeps {
  getPlugin: (pluginId: string) => PluginRecord | undefined
  callApi: (method: string, args: unknown[]) => Promise<unknown>
  getToken: () => Promise<string | null>
}

interface SessionEntry {
  pluginId: string
  permissions: PluginPermission[]
}

let deps: BrokerDeps | null = null
const sessions = new Map<string, SessionEntry>()
const sessionByPlugin = new Map<string, string>()

export function initBroker(d: BrokerDeps): void {
  deps = d
}

/** 仅供测试：清空全部会话与依赖 */
export function resetBrokerForTests(): void {
  sessions.clear()
  sessionByPlugin.clear()
  deps = null
}

export async function createSession(pluginId: string): Promise<PluginSessionInfo> {
  if (!deps) throw new Error('broker 未初始化')
  const record = deps.getPlugin(pluginId)
  if (!record || !record.enabled) {
    throw new Error(`插件不存在或未启用: ${pluginId}`)
  }
  // 渲染层重载会产生新会话；同插件旧会话直接失效，避免权限残留
  await disposeSession(pluginId)
  const sessionId = randomUUID()
  sessions.set(sessionId, { pluginId, permissions: record.manifest.permissions })
  sessionByPlugin.set(pluginId, sessionId)
  return { sessionId, pluginId, permissions: record.manifest.permissions }
}

export async function disposeSession(pluginId: string): Promise<void> {
  const old = sessionByPlugin.get(pluginId)
  if (old) {
    sessions.delete(old)
    sessionByPlugin.delete(pluginId)
  }
}

export async function handlePluginInvoke(
  sessionId: string,
  method: string,
  args: unknown[]
): Promise<IpcResult<unknown>> {
  if (!deps) return { ok: false, error: 'broker 未初始化' }
  const session = sessions.get(sessionId)
  if (!session) return { ok: false, error: '会话无效或已过期，请重新建立' }

  const decision = authorizeCapability(session.permissions, method)
  if (!decision.ok) return { ok: false, error: decision.reason }

  try {
    const data = await deps.callApi(method, args)
    return { ok: true, data }
  } catch (err) {
    let message = err instanceof Error ? err.message : String(err)
    // 兜底脱敏：任何能力实现的报错都不得带出凭证原文
    const token = await deps.getToken()
    if (token) message = message.split(token).join('***')
    return { ok: false, error: message }
  }
}

// ---------- publisher 反向派发（主进程 → host → 插件逻辑帧） ----------

interface PendingDispatch {
  resolve: (v: IpcResult<unknown>) => void
  timer: NodeJS.Timeout
}
const pendingDispatches = new Map<string, PendingDispatch>()

/**
 * 把一次 publisher 调用派发给指定插件：webContents.send → host 转发逻辑帧 →
 * 插件响应经 plugin:dispatchReply 回流。超时视为插件无响应。
 */
export function dispatchToPlugin(pluginId: string, service: 'publisher', requestId: string, args: unknown[]): Promise<IpcResult<unknown>> {
  return new Promise((resolve) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) {
      resolve({ ok: false, error: '无可用窗口，无法调用插件' })
      return
    }
    const timer = setTimeout(() => {
      pendingDispatches.delete(requestId)
      resolve({ ok: false, error: `插件 ${pluginId} 响应超时` })
    }, 30_000)
    pendingDispatches.set(requestId, { resolve, timer })
    win.webContents.send('plugin:dispatch', { pluginId, kind: 'request', service, requestId, args })
  })
}

function settleDispatch(requestId: string, result: IpcResult<unknown>): void {
  const entry = pendingDispatches.get(requestId)
  if (!entry) return
  pendingDispatches.delete(requestId)
  clearTimeout(entry.timer)
  entry.resolve(result)
}

// ---------- IPC 挂载（bootstrapPlugins 调用） ----------

export function registerBrokerIpc(): void {
  ipcMain.removeHandler('plugin:createSession')
  ipcMain.handle('plugin:createSession', async (_e, pluginId: string) => {
    try {
      return { ok: true, data: await createSession(pluginId) }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.removeHandler('plugin:disposeSession')
  ipcMain.handle('plugin:disposeSession', async (_e, pluginId: string) => {
    await disposeSession(pluginId)
    return { ok: true, data: null }
  })

  ipcMain.removeHandler('plugin:invoke')
  ipcMain.handle('plugin:invoke', async (_e, sessionId: string, method: string, args: unknown[]) =>
    handlePluginInvoke(sessionId, method, args)
  )

  ipcMain.removeHandler('plugin:dispatchReply')
  ipcMain.handle('plugin:dispatchReply', async (_e, requestId: string, result: IpcResult<unknown>) => {
    settleDispatch(requestId, result)
    return { ok: true, data: null }
  })
}
