/**
 * 胶囊开合注册表（20261015-feature-workbench-shell 引入；20261017-feature-app-layout-
 * workbench D5 Dock 退役后收敛为**单形态**纯逻辑快照 store，与 tasks/floats 同构）：
 * chip 开合控制中心下拉面板（点外关/Esc 可收）。原「下拉 ⇄ 停靠」双形态与 Dock
 * 页签随底部 Dock 一并退役（控制中心承接全部聚合职责，不设第二聚合点）。
 */
import { createStore } from './createStore'

interface CapsuleOpenState {
  open: boolean
}

const store = createStore<CapsuleOpenState>({ open: false })

export const dockStore = {
  get: store.get,
  subscribe: store.subscribe
}

/** chip 点击：开合控制中心下拉面板 */
export function toggleDockOpen(): void {
  store.commit((cur) => ({ open: !cur.open }))
}

export function setDockOpen(open: boolean): void {
  store.commit((cur) => (cur.open === open ? cur : { open }))
}

export function resetDockForTests(): void {
  store.commit({ open: false })
}
