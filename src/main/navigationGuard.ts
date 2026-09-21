/**
 * 顶层导航白名单。
 *
 * 宿主窗口只应停留在自身壳层：生产为 app://shell（Next 静态导出），dev 为 next dev 源。
 * 任何页面内容（含沙箱插件帧）试图把顶层文档导航到别处都拒绝——外部链接走
 * `setWindowOpenHandler → shell.openExternal` 这条显式通道，不经顶层导航，
 * 否则插件帧可把宿主窗口换成自己控制的文档而拿到窗口级 preload 能力。
 */
import { APP_SCHEME } from './schemes'

export interface TopNavigationContext {
  isDev: boolean
  /** dev 渲染层地址（next dev）；仅 isDev 时参与判定 */
  devUrl: string
}

const SHELL_HOST = 'shell'

export function isAllowedTopNavigation(target: string, ctx: TopNavigationContext): boolean {
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return false
  }
  // 自定义 scheme 在 WHATWG URL 中非 special，origin 序列化为 null，故按 protocol + host 判定
  if (url.protocol === `${APP_SCHEME}:`) return url.host === SHELL_HOST
  if (!ctx.isDev) return false
  try {
    const dev = new URL(ctx.devUrl)
    return url.protocol === dev.protocol && url.host === dev.host
  } catch {
    return false
  }
}
