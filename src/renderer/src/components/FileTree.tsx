import { useEffect, useMemo, useState } from 'react'
import { IconChevronDown, IconChevronRight, IconFile, IconFolder, IconFolderOpen } from './icons'
import { AppIcon } from './ui/AppIcon'
import { Empty } from './ui/Empty'
import type { FileNode } from '@shared/types'
import {
  BLOG_PRESET,
  buildStructuredSections,
  classifyRelPath,
  type StructuredSection
} from '@shared/structure'
import { workspaceStore } from '../store'

function isMarkdown(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.markdown')
}

function collectMarkdownPaths(nodes: FileNode[], out: string[] = []): string[] {
  for (const n of nodes) {
    if (n.type === 'dir') collectMarkdownPaths(n.children ?? [], out)
    else if (isMarkdown(n.name)) out.push(n.path)
  }
  return out
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
          <span className="caret"><AppIcon icon={open ? IconChevronDown : IconChevronRight} size="xs" /></span>
          <AppIcon icon={IconFolder} size="sm" className="tree-icon" />
          {node.name}
        </div>
        {open && node.children?.map((child) => <Node key={child.path} node={child} depth={depth + 1} />)}
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
      <AppIcon icon={IconFile} size="sm" className="tree-icon" />
      {node.name}
    </div>
  )
}

function StructuredView(props: {
  sections: StructuredSection[]
  roots: FileNode[]
}): React.JSX.Element {
  const { sections } = props
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())

  const toggle = (key: string): void =>
    setOpenKeys((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const row = (path: string, name: string, depth: number): React.JSX.Element => (
    <div
      key={path}
      className="tree-row file"
      style={{ paddingLeft: depth * 14 + 22 }}
      onClick={() => void workspaceStore.openFile(path)}
    >
      <AppIcon icon={IconFile} size="sm" className="tree-icon" />
      {name}
    </div>
  )

  return (
    <div className="file-tree">
      {sections.map((section) => (
        <div key={section.kind} className="struct-section">
          <div className="struct-title">{section.title}</div>
          {section.kind === 'other'
            ? section.entries?.map((e) => row(e.path, e.name, 1))
            : section.groups?.map((g) => {
                const key = `${section.kind}:${g.title}`
                const open = openKeys.has(key) || section.kind === 'years'
                return (
                  <div key={key}>
                    <div
                      className="tree-row dir"
                      style={{ paddingLeft: 8 }}
                      onClick={() => toggle(key)}
                    >
                      <span className="caret"><AppIcon icon={open ? IconChevronDown : IconChevronRight} size="xs" /></span>
                      <AppIcon icon={IconFolder} size="sm" className="tree-icon" />
                      {g.title}
                    </div>
                    {open &&
                      g.entries.map((e) =>
                        row(
                          e.path,
                          section.kind === 'years' ? `${e.month ?? ''} / ${e.name}` : e.name,
                          2
                        )
                      )}
                  </div>
                )
              })}
        </div>
      ))}
    </div>
  )
}

export function FileTree(): React.JSX.Element {
  const [tree, setTree] = useState<FileNode[] | null>(null)
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

  const sections = useMemo(() => {
    if (!tree) return null
    const mdPaths = collectMarkdownPaths(tree)
    // 命中 blog 结构化约定的文件过半才切换结构化视图，通用目录保持普通树
    const matched = mdPaths.filter(
      (p) => classifyRelPath(p).kind !== 'other'
    ).length
    return mdPaths.length >= 4 && matched >= mdPaths.length / 2
      ? buildStructuredSections(mdPaths, BLOG_PRESET)
      : null
  }, [tree])

  if (error) return <div className="placeholder">读取失败：{error}</div>
  if (tree === null) {
    return (
      <Empty
        icon={<AppIcon icon={IconFolderOpen} size="lg" />}
        title="打开一个文件夹开始"
        hint="左上角「打开文件夹」选择博客仓库"
      />
    )
  }
  if (sections) return <StructuredView sections={sections} roots={tree} />

  return (
    <div className="file-tree">
      {tree.map((node) => (
        <Node key={node.path} node={node} depth={0} />
      ))}
    </div>
  )
}
