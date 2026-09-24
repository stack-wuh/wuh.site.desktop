import type { FileNode, RecentWorkspace, WorkspaceInfo } from '@shared/types'

/**
 * 项目纯逻辑（20260924-feature-projects-editor-page）：
 * 以项目维度划分 Group——当前工作区组置顶（徽标「当前」），最近项目去重后按 MRU 顺延；
 * 组展开态 helpers 供 /projects 页消费。root 均来自主进程登记（setWorkspace/listRecent），
 * 同一来源路径字面量一致，去重按字面量比较即可。
 *
 * 菜单树扩展（走查反馈修订）：树节点展开态 key helpers + pruneMarkdownTree——
 * 侧栏树只渲染「含 .md 的分支」，与 collectMarkdownFiles 同口径（大小写不敏感后缀）。
 */

/** 项目组：组内文件打开时的工作区根 + 展示元数据 */
export interface ProjectGroup {
  root: string
  name: string
  /** 当前工作区组（置顶、带徽标；组内文件无需切工作区） */
  current: boolean
}

export function buildProjectGroups(
  current: WorkspaceInfo | null,
  recent: RecentWorkspace[]
): ProjectGroup[] {
  const groups: ProjectGroup[] = []
  if (current) groups.push({ root: current.root, name: current.name, current: true })
  for (const r of recent) {
    if (groups.some((g) => g.root === r.path)) continue
    groups.push({ root: r.path, name: r.name, current: false })
  }
  return groups
}

/** 初始展开态：仅当前组展开；无当前组则全收起 */
export function initialExpandedGroups(groups: ProjectGroup[]): Set<string> {
  const current = groups.find((g) => g.current)
  return new Set(current ? [current.root] : [])
}

/** 切换一组展开/收起（返回新集合，不改原集合） */
export function toggleExpandedGroup(expanded: Set<string>, root: string): Set<string> {
  const next = new Set(expanded)
  if (next.has(root)) next.delete(root)
  else next.add(root)
  return next
}

/** 树节点展开态 key：项目节点与目录节点共用一个集合，前缀区分命名空间 */
export function projectNodeKey(root: string): string {
  return `p:${root}`
}

export function folderNodeKey(root: string, relPath: string): string {
  return `d:${root}/${relPath}`
}

/** 切换一个树节点展开/收起（返回新集合，不改原集合） */
export function toggleNodeKey(expanded: Set<string>, key: string): Set<string> {
  const next = new Set(expanded)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith('.md')
}

/** 只保留「含 .md 的分支」：文件仅留 .md，目录无 .md 后代则整枝剪除（返回新节点） */
export function pruneMarkdownTree(nodes: FileNode[]): FileNode[] {
  const walk = (list: FileNode[]): FileNode[] => {
    const out: FileNode[] = []
    for (const node of list) {
      if (node.type === 'file') {
        if (isMarkdownPath(node.path)) out.push(node)
      } else if (node.children) {
        const children = walk(node.children)
        if (children.length > 0) out.push({ ...node, children })
      }
    }
    return out
  }
  return walk(nodes)
}
