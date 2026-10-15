'use client'

/**
 * 任务中心「任务」页签体（20261015-feature-workbench-shell task-6 自 CapsulePanel
 * 抽取为共享件）：筛选 chips + 聚合空态 + 时间线（进行中→待处理→最近完成）。
 * 胶囊下拉面板与底部 Dock 的任务页签共用同一渲染，testid 保持 capsule-*（既有
 * 用例锚点）；清空已完成仍是壳层唯一允许的任务写操作（remove 隐藏，不改状态）。
 */
import { useState, useSyncExternalStore } from 'react'
import {
  taskAggregate,
  tasksStore,
  visibleTasks,
  removeTask
} from '../../../lib/tasks'
import { useLocale } from '../../../lib/i18n/context'
import {
  FilterRow,
  FilterChip,
  PluginPill,
  Timeline,
  DoneHead,
  DoneLabel,
  ClearBtn,
  EmptyState,
  EmptyTitle,
  EmptyHint
} from './styles'
import { TaskRow } from './TaskTimeline'

type StatusFilter = 'all' | 'active' | 'done'

export function TaskCenterBody(props: { onClose: () => void }): React.JSX.Element {
  const { t } = useLocale()
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [pluginFilter, setPluginFilter] = useState<string | null>(null)
  const tasks = visibleTasks()
  const agg = taskAggregate()
  const now = Date.now()

  const sourceIds = [...new Set(tasks.map((task) => task.pluginId))].sort()
  const filtered = tasks
    .filter((task) => (pluginFilter ? task.pluginId === pluginFilter : true))
    .filter((task) =>
      filter === 'all' ? true : filter === 'done' ? task.status === 'done' : task.status !== 'done'
    )
  const running = filtered
    .filter((task) => task.status === 'in_progress')
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const pending = filtered
    .filter((task) => task.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
  const doneList = filtered
    .filter((task) => task.status === 'done')
    .sort((a, b) => (b.doneAt ?? b.updatedAt) - (a.doneAt ?? a.updatedAt))

  // 清空已完成 = 壳层唯一允许的写操作：remove 隐藏条目，不改任务状态
  const clearDone = (): void => {
    for (const task of tasks) {
      if (task.status === 'done') removeTask(task.pluginId, task.id)
    }
  }

  return (
    <>
      <FilterRow>
        <FilterChip type="button" aria-pressed={filter === 'all'} $on={filter === 'all'} onClick={() => setFilter('all')}>
          {t('capsule.filterAll')}
        </FilterChip>
        <FilterChip
          type="button"
          aria-pressed={filter === 'active'}
          $on={filter === 'active'}
          onClick={() => setFilter('active')}
        >
          {t('capsule.filterActive')}
        </FilterChip>
        <FilterChip type="button" aria-pressed={filter === 'done'} $on={filter === 'done'} onClick={() => setFilter('done')}>
          {t('capsule.filterDone')}
        </FilterChip>
        {sourceIds.length >= 2 &&
          sourceIds.map((id) => (
            <PluginPill
              key={id}
              type="button"
              aria-pressed={pluginFilter === id}
              $on={pluginFilter === id}
              onClick={() => setPluginFilter((cur) => (cur === id ? null : id))}
            >
              {id}
            </PluginPill>
          ))}
      </FilterRow>

      {agg.total === 0 ? (
        <EmptyState data-testid="capsule-empty">
          <EmptyTitle>{t('capsule.emptyTitle')}</EmptyTitle>
          <EmptyHint>{t('capsule.emptyHint')}</EmptyHint>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState data-testid="capsule-nomatch">
          <EmptyTitle>{t('capsule.noMatch')}</EmptyTitle>
        </EmptyState>
      ) : (
        <Timeline data-testid="capsule-timeline">
          {running.map((task) => (
            <TaskRow key={task.key} task={task} now={now} onClose={props.onClose} />
          ))}
          {pending.map((task) => (
            <TaskRow key={task.key} task={task} now={now} onClose={props.onClose} />
          ))}
          {doneList.length > 0 && (
            <DoneHead>
              <DoneLabel>
                {t('capsule.recentDone')} · {doneList.length}
              </DoneLabel>
              <ClearBtn type="button" data-testid="capsule-clear-done" onClick={clearDone}>
                {t('capsule.clearDone')}
              </ClearBtn>
            </DoneHead>
          )}
          {doneList.map((task) => (
            <TaskRow key={task.key} task={task} now={now} onClose={props.onClose} />
          ))}
        </Timeline>
      )}
    </>
  )
}
