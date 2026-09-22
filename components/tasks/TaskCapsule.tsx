'use client'

/**
 * 任务胶囊（壳层 StatusBar 左区）：跨插件聚合任务贡献点（manifest tasks 声明 +
 * SDK tasks.upsert/remove 上报，注册表 lib/tasks.ts）。20260922 胶囊化演进：
 * 兼任「任务 + 编辑器」复合入口——有活动文档（草稿或已打开文件）即显示，
 * 点击弹出的 TaskPopover 内含编辑器分区（全局补充入口）。
 * 文档操作命令宿主（EditorCommandHost）自 20260922-fix-editor-panel-controls
 * 起常驻壳层 layout（单实例），面板操作行与胶囊在任意状态下均可用。
 *
 * 无可见任务且无活动文档时不渲染；有任务时显示聚合进度 done/total（存在
 * in_progress 时附加环形动效，reduced-motion 降级为静态）。Esc 与面板外
 * 点击关闭——面板内点击不冒泡（点击型开合，非悬停型）。
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import styled, { keyframes } from 'styled-components'
import { taskAggregate, tasksStore } from '../../lib/tasks'
import { useWorkspaceStore } from '../../lib/store'
import { useLocale } from '../../lib/i18n/context'
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
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const agg = taskAggregate()
  // 胶囊化：任务与活动文档任一存在即显示（编辑器功能入口常可达）
  const hasDoc = doc.activePath != null || doc.content != null

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

  if (agg.total === 0 && !hasDoc) return null

  return (
    <Wrap>
      <Capsule
        type="button"
        data-testid="task-capsule"
        aria-label={t('capsule.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {agg.active > 0 && <Spinner aria-hidden="true" />}
        <span>
          {agg.total > 0
            ? t('capsule.tasks', { done: agg.done, total: agg.total })
            : t('capsule.editorSection')}
        </span>
      </Capsule>
      {open && <TaskPopover onClose={() => setOpen(false)} />}
    </Wrap>
  )
}
