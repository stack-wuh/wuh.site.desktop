import { useEffect, useMemo, useState } from 'react'
import type { AppSettings, WorkspaceInfo } from '@shared/types'
import { FileTree } from './components/FileTree'
import { EditorPane } from './editor/EditorPane'
import { ActivityBar, type ActivityItem } from './components/ActivityBar'
import { SettingsPage } from './settings/SettingsPage'
import { ConfirmHost } from './components/ui/Dialog'
import { AppearanceMenu } from './components/AppearanceMenu'
import { StatusBar } from './components/StatusBar'
import { AppIcon } from './components/ui/AppIcon'
import { Button } from './components/ui/Button'
import { Empty } from './components/ui/Empty'
import { IconFile, IconFolderOpen, IconPanelCollapse, IconSettings, pluginIcon } from './components/icons'
import { useWorkspaceStore, workspaceStore } from './store'
import {
  bootstrapPluginsHost,
  broadcastTheme,
  listPreviewViews,
  listSidebarViews,
  PluginView,
  setWorkspaceInfo
} from './plugins/PluginFrameHost'
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

/** 设置里开启后：编辑停顿 N ms 自动保存并 commit（防抖，只在脏状态触发） */
function useAutoCommit(): void {
  const { dirty, activePath } = useWorkspaceStore()
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    void window.api.getSettings().then((s) => setSettings(s.settings))
  }, [])

  useEffect(() => {
    if (!settings?.autoCommit || !dirty || !activePath) return
    const timer = setTimeout(() => {
      const st = workspaceStore.get()
      if (!st.dirty || st.activePath !== activePath || st.content == null) return
      void window.api
        .writeFile(st.activePath, st.content)
        .then(() => workspaceStore.markSaved())
        .then(() => window.api.gitCommit(`docs: auto save ${activePath}`, [activePath]))
    }, Math.max(500, settings.autoCommitDelayMs))
    return () => clearTimeout(timer)
  }, [dirty, activePath, settings])
}

/** 主区视图：work = 编辑器+预览，settings = 全屏设置页（盖住 ActivityBar+侧栏，未来 tab 化的挂载点） */
export type MainView = 'work' | 'settings'

export default function App(): React.JSX.Element {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [activePanel, setActivePanel] = useState<string>('files')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mainView, setMainView] = useState<MainView>('work')
  const [pluginsReady, setPluginsReady] = useState(false)
  const { family, scheme } = useTheme()
  useAutoCommit()

  /** 焦点移回触发元素（ActivityBar 设置按钮），interaction.md 焦点管理要求 */
  const focusSettingsTrigger = (): void => {
    document.querySelector<HTMLButtonElement>('.activity-bar button[aria-label="设置"]')?.focus()
  }

  const openSettings = (): void => setMainView('settings')

  const closeSettings = (): void => {
    // 设置页盖住 ActivityBar，返回后按钮才重新挂载，延迟到渲染完成再还焦点
    setMainView('work')
    setTimeout(focusSettingsTrigger, 0)
  }

  // Cmd/Ctrl+, 开/关设置；Esc 返回编辑器。确认框打开时让位给 Dialog 自己的 Esc 处理
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        if (mainView === 'settings') closeSettings()
        else openSettings()
        return
      }
      if (e.key === 'Escape' && mainView === 'settings' && !document.querySelector('.ui-dialog-overlay')) {
        closeSettings()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mainView])

  const handlePanelChange = (id: string): void => {
    if (id === 'settings') {
      openSettings()
      return
    }
    if (id === activePanel) {
      // 再点当前面板图标：折叠/展开侧栏（VSCode 语义）
      setSidebarCollapsed((v) => !v)
      return
    }
    setActivePanel(id)
    setSidebarCollapsed(false)
  }

  useEffect(() => {
    void window.api.getWorkspace().then((info) => {
      setWorkspace(info)
      setWorkspaceInfo(info)
    })
    void bootstrapPluginsHost()
      .then(() => setPluginsReady(true))
      .catch((err: unknown) => console.error('插件引导失败', err))
  }, [])

  // 主题切换同步进全部插件帧（token 快照经 CSS 注入，设计同源）
  useEffect(() => {
    if (pluginsReady) broadcastTheme()
  }, [family, scheme, pluginsReady])

  const sidebarViews = useMemo(() => (pluginsReady ? listSidebarViews() : []), [pluginsReady])
  const previewView = useMemo(() => (pluginsReady ? listPreviewViews()[0] : undefined), [pluginsReady])

  const items: ActivityItem[] = [
    { id: 'files', icon: IconFile, title: '文件' },
    ...sidebarViews.map(({ pluginId, view }) => ({
      id: pluginPanelKey(pluginId, view.id),
      icon: pluginIcon(view.icon),
      title: view.title
    }))
  ]
  const tailItems: ActivityItem[] = [{ id: 'settings', icon: IconSettings, title: '设置' }]

  const activePluginPanel = activePanel.startsWith(PLUGIN_PANEL_PREFIX)
    ? sidebarViews.find((entry) => pluginPanelKey(entry.pluginId, entry.view.id) === activePanel)
    : undefined

  const activePanelTitle =
    activePanel === 'files' ? '文件' : (activePluginPanel?.view.title ?? '插件面板')

  const handleOpen = (): void => {
    void window.api.openWorkspace().then((info) => {
      if (info) {
        setWorkspace(info)
        setWorkspaceInfo(info)
        workspaceStore.reset()
      }
    })
  }

  return (
    <div className="app-shell">
      <header className="title-bar">
        <span className="title">wuh-site desktop</span>
        <span className="workspace-name">
          {workspace ? workspace.name : '未打开工作区'}
        </span>
        {workspace?.isGitRepo && (
          <span className="git-badge">
            {workspace.branch ?? 'no branch'}
            {workspace.ahead > 0 ? ` ↑${workspace.ahead}` : ''}
            {workspace.behind > 0 ? ` ↓${workspace.behind}` : ''}
          </span>
        )}
        {workspace?.github && (
          <span className="remote-badge">
            {workspace.github.owner}/{workspace.github.repo}
          </span>
        )}
        <span className="title-actions">
          <Button size="sm" onClick={handleOpen}>
            <AppIcon icon={IconFolderOpen} size="sm" />
            打开文件夹
          </Button>
          <AppearanceMenu />
        </span>
      </header>
      <div className="app-body">
        {mainView === 'settings' ? (
          <SettingsPage onBack={closeSettings} />
        ) : (
          <>
            <ActivityBar
              items={items}
              tailItems={tailItems}
              active={activePanel}
              onChange={handlePanelChange}
            />
            <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
              <div className="sidebar-header">
                <span className="panel-title">{activePanelTitle}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  title="折叠侧栏"
                  aria-label="折叠侧栏"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <AppIcon icon={IconPanelCollapse} size="sm" />
                </Button>
              </div>
              {activePanel === 'files' && <FileTree />}
              {activePluginPanel && (
                <PluginView pluginId={activePluginPanel.pluginId} view={activePluginPanel.view} />
              )}
              {activePanel.startsWith(PLUGIN_PANEL_PREFIX) && !activePluginPanel && (
                <Empty title="该插件视图已停用" hint="可在设置页重新启用对应插件" />
              )}
            </aside>
            <main className="work-area">
              <section className="editor-area">
                <EditorPane />
              </section>
              <section className="preview-area">
                {previewView ? (
                  <PluginView pluginId={previewView.pluginId} view={previewView.view} />
                ) : (
                  <Empty
                    icon={<AppIcon icon={pluginIcon('eye')} size="lg" />}
                    title="预览区"
                    hint="未启用提供预览视图的插件"
                  />
                )}
              </section>
            </main>
          </>
        )}
      </div>
      <StatusBar workspace={workspace} />
      <ConfirmHost />
    </div>
  )
}
