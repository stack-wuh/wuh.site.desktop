import { useEffect, useState } from 'react'
import type { AppSettings, WorkspaceInfo } from '@shared/types'
import { FileTree } from './components/FileTree'
import { EditorPane } from './editor/EditorPane'
import { Preview } from './preview/Preview'
import { ActivityBar, type PanelId } from './components/ActivityBar'
import { GitHubPanel } from './components/GitHubPanel'
import { GitPanel } from './history/HistoryPanel'
import { SettingsPage } from './settings/SettingsPage'
import { ConfirmHost } from './components/ui/Dialog'
import { useTheme } from './theme/ThemeProvider'
import { useWorkspaceStore, workspaceStore } from './store'

declare global {
  interface Window {
    api: import('@shared/types').DesktopApi
  }
}

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

export default function App(): React.JSX.Element {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [activePanel, setActivePanel] = useState<PanelId>('files')
  const store = useWorkspaceStore()
  const { theme, toggle } = useTheme()
  useAutoCommit()

  useEffect(() => {
    void window.api.getWorkspace().then(setWorkspace)
  }, [])

  const handleOpen = (): void => {
    void window.api.openWorkspace().then((info) => {
      if (info) {
        setWorkspace(info)
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
        <button onClick={handleOpen}>打开文件夹</button>
        <button
          className="theme-toggle"
          title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
          onClick={toggle}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </header>
      <div className="app-body">
        <ActivityBar active={activePanel} onChange={setActivePanel} />
        <aside className="sidebar">
          {activePanel === 'files' && <FileTree />}
          {activePanel === 'git' && <GitPanel />}
          {activePanel === 'github' && <GitHubPanel />}
          {activePanel === 'settings' && <SettingsPage />}
        </aside>
        <main className="work-area">
          <section className="editor-area">
            <EditorPane />
          </section>
          <section className="preview-area">
            <Preview />
          </section>
        </main>
      </div>
      <footer className="status-bar">
        <span>{store.activePath ?? 'no file'}</span>
        {store.dirty && <span className="dirty-dot">● 未保存</span>}
      </footer>
      <ConfirmHost />
    </div>
  )
}
