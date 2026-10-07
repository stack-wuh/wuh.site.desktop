import { useEffect, useMemo, useState } from 'react'
import { IconChevronDown, IconChevronRight, IconFile, IconFolder, IconFolderOpen } from './icons'
import { AppIcon } from './ui/AppIcon'
import { Empty } from './ui/Empty'
import { VirtualList } from './ui/VirtualList'
import type { FileNode } from '@shared/types'
import {
  BLOG_PRESET,
  buildStructuredSections,
  classifyRelPath,
  type StructuredSection
} from '@shared/structure'
import { workspaceStore } from '../store'

const ROW_HEIGHT = 26

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

/**
 * 两个视图统一压平后的可见行。展开状态以 key 记录在 FileTree 层：
 * 虚拟化后滚出屏幕的行会被卸载，状态不能存在行组件里。
 */
type TreeRow =
  | { kind: 'dir'; key: string; name: string; depth: number; open: boolean }
  | { kind: 'file'; key: string; path: string; name: string; depth: number; muted?: boolean }
  | { kind: 'title'; key: string; label: string }

/** 初始展开：depth < 2 的目录，与旧行内 useState(depth < 2) 的行为一致 */
function initialOpenKeys(nodes: FileNode[], depth = 0, out: Set<string> = new Set()): Set<string> {
  for (const n of nodes) {
    if (n.type !== 'dir') continue
    if (depth < 2) {
      out.add(n.path)
      initialOpenKeys(n.children ?? [], depth + 1, out)
    }
  }
  return out
}

function flattenTree(nodes: FileNode[], openKeys: Set<string>, depth = 0, out: TreeRow[] = []): TreeRow[] {
  for (const n of nodes) {
    if (n.type === 'dir') {
      const open = openKeys.has(n.path)
      out.push({ kind: 'dir', key: n.path, name: n.name, depth, open })
      if (open) flattenTree(n.children ?? [], openKeys, depth + 1, out)
    } else {
      out.push({ kind: 'file', key: n.path, path: n.path, name: n.name, depth, muted: !isMarkdown(n.name) })
    }
  }
  return out
}

function flattenSections(sections: StructuredSection[], openKeys: Set<string>): TreeRow[] {
  const out: TreeRow[] = []
  for (const section of sections) {
    out.push({ kind: 'title', key: `section:${section.kind}`, label: section.title })
    if (section.kind === 'other') {
      for (const e of section.entries ?? []) {
        out.push({ kind: 'file', key: e.path, path: e.path, name: e.name, depth: 1 })
      }
      continue
    }
    for (const g of section.groups ?? []) {
      const key = `${section.kind}:${g.title}`
      // years 组保持常开（与旧 StructuredView 一致，点击不收起）
      const open = openKeys.has(key) || section.kind === 'years'
      out.push({ kind: 'dir', key, name: g.title, depth: 0, open })
      if (!open) continue
      for (const e of g.entries) {
        out.push({
          kind: 'file',
          key: e.path,
          path: e.path,
          name: section.kind === 'years' ? `${e.month ?? ''} / ${e.name}` : e.name,
          depth: 2
        })
      }
    }
  }
  return out
}

function Row(props: { row: TreeRow; onToggle: (key: string) => void }): React.JSX.Element {
  const { row, onToggle } = props

  if (row.kind === 'title') {
    return <div className="tree-row struct-title" style={{ paddingLeft: 14 }}>{row.label}</div>
  }

  if (row.kind === 'dir') {
    return (
      <div className="tree-row dir" style={{ paddingLeft: row.depth * 14 + 8 }} onClick={() => onToggle(row.key)}>
        <span className="caret"><AppIcon icon={row.open ? IconChevronDown : IconChevronRight} size="xs" /></span>
        <AppIcon icon={IconFolder} size="sm" className="tree-icon" />
        {row.name}
      </div>
    )
  }

  return (
    <div
      className={`tree-row file${row.muted ? ' non-md' : ''}`}
      style={{ paddingLeft: row.depth * 14 + 22 }}
      onClick={() => {
        // muted = 非 Markdown（普通树）：与旧行为一致，点击不打开
        if (!row.muted) void workspaceStore.openFile(row.path)
      }}
    >
      <AppIcon icon={IconFile} size="sm" className="tree-icon" />
      {row.name}
    </div>
  )
}

export function FileTree(): React.JSX.Element {
  const [tree, setTree] = useState<FileNode[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  const root = workspaceStore.get().root

  useEffect(() => {
    let alive = true
    window.api
      .readTree()
      .then((nodes) => {
        if (!alive) return
        setTree(nodes)
        setOpenKeys(initialOpenKeys(nodes))
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      alive = false
    }
  }, [root])

  const toggle = (key: string): void =>
    setOpenKeys((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

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

  // 压平只依赖展开状态，不随滚动重算；滚动只移动窗口
  const rows = useMemo(() => {
    if (!tree) return []
    return sections ? flattenSections(sections, openKeys) : flattenTree(tree, openKeys)
  }, [tree, sections, openKeys])

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

  return (
    <VirtualList
      className="file-tree"
      items={rows}
      itemHeight={ROW_HEIGHT}
      itemKey={(row) => row.key}
      renderItem={(row) => <Row row={row} onToggle={toggle} />}
    />
  )
}
