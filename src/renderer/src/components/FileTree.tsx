import { useEffect, useState } from 'react'
import type { FileNode } from '@shared/types'
import { workspaceStore } from '../store'

function isMarkdown(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.markdown')
}

function Node(props: { node: FileNode; depth: number }): React.JSX.Element {
  const { node, depth } = props
  const [open, setOpen] = useState(depth < 2)

  if (node.type === 'dir') {
    return (
      <div>
        <div
          className="tree-row dir"
          style={{ paddingLeft: depth * 14 + 8 }}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="caret">{open ? '▾' : '▸'}</span>
          {node.name}
        </div>
        {open &&
          node.children?.map((child) => (
            <Node key={child.path} node={child} depth={depth + 1} />
          ))}
      </div>
    )
  }

  return (
    <div
      className={`tree-row file ${isMarkdown(node.name) ? '' : 'non-md'}`}
      style={{ paddingLeft: depth * 14 + 22 }}
      onClick={() => {
        if (isMarkdown(node.name)) void workspaceStore.openFile(node.path)
      }}
    >
      {node.name}
    </div>
  )
}

export function FileTree(): React.JSX.Element {
  const [tree, setTree] = useState<FileNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const root = workspaceStore.get().root

  useEffect(() => {
    let alive = true
    window.api
      .readTree()
      .then((nodes) => {
        if (alive) setTree(nodes)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      alive = false
    }
  }, [root])

  if (error) return <div className="placeholder">读取失败：{error}</div>
  if (tree.length === 0) return <div className="placeholder">打开一个文件夹开始（左上角按钮）</div>

  return (
    <div className="file-tree">
      {tree.map((node) => (
        <Node key={node.path} node={node} depth={0} />
      ))}
    </div>
  )
}
