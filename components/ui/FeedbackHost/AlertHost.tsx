'use client'

/**
 * Alert 模态宿主（拆分自 FeedbackHost 单文件，20260927-refactor-midsize-component-split）：
 * 居中模态串行队列（仅展示 [0]），复用 ui/Dialog 视觉；「必须明确响应」——
 * Esc/点遮罩不关闭，仅按钮收敛（resolveAlert）；按钮 label 缺省回退 common.ok。
 */
import styled from 'styled-components'
import type { FeedbackKind } from '../../../lib/feedback'
import { resolveAlert, useFeedback } from '../../../lib/feedback'
import { Button } from '../Button'
import { AppIcon } from '../AppIcon'
import { Dialog } from '../Dialog'
import { useLocale } from '../../../lib/i18n/context'
import { KIND_COLOR, KIND_ICON } from './styles'

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
