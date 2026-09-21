/**
 * 插件 loader（主进程）：扫描插件目录、校验 manifest、维护启用/批准状态，
 * 并把 broker / protocol / publisher 桥接接成一条线。
 *
 * 首期插件源：应用内置 plugins/ 目录（官方参考插件）与 userData/plugins/（本地第三方）。
 * 启用/批准持久化在 userData/plugin-state.json：
 * - disabled: 用户显式禁用列表
 * - approvals: 插件 id → 批准时 manifest 权限快照（权限变更即失效待重批）
 * 有效启用 = 未禁用 且 resolveApproval === 'approved'。
 * 市场/审核/分发为非目标。
 */
import { app, ipcMain, shell } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  resolveApproval,
  samePermissions,
  validateManifest,
  type ApprovalMap,
  type PluginRecord
} from '@shared/plugin'
import type { IpcResult, PublishResult } from '@shared/types'
import { callHandler } from '../ipc'
import { getToken } from '../credentials'
import { registerPublisher, unregisterPublisher } from '../publishers/types'
import { dispatchToPlugin, initBroker, registerBrokerIpc } from './broker'
import { initPluginProtocol } from './protocol'
import { PLUGIN_SDK_JS } from '../../plugin-sdk'

interface LoadState {
  disabled: string[]
  approvals: Record<string, string[]>
}

const records = new Map<string, PluginRecord>()
const problems: { dir: string; errors: string[] }[] = []
const bridgePublisherIds = new Set<string>()
/** 当前批准快照（与 state 文件同步），扫描与启停共用 */
let approvals: Record<string, string[]> = {}

function stateFile(): string {
  return path.join(app.getPath('userData'), 'plugin-state.json')
}

async function loadState(): Promise<LoadState> {
  try {
    const raw = JSON.parse(await fsp.readFile(stateFile(), 'utf-8')) as Partial<LoadState>
    return {
      disabled: Array.isArray(raw.disabled) ? raw.disabled : [],
      approvals: raw.approvals && typeof raw.approvals === 'object' ? raw.approvals : {}
    }
  } catch {
    return { disabled: [], approvals: {} }
  }
}

async function saveState(state: LoadState): Promise<void> {
  await fsp.mkdir(path.dirname(stateFile()), { recursive: true })
  await fsp.writeFile(stateFile(), JSON.stringify(state, null, 2), 'utf-8')
}

async function scanDir(baseDir: string, disabled: Set<string>): Promise<void> {
  let entries
  try {
    entries = await fsp.readdir(baseDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const dir = path.join(baseDir, e.name)
    try {
      const manifestRaw: unknown = JSON.parse(await fsp.readFile(path.join(dir, 'plugin.json'), 'utf-8'))
      const checked = validateManifest(manifestRaw)
      if (!checked.ok) {
        problems.push({ dir, errors: checked.errors })
        continue
      }
      if (records.has(checked.manifest.id)) {
        problems.push({ dir, errors: [`插件 id 重复: ${checked.manifest.id}（保留先扫描到的目录）`] })
        continue
      }
      const approval = resolveApproval(checked.manifest, approvals as ApprovalMap)
      records.set(checked.manifest.id, {
        manifest: checked.manifest,
        dir,
        enabled: !disabled.has(checked.manifest.id) && approval === 'approved',
        approval
      })
    } catch (err) {
      problems.push({ dir, errors: [`plugin.json 读取/解析失败: ${err instanceof Error ? err.message : String(err)}`] })
    }
  }
}

export function listPluginRecords(): PluginRecord[] {
  return [...records.values()].sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
}

export function getPluginRecord(pluginId: string): PluginRecord | undefined {
  return records.get(pluginId)
}

/** manifest 声明的 publishers 注册为桥接 Publisher：publish 经 host 派发回插件逻辑帧 */
function syncBridgePublishers(): void {
  for (const id of bridgePublisherIds) unregisterPublisher(id)
  bridgePublisherIds.clear()
  for (const record of records.values()) {
    if (!record.enabled) continue
    for (const pub of record.manifest.publishers) {
      if (bridgePublisherIds.has(pub.id)) continue // 首个声明生效，重复留给 review 警告
      bridgePublisherIds.add(pub.id)
      registerPublisher({
        id: pub.id,
        label: pub.label,
        async isAvailable(): Promise<boolean> {
          return true
        },
        async publish(req): Promise<PublishResult> {
          const res = await dispatchToPlugin(record.manifest.id, 'publisher', randomUUID(), [pub.id, req])
          if (!res.ok) return { ok: false, error: res.error }
          return res.data as PublishResult
        }
      })
    }
  }
}

export async function setPluginEnabled(
  pluginId: string,
  enabled: boolean,
  approvedPermissions?: string[]
): Promise<IpcResult<null>> {
  const record = records.get(pluginId)
  if (!record) return { ok: false, error: `插件不存在: ${pluginId}` }
  const state = await loadState()
  const disabled = new Set(state.disabled)

  if (enabled) {
    const current = resolveApproval(record.manifest, approvals as ApprovalMap)
    if (current !== 'approved') {
      // 未批准/权限已变：必须携带与 manifest 完全一致的权限数组才放行
      if (!approvedPermissions || !samePermissions(approvedPermissions, record.manifest.permissions)) {
        return { ok: false, error: `插件 ${pluginId} 需先批准与 manifest 一致的权限列表` }
      }
      approvals[pluginId] = [...new Set(approvedPermissions)]
    } else if (approvedPermissions && !samePermissions(approvedPermissions, record.manifest.permissions)) {
      return { ok: false, error: `批准列表与插件 ${pluginId} 的 manifest 权限不一致` }
    }
    disabled.delete(pluginId)
  } else {
    disabled.add(pluginId)
  }

  approvals = { ...approvals }
  await saveState({ disabled: [...disabled], approvals })
  const approval = resolveApproval(record.manifest, approvals as ApprovalMap)
  record.enabled = !disabled.has(pluginId) && approval === 'approved'
  record.approval = approval
  syncBridgePublishers()
  return { ok: true, data: null }
}

export function bootstrapPlugins(): Promise<void> {
  return rescan()
}

/** 重扫双目录并重建 records / 桥接 / IPC（reload 与首次引导共用，幂等） */
export function rescan(): Promise<void> {
  return (async () => {
    const state = await loadState()
    approvals = { ...state.approvals }
    const disabled = new Set(state.disabled)
    records.clear()
    problems.length = 0
    await scanDir(path.join(app.getAppPath(), 'plugins'), disabled)
    await scanDir(path.join(app.getPath('userData'), 'plugins'), disabled)

    initBroker({
      getPlugin: (id) => records.get(id),
      callApi: (method, args) => callHandler(method, args),
      getToken
    })
    initPluginProtocol({
      getPluginDir: (id) => records.get(id)?.dir ?? null,
      getLogicEntry: (id) => {
        const rec = records.get(id)
        return rec?.enabled ? rec.manifest.logic ?? null : null
      },
      getSdkSource: () => PLUGIN_SDK_JS
    })
    registerBrokerIpc()

    ipcMain.removeHandler('plugin:list')
    ipcMain.handle('plugin:list', async () => {
      return { ok: true, data: { records: listPluginRecords(), problems: [...problems] } }
    })
    ipcMain.removeHandler('plugin:setEnabled')
    ipcMain.handle('plugin:setEnabled', async (_e, pluginId: string, enabled: boolean, approvedPermissions?: string[]) =>
      setPluginEnabled(pluginId, enabled, approvedPermissions)
    )
    ipcMain.removeHandler('plugin:reload')
    ipcMain.handle('plugin:reload', async () => {
      await rescan()
      return { ok: true, data: { records: listPluginRecords(), problems: [...problems] } }
    })
    ipcMain.removeHandler('plugin:revealDir')
    ipcMain.handle('plugin:revealDir', async (_e, pluginId: string) => {
      const record = records.get(pluginId)
      if (!record) return { ok: false, error: `插件不存在: ${pluginId}` }
      await shell.openPath(record.dir)
      return { ok: true, data: null }
    })

    syncBridgePublishers()
  })()
}
