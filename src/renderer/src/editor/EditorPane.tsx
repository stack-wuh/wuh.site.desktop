import { useState } from 'react'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { useDirtyState } from './useDirtyState'
import { FrontmatterPanel } from '../frontmatter/FrontmatterPanel'
import { Button } from '../components/ui/Button'
import { Empty } from '../components/ui/Empty'
import { useWorkspaceStore, workspaceStore } from '../store'

export function EditorPane(): React.JSX.Element {
  const { activePath, content, dirty } = useWorkspaceStore()
  const { save } = useDirtyState()
  const [showFm, setShowFm] = useState(false)

  if (!activePath || content == null) {
    return <Empty icon='📝' title='从左侧选择一个 Markdown 文件开始编辑' />
  }

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <span className="doc-path">{activePath}</span>
        <Button
          variant="ghost"
          size="sm"
          className={showFm ? 'active' : ''}
          onClick={() => setShowFm((v) => !v)}
        >
          frontmatter
        </Button>
        <Button size="sm" disabled={!dirty} onClick={() => void save()}>
          保存 ⌘S
        </Button>
      </div>
      {showFm && <FrontmatterPanel />}
      <div className="editor-scroll">
        <CodeMirrorEditor
          key={activePath}
          docPath={activePath}
          initialValue={content}
          onChange={(v) => workspaceStore.setContent(v)}
          onSave={() => void save()}
        />
      </div>
    </div>
  )
}
