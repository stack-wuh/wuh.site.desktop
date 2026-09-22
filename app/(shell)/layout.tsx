'use client'

/**
 * 两栏壳层（App Router layout 持久化）：标题栏 → app-body（左栏 SideMenu + 右栏 main 容器）→ StatusBar。
 * 路由语义：'/'=Home（默认入口）/ '/settings' / '/plugin/<pluginId>/<viewId>'（插件 main 视图），
 * SideMenu 菜单项与路由段一一对应；FloatLayer 常驻 main 容器，浮窗与右栏页面共存；
 * 壳层胶囊（Capsule）常驻 main 容器右上（20260922-feature-shell-capsule）。
 * 全屏视图体系已废止（2026-09-20）：Cmd/Ctrl+, 在 settings ↔ home 间切换；Esc 只关浮窗。
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styled from 'styled-components'
import { HomePage } from '../../components/home/HomePage'
import { ConfirmHost } from '../../components/ui/Dialog'
import { StatusBar } from '../../components/StatusBar'
import { FloatLayer } from '../../components/FloatLayer'
import { Capsule } from '../../components/capsule/Capsule'
import { SideMenu, type SideMenuItem } from '../../components/SideMenu'
import { EditorCommandHost } from '../../components/capsule/sections/EditorSection'
import ShellReady from '../../components/ShellReady'
import { IconHome, pluginIcon } from '../../components/icons'
import {
  bootstrapPluginsHost,
  broadcastTheme,
  hostGeneration,
  listFloatViews,
  listMainViews,
  setWorkspaceInfo,
  usePluginsReady
} from '../../components/plugins/PluginFrameHost'
import { floatsStore, toggleFloat } from '../../lib/floats'
import { refreshIdentity } from '../../lib/identity'
import { pluginPanelKey, routeKeyFromPathname } from '../../lib/routes'
import { useTheme } from '../../components/theme/ThemeProvider'
import { useLocale } from '../../lib/i18n/context'

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`

const TitleBar = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 14px;
  background: var(--chrome-panel);
  border-bottom: 1px solid var(--chrome-border);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`

/* 右栏：页面容器（Home / 设置 / 插件 main 视图路由段互斥，FloatLayer 叠加） */
const MainArea = styled.main`
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  background: var(--background-color);
  transition: background-color 0.3s ease;
`

export default function ShellLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [menuExpanded, setMenuExpanded] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const pluginsReady = usePluginsReady()
  const { family, scheme } = useTheme()
  const { t } = useLocale()

  useEffect(() => {
    // 工作区信息仅供插件 doc 服务解析根路径（壳层不再展示工作区 UI）
    void window.api.getWorkspace().then(setWorkspaceInfo)
    void bootstrapPluginsHost().catch((err: unknown) => console.error('插件引导失败', err))
    // 全局身份一次拉取：侧栏用户入口/快捷面板、首页问候与用户中心共享同一份
    void refreshIdentity().catch((err: unknown) => console.error('身份拉取失败', err))
  }, [])

  // 主题切换同步进全部插件帧（token 快照经 CSS 注入，设计同源）
  useEffect(() => {
    if (pluginsReady) broadcastTheme()
  }, [family, scheme, pluginsReady])

  // Cmd/Ctrl+, 在设置页与首页之间切换（右栏页面互斥，无 prevView 覆盖语义）
  // Cmd/Ctrl+B 切换左栏展开/收起（Rail 底部按钮的快捷键等价入口）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        router.push(pathname.startsWith('/settings') ? '/' : '/settings')
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault()
        setMenuExpanded((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pathname, router])

  // 宿主代际：插件启停/重载时 +1，驱动菜单与浮窗视图列表刷新
  const generation = useSyncExternalStore(hostGeneration.subscribe, hostGeneration.get, hostGeneration.get)
  const mainViews = useMemo(() => (pluginsReady ? listMainViews() : []), [pluginsReady, generation])
  const floatViews = useMemo(() => (pluginsReady ? listFloatViews() : []), [pluginsReady, generation])
  // 浮窗开合快照：SideMenu toggle 激活态与 FloatLayer 渲染共用
  // （注册表 key 无前缀，toggle 项 id 带 plugin: 前缀，此处映射）
  const floatsSnapshot = useSyncExternalStore(floatsStore.subscribe, floatsStore.get, floatsStore.get)
  const openKeys = new Set(floatsSnapshot.floats.map((f) => pluginPanelKey(f.pluginId, f.viewId)))

  const items: SideMenuItem[] = [
    // 首页 = 「新建博客」项目入口（路由 key 仍为 home / 路径 /，仅显示名升级）
    { id: 'home', icon: IconHome, title: t('menu.home') },
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

  const mainAreaRef = useRef<HTMLElement | null>(null)

  /** 浮窗 toggle：开/关由 floats 注册表裁决，几何以 main 容器为视口 */
  const handleToggleFloat = (id: string): void => {
    const decl = floatViews.find((entry) => pluginPanelKey(entry.pluginId, entry.view.id) === id)
    if (!decl) return
    const rect = mainAreaRef.current?.getBoundingClientRect()
    toggleFloat(
      { pluginId: decl.pluginId, viewId: decl.view.id, title: decl.view.title, icon: decl.view.icon, entry: decl.view.entry },
      { width: rect?.width ?? window.innerWidth, height: rect?.height ?? window.innerHeight }
    )
  }

  const active = routeKeyFromPathname(pathname)

  return (
    <Shell>
      {/* 预留通知条：后期承载应用更新通知 / 紧急通知，当前无内容
          （应用标题与外观菜单已移除——主题切换入口在左栏用户快捷面板） */}
      <TitleBar aria-label={t('shell.noticeAria')} aria-live="polite" />
      <Body>
        <SideMenu
          expanded={menuExpanded}
          onToggleExpanded={() => setMenuExpanded((v) => !v)}
          items={items}
          toggleItems={toggleItems}
          openToggleKeys={openKeys}
          onToggle={handleToggleFloat}
          active={active}
          onChange={(id) => {
            if (id === 'home') router.push('/')
            else if (id === 'settings') router.push('/settings')
            else {
              const [prefix, pluginId, viewId] = id.split(':')
              if (prefix === 'plugin' && pluginId && viewId) router.push(`/plugin/${pluginId}/${viewId}`)
            }
          }}
          onOpenUser={() => router.push('/account')}
          onOpenSettings={() => router.push('/settings')}
          userActive={active === 'account'}
        />
        <MainArea ref={mainAreaRef}>
          {children}
          {/* 插件浮窗视图（views.area=float）经注册表按需唤起，与右栏页面共存 */}
          <FloatLayer containerRef={mainAreaRef} />
          {/* 壳层胶囊：MainArea 右上常驻（挂点契约见 components/capsule/Capsule.tsx，
              须挂在 MainArea 内、FloatLayer 之后——chip 低于浮窗、面板浮于浮窗） */}
          <Capsule />
        </MainArea>
      </Body>
      <StatusBar />
      <ConfirmHost />
      {/* 编辑器文档操作命令宿主（单实例常驻）：首页面板操作行与胶囊共用，
          冷启动态（无文档无任务）保存/另存为/新建/关闭依旧可达 */}
      <EditorCommandHost />
      {/* 启动就绪信号（无 UI）：挂载即通知主进程撤下 splash */}
      <ShellReady />
    </Shell>
  )
}
