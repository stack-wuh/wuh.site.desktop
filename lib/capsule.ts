/**
 * 胶囊控制中心模块注册表（host 侧纯逻辑，可独立测试）——与 tasks/statusItems
 * 同构的快照注册表。
 *
 * 模型：manifest 声明制模块槽位（bootstrap/启用插件时注册，默认 hidden），
 * 运行时插件帧（视图帧或逻辑帧）经 capsule.update / capsule.remove 只能更新
 * 「自己声明过」的模块内容或隐藏——跨插件、未声明、模板不符的数据一律拒绝。
 * 数据单向上报，宿主按模板白名单渲染（count/status），插件帧不触 DOM。
 */

import type { CapsuleTemplate, PluginManifest } from '@shared/plugin'

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

interface CapsuleState {
  modules: CapsuleModuleState[]
}

let state: CapsuleState = { modules: [] }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function commit(): void {
  state = { modules: [...state.modules] }
  emit()
}

export const capsuleStore = {
  get: (): CapsuleState => state,
  subscribe(l: () => void): () => void {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
}

export function capsuleKey(pluginId: string, moduleId: string): string {
  return `${pluginId}:${moduleId}`
}

const TONES: readonly CapsuleTone[] = ['default', 'primary', 'success', 'warning']

/** bootstrap/启用插件时注册 manifest 声明；重复注册幂等且不覆盖运行时数据 */
export function registerManifestCapsule(manifest: PluginManifest): void {
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
  if (changed) commit()
}

/** 停用/卸载插件时移除其全部模块 */
export function clearPluginCapsule(pluginId: string): void {
  const before = state.modules.length
  state.modules = state.modules.filter((m) => m.pluginId !== pluginId)
  if (state.modules.length !== before) commit()
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
  const mod = state.modules.find((m) => m.key === capsuleKey(pluginId, moduleId))
  if (!mod) throw new Error(`胶囊模块未声明: ${pluginId}/${moduleId}`)
  mod.hidden = true
  commit()
}

/** 控制中心插件区渲染用：可见模块（已排序：pluginId → 声明序） */
export function visibleCapsuleModules(): CapsuleModuleState[] {
  return state.modules.filter((m) => !m.hidden)
}

export function resetCapsuleForTests(): void {
  state = { modules: [] }
  emit()
}
