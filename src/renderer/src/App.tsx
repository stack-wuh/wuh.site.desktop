import { useEffect, useState } from 'react'
import type { WorkspaceInfo } from '@shared/types'
import { FileTree } from './components/FileTree'
import { EditorPane } from './editor/EditorPane'
import { Preview } from './preview/Preview'
import { ActivityBar, type PanelId } from './components/ActivityBar'
import { useWorkspaceStore } from './store'

declare global {
  interface Window {
    api: import('@shared/types').DesktopApi
  }
}

export default function App(): React.JSX.Element {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [activePanel, setActivePanel] = useState<PanelId>('files')
  const store = useWorkspaceStore()

  useEffect(() => {
    void window.api.getWorkspace().then(setWorkspace)
  }, [])

  const handleOpen = async (): Promise<void> => {
    const info = await window.api.openWorkspace()
    if (info) {
      setWorkspace(info)
      store.reset()
    }
  }

  return (
    <div className="app-shell">
      <header className="title-bar">
        <span className="title">wuh-site desktop</span>
        <span className="workspace-name">{workspace ? workspace.name : '未打开工作区'}</span>
        {workspace?.isGitRepo && (
          <span className="git-badge">
            {workspace.branch ?? 'no branch'}
            {workspace.ahead > 0 ? ` ↑${workspace.ahead}` : ''}
            {workspace.behind > 0 ? ` ↓${workspace.behind}` : ''}
          </span>
        )}
        <button onClick={() => void handleOpen()}>打开文件夹</button>
      </header>
      <div className="app-body">
        <ActivityBar active={activePanel} onChange={setActivePanel} />
        <aside className="sidebar">
          {activePanel === 'files' && <FileTree />}
          {activePanel === 'git' && <div className="placeholder">Git 面板（Phase 4）</div>}
          {activePanel === 'github' && <div className="placeholder">GitHub 面板（Phase 5）</div>}
          {activePanel === 'settings' && <div className="placeholder">设置（Phase 6）</div>}
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
    </div>
  )
}
