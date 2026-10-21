/** 插件视图路由约定：/plugin/<pluginId>/<viewId> ↔ 菜单项/浮窗 key 的互转 */

export const PLUGIN_ROUTE_PREFIX = '/plugin'

/** 菜单/浮窗项 id：`plugin:<pluginId>:<viewId>`（home/settings 为字面量） */
export const pluginPanelKey = (pluginId: string, viewId: string): string =>
  `plugin:${pluginId}:${viewId}`

/** pathname → 菜单项路由 key（'/' | 'account' | 'settings' | 'drafts' | 'projects' | 'editor' | 'plugin:<pid>:<vid>'） */
export function routeKeyFromPathname(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'home'
  if (pathname === '/account') return 'account'
  if (pathname === '/settings') return 'settings'
  if (pathname === '/drafts') return 'drafts'
  if (pathname === '/projects') return 'projects'
  // 非菜单路由 key：与 account 同构——合法路径段但不高亮任何菜单项
  if (pathname === '/editor') return 'editor'
  if (pathname.startsWith(`${PLUGIN_ROUTE_PREFIX}/`)) {
    const [, , pluginId, viewId] = pathname.split('/')
    if (pluginId && viewId) return pluginPanelKey(pluginId, viewId)
  }
  return 'home'
}

/**
 * 书脊首项（写作入口）目标：有活动文档且不在编辑页 → 回 `/editor`；
 * 已在编辑页或无文档 → 回 `/`（首页 = 新建博客）。
 */
export function workbenchEntryTarget(pathname: string, hasActiveDoc: boolean): '/' | '/editor' {
  return hasActiveDoc && !pathname.startsWith('/editor') ? '/editor' : '/'
}
