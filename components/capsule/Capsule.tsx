'use client'

/**
 * 壳层胶囊（固定命名 Capsule，正名自 TaskCapsule）：壳层一等聚合入口，
 * v1 承载「任务 + 编辑器」复合内容——任务聚合来自 lib/tasks.ts 贡献点注册表，
 * 活动文档提供编辑器入口；点击弹出的 CapsulePanel 内含任务分组与编辑器分区
 * （分区即扩展点，后续更改统计/通知等以分区接入）。
 *
 * 挂点契约（20260922-feature-shell-capsule）：**常驻** MainArea 右上（空态显示
 * 「就绪」，不再整体隐藏——修复冷启动不可见）。宿主 Wrap 绝对定位于右上且
 * `pointer-events: none`（不遮挡页面点击），chip/面板本体 `auto`；宿主不设
 * z-index（不建层叠上下文）——chip 靠 DOM 顺序压页面内容、低于浮窗窗口
 * （FloatLayer z-index 2），面板 z-index 70 可浮于浮窗之上、低于 Dialog 100。
 *
 * 有任务显示聚合进度 done/total（存在 in_progress 时附加环形动效，reduced-motion
 * 降级为静态）。Esc 与面板外点击关闭——面板内点击不冒泡（点击型开合，非悬停型）。
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import styled, { keyframes } from 'styled-components'
import { taskAggregate, tasksStore } from '../../lib/tasks'
import { useWorkspaceStore } from '../../lib/store'
import { useLocale } from '../../lib/i18n/context'
import { CapsulePanel } from './CapsulePanel'

const Wrap = styled.span`
  /* MainArea 右上挂点：绝对定位 + pointer-events 穿透；不设 z-index（保持
     层叠上下文开放，让面板 z-index 70 直接参与 MainArea 层叠，见头注释） */
  position: absolute;
  top: 10px;
  right: 12px;
  display: inline-flex;
  pointer-events: none;
`

const CapsuleButton = styled.button`
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
  pointer-events: auto;
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

export function Capsule(): React.JSX.Element {
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const agg = taskAggregate()
  // 常驻胶囊：空态显示「就绪」；有任务显聚合进度，无任务有文档显编辑器入口
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

  return (
    <Wrap>
      <CapsuleButton
        type="button"
        data-testid="capsule"
        aria-label={t('capsule.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {agg.active > 0 && <Spinner aria-hidden="true" />}
        <span>
          {agg.total > 0
            ? t('capsule.tasks', { done: agg.done, total: agg.total })
            : hasDoc
              ? t('capsule.editorSection')
              : t('capsule.ready')}
        </span>
      </CapsuleButton>
      {open && <CapsulePanel onClose={() => setOpen(false)} />}
    </Wrap>
  )
}
