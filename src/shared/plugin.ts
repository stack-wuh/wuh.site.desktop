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

export type ViewArea = 'main' | 'float'

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

export type StatusItemAlignment = 'left' | 'right'

/** 状态栏状态项贡献：声明制占位，运行时经 SDK statusBar.update/remove 更新内容或隐藏 */
export interface PluginStatusItemContribution {
  /** 插件内唯一，[a-z0-9][a-z0-9._-]* */
  id: string
  icon: PluginIconName
  /** 默认文本（运行时可更新） */
  text: string
  alignment: StatusItemAlignment
  /** 排序权重，小者在前，默认 100 */
  order: number
}

/** 任务胶囊任务声明：声明制占位，运行时经 SDK tasks.upsert/remove 只能更新状态或隐藏 */
export interface PluginTaskContribution {
  /** 插件内唯一，[a-z0-9][a-z0-9._-]* */
  id: string
  /** 任务标题（运行时不可变，保证胶囊清单稳定） */
  title: string
  /** 可选跳转目标：须为本插件已声明的 area=main 视图 id（Popover 条目跳转去向） */
  viewId?: string
}

/** 胶囊控制中心模块模板：count=数值卡（主数值+副标）；status=状态卡（文本+语气色） */
export type CapsuleTemplate = 'count' | 'status'

/** 胶囊控制中心模块声明：声明制槽位，运行时经 SDK capsule.update/remove 更新内容或隐藏 */
export interface PluginCapsuleContribution {
  /** 插件内唯一，[a-z0-9][a-z0-9._-]* */
  id: string
  /** 模块标题（运行时不可变，保证控制中心模块清单稳定） */
  title: string
  icon: PluginIconName
  /** 内容模板：宿主按模板白名单渲染，插件帧不触 DOM */
  template: CapsuleTemplate
  /** 可选跳转目标：须为本插件已声明的 area=main 视图 id */
  viewId?: string
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
  statusItems?: PluginStatusItemContribution[]
  tasks?: PluginTaskContribution[]
  capsule?: PluginCapsuleContribution[]
  permissions: PluginPermission[]
}

/** 主进程 loader 产出，经 plugin:list 交给渲染层 */
export interface PluginRecord {
  manifest: PluginManifest
  dir: string
  /** 有效启用 = 用户未禁用 且 权限批准有效（approved） */
  enabled: boolean
  /** 批准状态：approved=快照一致；pending=从未批准；changed=manifest 权限与快照不一致 */
  approval: PluginApprovalState
}

export type PluginApprovalState = 'approved' | 'pending' | 'changed'

/** plugin-state.json 的 approvals 段：插件 id → 批准时 manifest 权限快照 */
export type ApprovalMap = Readonly<Record<string, readonly string[]>>

/** 权限集合相等：排序去重后逐项比较（顺序无关） */
export function samePermissions(a: readonly string[], b: readonly string[]): boolean {
  const norm = (list: readonly string[]) => [...new Set(list)].sort()
  const x = norm(a)
  const y = norm(b)
  return x.length === y.length && x.every((v, i) => v === y[i])
}

/** 纯函数判定：批准快照 vs 当前 manifest 权限 */
export function resolveApproval(manifest: PluginManifest, approvals: ApprovalMap): PluginApprovalState {
  const snapshot = approvals[manifest.id]
  if (!snapshot) return 'pending'
  return samePermissions(snapshot, manifest.permissions) ? 'approved' : 'changed'
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
  /** enabled=true 且插件未批准/权限已变时，必须携带与 manifest 完全一致的权限数组（批准写入快照） */
  setEnabled(pluginId: string, enabled: boolean, approvedPermissions?: string[]): Promise<void>
  /** 主进程重扫插件目录并重建 records（幂等） */
  reload(): Promise<PluginListResult>
  /** 在文件管理器中打开插件目录（仅限已注册插件 id） */
  revealDir(pluginId: string): Promise<void>
  invoke(sessionId: string, method: string, args: unknown[]): Promise<unknown>
  onDispatch(cb: (payload: PluginDispatchPayload) => void): () => void
  dispatchReply(requestId: string, result: IpcResult<unknown>): Promise<void>
}

// ---------- 帧消息协议 ----------

/** 插件帧 → host：service=cap 走主进程 broker；doc/render/ui/statusBar/tasks/capsule 由 host 直接服务。
 * id 由各帧自己的序号发生器产出（host 用数字、SDK 用 rN 字符串，回显原样匹配）。 */
export interface FrameInvoke {
  kind: 'invoke'
  id: number | string
  service: 'cap' | 'doc' | 'render' | 'ui' | 'statusBar' | 'tasks' | 'capsule'
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
      if (v.area !== 'main' && v.area !== 'float') {
        errors.push(
          v.area === 'sidebar'
            ? `views[${i}].area sidebar 已废弃，请迁移为 main（右栏页面）: ${String(v.area)}`
            : `views[${i}].area 只能是 main/float: ${String(v.area)}`
        )
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

  // statusItems：可选，声明制状态项；运行时只能更新/隐藏已声明项
  const statusItems: PluginStatusItemContribution[] = []
  if (raw.statusItems !== undefined) {
    if (!Array.isArray(raw.statusItems)) {
      errors.push('statusItems 必须是数组')
    } else {
      if (raw.statusItems.length > 4) errors.push('statusItems 最多声明 4 项')
      const itemIds = new Set<string>()
      raw.statusItems.forEach((s, i) => {
        if (!isRecord(s)) {
          errors.push(`statusItems[${i}] 必须是对象`)
          return
        }
        let valid = true
        if (typeof s.id !== 'string' || !ID_RE.test(s.id)) {
          errors.push(`statusItems[${i}].id 非法（须匹配 ${ID_RE}）: ${String(s.id)}`)
          valid = false
        } else if (itemIds.has(s.id)) {
          errors.push(`statusItem id 重复: ${s.id}`)
          valid = false
        } else {
          itemIds.add(s.id)
        }
        if (!(PLUGIN_ICONS as readonly string[]).includes(String(s.icon))) {
          errors.push(`statusItems[${i}].icon 不在白名单: ${String(s.icon)}`)
          valid = false
        }
        if (typeof s.text !== 'string' || !s.text.trim()) {
          errors.push(`statusItems[${i}].text 必填`)
          valid = false
        }
        if (s.alignment !== undefined && s.alignment !== 'left' && s.alignment !== 'right') {
          errors.push(`statusItems[${i}].alignment 只能是 left/right: ${String(s.alignment)}`)
          valid = false
        }
        if (valid) {
          statusItems.push({
            id: s.id as string,
            icon: s.icon as PluginIconName,
            text: s.text as string,
            alignment: (s.alignment as StatusItemAlignment) ?? 'right',
            order: typeof s.order === 'number' ? s.order : 100
          })
        }
      })
    }
  }

  // tasks：可选，声明制任务；运行时只能更新状态/隐藏已声明项，viewId 跳转仅限本插件 main 视图
  const tasks: PluginTaskContribution[] = []
  if (raw.tasks !== undefined) {
    if (!Array.isArray(raw.tasks)) {
      errors.push('tasks 必须是数组')
    } else {
      if (raw.tasks.length > 8) errors.push('tasks 最多声明 8 项')
      const taskIds = new Set<string>()
      raw.tasks.forEach((t, i) => {
        if (!isRecord(t)) {
          errors.push(`tasks[${i}] 必须是对象`)
          return
        }
        let valid = true
        if (typeof t.id !== 'string' || !ID_RE.test(t.id)) {
          errors.push(`tasks[${i}].id 非法（须匹配 ${ID_RE}）: ${String(t.id)}`)
          valid = false
        } else if (taskIds.has(t.id)) {
          errors.push(`task id 重复: ${t.id}`)
          valid = false
        } else {
          taskIds.add(t.id)
        }
        if (typeof t.title !== 'string' || !t.title.trim()) {
          errors.push(`tasks[${i}].title 必填`)
          valid = false
        }
        if (t.viewId !== undefined) {
          const target = views.find((v) => v.id === t.viewId)
          if (!target || target.area !== 'main') {
            errors.push(`tasks[${i}].viewId 须指向本插件已声明的 main 视图: ${String(t.viewId)}`)
            valid = false
          }
        }
        if (valid) {
          tasks.push({
            id: t.id as string,
            title: t.title as string,
            ...(typeof t.viewId === 'string' ? { viewId: t.viewId } : {})
          })
        }
      })
    }
  }

  // capsule：可选，声明制控制中心模块；运行时只能更新/隐藏已声明模块
  const capsule: PluginCapsuleContribution[] = []
  if (raw.capsule !== undefined) {
    if (!Array.isArray(raw.capsule)) {
      errors.push('capsule 必须是数组')
    } else {
      if (raw.capsule.length > 2) errors.push('capsule 最多声明 2 个模块')
      const moduleIds = new Set<string>()
      raw.capsule.forEach((c, i) => {
        if (!isRecord(c)) {
          errors.push(`capsule[${i}] 必须是对象`)
          return
        }
        let valid = true
        if (typeof c.id !== 'string' || !ID_RE.test(c.id)) {
          errors.push(`capsule[${i}].id 非法（须匹配 ${ID_RE}）: ${String(c.id)}`)
          valid = false
        } else if (moduleIds.has(c.id)) {
          errors.push(`capsule 模块 id 重复: ${c.id}`)
          valid = false
        } else {
          moduleIds.add(c.id)
        }
        if (typeof c.title !== 'string' || !c.title.trim()) {
          errors.push(`capsule[${i}].title 必填`)
          valid = false
        }
        if (!(PLUGIN_ICONS as readonly string[]).includes(String(c.icon))) {
          errors.push(`capsule[${i}].icon 不在白名单: ${String(c.icon)}`)
          valid = false
        }
        if (c.template !== 'count' && c.template !== 'status') {
          errors.push(`capsule[${i}].template 只能是 count/status: ${String(c.template)}`)
          valid = false
        }
        if (c.viewId !== undefined) {
          const target = views.find((v) => v.id === c.viewId)
          if (!target || target.area !== 'main') {
            errors.push(`capsule[${i}].viewId 须指向本插件已声明的 main 视图: ${String(c.viewId)}`)
            valid = false
          }
        }
        if (valid) {
          capsule.push({
            id: c.id as string,
            title: c.title as string,
            icon: c.icon as PluginIconName,
            template: c.template as CapsuleTemplate,
            ...(typeof c.viewId === 'string' ? { viewId: c.viewId } : {})
          })
        }
      })
    }
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
      ...(statusItems.length > 0 ? { statusItems } : {}),
      ...(tasks.length > 0 ? { tasks } : {}),
      ...(capsule.length > 0 ? { capsule } : {}),
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
