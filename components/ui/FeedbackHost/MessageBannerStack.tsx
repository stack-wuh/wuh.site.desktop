'use client'

/**
 * Message 横幅栈（拆分自 FeedbackHost 单文件，20260927-refactor-midsize-component-split）：
 * 内容区顶部横幅（由壳层放进 MainArea 文档流、TitleBar 之下），常驻到手动关闭，
 * 可带 ≤3 操作按钮（点击 → dismissMessage(id, actionId)）。
 */
import styled from 'styled-components'
import type { FeedbackKind } from '../../../lib/feedback'
import { dismissMessage, useFeedback } from '../../../lib/feedback'
import { Button } from '../Button'
import { AppIcon } from '../AppIcon'
import { IconClose } from '../../icons'
import { useLocale } from '../../../lib/i18n/context'
import { KIND_COLOR, KIND_ICON } from './styles'

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
