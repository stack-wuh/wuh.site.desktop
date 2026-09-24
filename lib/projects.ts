import type { RecentWorkspace, WorkspaceInfo } from '@shared/types'

/**
 * 项目页纯逻辑（20260924-feature-projects-editor-page）：
 * 以项目维度划分 Group——当前工作区组置顶（徽标「当前」），最近项目去重后按 MRU 顺延；
 * 组展开态 helpers 供 /projects 页消费。root 均来自主进程登记（setWorkspace/listRecent），
 * 同一来源路径字面量一致，去重按字面量比较即可。
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
