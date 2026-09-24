'use client'

/**
 * 反馈提示宿主（20260924-feature-ui-feedback-system · Phase 1）——总线（lib/feedback）
 * 的三个渲染落点，全部只读订阅 useFeedback()，无本地队列状态：
 * - ToastStack：右下角浮出、自动消退（时长由总线裁决），z=90（浮窗之上、模态之下）；
 *   aria-live 区域常驻（空态也挂），保证首条播报不被「区域刚创建」吞掉；
 * - MessageBannerStack：内容区顶部横幅（由壳层放进 MainArea 文档流、TitleBar 之下），
 *   常驻到手动关闭，可带 ≤3 操作按钮（点击 → dismissMessage(id, actionId)）；
 * - AlertHost：居中模态串行队列（仅展示 [0]），复用 ui/Dialog 视觉；
 *   「必须明确响应」——Esc/点遮罩不关闭，仅按钮收敛（resolveAlert）；
 *   按钮 label 缺省回退 common.ok。
 * 主题只写语义 token；图标经注册表（components/icons）；三语 aria 见 feedback.* keys。
 */
import { useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import type { DesktopApi } from '@shared/types'
import type { FeedbackKind } from '../../lib/feedback'
import { configureSystemNotify, dismissMessage, resolveAlert, useFeedback } from '../../lib/feedback'
import { Button } from './Button'
import { AppIcon, type IconComponent } from './AppIcon'
import { Dialog } from './Dialog'
import { IconCircleAlert, IconCircleCheck, IconClose, IconInfo, IconTriangleAlert } from '../icons'
import { useLocale } from '../../lib/i18n/context'

const KIND_ICON: Record<FeedbackKind, IconComponent> = {
  info: IconInfo,
  success: IconCircleCheck,
  warning: IconTriangleAlert,
  error: IconCircleAlert
}

/** 语义色 token 映射（明暗随主题自动跟随） */
const KIND_COLOR: Record<FeedbackKind, string> = {
  info: 'var(--primary-color)',
  success: 'var(--success-color)',
  warning: 'var(--warning-color)',
  error: 'var(--danger-color)'
}

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

/* ---------- Message 横幅栈（内容区顶部，文档流内） ---------- */

const BannerRegion = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 0;

  /* 空态零占位：不挤压页面内容 */
  &:empty {
    padding: 0;
  }
`

const Banner = styled.div<{ $kind: FeedbackKind }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-left: 3px solid ${(props) => KIND_COLOR[props.$kind]};
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-soft, none);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

const BannerIcon = styled.span<{ $kind: FeedbackKind }>`
  display: inline-flex;
  flex: none;
  margin-top: 2px;
  color: ${(props) => KIND_COLOR[props.$kind]};
`

const BannerBody = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.6;
`

const BannerTitle = styled.div`
  font-weight: 700;
  color: var(--text-primary);
`

const BannerText = styled.div`
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
`

const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
`

const CloseBtn = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-base, 4px);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }
`

/** 内容区顶部横幅（壳层放进右栏 MainArea，位于页面内容之上） */
export function MessageBannerStack(): React.JSX.Element {
  const { messages } = useFeedback()
  const { t } = useLocale()
  return (
    <BannerRegion role="status" aria-live="polite" aria-label={t('feedback.messageRegion')}>
      {messages.map((entry) => (
        <Banner key={entry.id} $kind={entry.kind}>
          <BannerIcon $kind={entry.kind}>
            <AppIcon icon={KIND_ICON[entry.kind]} size="xs" decorative />
          </BannerIcon>
          <BannerBody>
            {entry.title && <BannerTitle>{entry.title}</BannerTitle>}
            <BannerText>{entry.text}</BannerText>
          </BannerBody>
          <BannerActions>
            {entry.actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.variant ?? 'ghost'}
                onClick={() => dismissMessage(entry.id, action.id)}
              >
                {action.label ?? t('common.ok')}
              </Button>
            ))}
            <CloseBtn
              type="button"
              aria-label={t('feedback.close')}
              title={t('feedback.close')}
              onClick={() => dismissMessage(entry.id)}
            >
              <AppIcon icon={IconClose} size="xs" decorative />
            </CloseBtn>
          </BannerActions>        </Banner>
      ))}
    </BannerRegion>
  )
}

/* ---------- Alert 模态（串行队列，必须明确响应） ---------- */

const AlertBody = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
`

const AlertIcon = styled.span<{ $kind: FeedbackKind }>`
  display: inline-flex;
  flex: none;
  margin-top: 2px;
  color: ${(props) => KIND_COLOR[props.$kind]};
`

const AlertText = styled.div`
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
`

export function AlertHost(): React.JSX.Element {
  const { alerts } = useFeedback()
  const { t } = useLocale()
  const current = alerts[0] ?? null

  return (
    <Dialog
      key={current?.id ?? 'none'}
      open={current !== null}
      title={current?.title}
      // 必须明确响应：Esc 与遮罩点击不关闭，仅按钮收敛
      onClose={() => undefined}
      footer={
        current && (
          <>
            {current.buttons.map((button, index) => (
              <Button
                key={button.id}
                // 首个按钮自动聚焦（对话框 remount 即重聚焦）——键盘用户可直达响应
                autoFocus={index === 0}
                variant={button.variant ?? (index === current.buttons.length - 1 ? 'primary' : 'default')}
                onClick={() => resolveAlert(current.id, button.id)}
              >
                {button.label ?? t('common.ok')}
              </Button>
            ))}
          </>
        )
      }
    >
      {current && (
        <AlertBody>
          <AlertIcon $kind={current.kind}>
            <AppIcon icon={KIND_ICON[current.kind]} size="sm" decorative />
          </AlertIcon>
          <AlertText>{current.text}</AlertText>
        </AlertBody>
      )}
    </Dialog>
  )
}

/** 壳层根挂载（Toast + Alert；Message 横幅由壳层放右栏文档流） */
export function FeedbackHost(): React.JSX.Element {
  // 系统通知降级接线：Alert 入队即发 notifySystem（fire-and-forget），主进程按
  // 窗口焦点裁决是否真弹 OS 通知；preload 落后（缺方法）时静默降级为纯应用内
  useEffect(() => {
    configureSystemNotify((payload) => {
      const api = window.api as Partial<DesktopApi> | undefined
      if (!api || typeof api.notifySystem !== 'function') return
      void api.notifySystem(payload).catch(() => undefined)
    })
    return () => configureSystemNotify(null)
  }, [])

  return (
    <>
      <ToastStack />
      <AlertHost />
    </>
  )
}
