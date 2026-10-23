'use client'

/**
 * 工作台壳层（App Router layout 持久化，20261015-feature-workbench-shell 重设计）：
 * TitleBar（左通知预留 + 右胶囊）→ app-body（恒 48px Rail + 上下文面板 + main 容器）
 * → StatusBar。SideMenu 双形态菜单退役（文字导航让位 ⌘K 命令面板），【项目】子树
 * 迁入上下文面板（⌘B / 收起旋钮双入口），【插件】子树迁入 Rail popover。
 * 路由语义不变：'/'=Home / '/settings' / '/account' / '/projects' / '/drafts' /
 * '/editor' / '/plugin/<pluginId>/<viewId>'；FloatLayer 常驻 main 容器共存。
 * Cmd/Ctrl+, 在 settings ↔ home 间切换；Cmd/Ctrl+B 切上下文面板。
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styled from 'styled-components'
import { HomePage } from '@/components/home/HomePage'
import { ConfirmHost } from '@/components/ui/Dialog'
import { FeedbackHost, MessageBannerStack } from '@/components/ui/FeedbackHost'
import { StatusBar } from '@/components/StatusBar'
import { FloatLayer } from '@/components/FloatLayer'
import { Capsule } from '@/components/capsule/Capsule'
import { FocusBar } from '@/components/focusbar'
import { Palette } from '@/components/palette'
import { Rail } from '@/components/rail'
import { ContextPanel } from '@/components/contextpanel'
import { Sheet } from '@/components/ui/Sheet'
import { EditorCommandHost } from '@/components/capsule/sections/EditorSection'
import ShellReady from '@/components/ShellReady'
import { IconFile, IconFolderOpen, IconHome, IconInbox, IconPuzzle } from '@/components/icons'
import {
  bootstrapPluginsHost,
  broadcastTheme,
  hostGeneration,
  listFloatViews,
  listMainViews,
  setWorkspaceInfo,
  usePluginsReady
} from '@/components/plugins/PluginFrameHost'
import { floatsStore, toggleFloat } from '@/lib/floats'
import { installDraftAutosave, useDrafts } from '@/lib/drafts'
import { refreshIdentity } from '@/lib/identity'
import { pluginPanelKey, routeKeyFromPathname, workbenchEntryTarget } from '@/lib/routes'
import { useHasActiveDoc } from '@/lib/store'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useLocale } from '@/lib/i18n/context'
import { getEditorLiveState, publishEditorLiveState, useEditorLiveState } from '@/lib/editor-state'
import { openPalette, togglePalette } from '@/lib/palette'
import { setShellNavigate } from '@/lib/navigate'
import { IconSearch } from '@/components/icons'
import { AppIcon } from '@/components/ui/AppIcon'

const Shell = styled.div<{ $focus: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* 壳体禁滚（20261017 走查修复）：任何子树溢出一律硬裁剪——chrome（TitleBar/
     Rail/StatusBar）永不随内容滚走，滚动只属于各内容滚动容器。clip 而非 hidden：
     不产生滚动容器、程序化滚动（scrollIntoView 类）也无法位移壳体 */
  overflow: clip;

  /* 专注模式（task-8）：壳层 chrome 全退场——编辑区满幅，浮条由 MainArea 承载。
     只匹配 [data-chrome] 稳定属性（20261015-review 修复：元素选择器会误伤内容区
     ——编辑页 PageShell 是 section、首页卡片也是 section，曾是白屏级缺陷）；
     路由子内容不带该属性，编辑页自身顶栏淡出语义保留 */
  ${(props) =>
    props.$focus
      ? `
    &[data-focus='true'] [data-chrome] {
      display: none !important;
    }
  `
      : ''}
`

const TitleBar = styled.header`
  position: relative;
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
  /* 目次/书耳浮笺的定位锚（absolute slip-card 贴案面两缘） */
  position: relative;
`

/* 中央容器：页面内容（Home / 设置 / 插件 main 视图路由段互斥，FloatLayer 叠加）。
   案面底（D2/task-1）：视觉稿 .window.desk 五层配方无损移植——顶部窗光扫 + 双
   radial 暖晕 + 1.2% 纸纹竖纹，全部 token/color-mix，四主题随 normal/background
   路由自动换色；纸笺（Sheet/书耳/目次）浮起其上 */
const MainArea = styled.main`
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--normal-100) 34%, transparent), transparent 26%),
    radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--normal-100) 30%, transparent), transparent 55%),
    radial-gradient(120% 100% at 50% 110%, color-mix(in oklab, var(--background-200) 70%, transparent), transparent 60%),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.012) 0 1px, transparent 1px 4px),
    var(--background-color);
  transition: background-color 0.3s ease;
`

/* 中央纵向列：Message 横幅（文档流顶部）与页面内容上下排布；
   FloatLayer 仍是 MainArea 直接子级（定位不变） */
const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
`

/* TitleBar 命令面板入口（task-10）：居中搜索胶囊——绝对居中（flex 弹性空间会被
   胶囊的 margin-left:auto 分走，曾致搜索位偏心，20261017 走查修复） */
const SearchBtn = styled.button`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  min-width: 220px;
  max-width: min(420px, 40vw);
  color: var(--text-muted);
  font-size: 12px;
  font-family: var(--font-sans);
  background: var(--background-color);
  border: 1px solid var(--chrome-border);
  border-radius: 999px;
  padding: 4px 14px;
  cursor: pointer;
  transition:
    color 150ms ease-out,
    border-color 150ms ease-out;

  &:hover {
    color: var(--text-secondary);
    border-color: var(--chrome-border-strong, var(--chrome-border));
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-muted);
    border: 1px solid var(--chrome-border);
    border-radius: 4px;
    padding: 0 5px;
  }
`

export default function ShellLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  // 目次浮笺显隐（⌘B / rail 项目钮 / 头部旋钮三入口；D3 默认收起，
  // 状态在壳层；浮笺保挂载，树缓存与展开态不丢）
  const [ctxOpen, setCtxOpen] = useState(false)
  // 插件 popover 开合（受控态收壳层：与目次浮笺互斥，D3 浮笺互不叠加）
  const [pluginsOpen, setPluginsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const pluginsReady = usePluginsReady()
  const { family, scheme } = useTheme()
  const { t } = useLocale()
  // 专注模式（task-8）：复用 editor-state focusMode 总线（编辑页顶栏淡出已用），
  // 壳层据此整体退场 chrome
  const live = useEditorLiveState()
  // 写作入口布尔快照：只随「有无文档会话」变化，键入不触发壳层重渲染
  const hasActiveDoc = useHasActiveDoc()

  useEffect(() => {
    // 工作区信息仅供插件 doc 服务解析根路径（壳层不再展示工作区 UI）
    void window.api.getWorkspace().then(setWorkspaceInfo)
    void bootstrapPluginsHost().catch((err: unknown) => console.error('插件引导失败', err))
    // 全局身份一次拉取：rail 用户入口、首页问候与用户中心共享同一份
    void refreshIdentity().catch((err: unknown) => console.error('身份拉取失败', err))
    // 草稿自动暂存联动（幂等）：新草稿会话的输入防抖落草稿箱
    setShellNavigate((path) => router.push(path))
    return installDraftAutosave()
  }, [])

  // 主题切换同步进全部插件帧（token 快照经 CSS 注入，设计同源）
  useEffect(() => {
    if (pluginsReady) broadcastTheme()
  }, [family, scheme, pluginsReady])

  // Cmd/Ctrl+, 在设置页与首页之间切换（中央页面互斥，无 prevView 覆盖语义）
  // Cmd/Ctrl+B 切换上下文面板显隐
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        router.push(pathname.startsWith('/settings') ? '/' : '/settings')
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault()
        setCtxOpen((v) => !v)
        setPluginsOpen(false)
        return
      }
      // ⌘/Ctrl+⇧+F 切换专注模式（task-8）
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        publishEditorLiveState({ focusMode: !getEditorLiveState().focusMode })
        return
      }
      // ⌘/Ctrl+K 命令面板（task-10）
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        togglePalette()
        return
      }
      // Esc 退专注：确认框/胶囊面板打开时让位（浮窗层自有关闭顺序，先于本层）
      if (e.key === 'Escape' && getEditorLiveState().focusMode) {
        if (document.querySelector('[data-dialog-overlay]')) return
        if (document.querySelector('[data-capsule-panel]')) return
        publishEditorLiveState({ focusMode: false })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pathname, router])

  // 路由切换自动退出专注（专注是编辑态语义，离开 /editor 不保持 chrome 退场）
  useEffect(() => {
    if (getEditorLiveState().focusMode) publishEditorLiveState({ focusMode: false })
  }, [pathname])

  // 宿主代际：插件启停/重载时 +1，驱动 rail popover 与浮窗视图列表刷新
  const generation = useSyncExternalStore(hostGeneration.subscribe, hostGeneration.get, hostGeneration.get)
  const mainViews = useMemo(() => (pluginsReady ? listMainViews() : []), [pluginsReady, generation])
  const floatViews = useMemo(() => (pluginsReady ? listFloatViews() : []), [pluginsReady, generation])
  // 浮窗开合快照：rail popover 开关行激活态与 FloatLayer 渲染共用
  const floatsSnapshot = useSyncExternalStore(floatsStore.subscribe, floatsStore.get, floatsStore.get)
  const openKeys = new Set(floatsSnapshot.floats.map((f) => pluginPanelKey(f.pluginId, f.viewId)))
  // 草稿箱快照：rail 徽标 = 暂存草稿数
  const drafts = useDrafts()

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
  const workbenchTarget = workbenchEntryTarget(pathname, hasActiveDoc)
  const workbenchToEditor = workbenchTarget === '/editor'
  // 首项在“回到编辑”态不冒充首页激活：目标是 /editor 时取消 home 高亮
  const railActive = workbenchToEditor && active === 'home' ? '' : active

  const items = [
    // 首项 = 写作入口（上下文切换）：有活动文档且不在编辑页 → 回到上次文档；
    // 已在编辑页或无文档 → 首页（新建博客）。/editor 仍为菜单外路由。
    {
      id: 'home',
      icon: workbenchToEditor ? IconFile : IconHome,
      title: workbenchToEditor ? t('menu.backToEditor') : t('menu.home')
    },
    // 项目：行本体进 /projects 总览；文档树迁入上下文面板（⌘B）
    { id: 'projects', icon: IconFolderOpen, title: t('menu.projects') },
    // 草稿箱（徽标 = 暂存草稿数；首拉完成前不显示数字）
    ...(drafts.loaded && drafts.drafts.length > 0
      ? [{ id: 'drafts', icon: IconInbox, title: t('menu.drafts'), badge: { count: drafts.drafts.length } }]
      : [{ id: 'drafts', icon: IconInbox, title: t('menu.drafts') }])
  ]

  return (
    <Shell $focus={live.focusMode} data-focus={live.focusMode ? 'true' : undefined}>
      {/* TitleBar：左区 = 通知/信息预留位，右区 = 壳层胶囊（任务中心入口，
          挂点契约与层叠换算见 components/capsule/Capsule.tsx 头注释） */}
      <TitleBar data-chrome="titlebar" aria-label={t('shell.noticeAria')} aria-live="polite">
        {/* 命令面板入口（task-10）：搜索或跳转 ⌘K */}
        <SearchBtn type="button" data-testid="palette-open-btn" onClick={openPalette}>
          <AppIcon icon={IconSearch} size="sm" decorative />
          {t('palette.placeholder')}
          <kbd>⌘K</kbd>
        </SearchBtn>
        <Capsule />
      </TitleBar>
      <Body>
        <Rail
          items={items}
          // ▤ 项目钮 = 目次浮笺开关（D3 假定 b）：呼出态即激活态（视觉稿 scene-b）；
          // /projects 路由保留（⌘K / 首页可达），rail 不再直达
          active={ctxOpen ? 'projects' : railActive}
          onChange={(id) => {
            if (id === 'home') router.push(workbenchTarget)
            else if (id === 'projects') {
              setCtxOpen((v) => !v)
              setPluginsOpen(false)
            } else if (id === 'drafts') router.push('/drafts')
            else if (id === 'settings') router.push('/settings')
          }}
          plugins={{
            mainViews,
            floatViews,
            openKeys,
            onToggleFloat: handleToggleFloat
          }}
          userActive={active === 'account'}
          settingsActive={active === 'settings'}
          onOpenUser={() => router.push('/account')}
          onOpenSettings={() => router.push('/settings')}
          pluginsOpen={pluginsOpen}
          onPluginsOpenChange={(open) => {
            setPluginsOpen(open)
            if (open) setCtxOpen(false)
          }}
        />
        {/* 目次浮笺（D3）：absolute slip-card 浮在案面左缘，默认收起；
            保挂载（树缓存/展开态不丢），显隐走滑出过渡 */}
        <ContextPanel open={ctxOpen} onCollapse={() => setCtxOpen(false)} />
        <MainArea ref={mainAreaRef}>
          <MainColumn>
            {/* Message 提示（影响用户操作的提示）：内容区顶部横幅，TitleBar 之下 */}
            <MessageBannerStack />
            {/* 浮笺画芯载体（D2/task-2）：非编辑页统一包进素笺——纸浮在案上；
                /editor 纸面即素笺本体，不套（投影对齐由编辑页样式完成） */}
            {pathname.startsWith('/editor') ? children : <Sheet data-testid="page-sheet">{children}</Sheet>}
          </MainColumn>
          {/* 专注模式浮条：chrome 退场后的最小信令（文档名/保存态/字数/退出） */}
          {live.focusMode && <FocusBar />}
          {/* 插件浮窗视图（views.area=float）经注册表按需唤起，与中央页面共存 */}
          <FloatLayer containerRef={mainAreaRef} />
        </MainArea>
      </Body>
      <StatusBar />
      <ConfirmHost />
      {/* ⌘K 命令面板（task-10）：全局动作入口 */}
      <Palette />
      {/* 反馈提示宿主（Toast 右下浮出自动消退 / Alert 模态必须响应） */}
      <FeedbackHost />
      {/* 编辑器文档操作命令宿主（单实例常驻）：编辑页与胶囊共用，
          冷启动态（无文档无任务）保存/另存为/新建/关闭依旧可达 */}
      <EditorCommandHost />
      {/* 启动就绪信号（无 UI）：挂载即通知主进程撤下 splash */}
      <ShellReady />
    </Shell>
  )
}
