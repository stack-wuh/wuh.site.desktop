import { beforeEach, describe, expect, it } from 'vitest'
import type { PluginManifest } from '@shared/plugin'
import {
  MAX_VISIBLE_TASKS_PER_PLUGIN,
  clearPluginTasks,
  registerManifestTasks,
  removeTask,
  resetTasksForTests,
  taskAggregate,
  taskKey,
  tasksStore,
  upsertTask,
  visibleTasks
} from '../lib/tasks'

function manifest(id: string, tasks: PluginManifest['tasks']): PluginManifest {
  return {
    id,
    name: id,
    version: '1.0.0',
    views: [],
    publishers: [],
    permissions: [],
    tasks
  }
}

const task = (id: string, title: string, viewId?: string) =>
  viewId === undefined ? { id, title } : { id, title, viewId }

beforeEach(() => {
  resetTasksForTests()
})

describe('tasks 注册表', () => {
  it('manifest 声明注册为默认 pending 任务，key 为 pluginId:taskId', () => {
    registerManifestTasks(manifest('github-issues', [task('publish', '发布 Issue', 'github')]))
    const visible = visibleTasks()
    expect(visible).toHaveLength(1)
    expect(visible[0]?.key).toBe('github-issues:publish')
    expect(visible[0]?.title).toBe('发布 Issue')
    expect(visible[0]?.viewId).toBe('github')
    expect(visible[0]?.status).toBe('pending')
    expect(visible[0]?.progress).toBeNull()
    expect(visible[0]?.hidden).toBe(false)
  })

  it('重复注册幂等（不覆盖运行时已更新的状态）', () => {
    const m = manifest('p', [task('a', 'x')])
    registerManifestTasks(m)
    upsertTask('p', 'a', { status: 'in_progress' })
    registerManifestTasks(m)
    expect(visibleTasks()).toHaveLength(1)
    expect(visibleTasks()[0]?.status).toBe('in_progress')
  })

  it('upsert 更新 status/progress/detail 并恢复隐藏；remove 隐藏后声明仍在', () => {
    registerManifestTasks(manifest('p', [task('a', 'x')]))

    upsertTask('p', 'a', { status: 'in_progress', progress: { current: 1, total: 3 }, detail: '发布中' })
    expect(visibleTasks()[0]).toMatchObject({
      status: 'in_progress',
      progress: { current: 1, total: 3 },
      detail: '发布中'
    })

    removeTask('p', 'a')
    expect(visibleTasks()).toHaveLength(0)
    expect(taskAggregate().total).toBe(0)

    upsertTask('p', 'a', { status: 'done' })
    expect(visibleTasks()).toHaveLength(1)
    expect(visibleTasks()[0]?.status).toBe('done')
  })

  it('未声明任务：无 title 报错；remove 报错', () => {
    registerManifestTasks(manifest('p', [task('a', 'x')]))
    expect(() => upsertTask('p', 'ghost', { status: 'done' })).toThrow(/未声明/)
    expect(() => removeTask('p', 'ghost')).toThrow(/未声明/)
  })

  it('动态创建：未声明 id 首报 title 即创建（声明制退役为可选预置）', () => {
    const now = Date.now()
    upsertTask('crawler', 'fetch-repo', { title: '抓取仓库', status: 'in_progress', progress: { current: 1, total: 5 } })
    const created = visibleTasks()[0]
    expect(created).toMatchObject({
      key: 'crawler:fetch-repo',
      pluginId: 'crawler',
      id: 'fetch-repo',
      title: '抓取仓库',
      status: 'in_progress',
      progress: { current: 1, total: 5 },
      hidden: false,
      declared: false,
      doneAt: null
    })
    expect(created?.createdAt).toBeGreaterThanOrEqual(now)
    expect(created?.viewId).toBeUndefined()
  })

  it('title 仅动态创建首报时生效；已存在任务携带 title 拒绝', () => {
    upsertTask('p', 'dynamic', { title: 'v1' })
    expect(() => upsertTask('p', 'dynamic', { title: 'v2' })).toThrow(/title/)
    registerManifestTasks(manifest('p', [task('declared', 'x')]))
    expect(() => upsertTask('p', 'declared', { title: 'y' })).toThrow(/title/)
    // title 长度护栏：空串/超长拒绝
    expect(() => upsertTask('p', 'bad', { title: '' })).toThrow(/title/)
    expect(() => upsertTask('p', 'bad', { title: 'x'.repeat(81) })).toThrow(/title/)
  })

  it(`并发护栏：每插件可见任务 ≤${8}，隐藏腾位后可再创建`, () => {
    const declared = Array.from({ length: MAX_VISIBLE_TASKS_PER_PLUGIN }, (_, i) => task(`t${i}`, `任务${i}`))
    registerManifestTasks(manifest('p', declared))
    expect(() => upsertTask('p', 'extra', { title: '超额' })).toThrow(/超限/)
    // remove 隐藏腾出一个可见位后可创建
    removeTask('p', 't0')
    expect(() => upsertTask('p', 'extra', { title: '补位' })).not.toThrow()
    expect(visibleTasks().filter((t) => t.pluginId === 'p')).toHaveLength(MAX_VISIBLE_TASKS_PER_PLUGIN)
  })

  it('doneAt 时间戳：进入 done 打点，离开 done 清空', () => {
    upsertTask('p', 'a', { title: 'x' })
    const find = () => visibleTasks()[0]
    expect(find()?.doneAt).toBeNull()
    upsertTask('p', 'a', { status: 'done' })
    expect(find()?.doneAt).not.toBeNull()
    upsertTask('p', 'a', { status: 'in_progress' })
    expect(find()?.doneAt).toBeNull()
  })

  it('clearPluginTasks 同样移除动态创建的任务', () => {
    upsertTask('p1', 'dynamic', { title: '动态' })
    registerManifestTasks(manifest('p2', [task('b', 'y')]))
    clearPluginTasks('p1')
    expect(visibleTasks().map((t) => t.key)).toEqual(['p2:b'])
  })

  it('插件只能操作自己的任务：跨插件同 id 互不干扰', () => {
    registerManifestTasks(manifest('p1', [task('a', 'x')]))
    registerManifestTasks(manifest('p2', [task('a', 'y')]))
    upsertTask('p2', 'a', { status: 'done' })
    expect(visibleTasks().map((t) => `${t.key}=${t.status}`).sort()).toEqual(['p1:a=pending', 'p2:a=done'])
  })

  it('非法 patch 被拒绝：未知 status / 坏 progress 形状 / 非 string detail', () => {
    registerManifestTasks(manifest('p', [task('a', 'x')]))
    expect(() => upsertTask('p', 'a', { status: 'running' as never })).toThrow(/status/)
    expect(() => upsertTask('p', 'a', { progress: { current: -1, total: 3 } })).toThrow(/progress/)
    expect(() => upsertTask('p', 'a', { progress: { current: 4, total: 3 } })).toThrow(/progress/)
    expect(() => upsertTask('p', 'a', { progress: { current: '1', total: 3 } as never })).toThrow(/progress/)
    expect(() => upsertTask('p', 'a', { detail: 42 as never })).toThrow(/detail/)
  })

  it('clearPluginTasks 移除该插件全部任务（停用插件）', () => {
    registerManifestTasks(manifest('p1', [task('a', 'x')]))
    registerManifestTasks(manifest('p2', [task('b', 'y')]))
    clearPluginTasks('p1')
    expect(visibleTasks().map((t) => t.key)).toEqual(['p2:b'])
  })

  it('聚合派生只统计可见任务：total/done/active/pending', () => {
    registerManifestTasks(
      manifest('p', [task('a', '1'), task('b', '2'), task('c', '3'), task('d', '4')])
    )
    upsertTask('p', 'a', { status: 'done' })
    upsertTask('p', 'b', { status: 'in_progress' })
    removeTask('p', 'c')
    expect(taskAggregate()).toEqual({ total: 3, done: 1, active: 1, pending: 1 })
  })

  it('每次变更 commit 产出新快照引用（useSyncExternalStore 依赖）', () => {
    registerManifestTasks(manifest('p', [task('a', 'x')]))
    const first = tasksStore.get()
    upsertTask('p', 'a', { status: 'done' })
    expect(tasksStore.get()).not.toBe(first)
    expect(tasksStore.get().tasks[0]?.status).toBe('done')
    // 幂等空操作（重复注册无变化）不触发新引用
    const before = tasksStore.get()
    registerManifestTasks(manifest('p', [task('a', 'x')]))
    expect(tasksStore.get()).toBe(before)
  })

  it('排序按插件 id 分组稳定，组内保持注册顺序', () => {
    registerManifestTasks(manifest('zeta', [task('b', 'zb'), task('a', 'za')]))
    registerManifestTasks(manifest('alpha', [task('c', 'ac')]))
    expect(visibleTasks().map((t) => taskKey(t.pluginId, t.id))).toEqual([
      'alpha:c',
      'zeta:b',
      'zeta:a'
    ])
  })
})
