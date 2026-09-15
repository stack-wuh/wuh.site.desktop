import { FileText, Save } from 'lucide-react'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { useDirtyState } from './useDirtyState'
import { Button } from '../components/ui/Button'
import { Empty } from '../components/ui/Empty'
import { AppIcon } from '../components/ui/AppIcon'
import { useWorkspaceStore, workspaceStore } from '../store'

export function EditorPane(): React.JSX.Element {
  const { activePath, content, dirty } = useWorkspaceStore()
  const { save } = useDirtyState()

  if (!activePath || content == null) {
    return (
      <Empty
        icon={<AppIcon icon={FileText} size={28} />}
        title="从左侧选择一个 Markdown 文件开始编辑"
      />
    )
  }

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <span className="doc-path">{activePath}</span>
        <Button size="sm" disabled={!dirty} onClick={() => void save()}>
          <AppIcon icon={Save} size="sm" />
          保存 ⌘S
        </Button>
      </div>
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
