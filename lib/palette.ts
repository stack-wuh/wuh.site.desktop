/**
 * 命令面板 UI 开合状态（20261015-feature-workbench-shell task-10，纯逻辑快照
 * store）：⌘K / TitleBar 搜索钮 / 插件命令入口共用；面板组件与 layout 键盘
 * 监听都读写这里。
 */
import { createStore } from './createStore'

interface PaletteUiState {
  open: boolean
}

const store = createStore<PaletteUiState>({ open: false })

export const paletteStore = {
  get: store.get,
  subscribe: store.subscribe
}

export function openPalette(): void {
  store.commit({ open: true })
}

export function closePalette(): void {
  store.commit({ open: false })
}

export function togglePalette(): void {
  store.commit((cur) => ({ open: !cur.open }))
}

export function resetPaletteUiForTests(): void {
  store.commit({ open: false })
}
