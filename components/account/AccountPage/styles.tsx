'use client'

/**
 * 用户中心样式原子（拆分自 AccountPage 单文件，20260926-refactor-mega-component-split）：
 * 页面骨架（Page/ScrollArea/Content/Sections）、授权区（Intro/Spinner/CodeBox/StaleBanner）、
 * 身份行（Avatar/IdentityMeta/ScopeTags/KindTag）、仓库列表、PAT 折叠区，以及跨区共用
 * 的微展示组件 SavedFlash（保存成功瞬时反馈）。
 */
import styled, { keyframes } from 'styled-components'
import { AppIcon } from '../../ui/AppIcon'
import { IconCheck } from '../../icons'
import { useLocale } from '../../../lib/i18n/context'

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

export const Page = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--background-color);
  outline: none;
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/* 内容滚动容器：页头（PageTopbar）在其之外固定，不随滚动 */
export const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 32px 48px;

  @media (max-width: 768px) {
    padding: 0 16px 40px;
  }
`

export const Content = styled.div`
  max-width: 760px;
  margin: 0 auto;
`

export const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`

export const Intro = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0 4px;
`

export const IntroMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid var(--chrome-border);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: ${spin} 800ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const CodeBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

/** 设备授权码：等宽大字 + 高对比底色，键盘可选中文本 */
export const Code = styled.code`
  font-family: var(--font-mono);
  font-size: 22px;
  letter-spacing: 3px;
  color: var(--text-primary);
  background: var(--chrome-hover);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  padding: 6px 14px;
  user-select: all;
`

export const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
  flex-wrap: wrap;
`

export const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--chrome-border);
  background: var(--chrome-hover);
  object-fit: cover;
`

export const IdentityMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  & > strong {
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }
`

export const ScopeTags = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

export const ScopeTag = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  background: var(--chrome-hover);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  padding: 1px 7px;
`

export const KindTag = styled(ScopeTag)`
  color: var(--primary-color);
`

export const StaleBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid color-mix(in oklab, var(--danger-color) 35%, transparent);
  background: color-mix(in oklab, var(--danger-color) 8%, transparent);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 13px;
`

export const RowError = styled.span`
  flex-basis: 100%;
  font-size: 12px;
  color: var(--danger-color);
`

export const RowStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--success-color);
`

export const RepoList = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow: auto;
`

export const RepoRow = styled.li<{ $default: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid ${(props) => (props.$default ? 'var(--primary-color)' : 'var(--chrome-border)')};
  border-radius: var(--border-radius-sm);
  background: ${(props) => (props.$default ? 'color-mix(in oklab, var(--primary-color) 7%, transparent)' : 'transparent')};
`

export const RepoName = styled.code`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const RepoDesc = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const PrivacyTag = styled(ScopeTag)`
  flex-shrink: 0;
`

/** PAT 回退折叠区：原生 details/summary 保键盘可达与无障碍语义 */
export const PatDetails = styled.details`
  margin-top: 12px;
  border-top: 1px dashed var(--chrome-border);
  padding-top: 10px;

  & > summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-muted);
    user-select: none;

    &:hover {
      color: var(--text-primary);
    }
  }
`

export const PatBody = styled.div`
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const SavedFlash = ({ show }: { show: boolean }): React.JSX.Element => {
  const { t } = useLocale()
  return (
    <RowStatus role="status" aria-live="polite">
      {show && (
        <>
          <AppIcon icon={IconCheck} size="xs" />
          {t('common.saved')}
        </>
      )}
    </RowStatus>
  )
}
