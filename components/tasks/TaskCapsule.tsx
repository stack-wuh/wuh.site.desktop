'use client'

/**
 * 任务胶囊（壳层 StatusBar 左区）：跨插件聚合任务贡献点（manifest tasks 声明 +
 * SDK tasks.upsert/remove 上报，注册表 lib/tasks.ts）。
 *
 * 无可见任务不渲染；有任务时显示聚合进度 done/total（存在 in_progress 时
 * 附加环形动效，reduced-motion 降级为静态）。点击切换任务清单面板
 * （TaskPopover）；Esc 与面板外点击关闭——面板内点击不冒泡，面板关闭延迟无需
 * （点击型开合，非悬停型）。
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import styled, { keyframes } from 'styled-components'
import { taskAggregate, tasksStore } from '../../lib/tasks'
import { TaskPopover } from './TaskPopover'

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
`

const Capsule = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 18px;
  padding: 0 8px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: 9px;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;

  &:hover {
    background: var(--chrome-hover);
    border-color: var(--primary-color);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

const Spinner = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid var(--chrome-border);
  border-top-color: var(--primary-color);
  box-sizing: border-box;
  animation: ${spin} 800ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-color: var(--primary-color);
    opacity: 0.55;
  }
`

export function TaskCapsule(): React.JSX.Element | null {
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  const [open, setOpen] = useState(false)
  const agg = taskAggregate()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (): void => setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
    }
  }, [open])

  if (agg.total === 0) return null

  return (
    <Wrap>
      <Capsule
        type="button"
        data-testid="task-capsule"
        aria-label={`任务进度：已完成 ${agg.done}，共 ${agg.total}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {agg.active > 0 && <Spinner aria-hidden="true" />}
        <span>
          任务 {agg.done}/{agg.total}
        </span>
      </Capsule>
      {open && <TaskPopover onClose={() => setOpen(false)} />}
    </Wrap>
  )
}
