'use client'

/**
 * 左栏「项目」树（20260924 走查反馈修订）：树根 = SideMenu【项目】条目行本身，本组件渲染其子树。
 * 一级 = 项目节点（当前工作区置顶带「当前」徽标，其余为最近项目，buildProjectGroups 按 root 去重）；
 * 二级起 = 项目内文件夹 + .md 递归树（pruneMarkdownTree 只留含 .md 分支，排序沿用主进程 buildTree 目录优先）。
 * 懒加载：项目节点首次展开才 readTree(root)；失败呈「无法访问」行，再次点击该项目重试。
 * 订阅 workspaceStore.root：工作区切换后重拉分组（「当前」徽标随迁，已加载树缓存复用）。
 * 点文件 = openProjectFile（脏确认 → 按需切工作区 → readFile → openDoc）→ router.push('/editor')，
 * 与 /projects 页共享同一打开流。空态（无工作区且无最近项目）给「打开目录」入口；失败经 role="alert" 行展示。
 * 大仓库虚拟化（20261007-feature-virtual-projects-tree）：全部行压平进固定行高 VirtualList，
 * 只渲染可见窗口；展开态本就持有在组件层 expanded Set（虚拟化卸载行不丢状态），行交互语义与既有保持一致。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import type { FileNode } from '@shared/types'
import {
  buildProjectGroups,
  folderNodeKey,
  projectNodeKey,
  pruneMarkdownTree,
  toggleNodeKey,
  type ProjectGroup
} from '../../lib/projects'
import { openProjectFile } from '../../lib/projectOpen'
import { useWorkspaceStore } from '../../lib/store'
import { errText } from '../workspace/PickerShell'
import { AppIcon } from '../ui/AppIcon'
import { VirtualList } from '../ui/VirtualList'
import { IconChevronRight, IconFile, IconFolderOpen } from '../icons'
import { useLocale } from '../../lib/i18n/context'

/** 固定行高：与 VirtualList itemHeight 严格一致，NodeRow/NoteRow CSS 同步收敛到该值 */
const ROW_HEIGHT = 26

/** 压平后的可见行：虚拟化后滚出屏幕的行会被卸载，行内不得自持状态（展开态在组件层 expanded Set） */
type TreeRow =
  | { kind: 'project'; key: string; group: ProjectGroup; open: boolean }
  | { kind: 'dir'; key: string; root: string; path: string; name: string; depth: number; open: boolean }
  | { kind: 'file'; key: string; group: ProjectGroup; path: string; name: string; depth: number }
  | { kind: 'note'; key: string; label: string; depth: number; tone?: 'muted' | 'warning' | 'danger'; alert?: boolean }
  | { kind: 'action'; key: string; label: string }

/** 单个项目树的加载态：loading（首拉中）/ ready（剪枝后的含 .md 分支） */
type ProjectTreeState = { status: 'loading' } | { status: 'ready'; nodes: FileNode[] }

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 4px 4px;
  font-family: var(--font-sans);
`

/* 虚拟滚动容器：与 SideMenu TreeWrap 同口径高度封顶，自滚动（TreeWrap 本体不滚动，PluginTree 无感知）。
   styled(VirtualList) 会把泛型折叠成 unknown（itemKey 参数丢类型），故封顶经 style prop 内联传递 */
const SCROLL_STYLE: React.CSSProperties = { maxHeight: 'min(52vh, 560px)', overflowY: 'auto' }

const NodeRow = styled.button<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  /* 虚拟化要求固定行高（与 ROW_HEIGHT 对齐），缩进仍由 padding-left 承担 */
  height: 26px;
  box-sizing: border-box;
  padding: 0 6px 0 ${(props) => 6 + props.$depth * 12}px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-primary);

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

const NodeLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Twirl = styled.span<{ $open: boolean }>`
  flex: none;
  display: inline-flex;
  color: var(--text-muted);
  transition: transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);
  transform: rotate(${(props) => (props.$open ? 90 : 0)}deg);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const CurrentBadge = styled.span`
  flex: none;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 9.5px;
  font-weight: 600;
  line-height: 15px;
`

const NoteRow = styled.p<{ $depth: number; $tone?: 'muted' | 'warning' | 'danger' }>`
  display: flex;
  align-items: center;
  /* 固定行高：旧版垂直 margin 收敛为统一行距，由行高承担 */
  height: 26px;
  box-sizing: border-box;
  margin: 0;
  padding: 0 6px 0 ${(props) => 6 + props.$depth * 12}px;
  font-family: var(--font-sans);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(props) =>
    props.$tone === 'warning'
      ? 'var(--warning-color)'
      : props.$tone === 'danger'
        ? 'var(--danger-color)'
        : 'var(--text-muted)'};
`

export function ProjectsTree(): React.JSX.Element | null {
  const { t } = useLocale()
  const router = useRouter()
  const wsRoot = useWorkspaceStore().root
  const [groups, setGroups] = useState<ProjectGroup[] | null>(null)
  const [trees, setTrees] = useState<Record<string, ProjectTreeState>>({})
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 树缓存经 ref 同步读写：ensureTree 需在异步回调里判断「是否已拉取」，state 快照会滞后
  const treesRef = useRef<Record<string, ProjectTreeState>>({})
  const aliveRef = useRef(true)

  /** 懒加载单项目树（已缓存/加载中则跳过）；失败删除缓存并标记，待重试 */
  const ensureTree = useCallback((root: string): void => {
    if (treesRef.current[root] !== undefined) return
    treesRef.current = { ...treesRef.current, [root]: { status: 'loading' } }
    setTrees(treesRef.current)
    window.api
      .readTree(root)
      .then((nodes: FileNode[]) => {
        treesRef.current = {
          ...treesRef.current,
          [root]: { status: 'ready', nodes: pruneMarkdownTree(nodes) }
        }
        setTrees(treesRef.current)
      })
      .catch(() => {
        const next = { ...treesRef.current }
        delete next[root]
        treesRef.current = next
        setTrees(next)
        setFailed((prev) => new Set(prev).add(root))
      })
  }, [])

  const loadGroups = useCallback(
    async (alive: () => boolean): Promise<void> => {
      const [info, recent] = await Promise.all([
        window.api.getWorkspace().catch(() => null),
        window.api.listRecentWorkspaces().catch(() => [])
      ])
      if (!alive()) return
      const next = buildProjectGroups(info, recent)
      setGroups(next)
      // 当前组默认展开（与 /projects 页 initialExpandedGroups 同语义），首拉随之触发
      const cur = next.find((g) => g.current)
      if (cur) {
        setExpanded((prev) => new Set(prev).add(projectNodeKey(cur.root)))
        ensureTree(cur.root)
      }
    },
    [ensureTree]
  )

  useEffect(() => {
    aliveRef.current = true
    void loadGroups(() => aliveRef.current)
    return () => {
      aliveRef.current = false
    }
  }, [loadGroups, wsRoot])

  const toggleProject = (g: ProjectGroup): void => {
    setExpanded((prev) => toggleNodeKey(prev, projectNodeKey(g.root)))
    // 失效项目再次点击即重试（清标记 + 重新拉取）
    if (failed.has(g.root)) {
      setFailed((prev) => {
        const next = new Set(prev)
        next.delete(g.root)
        return next
      })
    }
    ensureTree(g.root)
  }

  const toggleFolder = (root: string, relPath: string): void => {
    setExpanded((prev) => toggleNodeKey(prev, folderNodeKey(root, relPath)))
  }

  const onFile = async (g: ProjectGroup, relPath: string): Promise<void> => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const res = await openProjectFile(g, relPath, t)
      if (res.outcome === 'opened') router.push('/editor')
      else if (res.outcome === 'error') setError(errText(res.error))
    } finally {
      setBusy(false)
    }
  }

  const openLocal = async (): Promise<void> => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await window.api.openWorkspace()
      await loadGroups(() => aliveRef.current)
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  const flattenNodes = (g: ProjectGroup, nodes: FileNode[], depth: number, out: TreeRow[]): void => {
    for (const n of nodes) {
      if (n.type === 'dir') {
        const key = folderNodeKey(g.root, n.path)
        const open = expanded.has(key)
        out.push({ kind: 'dir', key, root: g.root, path: n.path, name: n.name, depth, open })
        if (open) flattenNodes(g, n.children ?? [], depth + 1, out)
      } else {
        out.push({ kind: 'file', key: folderNodeKey(g.root, n.path), group: g, path: n.path, name: n.name, depth })
      }
    }
  }

  // 压平只依赖展开态与树缓存，不随滚动重算；滚动只移动窗口。
  // t 参与压平（note/action 文案），随 locale 切换重算。
  const rows = useMemo<TreeRow[]>(() => {
    const out: TreeRow[] = []
    if (groups == null) return out
    for (const g of groups) {
      const key = projectNodeKey(g.root)
      const open = expanded.has(key)
      out.push({ kind: 'project', key, group: g, open })
      if (!open) continue
      if (failed.has(g.root)) {
        out.push({ kind: 'note', key: `${key}:unreachable`, label: t('projects.unreachable'), depth: 1, tone: 'warning' })
        continue
      }
      const tree = trees[g.root]
      if (tree == null || tree.status === 'loading') {
        out.push({ kind: 'note', key: `${key}:loading`, label: t('projects.loading'), depth: 1 })
        continue
      }
      if (tree.nodes.length === 0) {
        out.push({ kind: 'note', key: `${key}:empty`, label: t('projects.groupEmpty'), depth: 1 })
        continue
      }
      flattenNodes(g, tree.nodes, 1, out)
    }
    if (groups.length === 0) {
      out.push({ kind: 'action', key: 'open-local', label: busy ? t('project.opening') : t('project.openLocal') })
    }
    if (error) {
      out.push({ kind: 'note', key: 'error', label: error, depth: 0, tone: 'danger', alert: true })
    }
    return out
  }, [groups, trees, expanded, failed, error, busy, t])

  const renderRow = (row: TreeRow): React.JSX.Element => {
    switch (row.kind) {
      case 'project': {
        const g = row.group
        return (
          <NodeRow type="button" $depth={0} aria-expanded={row.open} onClick={() => toggleProject(g)}>
            <Twirl $open={row.open}>
              <AppIcon icon={IconChevronRight} size="xs" decorative />
            </Twirl>
            <AppIcon icon={IconFolderOpen} size="xs" decorative />
            <NodeLabel title={g.root}>{g.name}</NodeLabel>
            {g.current && <CurrentBadge>{t('projects.currentBadge')}</CurrentBadge>}
          </NodeRow>
        )
      }
      case 'dir':
        return (
          <NodeRow
            type="button"
            $depth={row.depth}
            aria-expanded={row.open}
            onClick={() => toggleFolder(row.root, row.path)}
          >
            <Twirl $open={row.open}>
              <AppIcon icon={IconChevronRight} size="xs" decorative />
            </Twirl>
            <AppIcon icon={IconFolderOpen} size="xs" decorative />
            <NodeLabel title={row.path}>{row.name}</NodeLabel>
          </NodeRow>
        )
      case 'file':
        return (
          <NodeRow
            type="button"
            $depth={row.depth}
            aria-label={t('projects.openFileAria', { path: row.path })}
            title={row.path}
            onClick={() => void onFile(row.group, row.path)}
          >
            <AppIcon icon={IconFile} size="xs" decorative />
            <NodeLabel>{row.name}</NodeLabel>
          </NodeRow>
        )
      case 'action':
        return (
          <NodeRow type="button" $depth={0} disabled={busy} onClick={() => void openLocal()}>
            <AppIcon icon={IconFolderOpen} size="xs" decorative />
            <NodeLabel>{row.label}</NodeLabel>
          </NodeRow>
        )
      case 'note':
        return (
          <NoteRow $depth={row.depth} $tone={row.tone} role={row.alert ? 'alert' : undefined}>
            {row.label}
          </NoteRow>
        )
    }
  }

  return (
    <Wrap>
      <VirtualList
        style={SCROLL_STYLE}
        items={rows}
        itemHeight={ROW_HEIGHT}
        itemKey={(row) => row.key}
        renderItem={renderRow}
      />
    </Wrap>
  )
}
