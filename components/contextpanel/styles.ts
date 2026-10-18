import styled from 'styled-components'

/**
 * 目次浮笺样式（20261017-feature-app-layout-workbench D3，原贴边栏 20261015）：
 * absolute slip-card 浮在案面左缘——radius 14 双投影 + 折角，滑出 220ms
 * ease-out-soft（自书脊侧平移 + 淡入），reduced-motion 瞬切。保挂载（显隐走
 * opacity/visibility，树缓存与展开态不丢）；data-chrome 保留（专注退场锚点）。
 */

export const Panel = styled.aside<{ $open: boolean }>`
  position: absolute;
  /* 锚点 = Body（含 48px 书脊）：64px = 书脊 48 + 案面呼吸 16——浮笺浮在案面上、
     不遮书脊（视觉稿里 slip-card 是 paper-wrap 的子级，20261017 走查修复） */
  left: 64px;
  top: 12px;
  bottom: 16px;
  width: 224px;
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
  transform: translateX(-14px);
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

  /* 折角：浮笺右上小三角（视觉稿 .slip-card::before） */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 18px;
    height: 18px;
    z-index: 2;
    background: linear-gradient(
      225deg,
      color-mix(in oklab, var(--background-color) 96%, #000) 0 50%,
      color-mix(in oklab, var(--chrome-border) 70%, var(--background-color)) 50% 100%
    );
    border-left: 1px solid var(--chrome-border);
    border-bottom: 1px solid var(--chrome-border);
    border-radius: 0 0 0 5px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 12px 8px 14px;
  flex: none;
  border-bottom: 1px solid color-mix(in oklab, var(--chrome-border) 45%, transparent);
`

export const ProjectName = styled.span`
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CurrentBadge = styled.span`
  flex: none;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 9.5px;
  font-weight: 600;
  line-height: 15px;
`

export const CollapseBtn = styled.button`
  margin-left: auto;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-muted);
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

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`
