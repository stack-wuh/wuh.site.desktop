/**
 * 工作台 Dock 开合注册表（20261015-feature-workbench-shell task-5，纯逻辑快照
 * store，与 tasks/floats 同构）。任务中心「下拉 ⇄ 停靠」双形态共用一份开合态：
 * - docked=false：chip 开合胶囊下拉面板（原交互，点外关/Esc 可收）
 * - docked=true：chip 开合底部 Dock 面板（常驻，点外关/Esc 不收，Esc 让位浮窗层）
 * - tab：Dock 展开态当前页签（'tasks' = 任务中心 | 插件 dock 页签 key）
 */
import { createStore } from './createStore'

interface DockState {
  docked: boolean
  open: boolean
  tab: string
}

const store = createStore<DockState>({ docked: false, open: false, tab: 'tasks' })

export const dockStore = {
  get: store.get,
  subscribe: store.subscribe
}

/** chip 点击：开合当前形态（未停靠=下拉，停靠=Dock 面板） */
export function toggleDockOpen(): void {
  store.commit((cur) => ({ ...cur, open: !cur.open }))
}

export function setDockOpen(open: boolean): void {
  store.commit((cur) => (cur.open === open ? cur : { ...cur, open }))
}

/** 停靠：任务中心挂到底部 Dock（open 保持开，形态切为 Dock 面板） */
export function dockTaskCenter(): void {
  store.commit((cur) => ({ ...cur, docked: true, open: true, tab: 'tasks' }))
}

/** 取消停靠：回到胶囊下拉形态（open 保持开 → 下拉面板即时重现） */
export function undockTaskCenter(): void {
  store.commit((cur) => ({ ...cur, docked: false, open: true }))
}

export function setDockTab(tab: string): void {
  store.commit((cur) => ({ ...cur, tab, open: true }))
}

export function resetDockForTests(): void {
  store.commit({ docked: false, open: false, tab: 'tasks' })
}
