import styled, { keyframes } from 'styled-components'

/**
 * 书口刻度样式（素笺手记 20261014 视觉稿无损移植）：
 * 脊柱发丝 + 骑线墨点，当前章朱竖线，距离渐隐（62%/34% 墨）；
 * 悬停浮章名，底端字数/读时悬停显影；点击跳章 bloom 一圈朱晕。
 */

const bloom = keyframes`
  from { box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary-color) 45%, transparent); }
  to { box-shadow: 0 0 0 12px transparent; }
`

export const Wrap = styled.nav`
  position: absolute;
  right: 16px;
  top: 14vh;
  height: 68vh;
  z-index: 9;

  @media (prefers-reduced-motion: reduce) {
    & *, & *::before, & *::after {
      transition: none !important;
      animation: none !important;
    }
  }
`

export const Rail = styled.div`
  position: relative;
  height: 100%;
  width: 1px;
  margin-left: auto;
  background: var(--chrome-border);
`

export const Tick = styled.button<{ $top: number }>`
  position: absolute;
  right: -2px;
  top: ${(props) => props.$top}%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 2px 0;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
`

export const TickLabel = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  opacity: 0;
  transform: translateX(4px);
  transition:
    opacity var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  ${Tick}:hover &, ${Tick}:focus-visible & {
    opacity: 1;
    transform: none;
  }
`

export const TickPoint = styled.span<{ $dist: 0 | 1 | 2; $minor: boolean; $bloom: boolean }>`
  flex: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-primary);
  opacity: ${(props) => (props.$dist === 0 ? 1 : props.$dist === 1 ? 0.62 : 0.34)};
  transition:
    background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    opacity var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  ${(props) =>
    props.$dist === 0
      ? `height: 18px;
    width: 5px;
    border-radius: 3px;
    background: var(--primary-color);
    opacity: 1;`
      : ''}
  ${(props) => (props.$minor && props.$dist !== 0 ? 'width: 3px; height: 3px;' : '')}
  ${Tick}:hover & {
    opacity: 1;
    background: var(--primary-color);
  }
  ${(props) =>
    props.$bloom
      ? `animation: ${bloom} var(--motion-dur-write, 400ms) var(--motion-ease-out-soft, ease-out);`
      : ''}
`

export const Meta = styled.div`
  position: absolute;
  top: calc(100% + 12px);
  right: -4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  ${Wrap}:hover & {
    opacity: 1;
  }
`
