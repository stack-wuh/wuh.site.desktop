'use client'

/**
 * 任务清单面板：贴 StatusBar 胶囊上方弹出（与用户快捷面板同族交互——
 * Esc 关、点外关由胶囊侧统一处理，面板内点击不冒泡）。
 * 按插件分组列任务：状态标记 + 标题 + 进度/detail；声明了 viewId 的任务
 * 可点击跳转来源插件 main 视图。任务状态由插件经 SDK 单向上报，壳层只读。
 */
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import styled, { keyframes } from 'styled-components'
import { AppIcon } from '../ui/AppIcon'
import { IconCheck } from '../icons'
import { taskAggregate, tasksStore, visibleTasks, type TaskState, type TaskStatus } from '../../lib/tasks'

const Pop = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 70;
  min-width: 264px;
  max-width: 360px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
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
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--chrome-border);

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

const PopGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;

  & + & {
    border-top: 1px solid var(--chrome-border);
  }
`

const PopLabel = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  padding: 2px 10px;
  letter-spacing: 1px;
`

const RowBase = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 10px;
  border-radius: var(--border-radius-sm);
  text-align: left;
`

const Row = styled(RowBase)`
  color: var(--text-primary);
`

const RowButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 10px;
  background: transparent;
  border: none;
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: background-color 200ms ease-out;

  &:hover {
    background: var(--chrome-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const RowBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
`

const RowTitle = styled.span`
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowDetail = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowHint = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--primary-color);
  flex-shrink: 0;
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

/* pending 空心点 / in_progress 环形动效 / done 对勾（reduced-motion 一律静态） */
const StatusMark = styled.span<{ $status: TaskStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;

  ${({ $status }) => ($status === 'done' ? 'color: var(--success-color);' : '')}

  ${({ $status }) =>
    $status === 'pending'
      ? `
    &::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1.5px solid var(--text-muted);
      box-sizing: border-box;
    }
  `
      : ''
  }

  ${({ $status }) =>
    $status === 'in_progress'
      ? `
    &::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1.5px solid var(--chrome-border);
      border-top-color: var(--primary-color);
      box-sizing: border-box;
      animation: ${spin} 800ms linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      &::before {
        animation: none;
        border-color: var(--primary-color);
        opacity: 0.55;
      }
    }
  `
      : ''
  }
`

function TaskRow(props: { task: TaskState; onNavigate: () => void }): React.JSX.Element {
  const { task, onNavigate } = props
  const router = useRouter()
  const inner = (
    <>
      <StatusMark $status={task.status} aria-hidden="true">
        {task.status === 'done' && <AppIcon icon={IconCheck} size="xs" />}
      </StatusMark>
      <RowBody>
        <RowTitle>{task.title}</RowTitle>
        {task.detail && <RowDetail>{task.detail}</RowDetail>}
        {task.progress && (
          <RowDetail>
            {task.progress.current}/{task.progress.total}
          </RowDetail>
        )}
      </RowBody>
      {task.viewId && <RowHint>查看 ›</RowHint>}
    </>
  )
  if (task.viewId) {
    return (
      <RowButton
        type="button"
        data-testid="task-row-link"
        onClick={() => {
          router.push(`/plugin/${task.pluginId}/${task.viewId}`)
          onNavigate()
        }}
      >
        {inner}
      </RowButton>
    )
  }
  return <Row>{inner}</Row>
}

export function TaskPopover(props: { onClose: () => void }): React.JSX.Element {
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  const tasks = visibleTasks()
  const agg = taskAggregate()

  const groups: { pluginId: string; tasks: TaskState[] }[] = []
  for (const t of tasks) {
    const last = groups[groups.length - 1]
    if (last && last.pluginId === t.pluginId) last.tasks.push(t)
    else groups.push({ pluginId: t.pluginId, tasks: [t] })
  }

  return (
    <Pop role="dialog" aria-label="任务列表" data-testid="task-popover" onClick={(e) => e.stopPropagation()}>
      <PopHead>
        <strong>任务</strong>
        <PopCount>
          {agg.done}/{agg.total}
        </PopCount>
      </PopHead>
      {groups.map((g) => (
        <PopGroup key={g.pluginId} role="group" aria-label={g.pluginId}>
          <PopLabel>{g.pluginId}</PopLabel>
          {g.tasks.map((t) => (
            <TaskRow key={t.key} task={t} onNavigate={props.onClose} />
          ))}
        </PopGroup>
      ))}
      {agg.total === 0 && (
        <PopGroup role="group" aria-label="空">
          <PopLabel>暂无进行中的任务</PopLabel>
        </PopGroup>
      )}
    </Pop>
  )
}
