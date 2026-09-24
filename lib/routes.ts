/** 插件视图路由约定：/plugin/<pluginId>/<viewId> ↔ 菜单项/浮窗 key 的互转 */

export const PLUGIN_ROUTE_PREFIX = '/plugin'

/** 菜单/浮窗项 id：`plugin:<pluginId>:<viewId>`（home/settings 为字面量） */
export const pluginPanelKey = (pluginId: string, viewId: string): string =>
  `plugin:${pluginId}:${viewId}`

/** pathname → 菜单项路由 key（'/' | 'account' | 'settings' | 'drafts' | 'plugin:<pid>:<vid>'） */
export function routeKeyFromPathname(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'home'
  if (pathname === '/account') return 'account'
  if (pathname === '/settings') return 'settings'
  if (pathname === '/drafts') return 'drafts'
  if (pathname.startsWith(`${PLUGIN_ROUTE_PREFIX}/`)) {
    const [, , pluginId, viewId] = pathname.split('/')
    if (pluginId && viewId) return pluginPanelKey(pluginId, viewId)
  }
  return 'home'
}
