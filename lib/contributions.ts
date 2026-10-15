/**
 * 插件贡献点装配（20261015-feature-workbench-shell task-13）：bootstrap/启停时
 * 把 manifest 声明装配进壳层各注册表——panelTabs（dock/context 页签）与
 * paletteCommands（命令面板插件命令，v1 = main 视图快捷命令）。帧宿主
 * （frameProtocol）在注册/停用时机调用，本模块只做转发与导航闭包注入。
 */
import type { PluginManifest } from '@shared/plugin'
import { clearPluginPanelTabs, registerManifestPanelTabs } from './panelTabs'
import { clearPluginPaletteCommands, registerPaletteCommands } from './commands'

/** 导航注入：命令执行跳转插件 main 视图（壳层 layout 提供 router.push） */
export function wirePluginContributions(manifest: PluginManifest, navigate: (path: string) => void): void {
  registerManifestPanelTabs(manifest)
  const commands = manifest.commands ?? []
  if (commands.length === 0) return
  registerPaletteCommands(
    commands.map((c) => ({
      id: `${manifest.id}:${c.id}`,
      group: 'plugin' as const,
      title: c.title,
      keywords: `${manifest.id} ${c.id}`,
      run: (): void => navigate(`/plugin/${manifest.id}/${c.viewId}`)
    }))
  )
}

export function unwirePluginContributions(pluginId: string): void {
  clearPluginPanelTabs(pluginId)
  clearPluginPaletteCommands(pluginId)
}
