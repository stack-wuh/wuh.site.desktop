/**
 * 胶囊控制中心模块注册表（host 侧纯逻辑，可独立测试）——与 tasks/statusItems
 * 同构的快照注册表。
 *
 * 模型：manifest 声明制模块槽位（bootstrap/启用插件时注册，默认 hidden），
 * 运行时插件帧（视图帧或逻辑帧）经 capsule.update / capsule.remove 只能更新
 * 「自己声明过」的模块内容或隐藏——跨插件、未声明、模板不符的数据一律拒绝。
 * 数据单向上报，宿主按模板白名单渲染（count/status），插件帧不触 DOM。
 *
 * 插件 Tab（20260925-feature-capsule-plugin-tab）：manifest tabs 声明（每插件 ≤1），
 * 运行时经 capsule.updateTab / capsule.removeTab 以 sections/rows 结构化上报显隐——
 * 严格 typeof 校验（帧消息禁 Number() 宽转）+ 数量/体积护栏（≤3 sections × ≤8 rows、
 * 序列化 ≤4KB，沿用 events/tasks 先例）；row.viewId 须为本插件已声明的 main 视图。
 */

import { type CapsuleTemplate, type PluginManifest } from '@shared/plugin'
import { createStore } from './createStore'
import { parseTabSections } from './tabSections'

export type CapsuleTone = 'default' | 'primary' | 'success' | 'warning'

export interface CapsuleModuleState {
  /** `${pluginId}:${moduleId}` */
  key: string
  pluginId: string
  id: string
  title: string
  icon: string
  template: CapsuleTemplate
  /** 跳转目标视图（声明期确定，main 区域） */
  viewId?: string
  /** count 模板：主数值（≥0 有限数） */
  value?: number
  /** count 模板：数值副标（如「个 open」） */
  label?: string
  /** status 模板：主文本 */
  text?: string
  /** status 模板：语气色（白名单） */
  tone?: CapsuleTone
  detail?: string
  /** 运行时 remove 后隐藏（声明仍在，再次 update 恢复） */
  hidden: boolean
}

/** 插件 Tab 行：宿主通用渲染器绘制；icon 白名单、viewId 归属在更新入口校验 */
export interface CapsuleTabRow {
  icon?: string
  text: string
  detail?: string
  tone?: CapsuleTone
  viewId?: string
}

export interface CapsuleTabSection {
  title?: string
  rows: CapsuleTabRow[]
}

export interface CapsuleTabState {
  /** `plugin:${pluginId}:${tabId}`（对齐 lib/routes pluginPanelKey 约定，面板选中态寻址用） */
  key: string
  pluginId: string
  id: string
  title: string
  icon: string
  /** 运行时 removeTab 后隐藏（首次 updateTab 前亦隐藏，不出 tab 按钮） */
  hidden: boolean
  sections: CapsuleTabSection[]
  /** 声明期固化的本插件 main 视图 id 集合（updateTab 的 viewId 归属校验用，不参与渲染） */
  viewIds: string[]
}

interface CapsuleState {
  modules: CapsuleModuleState[]
  tabs: CapsuleTabState[]
}

const store = createStore<CapsuleState>({ modules: [], tabs: [] })

function commit(): void {
  store.commit((cur) => ({ modules: [...cur.modules], tabs: [...cur.tabs] }))
}

export const capsuleStore = {
  get: store.get,
  subscribe: store.subscribe
}

export function capsuleKey(pluginId: string, moduleId: string): string {
  return `${pluginId}:${moduleId}`
}

/** tab 注册表 key：plugin:<pid>:<tid>（对齐 lib/routes pluginPanelKey 约定） */
function tabKey(pluginId: string, tabId: string): string {
  return `plugin:${pluginId}:${tabId}`
}

const TONES: readonly CapsuleTone[] = ['default', 'primary', 'success', 'warning']

/** bootstrap/启用插件时注册 manifest 声明；重复注册幂等且不覆盖运行时数据 */
export function registerManifestCapsule(manifest: PluginManifest): void {
  const state = store.get()
  let changed = false
  for (const mod of manifest.capsule ?? []) {
    const key = capsuleKey(manifest.id, mod.id)
    if (state.modules.some((m) => m.key === key)) continue
    state.modules.push({
      key,
      pluginId: manifest.id,
      id: mod.id,
      title: mod.title,
      icon: mod.icon,
      template: mod.template,
      ...(mod.viewId !== undefined ? { viewId: mod.viewId } : {}),
      hidden: true
    })
    changed = true
  }
  for (const tab of manifest.tabs ?? []) {
    const key = tabKey(manifest.id, tab.id)
    if (state.tabs.some((t) => t.key === key)) continue
    state.tabs.push({
      key,
      pluginId: manifest.id,
      id: tab.id,
      title: tab.title,
      icon: tab.icon,
      hidden: true,
      sections: [],
      viewIds: manifest.views.filter((v) => v.area === 'main').map((v) => v.id)
    })
    changed = true
  }
  if (changed) commit()
}

/** 停用/卸载插件时移除其全部模块与 tab */
export function clearPluginCapsule(pluginId: string): void {
  const state = store.get()
  const before = state.modules.length + state.tabs.length
  state.modules = state.modules.filter((m) => m.pluginId !== pluginId)
  state.tabs = state.tabs.filter((t) => t.pluginId !== pluginId)
  if (state.modules.length + state.tabs.length !== before) commit()
}

/** count 模板数据校验；非法抛错（错误信息含期望字段，供插件帧排查） */
function applyCountPatch(mod: CapsuleModuleState, patch: Record<string, unknown>): void {
  if (patch.text !== undefined) throw new Error('count 模块不接受 text（应使用 value）')
  if (patch.value !== undefined) {
    if (typeof patch.value !== 'number' || !Number.isFinite(patch.value) || patch.value < 0) {
      throw new Error('value 须为 ≥0 的有限数值')
    }
    mod.value = patch.value
  }
  if (patch.label !== undefined) {
    if (typeof patch.label !== 'string' || patch.label.length > 20) {
      throw new Error('label 须为 ≤20 字符的字符串')
    }
    mod.label = patch.label
  }
}

/** status 模板数据校验 */
function applyStatusPatch(mod: CapsuleModuleState, patch: Record<string, unknown>): void {
  if (patch.value !== undefined) throw new Error('status 模块不接受 value（应使用 text）')
  if (patch.text !== undefined) {
    if (typeof patch.text !== 'string' || patch.text.length === 0 || patch.text.length > 60) {
      throw new Error('text 须为 1-60 字符的字符串')
    }
    mod.text = patch.text
  }
  if (patch.tone !== undefined) {
    if (!TONES.includes(patch.tone as CapsuleTone)) {
      throw new Error(`tone 只能是 ${TONES.join('/')}: ${String(patch.tone)}`)
    }
    mod.tone = patch.tone as CapsuleTone
  }
}

/** 运行时更新内容（未声明模块报错；update 同时恢复 remove 的隐藏） */
export function updateCapsule(pluginId: string, moduleId: string, patch: unknown): void {
  const state = store.get()
  const mod = state.modules.find((m) => m.key === capsuleKey(pluginId, moduleId))
  if (!mod) throw new Error(`胶囊模块未声明: ${pluginId}/${moduleId}`)
  const p = (patch ?? {}) as Record<string, unknown>
  if (p.detail !== undefined) {
    if (typeof p.detail !== 'string' || p.detail.length > 80) {
      throw new Error('detail 须为 ≤80 字符的字符串')
    }
    mod.detail = p.detail
  }
  if (mod.template === 'count') applyCountPatch(mod, p)
  else applyStatusPatch(mod, p)
  mod.hidden = false
  commit()
}

/** 运行时隐藏（未声明模块报错） */
export function removeCapsule(pluginId: string, moduleId: string): void {
  const state = store.get()
  const mod = state.modules.find((m) => m.key === capsuleKey(pluginId, moduleId))
  if (!mod) throw new Error(`胶囊模块未声明: ${pluginId}/${moduleId}`)
  mod.hidden = true
  commit()
}

// ---------- 插件 Tab（20260925-feature-capsule-plugin-tab） ----------

/** 运行时上报 tab 内容（未声明 tab 报错；update 同时恢复 removeTab 的隐藏）。
    护栏解析唯一事实源在 lib/tabSections.parseTabSections（capsule tabs / dock /
    上下文侧栏页签三处共用：≤3×≤8、4KB、icon 白名单、viewId 归属） */
export function updateCapsuleTab(pluginId: string, tabId: string, payload: unknown): void {
  const state = store.get()
  const tab = state.tabs.find((t) => t.key === tabKey(pluginId, tabId))
  if (!tab) throw new Error(`胶囊 Tab 未声明: ${pluginId}/${tabId}`)
  tab.sections = parseTabSections(payload, tab.viewIds)
  tab.hidden = false
  commit()
}

/** 运行时隐藏 tab（未声明报错） */
export function removeCapsuleTab(pluginId: string, tabId: string): void {
  const state = store.get()
  const tab = state.tabs.find((t) => t.key === tabKey(pluginId, tabId))
  if (!tab) throw new Error(`胶囊 Tab 未声明: ${pluginId}/${tabId}`)
  tab.hidden = true
  commit()
}

/** 控制中心插件区渲染用：可见模块（已排序：pluginId → 声明序） */
export function visibleCapsuleModules(): CapsuleModuleState[] {
  return store.get().modules.filter((m) => !m.hidden)
}

/** 面板动态 tab 渲染用：非隐藏 tab（声明序 = manifest 声明序 × 插件注册序） */
export function visibleCapsuleTabs(): CapsuleTabState[] {
  return store.get().tabs.filter((t) => !t.hidden)
}

export function resetCapsuleForTests(): void {
  store.commit({ modules: [], tabs: [] })
}
