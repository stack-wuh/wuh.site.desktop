/**
 * 状态栏状态项注册表（host 侧纯逻辑，可独立测试）。
 *
 * 模型：manifest 声明制占位（bootstrap/启用插件时注册，展示默认文本），
 * 运行时插件帧经 statusBar.update / statusBar.remove 只能更新或隐藏
 * 「自己声明过」的项——跨插件、未声明一律拒绝，图标/对齐/排序固定在
 * manifest 层，运行时不可变，保证布局稳定与注入面最小。
 */

import type { PluginIconName, PluginManifest, StatusItemAlignment } from '@shared/plugin'
import { createStore } from './createStore'

export interface StatusItemState {
  /** `${pluginId}:${itemId}` */
  key: string
  pluginId: string
  id: string
  icon: PluginIconName
  text: string
  title?: string
  alignment: StatusItemAlignment
  order: number
  /** 运行时 remove 后隐藏（声明仍在，再次 update 恢复） */
  hidden: boolean
}

interface StatusItemsState {
  items: StatusItemState[]
}

const store = createStore<StatusItemsState>({ items: [] })

function sortItems(a: StatusItemState, b: StatusItemState): number {
  if (a.order !== b.order) return a.order - b.order
  if (a.pluginId !== b.pluginId) return a.pluginId < b.pluginId ? -1 : 1
  return a.id < b.id ? -1 : 1
}

/** 就地变更后统一走这里产出新快照（useSyncExternalStore 依赖新引用） */
function commit(): void {
  store.commit((cur) => ({ items: [...cur.items].sort(sortItems) }))
}

export const statusItemsStore = {
  get: store.get,
  subscribe: store.subscribe
}

export function statusItemKey(pluginId: string, itemId: string): string {
  return `${pluginId}:${itemId}`
}

/** bootstrap/启用插件时注册 manifest 声明；重复注册幂等 */
export function registerManifestStatusItems(manifest: PluginManifest): void {
  const state = store.get()
  let changed = false
  for (const item of manifest.statusItems ?? []) {
    const key = statusItemKey(manifest.id, item.id)
    if (state.items.some((s) => s.key === key)) continue
    state.items.push({
      key,
      pluginId: manifest.id,
      id: item.id,
      icon: item.icon,
      text: item.text,
      alignment: item.alignment,
      order: item.order,
      hidden: false
    })
    changed = true
  }
  if (changed) commit()
}

/** 停用插件时移除其全部状态项 */
export function clearPluginStatusItems(pluginId: string): void {
  const state = store.get()
  const before = state.items.length
  state.items = state.items.filter((s) => s.pluginId !== pluginId)
  if (state.items.length !== before) commit()
}

export interface StatusItemPatch {
  text?: string
  title?: string
}

/** 运行时更新内容（未声明项报错；update 同时恢复 remove 的隐藏） */
export function updateStatusItem(pluginId: string, itemId: string, patch: StatusItemPatch): void {
  const state = store.get()
  const item = state.items.find((s) => s.key === statusItemKey(pluginId, itemId))
  if (!item) throw new Error(`状态项未声明: ${pluginId}/${itemId}`)
  if (patch.text !== undefined) {
    const text = String(patch.text)
    if (!text.trim()) throw new Error('状态项 text 不能为空')
    item.text = text
  }
  if (patch.title !== undefined) item.title = String(patch.title)
  item.hidden = false
  commit()
}

/** 运行时隐藏（未声明项报错） */
export function removeStatusItem(pluginId: string, itemId: string): void {
  const state = store.get()
  const item = state.items.find((s) => s.key === statusItemKey(pluginId, itemId))
  if (!item) throw new Error(`状态项未声明: ${pluginId}/${itemId}`)
  item.hidden = true
  commit()
}

/** StatusBar 渲染用：可见项（已排序） */
export function visibleStatusItems(): StatusItemState[] {
  return store.get().items.filter((s) => !s.hidden)
}

export function resetStatusItemsForTests(): void {
  store.commit({ items: [] })
}
