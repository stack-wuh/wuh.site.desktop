/**
 * 插件系统共享契约：manifest 结构、权限词表、主↔渲染↔帧消息类型与纯校验函数。
 * 仅类型与纯函数，禁止引入 node/electron API（与 shared/types.ts 同边界）。
 */
import type { IpcResult } from './types'

// ---------- 权限词表 ----------

export const PLUGIN_PERMISSIONS = [
  'fs.workspace.read',
  'fs.workspace.write',
  'git.status.read',
  'git.history.write',
  'net.github.api',
  'settings.read',
  'document.read.write',
  'render.rule.register',
  'render.execute',
  'publish.register'
] as const

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number]

// ---------- manifest ----------

export type ViewArea = 'sidebar' | 'preview'

/** 图标白名单：host 按名称映射到同源 lucide/品牌图标，插件不携带图标资源 */
export const PLUGIN_ICONS = [
  'file-text',
  'git-branch',
  'github',
  'tag',
  'message',
  'eye',
  'sparkles',
  'book'
] as const
export type PluginIconName = (typeof PLUGIN_ICONS)[number]

export interface PluginViewContribution {
  id: string
  area: ViewArea
  title: string
  icon: PluginIconName
  /** 插件目录内相对路径的 .html 入口 */
  entry: string
  /** 排序权重，小者在前，默认 100 */
  order: number
}

export interface PluginPublisherContribution {
  id: string
  label: string
}

export interface PluginManifest {
  /** [a-z0-9][a-z0-9._-]*，同时作为 plugin://<id>/ 的 host */
  id: string
  name: string
  version: string
  description?: string
  /** 可选逻辑帧入口（插件目录内相对路径的 .js） */
  logic?: string
  views: PluginViewContribution[]
  publishers: PluginPublisherContribution[]
  permissions: PluginPermission[]
}

/** 主进程 loader 产出，经 plugin:list 交给渲染层 */
export interface PluginRecord {
  manifest: PluginManifest
  dir: string
  enabled: boolean
}

export interface PluginListResult {
  records: PluginRecord[]
  problems: { dir: string; errors: string[] }[]
}

/** 主进程 createSession 返回给 host 的会话信息（sessionId 绝不下发给插件帧） */
export interface PluginSessionInfo {
  sessionId: string
  pluginId: string
  permissions: PluginPermission[]
}

/** 主进程 → host 的 publisher 派发负载（webContents.send('plugin:dispatch')） */
export interface PluginDispatchPayload {
  pluginId: string
  kind: 'request'
  service: 'publisher'
  requestId: string
  args: unknown[]
}

/** preload 暴露到 window.pluginApi 的 host↔主进程插件通道 */
export interface PluginHostApi {
  list(): Promise<PluginListResult>
  createSession(pluginId: string): Promise<PluginSessionInfo>
  setEnabled(pluginId: string, enabled: boolean): Promise<void>
  invoke(sessionId: string, method: string, args: unknown[]): Promise<unknown>
  onDispatch(cb: (payload: PluginDispatchPayload) => void): () => void
  dispatchReply(requestId: string, result: IpcResult<unknown>): Promise<void>
}

// ---------- 帧消息协议 ----------

/** 插件帧 → host：service=cap 走主进程 broker；doc/render/ui 由 host 直接服务。
 * id 由各帧自己的序号发生器产出（host 用数字、SDK 用 rN 字符串，回显原样匹配）。 */
export interface FrameInvoke {
  kind: 'invoke'
  id: number | string
  service: 'cap' | 'doc' | 'render' | 'ui'
  method: string
  args: unknown[]
}

/** host 请求插件（renderRule / publisher）执行；插件以 response 回传 */
export interface HostRequest {
  kind: 'request'
  id: number
  service: 'renderRule' | 'publisher'
  method: string
  args: unknown[]
}

export interface FrameResponse {
  kind: 'response'
  id: number | string
  ok: boolean
  data?: unknown
  error?: string
}

export type ToFrameMessage =
  | { kind: 'result'; id: number | string; ok: boolean; data?: unknown; error?: string }
  | { kind: 'event'; name: string; payload?: unknown }
  | HostRequest

/** 帧内 SDK 初始化完成信令 */
export interface FrameReady {
  kind: 'ready'
}

export type ToHostMessage = FrameInvoke | FrameResponse | FrameReady

// ---------- 协议常量 ----------

export const PLUGIN_SCHEME = 'plugin'
/** SDK 虚拟文件：由主进程协议 handler 以字符串常量下发，不属于插件目录 */
export const SDK_VIRTUAL_PATH = '@core/sdk.js'
/** 逻辑帧的合成入口：加载 SDK 后再 import 插件 logic 文件 */
export const LOGIC_HOST_PATH = '@core/logic-host.html'

export function pluginOrigin(pluginId: string): string {
  return `${PLUGIN_SCHEME}://${pluginId}`
}

export function pluginViewUrl(pluginId: string, entry: string): string {
  return `${pluginOrigin(pluginId)}/${entry}`
}

export function pluginLogicUrl(pluginId: string): string {
  return `${pluginOrigin(pluginId)}/${LOGIC_HOST_PATH}`
}

// ---------- manifest 校验 ----------

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/
const VERSION_RE = /^\d+\.\d+\.\d+[-\w.]*$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 相对路径校验：禁止绝对路径、盘符、.. 越界 */
function checkRelPath(value: unknown, field: string, suffix: string, errors: string[]): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${field} 必须是非空字符串`)
    return false
  }
  if (value.startsWith('/') || value.startsWith('\\') || /^[a-zA-Z]:/.test(value)) {
    errors.push(`${field} 禁止绝对路径: ${value}`)
    return false
  }
  if (value.split(/[\\/]/).includes('..')) {
    errors.push(`${field} 禁止 .. 越界: ${value}`)
    return false
  }
  if (!value.endsWith(suffix)) {
    errors.push(`${field} 必须以 ${suffix} 结尾: ${value}`)
    return false
  }
  return true
}

export function validateManifest(
  raw: unknown
): { ok: true; manifest: PluginManifest } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (!isRecord(raw)) {
    return { ok: false, errors: ['manifest 必须是 JSON 对象'] }
  }

  const { id, name, version } = raw
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    errors.push(`id 非法（须匹配 ${ID_RE}，禁止路径字符）: ${String(id)}`)
  }
  if (typeof name !== 'string' || !name.trim()) errors.push('name 必填')
  if (typeof version !== 'string' || !VERSION_RE.test(version)) errors.push(`version 需为 x.y.z: ${String(version)}`)

  const perms: PluginPermission[] = []
  if (!Array.isArray(raw.permissions)) {
    errors.push('permissions 必须是数组（可为空数组）')
  } else {
    for (const p of raw.permissions) {
      if ((PLUGIN_PERMISSIONS as readonly string[]).includes(String(p))) {
        perms.push(p as PluginPermission)
      } else {
        errors.push(`未知权限: ${String(p)}`)
      }
    }
  }

  const views: PluginViewContribution[] = []
  const viewIds = new Set<string>()
  if (!Array.isArray(raw.views)) {
    errors.push('views 必须是数组（可为空数组）')
  } else {
    raw.views.forEach((v, i) => {
      if (!isRecord(v)) {
        errors.push(`views[${i}] 必须是对象`)
        return
      }
      let valid = true
      if (typeof v.id !== 'string' || !v.id) {
        errors.push(`views[${i}].id 必填`)
        valid = false
      } else if (viewIds.has(v.id)) {
        errors.push(`视图 id 重复: ${v.id}`)
        valid = false
      } else {
        viewIds.add(v.id)
      }
      if (v.area !== 'sidebar' && v.area !== 'preview') {
        errors.push(`views[${i}].area 只能是 sidebar/preview: ${String(v.area)}`)
        valid = false
      }
      if (typeof v.title !== 'string' || !v.title.trim()) {
        errors.push(`views[${i}].title 必填`)
        valid = false
      }
      if (!(PLUGIN_ICONS as readonly string[]).includes(String(v.icon))) {
        errors.push(`views[${i}].icon 不在白名单: ${String(v.icon)}`)
        valid = false
      }
      if (!checkRelPath(v.entry, `views[${i}].entry`, '.html', errors)) valid = false
      if (valid) {
        views.push({
          id: v.id as string,
          area: v.area as ViewArea,
          title: v.title as string,
          icon: v.icon as PluginIconName,
          entry: v.entry as string,
          order: typeof v.order === 'number' ? v.order : 100
        })
      }
    })
  }

  const publishers: PluginPublisherContribution[] = []
  const pubIds = new Set<string>()
  if (!Array.isArray(raw.publishers)) {
    errors.push('publishers 必须是数组（可为空数组）')
  } else {
    raw.publishers.forEach((p, i) => {
      if (!isRecord(p) || typeof p.id !== 'string' || !p.id || typeof p.label !== 'string' || !p.label) {
        errors.push(`publishers[${i}] 需含 id/label 字符串`)
        return
      }
      if (pubIds.has(p.id)) {
        errors.push(`publisher id 重复: ${p.id}`)
        return
      }
      pubIds.add(p.id)
      publishers.push({ id: p.id, label: p.label })
    })
  }

  let logic: string | undefined
  if (typeof raw.logic === 'string') {
    if (checkRelPath(raw.logic, 'logic', '.js', errors)) logic = raw.logic
  } else if (raw.logic !== undefined) {
    errors.push('logic 必须是字符串')
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    manifest: {
      id: id as string,
      name: name as string,
      version: version as string,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      logic,
      views,
      publishers,
      permissions: perms
    }
  }
}

// ---------- 能力方法 → 权限映射（主进程 broker 强制） ----------

/**
 * DesktopApi 方法名 → 插件可调用的所需权限。
 * 不在此表中的方法（含 setGithubToken/clearGithubToken/uploadImage/savePastedImage/
 * setSettings/openWorkspace 等）对插件永远不可见——默认拒绝。
 */
export const CAPABILITY_METHODS: Readonly<Record<string, PluginPermission>> = {
  readTree: 'fs.workspace.read',
  readFile: 'fs.workspace.read',
  writeFile: 'fs.workspace.write',
  gitStatus: 'git.status.read',
  gitLog: 'git.status.read',
  gitShow: 'git.status.read',
  gitStage: 'git.history.write',
  gitCommit: 'git.history.write',
  gitPush: 'git.history.write',
  gitPull: 'git.history.write',
  planRevert: 'git.history.write',
  executeRevert: 'git.history.write',
  githubListIssues: 'net.github.api',
  githubGetIssueComments: 'net.github.api',
  githubAddIssueComment: 'net.github.api',
  githubListLabels: 'net.github.api',
  githubUpsertLabel: 'net.github.api',
  githubDeleteLabel: 'net.github.api',
  githubUpsertIssue: 'publish.register',
  publish: 'publish.register',
  getSettings: 'settings.read'
}

export type CapabilityDecision =
  | { ok: true; permission: PluginPermission }
  | { ok: false; permission?: PluginPermission; reason: string }

/** 纯函数裁决：broker 与渲染侧共用同一语义，可独立测试 */
export function authorizeCapability(
  granted: readonly PluginPermission[],
  method: string
): CapabilityDecision {
  const required = CAPABILITY_METHODS[method]
  if (!required) {
    return { ok: false, reason: `方法 ${method} 不在插件能力白名单内，不允许调用` }
  }
  if (!granted.includes(required)) {
    return { ok: false, permission: required, reason: `缺少权限 ${required}（插件 manifest 未声明或用户未批准）` }
  }
  return { ok: true, permission: required }
}
