'use client'

/**
 * 插件帧宿主（渲染层）对外入口——20260926-refactor-mega-component-split 起为 barrel：
 * 协议/会话/宿主服务实现在 ./frameProtocol，视图槽位在 ./PluginView，样式在 ./styles。
 * 对外契约不变：本模块路径与全部具名导出保持可达。
 *
 * 帧规则：iframe sandbox="allow-scripts"（不透明源，无 preload / 无宿主 DOM），
 * 逐帧 MessagePort 绑定插件身份；能力调用按 service 分流：
 * - cap → window.pluginApi.invoke(sessionId) → 主进程 broker 权限裁决；
 * - doc / render / ui → host 直接服务（同样先查 manifest 权限）。
 * sessionId 只在 host 内存中流转，绝不下发给插件帧。
 */
export {
  applyWorkspaceSwitch,
  bootstrapPluginsHost,
  broadcastTheme,
  hostGeneration,
  listFloatViews,
  listMainViews,
  rebootstrapPluginsHost,
  setWorkspaceInfo,
  togglePlugin,
  usePluginsReady
} from './frameProtocol'
export { PluginView } from './PluginView'
