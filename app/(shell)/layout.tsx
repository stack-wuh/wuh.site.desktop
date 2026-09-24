'use client'

/**
 * 两栏壳层（App Router layout 持久化）：Header（左通知预留 + 右胶囊）→ app-body
 * （左栏 SideMenu + 右栏 main 容器）→ StatusBar。
 * 路由语义：'/'=Home（默认入口）/ '/settings' / '/plugin/<pluginId>/<viewId>'（插件 main 视图），
 * SideMenu 菜单项与路由段一一对应；FloatLayer 常驻 main 容器，浮窗与右栏页面共存；
 * 壳层胶囊（Capsule）挂 TitleBar 右侧（20260924-fix-capsule-header-chrome）。
 * 全屏视图体系已废止（2026-09-20）：Cmd/Ctrl+, 在 settings ↔ home 间切换；Esc 只关浮窗。
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styled from 'styled-components'
import { HomePage } from '../../components/home/HomePage'
import { ConfirmHost } from '../../components/ui/Dialog'
import { FeedbackHost, MessageBannerStack } from '../../components/ui/FeedbackHost'
import { StatusBar } from '../../components/StatusBar'
import { FloatLayer } from '../../components/FloatLayer'
import { Capsule } from '../../components/capsule/Capsule'
import { SideMenu, type SideMenuItem } from '../../components/SideMenu'
import { ProjectsTree } from '../../components/menu/ProjectsTree'
import { EditorCommandHost } from '../../components/capsule/sections/EditorSection'
import ShellReady from '../../components/ShellReady'
import { IconFolderOpen, IconHome, IconInbox, pluginIcon } from '../../components/icons'
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
import { installDraftAutosave, useDrafts } from '../../lib/drafts'
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

/* 右栏纵向列：Message 横幅（文档流顶部）与页面内容上下排布；
   FloatLayer 仍是 MainArea 直接子级（定位不变） */
const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
`

export default function ShellLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [menuExpanded, setMenuExpanded] = useState(false)
  // 左栏项目树展开态（走查反馈修订）：状态在壳层，旋钮只切子树显隐，条目行本体仍导航 /projects
  const [projectsTreeOpen, setProjectsTreeOpen] = useState(false)
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
    // 草稿自动暂存联动（幂等）：新草稿会话的输入防抖落草稿箱
    return installDraftAutosave()
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
  // 草稿箱快照：侧栏徽标 = 暂存草稿数
  const drafts = useDrafts()

  const items: SideMenuItem[] = [
    // 首页 = 「新建博客」项目入口（路由 key 仍为 home / 路径 /，仅显示名升级）
    { id: 'home', icon: IconHome, title: t('menu.home') },
    // 项目（20260924-feature-projects-editor-page）：行本体进 /projects 总览；子树 = 左栏项目树，
    // 一级项目节点二级文件，点文件直达 /editor（菜单树修订，见 brief 边界决策）
    {
      id: 'projects',
      icon: IconFolderOpen,
      title: t('menu.projects'),
      tree: <ProjectsTree />,
      treeOpen: projectsTreeOpen,
      onToggleTree: () => setProjectsTreeOpen((v) => !v)
    },
    // 草稿箱（徽标 = 暂存草稿数；首拉完成前不显示数字）
    ...(drafts.loaded && drafts.drafts.length > 0
      ? [{ id: 'drafts', icon: IconInbox, title: t('menu.drafts'), badge: { count: drafts.drafts.length } }]
      : [{ id: 'drafts', icon: IconInbox, title: t('menu.drafts') }]),
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
      {/* Header（20260924-fix-capsule-header-chrome）：左区 = 通知/信息预留位，
          右区 = 壳层胶囊（任务中心入口，chip 垂直居中、margin-left:auto 推右缘；
          挂点契约与层叠换算见 components/capsule/Capsule.tsx 头注释） */}
      <TitleBar aria-label={t('shell.noticeAria')} aria-live="polite">
        <Capsule />
      </TitleBar>
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
            else if (id === 'projects') router.push('/projects')
            else if (id === 'drafts') router.push('/drafts')
            else if (id === 'settings') router.push('/settings')
            else {
              const [prefix, pluginId, viewId] = id.split(':')
              if (prefix === 'plugin' && pluginId && viewId) router.push(`/plugin/${pluginId}/${viewId}`)
            }
          }}
          onOpenUser={() => router.push('/account')}
          onOpenSettings={() => router.push('/settings')}
          userActive={active === 'account'}
          settingsActive={active === 'settings'}
        />
        <MainArea ref={mainAreaRef}>
          <MainColumn>
            {/* Message 提示（影响用户操作的提示）：内容区顶部横幅，TitleBar 之下 */}
            <MessageBannerStack />
            {children}
          </MainColumn>
          {/* 插件浮窗视图（views.area=float）经注册表按需唤起，与右栏页面共存 */}
          <FloatLayer containerRef={mainAreaRef} />
        </MainArea>
      </Body>
      <StatusBar />
      <ConfirmHost />
      {/* 反馈提示宿主（Toast 右下浮出自动消退 / Alert 模态必须响应） */}
      <FeedbackHost />
      {/* 编辑器文档操作命令宿主（单实例常驻）：首页面板操作行与胶囊共用，
          冷启动态（无文档无任务）保存/另存为/新建/关闭依旧可达 */}
      <EditorCommandHost />
      {/* 启动就绪信号（无 UI）：挂载即通知主进程撤下 splash */}
      <ShellReady />
    </Shell>
  )
}
