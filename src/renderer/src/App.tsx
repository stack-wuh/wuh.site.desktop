import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, Settings } from 'lucide-react'
import type { AppSettings, WorkspaceInfo } from '@shared/types'
import { FileTree } from './components/FileTree'
import { EditorPane } from './editor/EditorPane'
import { ActivityBar, pluginIcon, type ActivityItem } from './components/ActivityBar'
import { SettingsPage } from './settings/SettingsPage'
import { ConfirmHost } from './components/ui/Dialog'
import { AppearanceMenu } from './components/AppearanceMenu'
import { AppIcon } from './components/ui/AppIcon'
import { Button } from './components/ui/Button'
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
  const [mainView, setMainView] = useState<MainView>('work')
  const [pluginsReady, setPluginsReady] = useState(false)
  const store = useWorkspaceStore()
  const { family, scheme } = useTheme()
  useAutoCommit()

  /** 焦点移回触发元素（ActivityBar 设置按钮），interaction.md 焦点管理要求 */
  const focusSettingsTrigger = (): void => {
    document.querySelector<HTMLButtonElement>('.activity-bar button[title="设置"]')?.focus()
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
    setActivePanel(id)
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
    { id: 'files', icon: FileText, title: '文件' },
    ...sidebarViews.map(({ pluginId, view }) => ({
      id: pluginPanelKey(pluginId, view.id),
      icon: pluginIcon(view.icon),
      title: view.title
    })),
    { id: 'settings', icon: Settings, title: '设置' }
  ]

  const activePluginPanel = activePanel.startsWith(PLUGIN_PANEL_PREFIX)
    ? sidebarViews.find((entry) => pluginPanelKey(entry.pluginId, entry.view.id) === activePanel)
    : undefined

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
            <AppIcon icon={FolderOpen} size="sm" />
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
            <ActivityBar items={items} active={activePanel} onChange={handlePanelChange} />
            <aside className="sidebar">
              {activePanel === 'files' && <FileTree />}
              {activePluginPanel && (
                <PluginView pluginId={activePluginPanel.pluginId} view={activePluginPanel.view} />
              )}
              {activePanel.startsWith(PLUGIN_PANEL_PREFIX) && !activePluginPanel && (
                <div className="placeholder">该插件视图已停用</div>
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
                  <div className="placeholder">预览区（未启用提供预览视图的插件）</div>
                )}
              </section>
            </main>
          </>
        )}
      </div>
      <footer className="status-bar">
        <span>{store.activePath ?? 'no file'}</span>
        {store.dirty && <span className="dirty-dot">● 未保存</span>}
      </footer>
      <ConfirmHost />
    </div>
  )
}
