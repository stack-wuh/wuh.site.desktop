import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { SettingsPage } from './settings/SettingsPage'
import { HomePage } from './home/HomePage'
import { ConfirmHost } from './components/ui/Dialog'
import { AppearanceMenu } from './components/AppearanceMenu'
import { StatusBar } from './components/StatusBar'
import { FloatLayer } from './components/FloatLayer'
import { SideMenu, type SideMenuItem } from './components/SideMenu'
import { Empty } from './components/ui/Empty'
import { IconHome, IconSettings, pluginIcon } from './components/icons'
import {
  bootstrapPluginsHost,
  broadcastTheme,
  hostGeneration,
  listFloatViews,
  listMainViews,
  PluginView,
  setWorkspaceInfo
} from './plugins/PluginFrameHost'
import { floatsStore, toggleFloat } from './plugins/floats'
import { useTheme } from './theme/ThemeProvider'

declare global {
  interface Window {
    api: import('@shared/types').DesktopApi
    pluginApi: import('@shared/plugin').PluginHostApi
  }
}

export const PLUGIN_PANEL_PREFIX = 'plugin:'
export const pluginPanelKey = (pluginId: string, viewId: string): string =>
  `${PLUGIN_PANEL_PREFIX}${pluginId}:${viewId}`

/**
 * 右栏路由（两栏布局，无 router 库）：'home' | 'settings' | 'plugin:<pluginId>:<viewId>'。
 * 左栏 SideMenu 菜单项与右栏页面一一对应，互斥切换；默认入口为 home（项目门面）。
 */
export type RightRoute = 'home' | 'settings' | `plugin:${string}:${string}`

/** 菜单项 id 即路由 key（home/settings/pluginPanelKey 产出），边界处收窄 */
const asRoute = (id: string): RightRoute => id as RightRoute

export default function App(): React.JSX.Element {
  const [rightRoute, setRightRoute] = useState<RightRoute>('home')
  const [menuExpanded, setMenuExpanded] = useState(false)
  const [pluginsReady, setPluginsReady] = useState(false)
  const { family, scheme } = useTheme()

  useEffect(() => {
    // 工作区信息仅供插件 doc 服务解析根路径（壳层不再展示工作区 UI）
    void window.api.getWorkspace().then(setWorkspaceInfo)
    void bootstrapPluginsHost()
      .then(() => setPluginsReady(true))
      .catch((err: unknown) => console.error('插件引导失败', err))
  }, [])

  // 主题切换同步进全部插件帧（token 快照经 CSS 注入，设计同源）
  useEffect(() => {
    if (pluginsReady) broadcastTheme()
  }, [family, scheme, pluginsReady])

  // Cmd/Ctrl+, 在设置页与首页之间切换（右栏页面互斥，无 prevView 覆盖语义）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setRightRoute((r) => (r === 'settings' ? 'home' : 'settings'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 宿主代际：插件启停/重载时 +1，驱动菜单与浮窗视图列表刷新
  const generation = useSyncExternalStore(hostGeneration.subscribe, hostGeneration.get)
  const mainViews = useMemo(() => (pluginsReady ? listMainViews() : []), [pluginsReady, generation])
  const floatViews = useMemo(() => (pluginsReady ? listFloatViews() : []), [pluginsReady, generation])
  // 浮窗开合快照：SideMenu toggle 激活态与 FloatLayer 渲染共用
  // （注册表 key 无前缀，toggle 项 id 带 PLUGIN_PANEL_PREFIX，此处映射）
  const floatsSnapshot = useSyncExternalStore(floatsStore.subscribe, floatsStore.get)
  const openKeys = new Set(floatsSnapshot.floats.map((f) => pluginPanelKey(f.pluginId, f.viewId)))

  const items: SideMenuItem[] = [
    { id: 'home', icon: IconHome, title: '首页' },
    ...mainViews.map(({ pluginId, view }) => ({
      id: pluginPanelKey(pluginId, view.id),
      icon: pluginIcon(view.icon),
      title: view.title
    }))
  ]
  const toggleItems: SideMenuItem[] = floatViews.map(({ pluginId, view }) => ({
    id: pluginPanelKey(pluginId, view.id),
    icon: pluginIcon(view.icon),
    title: view.title
  }))
  const tailItems: SideMenuItem[] = [{ id: 'settings', icon: IconSettings, title: '设置' }]

  const mainAreaRef = useRef<HTMLElement | null>(null)

  /** 浮窗 toggle：开/关由 floats 注册表裁决，几何以 main-area（右栏）为视口 */
  const handleToggleFloat = (id: string): void => {
    const decl = floatViews.find((entry) => pluginPanelKey(entry.pluginId, entry.view.id) === id)
    if (!decl) return
    const rect = mainAreaRef.current?.getBoundingClientRect()
    toggleFloat(
      { pluginId: decl.pluginId, viewId: decl.view.id, title: decl.view.title, icon: decl.view.icon, entry: decl.view.entry },
      { width: rect?.width ?? window.innerWidth, height: rect?.height ?? window.innerHeight }
    )
  }

  const activeMainView = rightRoute.startsWith(PLUGIN_PANEL_PREFIX)
    ? mainViews.find((entry) => pluginPanelKey(entry.pluginId, entry.view.id) === rightRoute)
    : undefined

  // 插件停用/重载后路由失效：回退 home（一次性修正，不阻塞渲染）
  useEffect(() => {
    if (rightRoute.startsWith(PLUGIN_PANEL_PREFIX) && !activeMainView && pluginsReady) {
      setRightRoute('home')
    }
  }, [rightRoute, activeMainView, pluginsReady])

  return (
    <div className="app-shell">
      <header className="title-bar">
        <span className="title">wuh-site desktop</span>
        <span className="title-actions">
          <AppearanceMenu />
        </span>
      </header>
      <div className="app-body">
        <SideMenu
          expanded={menuExpanded}
          onToggleExpanded={() => setMenuExpanded((v) => !v)}
          items={items}
          toggleItems={toggleItems}
          openToggleKeys={openKeys}
          onToggle={handleToggleFloat}
          tailItems={tailItems}
          active={rightRoute}
          onChange={(id) => setRightRoute(asRoute(id))}
        />
        <main className="main-area" ref={mainAreaRef}>
          {rightRoute === 'home' && <HomePage />}
          {rightRoute === 'settings' && <SettingsPage onBack={() => setRightRoute('home')} />}
          {activeMainView && <PluginView pluginId={activeMainView.pluginId} view={activeMainView.view} />}
          {rightRoute.startsWith(PLUGIN_PANEL_PREFIX) && !activeMainView && (
            <Empty title="该插件视图已停用" hint="可在设置页重新启用对应插件" />
          )}
          {/* 插件浮窗视图（views.area=float）经注册表按需唤起，与右栏页面共存 */}
          <FloatLayer containerRef={mainAreaRef} />
        </main>
      </div>
      <StatusBar />
      <ConfirmHost />
    </div>
  )
}
