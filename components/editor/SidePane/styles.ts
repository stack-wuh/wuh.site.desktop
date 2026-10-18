import styled from 'styled-components'

/**
 * 书耳浮笺样式（20261017-feature-app-layout-workbench D3，原贴边侧栏 20261015）：
 * absolute slip-card 浮在案面右缘——radius 14 双投影 + 折角，自右缘平移滑出
 * 220ms ease-out-soft，reduced-motion 瞬切；保挂载（显隐 opacity/visibility）。
 * 页签内容样式不变。
 */

export const Pane = styled.aside<{ $open: boolean }>`
  position: absolute;
  right: 16px;
  top: 12px;
  bottom: 16px;
  width: 248px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--background-color);
  border: 1px solid color-mix(in oklab, var(--chrome-border) 60%, transparent);
  border-radius: 14px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 12px 32px rgba(0, 0, 0, 0.14);
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translateX(14px);
  transition:
    opacity 220ms var(--motion-ease-out-soft),
    transform 220ms var(--motion-ease-out-soft),
    visibility 0s linear 220ms;

  ${({ $open }) =>
    $open
      ? `
    opacity: 1;
    visibility: visible;
    transform: none;
    transition:
      opacity 220ms var(--motion-ease-out-soft),
      transform 220ms var(--motion-ease-out-soft);
  `
      : ''}

  /* 折角：浮笺左上小三角（右缘浮笺的镜像折角） */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 18px;
    height: 18px;
    z-index: 2;
    background: linear-gradient(
      135deg,
      color-mix(in oklab, var(--background-color) 96%, #000) 0 50%,
      color-mix(in oklab, var(--chrome-border) 70%, var(--background-color)) 50% 100%
    );
    border-right: 1px solid var(--chrome-border);
    border-bottom: 1px solid var(--chrome-border);
    border-radius: 0 0 5px 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const Tabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 10px 10px 0;
  flex: none;
  border-bottom: 1px solid var(--chrome-border);
`

export const TabBtn = styled.button<{ $active?: boolean }>`
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0;
  padding: 5px 0 7px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;

  &:hover {
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  ${({ $active }) =>
    $active
      ? `
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  `
      : ''}
`

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 14px;
`

export const OutlineItem = styled.button`
  display: flex;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export const OutlineTag = styled.span`
  flex: none;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  padding-top: 2px;
`

export const MetaRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 5px 2px;
  font-size: 12px;
  border-bottom: 1px solid var(--chrome-border);

  &:last-child {
    border-bottom: none;
  }
`

export const MetaKey = styled.span`
  flex: none;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
`

export const MetaValue = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
`

export const HintText = styled.p`
  margin: 4px 0 10px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-muted);
`

export const OpenBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  justify-content: center;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  padding: 6px 11px;
  cursor: pointer;
  transition:
    color 150ms ease-out,
    border-color 150ms ease-out;

  &:hover {
    color: var(--primary-color);
    border-color: var(--primary-color);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const EmptyText = styled.p`
  margin: 6px 2px;
  font-size: 11.5px;
  color: var(--text-muted);
`
