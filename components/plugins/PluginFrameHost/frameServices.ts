'use client'

/**
 * 插件帧服务层（20260927-refactor-frame-protocol-split 自 frameProtocol 拆出）：
 * 能力调用的权限裁决、方法路由与参数钳制——cap 走主进程 broker，doc/render/ui
 * 由 host 直接服务，statusBar/tasks/capsule/events 写通各自注册表。
 * 会话/帧生命周期等协议状态仍在 frameProtocol（本文件经其内部访问器读取）；
 * 对插件帧的协议 kind/service 词表零变化。
 */
import {
  createFeedbackRateLimiter,
  sanitizeAlertArgs,
  sanitizeMessageArgs,
  sanitizeToastArgs
} from '@shared/plugin'
import { uiConfirm } from '../../ui/Dialog'
import { alert, message, toast } from '../../../lib/feedback'
import { storedLocale } from '../../../lib/i18n/locales'
import { workspaceStore } from '../../../lib/store'
import {
  removeStatusItem,
  updateStatusItem,
  type StatusItemPatch
} from '../../../lib/statusItems'
import { removeTask, upsertTask, type TaskPatch } from '../../../lib/tasks'
import { removeCapsule, removeCapsuleTab, updateCapsule, updateCapsuleTab } from '../../../lib/capsule'
import { publishEvent, publishPluginEvent, subscribePlugin, unsubscribePlugin } from '../../../lib/events'
import { renderService } from '../../../lib/renderPipeline'
import { currentDocState, requirePermission, sessionOf } from './frameProtocol'

/** 插件反馈频率护栏（全 kind 共享额度：10s 内 5 条；宿主内部调用不经此闸） */
const feedbackGuard = createFeedbackRateLimiter()

async function svcCap(pluginId: string, method: string, args: unknown[]): Promise<unknown> {
  const s = sessionOf(pluginId)
  return await window.pluginApi.invoke(s.sessionId, method, args)
}

async function svcDoc(pluginId: string, method: string, args: unknown[]): Promise<unknown> {
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

async function svcRender(pluginId: string, method: string, args: unknown[]): Promise<unknown> {
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

async function svcUi(_pluginId: string, method: string, args: unknown[]): Promise<unknown> {
  if (method === 'confirm') {
    const opts = (args[0] ?? { message: '' }) as { title?: string; message: string; okText?: string; cancelText?: string; danger?: boolean }
    return await uiConfirm(opts)
  }
  if (method === 'openExternal') {
    const url = String(args[0] ?? '')
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener')
    return null
  }
  // 宿主当前语言只读（20261007-feature-frontmatter-editor-hide）：非敏感信息，
  // 与 ui.toast 等同为免权限能力；语言切换经 documentEvents('locale') 自动广播
  if (method === 'locale') {
    return storedLocale()
  }
  // 反馈提示三方法（toast/message/alert）：与宿主共用 lib/feedback 总线；
  // 入参经 shared 校验器钳制，频率护栏全 kind 共享额度（防插件刷屏）
  if (method === 'toast' || method === 'message' || method === 'alert') {
    if (!feedbackGuard.allow(_pluginId)) {
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

async function svcStatusBar(pluginId: string, method: string, args: unknown[]): Promise<unknown> {
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

async function svcTasks(pluginId: string, method: string, args: unknown[]): Promise<unknown> {
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

async function svcCapsule(pluginId: string, method: string, args: unknown[]): Promise<unknown> {
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
  // 插件 tab（20260925-feature-capsule-plugin-tab）：manifest tabs 声明制（每插件 ≤1），
  // sections/rows 结构化上报，护栏与归属校验在注册表（updateCapsuleTab）
  if (method === 'updateTab') {
    const [tabId, payload] = args as [string, unknown]
    updateCapsuleTab(pluginId, String(tabId), payload)
    return null
  }
  if (method === 'removeTab') {
    removeCapsuleTab(pluginId, String(args[0] ?? ''))
    return null
  }
  throw new Error(`未知胶囊模块方法: ${method}`)
}

async function svcEvents(pluginId: string, method: string, args: unknown[]): Promise<unknown> {
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

export async function handleFrameInvoke(
  pluginId: string,
  service: 'cap' | 'doc' | 'render' | 'ui' | 'statusBar' | 'tasks' | 'capsule' | 'events',
  method: string,
  args: unknown[]
): Promise<unknown> {
  switch (service) {
    case 'cap':
      return svcCap(pluginId, method, args)
    case 'doc':
      return svcDoc(pluginId, method, args)
    case 'render':
      return svcRender(pluginId, method, args)
    case 'ui':
      return svcUi(pluginId, method, args)
    case 'statusBar':
      return svcStatusBar(pluginId, method, args)
    case 'tasks':
      return svcTasks(pluginId, method, args)
    case 'capsule':
      return svcCapsule(pluginId, method, args)
    case 'events':
      return svcEvents(pluginId, method, args)
    default:
      throw new Error(`未知服务: ${String(service)}`)
  }
}
