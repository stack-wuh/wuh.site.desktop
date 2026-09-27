'use client'

/**
 * Toast 栈（拆分自 FeedbackHost 单文件，20260927-refactor-midsize-component-split）：
 * 右下角浮出、自动消退（时长由总线裁决），z=90（浮窗之上、模态之下）；
 * aria-live 区域常驻（空态也挂），保证首条播报不被「区域刚创建」吞掉。
 */
import styled, { keyframes } from 'styled-components'
import type { FeedbackKind } from '../../../lib/feedback'
import { useFeedback } from '../../../lib/feedback'
import { AppIcon } from '../AppIcon'
import { useLocale } from '../../../lib/i18n/context'
import { KIND_COLOR, KIND_ICON } from './styles'

/* ---------- Toast 栈 ---------- */

/** 浮出微动效（reduced-motion 下不启用） */
const toastIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px);
  }
`

const ToastLayer = styled.div`
  position: fixed;
  right: 16px;
  /* 状态栏 26px 之上下留白 */
  bottom: 36px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;

  @media (prefers-reduced-motion: no-preference) {
    & > * {
      animation: ${toastIn} 160ms var(--motion-ease-out-soft, ease-out);
    }
  }
`

const ToastCard = styled.div<{ $kind: FeedbackKind }>`
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 360px;
  padding: 8px 12px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-left: 3px solid ${(props) => KIND_COLOR[props.$kind]};
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

const ToastIcon = styled.span<{ $kind: FeedbackKind }>`
  display: inline-flex;
  flex: none;
  margin-top: 1px;
  color: ${(props) => KIND_COLOR[props.$kind]};
`

export function ToastStack(): React.JSX.Element {
  const { toasts } = useFeedback()
  const { t } = useLocale()
  return (
    <ToastLayer role="status" aria-live="polite" aria-label={t('feedback.toastRegion')}>
      {toasts.map((entry) => (
        <ToastCard key={entry.id} $kind={entry.kind}>
          <ToastIcon $kind={entry.kind}>
            <AppIcon icon={KIND_ICON[entry.kind]} size="xs" decorative />
          </ToastIcon>
          <span>{entry.text}</span>
        </ToastCard>
      ))}
    </ToastLayer>
  )
}
