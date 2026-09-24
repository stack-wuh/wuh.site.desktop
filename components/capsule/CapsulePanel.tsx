'use client'

/**
 * 任务中心面板（20260924-feature-task-center-event-bus 重构）：胶囊升级为多插件
 * 并发任务的「集散地」——「任务 | 模块」双 tab；任务 tab = 单流时间线（进行中 →
 * 待处理 → 最近完成），左缘脊线把状态标串成事件流（进行中段 primary 脉动，属
 * 持续状态指示，reduced-motion 静态降级）；头部聚合进度条 + 「清空已完成」
 * （壳层唯一允许的写操作：隐藏不改状态）；筛选 chips（全部/未完成/已完成）+
 * 插件 pill（≥2 个插件有任务才出现）。模块 tab = EditorSection + capsule 贡献点
 * tiles（20260923 控制中心现状保留）。贴胶囊**向下**弹出（挂点契约不变：宿主
 * 无 z-index、面板 z70），Esc/点外关由胶囊侧统一处理，面板内点击不冒泡。
 */
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { AppIcon } from '../ui/AppIcon'
import { IconCheck } from '../icons'
import { pluginIcon } from '../icons'
import type { PluginIconName } from '@shared/plugin'
import {
  taskAggregate,
  tasksStore,
  visibleTasks,
  removeTask,
  type TaskState,
  type TaskStatus
} from '../../lib/tasks'
import { capsuleStore, visibleCapsuleModules, type CapsuleModuleState } from '../../lib/capsule'
import { useLocale } from '../../lib/i18n/context'
import { EditorSection } from './sections/EditorSection'
import { CenterSection, ModuleBig, ModuleCard, ModuleGrid, ModuleHead, ModuleIcon, ModulePanel, ModuleSub, SectionHint, SectionLabel } from './modules'

type TaskTab = 'tasks' | 'modules'
type StatusFilter = 'all' | 'active' | 'done'

const Pop = styled.div`
  /* 贴 chip（TitleBar 右侧，垂直居中）下缘向下弹出：panel 顶约落在 TitleBar
     底缘；挂点契约见 components/capsule/Capsule.tsx 头注释 */
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 70;
  pointer-events: auto;
  width: 420px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 6px 6px 8px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
`

const PopHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px 7px;

  & > strong {
    font-size: 13px;
    color: var(--text-primary);
  }
`

const PopCount = styled.span`
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

/* 头部聚合进度条：done/total，全完成转 success */
const HeadBar = styled.div`
  height: 3px;
  margin: 0 10px 2px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--chrome-border) 45%, transparent);
  overflow: hidden;
`

const HeadBarFill = styled.div<{ $pct: number; $allDone: boolean }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ $allDone }) => ($allDone ? 'var(--success-color)' : 'var(--primary-color)')};
  transition: width 300ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const TabRow = styled.div`
  display: flex;
  gap: 2px;
  padding: 0 8px;
  border-bottom: 1px solid var(--chrome-border);
`

const Tab = styled.button<{ $active: boolean }>`
  padding: 6px 10px 7px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--primary-color)' : 'transparent')};
  margin-bottom: -1px;
  color: ${({ $active }) => ($active ? 'var(--text-primary)' : 'var(--text-muted)')};
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: color 150ms ease-out;

  &:hover {
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
    border-radius: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px 6px;
`

const FilterChip = styled.button<{ $on: boolean }>`
  padding: 2px 10px;
  background: ${({ $on }) =>
    $on ? 'color-mix(in oklab, var(--primary-color) 14%, transparent)' : 'transparent'};
  border: 1px solid ${({ $on }) =>
    $on ? 'color-mix(in oklab, var(--primary-color) 42%, var(--chrome-border))' : 'var(--chrome-border)'};
  border-radius: 999px;
  color: ${({ $on }) => ($on ? 'var(--primary-color)' : 'var(--text-secondary)')};
  font-size: 11px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background-color 150ms ease-out, border-color 150ms ease-out;

  &:hover {
    border-color: color-mix(in oklab, var(--primary-color) 42%, var(--chrome-border));
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const PluginPill = styled(FilterChip)`
  font-family: var(--font-mono);
  font-size: 10px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* 时间线：左缘脊线（签名元素）——每行 Rail 画贯穿线，相邻行连成事件流 */
const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  padding: 2px 4px 4px;
`

const rowFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const TaskRowBase = styled.div<{ $dim?: boolean }>`
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  width: 100%;
  padding: 5px 6px 5px 2px;
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  text-align: left;
  opacity: ${({ $dim }) => ($dim ? 0.65 : 1)};
  animation: ${rowFadeIn} 150ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const TaskRowButton = styled(TaskRowBase).attrs({ as: 'button' })`
  background: transparent;
  border: none;
  font-size: inherit;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background-color 150ms ease-out;

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 脊线单元格：贯穿行高的 2px 竖线，相邻行相连成事件流；进行中行 primary 脉动
   （持续状态指示，reduced-motion 静态降级） */
const Rail = styled.span<{ $live: boolean }>`
  position: relative;
  align-self: stretch;
  width: 18px;
  flex: none;

  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 2px;
    border-radius: 1px;
    background: ${({ $live }) =>
      $live
        ? 'var(--primary-color)'
        : 'color-mix(in oklab, var(--chrome-border) 55%, transparent)'};
    opacity: ${({ $live }) => ($live ? 0.5 : 1)};
  }

  ${({ $live }) =>
    $live
      ? `
    &::before {
      animation: railPulse 1.6s ease-in-out infinite alternate;
    }

    @keyframes railPulse {
      from { opacity: 0.3; }
      to { opacity: 0.85; }
    }
  `
      : ''}

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
      opacity: 0.45;
    }
  }
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

/* 状态标骑在脊线上：pending 空心点 / in_progress 旋转环 / done 对勾；
   圆形面板底色遮断脊线形成珠串观感 */
const StatusMark = styled.span<{ $status: TaskStatus }>`
  position: absolute;
  top: 3px;
  left: 0;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--chrome-panel);

  ${({ $status }) => ($status === 'done' ? 'color: var(--success-color);' : '')}

  ${({ $status }) =>
    $status === 'pending'
      ? css`
          &::after {
            content: '';
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1.5px solid var(--text-muted);
            box-sizing: border-box;
          }
        `
      : ''}

  ${({ $status }) =>
    $status === 'in_progress'
      ? css`
          &::after {
            content: '';
            width: 11px;
            height: 11px;
            border-radius: 50%;
            border: 2px solid color-mix(in oklab, var(--chrome-border) 60%, transparent);
            border-top-color: var(--primary-color);
            box-sizing: border-box;
            animation: ${spin} 800ms linear infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            &::after {
              animation: none;
              border-color: var(--primary-color);
              opacity: 0.55;
            }
          }
        `
      : ''}
`

const RowBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const TitleLine = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const Title = styled.span`
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SourceBadge = styled.span`
  flex: none;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--chrome-border) 40%, transparent);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 9.5px;
`

const RowDetail = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ProgressLine = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`

const ProgressBar = styled.span`
  flex: 1;
  max-width: 180px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--chrome-border) 45%, transparent);
  overflow: hidden;
`

const ProgressFill = styled.span<{ $pct: number }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: var(--primary-color);
`

const ProgressNum = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  flex: none;
`

const MetaCol = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding-top: 2px;
  flex: none;
`

const Time = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
`

const ViewHint = styled.span`
  font-size: 10px;
  color: var(--text-muted);
`

const DoneHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 2px;
`

const DoneLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--text-muted);
`

const ClearBtn = styled.button`
  margin-left: auto;
  padding: 1px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--primary-color);
  font-size: 10.5px;
  font-family: var(--font-sans);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 30px 16px 26px;
  text-align: center;
`

const EmptyTitle = styled.span`
  font-size: 12.5px;
  color: var(--text-secondary);
`

const EmptyHint = styled.span`
  font-size: 11px;
  color: var(--text-muted);
`

const PluginNote = styled.div`
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 10px 2px;
  font-family: var(--font-mono);
`

const ToneDot = styled.span<{ $tone: NonNullable<CapsuleModuleState['tone']> }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  ${({ $tone }) =>
    $tone === 'primary'
      ? 'background: var(--primary-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'success'
      ? 'background: var(--success-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'warning'
      ? 'background: var(--warning-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'default'
      ? 'background: var(--text-muted);'
      : ''}
`

function relativeTime(ts: number, now: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Math.max(0, now - ts)
  if (diff < 60_000) return t('capsule.justNow')
  if (diff < 3_600_000) return t('capsule.minAgo', { n: Math.floor(diff / 60_000) })
  if (diff < 86_400_000) return t('capsule.hourAgo', { n: Math.floor(diff / 3_600_000) })
  return t('capsule.dayAgo', { n: Math.floor(diff / 86_400_000) })
}

/** 时间线任务行：viewId 整行可点跳转来源视图，否则纯展示 */
function TaskRow(props: { task: TaskState; now: number; onClose: () => void }): React.JSX.Element {
  const { task, now } = props
  const router = useRouter()
  const { t } = useLocale()
  const timeTs = task.status === 'done' ? task.doneAt ?? task.updatedAt : task.updatedAt
  const body = (
    <>
      <Rail $live={task.status === 'in_progress'} aria-hidden="true">
        <StatusMark $status={task.status} aria-hidden="true">
          {task.status === 'done' && <AppIcon icon={IconCheck} size="xs" />}
        </StatusMark>
      </Rail>
      <RowBody>
        <TitleLine>
          <Title>{task.title}</Title>
          <SourceBadge>{task.pluginId}</SourceBadge>
        </TitleLine>
        {task.detail && <RowDetail>{task.detail}</RowDetail>}
        {task.progress && (
          <ProgressLine>
            <ProgressBar aria-hidden="true">
              <ProgressFill $pct={task.progress.total > 0 ? (task.progress.current / task.progress.total) * 100 : 0} />
            </ProgressBar>
            <ProgressNum>
              {task.progress.current}/{task.progress.total}
            </ProgressNum>
          </ProgressLine>
        )}
      </RowBody>
      <MetaCol>
        <Time>{relativeTime(timeTs, now, t)}</Time>
        {task.viewId && <ViewHint>查看 ›</ViewHint>}
      </MetaCol>
    </>
  )
  if (task.viewId) {
    return (
      <TaskRowButton
        type="button"
        data-testid="task-row-link"
        $dim={task.status === 'done'}
        onClick={() => {
          router.push(`/plugin/${task.pluginId}/${task.viewId}`)
          props.onClose()
        }}
      >
        {body}
      </TaskRowButton>
    )
  }
  return <TaskRowBase $dim={task.status === 'done'}>{body}</TaskRowBase>
}

/** 插件贡献模块 tile：宿主按模板白名单渲染，数据全部来自单向上报快照 */
function CapsuleModuleTile(props: { mod: CapsuleModuleState; onNavigate: () => void }): React.JSX.Element {
  const { mod } = props
  const router = useRouter()
  const { t } = useLocale()
  const IconComp = pluginIcon(mod.icon as PluginIconName)
  const inner = (
    <>
      <ModuleHead>
        <ModuleIcon>
          <AppIcon icon={IconComp} size="xs" decorative />
        </ModuleIcon>
        {mod.title}
      </ModuleHead>
      {mod.template === 'count' ? (
        <ModuleBig>
          {mod.value ?? 0}
          {mod.label && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{mod.label}</span>}
        </ModuleBig>
      ) : (
        <ModuleBig style={{ fontSize: 12.5 }}>
          {mod.tone && mod.tone !== 'default' && <ToneDot $tone={mod.tone} />}
          <span className="truncate">{mod.text ?? '—'}</span>
        </ModuleBig>
      )}
      {mod.detail && <ModuleSub>{mod.detail}</ModuleSub>}
    </>
  )
  if (mod.viewId) {
    return (
      <ModuleCard
        $span2
        type="button"
        className="plugin-tile"
        title={t('capsule.openPluginView')}
        onClick={() => {
          router.push(`/plugin/${mod.pluginId}/${mod.viewId}`)
          props.onNavigate()
        }}
      >
        {inner}
        <span style={{ position: 'absolute', right: 10, top: 9, fontSize: 10, color: 'var(--text-muted)' }}>›</span>
      </ModuleCard>
    )
  }
  return (
    <ModulePanel $span2 className="plugin-tile" role="group" aria-label={mod.title}>
      {inner}
    </ModulePanel>
  )
}

export function CapsulePanel(props: { onClose: () => void }): React.JSX.Element {
  const { t } = useLocale()
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  useSyncExternalStore(capsuleStore.subscribe, capsuleStore.get, capsuleStore.get)
  const [tab, setTab] = useState<TaskTab>('tasks')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [pluginFilter, setPluginFilter] = useState<string | null>(null)
  const tasks = visibleTasks()
  const agg = taskAggregate()
  const modules = visibleCapsuleModules()
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
    <Pop role="dialog" aria-label={t('capsule.title')} data-testid="capsule-panel" onClick={(e) => e.stopPropagation()}>
      <PopHead>
        <strong>{t('capsule.title')}</strong>
        <PopCount>
          {agg.done}/{agg.total}
        </PopCount>
      </PopHead>
      <HeadBar
        role="progressbar"
        aria-label={t('capsule.tasks', { done: agg.done, total: agg.total })}
        aria-valuemin={0}
        aria-valuemax={agg.total}
        aria-valuenow={agg.done}
      >
        <HeadBarFill $pct={agg.total > 0 ? (agg.done / agg.total) * 100 : 0} $allDone={agg.total > 0 && agg.done === agg.total} />
      </HeadBar>

      <TabRow role="tablist" aria-label={t('capsule.title')}>
        <Tab
          type="button"
          role="tab"
          id="capsule-tab-tasks"
          aria-selected={tab === 'tasks'}
          aria-controls="capsule-tabpanel-tasks"
          $active={tab === 'tasks'}
          onClick={() => setTab('tasks')}
        >
          {t('capsule.tabTasks')}
        </Tab>
        <Tab
          type="button"
          role="tab"
          id="capsule-tab-modules"
          aria-selected={tab === 'modules'}
          aria-controls="capsule-tabpanel-modules"
          $active={tab === 'modules'}
          onClick={() => setTab('modules')}
        >
          {t('capsule.tabModules')}
        </Tab>
      </TabRow>

      {tab === 'tasks' ? (
        <div id="capsule-tabpanel-tasks" role="tabpanel" aria-labelledby="capsule-tab-tasks">
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
        </div>
      ) : (
        <div id="capsule-tabpanel-modules" role="tabpanel" aria-labelledby="capsule-tab-modules">
          <EditorSection />
          <CenterSection aria-label={t('capsule.pluginsSection')}>
            <SectionLabel>
              {t('capsule.pluginsSection')}
              <SectionHint>CAPSULE</SectionHint>
            </SectionLabel>
            {modules.length === 0 ? (
              <PluginNote>{t('capsule.noPlugins')}</PluginNote>
            ) : (
              <ModuleGrid>
                {modules.map((mod) => (
                  <CapsuleModuleTile key={mod.key} mod={mod} onNavigate={props.onClose} />
                ))}
              </ModuleGrid>
            )}
            <PluginNote>{t('capsule.pluginNote')}</PluginNote>
          </CenterSection>
        </div>
      )}
    </Pop>
  )
}
