/**
 * 命令面板命令注册表（20261015-feature-workbench-shell task-10/13，纯逻辑快照
 * store）：壳层命令由 Palette 组件内建（导航/文档/模式，run 闭包持 router 等）；
 * 插件命令为声明制贡献（manifest commands → bootstrap 注册，run 经帧服务转发到
 * 插件逻辑帧）。同 id 重复注册幂等；插件停用经 clearPluginCommands 清除。
 */
import { createStore } from './createStore'

export type PaletteCommandGroup = 'nav' | 'doc' | 'plugin' | 'mode'

export interface PaletteCommand {
  /** 全局唯一：壳层命令 `shell:<id>`；插件命令 `<pluginId>:<commandId>` */
  id: string
  group: PaletteCommandGroup
  title: string
  /** 过滤关键词（空格分隔，匹配语义 = 标题+关键词小写包含） */
  keywords: string
  run: () => void
}

interface CommandsState {
  commands: PaletteCommand[]
}

const store = createStore<CommandsState>({ commands: [] })

export const paletteCommandsStore = {
  get: store.get,
  subscribe: store.subscribe
}

/** 注册（同 id 幂等）；数组内其余命令照常注册 */
export function registerPaletteCommands(commands: PaletteCommand[]): void {
  const cur = store.get().commands
  const next = [...cur]
  let changed = false
  for (const c of commands) {
    if (next.some((x) => x.id === c.id)) continue
    next.push(c)
    changed = true
  }
  if (changed) store.commit({ commands: next })
}

export function clearPluginPaletteCommands(pluginId: string): void {
  store.commit((cur) => ({ commands: cur.commands.filter((c) => !c.id.startsWith(`${pluginId}:`)) }))
}

export function resetPaletteForTests(): void {
  store.commit({ commands: [] })
}
