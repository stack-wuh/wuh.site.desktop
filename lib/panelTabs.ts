/**
 * 编辑器上下文侧栏（书耳）插件页签注册表（20261015-feature-workbench-shell
 * task-6/9/13 引入；20261017-feature-app-layout-workbench D5 起 kind 收敛为
 * 'context'——Dock 退役，原 dock 页签随 components/dock 一并移除；
 * 纯逻辑快照 store，与 lib/capsule 同构）。
 *
 * 模型：manifest 声明制页签槽位（views.area = 'context'，bootstrap/启用
 * 插件时注册，默认 hidden 不出按钮），运行时插件帧经帧服务 updatePanelTab /
 * removePanelTab 以 sections/rows 结构化上报显隐——护栏与 capsule tabs 完全同源
 * （parseTabSections：≤3×≤8、4KB、icon 白名单、viewId 归属本插件 main 视图）。
 * 停用/卸载插件时整组清除。壳层只读渲染，插件帧不触 DOM。
 */
import { type PluginManifest } from '@shared/plugin'
import { createStore } from './createStore'
import { parseTabSections } from './tabSections'
import type { CapsuleTabSection } from './capsule'

export type PanelTabKind = 'context'

export interface PanelTabState {
  /** `<kind>:<pluginId>:<id>` */
  key: string
  kind: PanelTabKind
  pluginId: string
  id: string
  title: string
  icon: string
  /** 运行时 removePanelTab 后隐藏（首次上报前亦隐藏，不出页签按钮） */
  hidden: boolean
  sections: CapsuleTabSection[]
  /** 声明期固化的本插件 main 视图 id 集合（viewId 归属校验用，不参与渲染） */
  viewIds: string[]
}

interface PanelTabsState {
  tabs: PanelTabState[]
}

const store = createStore<PanelTabsState>({ tabs: [] })

export const panelTabsStore = {
  get: store.get,
  subscribe: store.subscribe
}

function tabKey(kind: PanelTabKind, pluginId: string, id: string): string {
  return `${kind}:${pluginId}:${id}`
}

/** bootstrap/启用插件时注册 manifest 声明（views.area context ≤1，
 * validateManifest 已拦超额；此处对重复注册幂等且不覆盖运行时数据） */
export function registerManifestPanelTabs(manifest: PluginManifest): void {
  const state = store.get()
  let changed = false
  for (const kind of ['context'] as const) {
    const view = manifest.views.find((v) => v.area === kind)
    if (!view) continue
    const key = tabKey(kind, manifest.id, view.id)
    if (state.tabs.some((tb) => tb.key === key)) continue
    state.tabs.push({
      key,
      kind,
      pluginId: manifest.id,
      id: view.id,
      title: view.title,
      icon: view.icon,
      hidden: true,
      sections: [],
      viewIds: manifest.views.filter((v) => v.area === 'main').map((v) => v.id)
    })
    changed = true
  }
  if (changed) store.commit((cur) => ({ tabs: [...cur.tabs] }))
}

/** 停用/卸载插件时移除其全部页签 */
export function clearPluginPanelTabs(pluginId: string): void {
  const before = store.get().tabs.length
  store.commit((cur) => ({ tabs: cur.tabs.filter((tb) => tb.pluginId !== pluginId) }))
  if (store.get().tabs.length !== before) return
}

/** 运行时上报页签内容（未声明报错；上报同时恢复隐藏） */
export function updatePanelTab(pluginId: string, kind: PanelTabKind, id: string, payload: unknown): void {
  const tab = store.get().tabs.find((tb) => tb.key === tabKey(kind, pluginId, id))
  if (!tab) throw new Error(`插件页签未声明: ${pluginId}/${kind}/${id}`)
  tab.sections = parseTabSections(payload, tab.viewIds)
  tab.hidden = false
  store.commit((cur) => ({ tabs: [...cur.tabs] }))
}

/** 运行时隐藏页签（未声明报错） */
export function removePanelTab(pluginId: string, kind: PanelTabKind, id: string): void {
  const tab = store.get().tabs.find((tb) => tb.key === tabKey(kind, pluginId, id))
  if (!tab) throw new Error(`插件页签未声明: ${pluginId}/${kind}/${id}`)
  tab.hidden = true
  store.commit((cur) => ({ tabs: [...cur.tabs] }))
}

/** 渲染用：非隐藏页签（声明序） */
export function visiblePanelTabs(kind: PanelTabKind): PanelTabState[] {
  return store.get().tabs.filter((tb) => tb.kind === kind && !tb.hidden)
}

export function resetPanelTabsForTests(): void {
  store.commit({ tabs: [] })
}
