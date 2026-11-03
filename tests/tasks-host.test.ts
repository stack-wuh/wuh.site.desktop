import { describe, expect, it } from 'vitest'

import {
  PUBLISH_STAGES,
  PUBLISH_TASK_ID,
  PUBLISH_TASK_NS,
  publishStagePatch,
  publishTaskDonePatch,
  publishTaskFailedPatch
} from '../lib/publish'
import { RESERVED_HOST_TASK_NAMESPACE, taskKey, upsertTask, visibleTasks, removeTask, resetTasksForTests } from '../lib/tasks'

/**
 * 宿主任务通道（20261103-feature-async-task-progress）：发布链作为首个消费者，
 * 四阶段进度写进任务注册表（host:publish）。阶段数 = 渲染层可见编排步——
 * CLI plan/execute 在主进程单 IPC 内不可细分，故 save→publish→writeback→sync。
 */

describe('publish stage patches', () => {
  it('exposes four orchestration-visible stages', () => {
    expect(PUBLISH_STAGES).toHaveLength(4)
    expect(PUBLISH_TASK_NS).toBe('host')
    expect(PUBLISH_TASK_ID).toBe('publish')
  })

  it('maps stage index to monotonic progress and composed detail', () => {
    const p0 = publishStagePatch(0, '保存中')
    expect(p0.status).toBe('in_progress')
    expect(p0.progress).toEqual({ current: 1, total: 4 })
    expect(p0.detail).toBe('保存中 1/4')
    const p3 = publishStagePatch(3, '同步站点')
    expect(p3.progress).toEqual({ current: 4, total: 4 })
    expect(p3.detail).toBe('同步站点 4/4')
  })

  it('rejects out-of-range stage index', () => {
    expect(() => publishStagePatch(-1, 'x')).toThrow()
    expect(() => publishStagePatch(4, 'x')).toThrow()
  })

  it('done patch carries no title and failed patch downgrades to pending with reason', () => {
    const done = publishTaskDonePatch()
    expect(done.status).toBe('done')
    expect(done.title).toBeUndefined()
    const failed = publishTaskFailedPatch('同步端点返回 500')
    expect(failed.status).toBe('pending')
    expect(failed.detail).toBe('同步端点返回 500')
  })
})

describe('host reserved namespace', () => {
  it('reserves the host namespace constant', () => {
    expect(RESERVED_HOST_TASK_NAMESPACE).toBe('host')
    expect(taskKey('host', 'publish')).toBe('host:publish')
  })

  it('host direct writes work and round-trip through the registry', () => {
    resetTasksForTests()
    upsertTask('host', 'publish', {
      title: '发布文章',
      ...publishStagePatch(0, '保存中')
    })
    const task = visibleTasks().find(t => t.key === taskKey('host', 'publish'))
    expect(task).toBeDefined()
    expect(task?.title).toBe('发布文章')
    expect(task?.status).toBe('in_progress')
    upsertTask('host', 'publish', publishStagePatch(3, '同步站点'))
    const updated = visibleTasks().find(t => t.key === taskKey('host', 'publish'))
    expect(updated?.progress).toEqual({ current: 4, total: 4 })
    removeTask('host', 'publish')
    expect(visibleTasks().find(t => t.key === taskKey('host', 'publish'))).toBeUndefined()
  })
})
