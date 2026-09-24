/**
 * 任务注册表（host 侧纯逻辑，可独立测试）——与 statusItems/floats 同构的快照注册表。
 *
 * 模型（20260924 起任务事件溯源，声明制退役为可选预置）：manifest 声明仍是合法
 * 来源（bootstrap/启用插件时注册，默认 pending，可带 viewId 跳转），但不再是唯一
 * 来源——运行时插件帧对「未声明 id」首报带 title 的 patch 即动态创建任务（集散地
 * 事件机制入口）。运行时插件帧（视图帧或逻辑帧）经 tasks.upsert / tasks.remove
 * 只能操作「自己的」任务——跨插件一律拒绝。声明任务的 title/viewId 仍不可变；
 * 动态任务 title 仅创建首报时生效。
 */

import type { PluginManifest } from '@shared/plugin'

export type TaskStatus = 'pending' | 'in_progress' | 'done'

/** 每插件并发可见任务上限（承接原 manifest ≤8 声明上限的注入面收敛职责） */
export const MAX_VISIBLE_TASKS_PER_PLUGIN = 8

export interface TaskProgress {
  current: number
  total: number
}

export interface TaskState {
  /** `${pluginId}:${taskId}` */
  key: string
  pluginId: string
  id: string
  title: string
  /** 跳转目标视图（仅 manifest 声明期确定，main 区域；动态任务无跳转） */
  viewId?: string
  status: TaskStatus
  progress: TaskProgress | null
  detail?: string
  /** 运行时 remove 后隐藏（声明/创建仍在，再次 upsert 恢复） */
  hidden: boolean
  /** 来源：manifest 预置 = true；运行时动态创建 = false */
  declared: boolean
  createdAt: number
  updatedAt: number
  /** 最近一次进入 done 的时间（离开 done 清空）；任务中心「最近完成」排序用 */
  doneAt: number | null
}

export interface TaskAggregate {
  /** 可见任务总数 */
  total: number
  done: number
  /** in_progress 数（胶囊动效依据） */
  active: number
  pending: number
}

interface TasksState {
  tasks: TaskState[]
}

let state: TasksState = { tasks: [] }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function sortTasks(a: TaskState, b: TaskState): number {
  if (a.pluginId !== b.pluginId) return a.pluginId < b.pluginId ? -1 : 1
  return 0
}

/** 就地变更后统一走这里产出新快照（useSyncExternalStore 依赖新引用） */
function commit(): void {
  state = { tasks: [...state.tasks].sort(sortTasks) }
  emit()
}

export const tasksStore = {
  get: (): TasksState => state,
  subscribe(l: () => void): () => void {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
}

export function taskKey(pluginId: string, taskId: string): string {
  return `${pluginId}:${taskId}`
}

/** bootstrap/启用插件时注册 manifest 声明；重复注册幂等且不覆盖运行时状态 */
export function registerManifestTasks(manifest: PluginManifest): void {
  let changed = false
  const now = Date.now()
  for (const task of manifest.tasks ?? []) {
    const key = taskKey(manifest.id, task.id)
    if (state.tasks.some((t) => t.key === key)) continue
    state.tasks.push({
      key,
      pluginId: manifest.id,
      id: task.id,
      title: task.title,
      ...(task.viewId !== undefined ? { viewId: task.viewId } : {}),
      status: 'pending',
      progress: null,
      hidden: false,
      declared: true,
      createdAt: now,
      updatedAt: now,
      doneAt: null
    })
    changed = true
  }
  if (changed) commit()
}

/** 停用/卸载插件时移除其全部任务 */
export function clearPluginTasks(pluginId: string): void {
  const before = state.tasks.length
  state.tasks = state.tasks.filter((t) => t.pluginId !== pluginId)
  if (state.tasks.length !== before) commit()
}

export interface TaskPatch {
  /** 仅动态创建首报时生效；已存在任务携带 title 拒绝 */
  title?: string
  status?: TaskStatus
  progress?: TaskProgress
  detail?: string
}

function applyPatch(task: TaskState, patch: TaskPatch): void {
  if (patch.status !== undefined) {
    if (patch.status !== 'pending' && patch.status !== 'in_progress' && patch.status !== 'done') {
      throw new Error(`非法任务 status: ${String(patch.status)}`)
    }
    task.status = patch.status
  }
  if (patch.progress !== undefined) {
    const p = patch.progress as TaskProgress | undefined | null
    const current = p?.current
    const total = p?.total
    if (
      !p ||
      typeof current !== 'number' ||
      typeof total !== 'number' ||
      !Number.isFinite(current) ||
      !Number.isFinite(total) ||
      current < 0 ||
      total < 0 ||
      current > total
    ) {
      throw new Error('progress 须为 { current, total } 且 0 ≤ current ≤ total')
    }
    task.progress = { current, total }
  }
  if (patch.detail !== undefined) {
    if (typeof patch.detail !== 'string') throw new Error('detail 须为字符串')
    task.detail = patch.detail
  }
}

/**
 * 运行时更新状态；未声明任务且 patch 带 1-80 字符 title 时动态创建（缺 title 报错）。
 * upsert 同时恢复 remove 的隐藏；每插件可见任务数超限拒绝创建。
 */
export function upsertTask(pluginId: string, taskId: string, patch: TaskPatch): void {
  const p = patch ?? {}
  const task = state.tasks.find((t) => t.key === taskKey(pluginId, taskId))
  if (!task) {
    const title = p.title
    if (typeof title !== 'string' || title.length === 0 || title.length > 80) {
      throw new Error(`任务未声明且缺少 title（动态创建须首报 1-80 字符 title）: ${pluginId}/${taskId}`)
    }
    const visibleCount = state.tasks.filter((t) => t.pluginId === pluginId && !t.hidden).length
    if (visibleCount >= MAX_VISIBLE_TASKS_PER_PLUGIN) {
      throw new Error(`并发任务超限（每插件可见任务 ≤${MAX_VISIBLE_TASKS_PER_PLUGIN}）: ${pluginId}`)
    }
    // 先在局部对象上完成校验（applyPatch 可能抛错），全部通过才入册
    const now = Date.now()
    const created: TaskState = {
      key: taskKey(pluginId, taskId),
      pluginId,
      id: taskId,
      title,
      status: 'pending',
      progress: null,
      hidden: false,
      declared: false,
      createdAt: now,
      updatedAt: now,
      doneAt: null
    }
    applyPatch(created, p)
    state.tasks.push(created)
    commit()
    return
  }
  if (p.title !== undefined) throw new Error('已存在任务不接受 title（title 仅动态创建首报时生效）')
  applyPatch(task, p)
  task.hidden = false
  task.updatedAt = Date.now()
  if (p.status === 'done') task.doneAt = Date.now()
  else if (p.status !== undefined) task.doneAt = null
  commit()
}

/** 运行时隐藏（未声明任务报错） */
export function removeTask(pluginId: string, taskId: string): void {
  const task = state.tasks.find((t) => t.key === taskKey(pluginId, taskId))
  if (!task) throw new Error(`任务未声明: ${pluginId}/${taskId}`)
  task.hidden = true
  commit()
}

/** 胶囊/Popover 渲染用：可见任务（已排序） */
export function visibleTasks(): TaskState[] {
  return state.tasks.filter((t) => !t.hidden)
}

/** 胶囊聚合派生（只统计可见任务） */
export function taskAggregate(): TaskAggregate {
  const agg: TaskAggregate = { total: 0, done: 0, active: 0, pending: 0 }
  for (const t of state.tasks) {
    if (t.hidden) continue
    agg.total += 1
    if (t.status === 'done') agg.done += 1
    else if (t.status === 'in_progress') agg.active += 1
    else agg.pending += 1
  }
  return agg
}

export function resetTasksForTests(): void {
  state = { tasks: [] }
  emit()
}
