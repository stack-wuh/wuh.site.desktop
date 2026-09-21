/**
 * 任务注册表（host 侧纯逻辑，可独立测试）——与 statusItems/floats 同构的快照注册表。
 *
 * 模型：manifest 声明制任务占位（bootstrap/启用插件时注册，默认 pending），
 * 运行时插件帧（视图帧或逻辑帧）经 tasks.upsert / tasks.remove 只能更新
 * 「自己声明过」的任务状态或隐藏——跨插件、未声明一律拒绝。标题/跳转目标
 * 固定在 manifest 层运行时不可变，保证胶囊清单稳定与注入面最小。
 */

import type { PluginManifest } from '@shared/plugin'

export type TaskStatus = 'pending' | 'in_progress' | 'done'

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
  /** 跳转目标视图（声明期确定，main 区域） */
  viewId?: string
  status: TaskStatus
  progress: TaskProgress | null
  detail?: string
  /** 运行时 remove 后隐藏（声明仍在，再次 upsert 恢复） */
  hidden: boolean
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
      hidden: false
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

/** 运行时更新状态（未声明任务报错；upsert 同时恢复 remove 的隐藏） */
export function upsertTask(pluginId: string, taskId: string, patch: TaskPatch): void {
  const task = state.tasks.find((t) => t.key === taskKey(pluginId, taskId))
  if (!task) throw new Error(`任务未声明: ${pluginId}/${taskId}`)
  applyPatch(task, patch ?? {})
  task.hidden = false
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
