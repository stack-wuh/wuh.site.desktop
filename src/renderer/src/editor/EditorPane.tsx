import { CodeMirrorEditor } from './CodeMirrorEditor'
import { useDirtyState } from './useDirtyState'
import { useWorkspaceStore } from '../store'

export function EditorPane(): React.JSX.Element {
  const { activePath, content, dirty } = useWorkspaceStore()
  const { save } = useDirtyState()

  if (!activePath || content == null) {
    return <div className="placeholder">从左侧选择一个 Markdown 文件开始编辑</div>
  }

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <span className="doc-path">{activePath}</span>
        <button disabled={!dirty} onClick={() => void save()}>
          保存 ⌘S
        </button>
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
