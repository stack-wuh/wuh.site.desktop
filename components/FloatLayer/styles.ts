'use client'

/**
 * 浮窗样式原子（拆分自 FloatLayer 单文件，20260927-refactor-midsize-component-split）：
 * 层容器、窗口 chrome（头部/标题/动作钮/内容体）、8 向缩放手柄、最小化 chip 条。
 * 动效均为入场/过渡型：reduced-motion 下静态降级。
 */
import styled, { keyframes } from 'styled-components'
import type { ResizeDir } from './geometry'

export const Layer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;

  & > * {
    pointer-events: auto;
  }
`

const floatIn = keyframes`
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
`

export const Window = styled.section<{ $minimized: boolean; $focused: boolean }>`
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 280px;
  overflow: hidden;
  background: var(--background-color);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
  box-shadow: var(--elevation-card);
  animation: ${floatIn} var(--transition-fast) ease-out;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  ${(props) =>
    props.$focused &&
    `
    border-color: color-mix(in oklab, var(--primary-color) 35%, var(--chrome-border));
  `}

  /* 最小化：整窗隐藏（帧保持挂载），入口收敛为角落 chip */
  ${(props) =>
    props.$minimized &&
    `
    display: none;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 6px 0 12px;
  flex-shrink: 0;
  color: var(--text-secondary);
  background: var(--chrome-panel);
  border-bottom: 1px solid var(--chrome-border);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`

export const WinTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
`

export const Actions = styled.span`
  display: flex;
  align-items: center;
`

export const WinBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--transition-fast) ease,
    background var(--transition-fast) ease;

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const WinBody = styled.div`
  flex: 1;
  min-height: 0;
  background: var(--chrome-panel);
`

export const ResizeHandle = styled.div<{ $dir: ResizeDir }>`
  position: absolute;
  z-index: 2;
  touch-action: none;

  ${(props) => {
    switch (props.$dir) {
      case 'n':
        return 'top: -3px; left: 8px; right: 8px; height: 7px; cursor: ns-resize;'
      case 's':
        return 'bottom: -3px; left: 8px; right: 8px; height: 7px; cursor: ns-resize;'
      case 'e':
        return 'right: -3px; top: 8px; bottom: 8px; width: 7px; cursor: ew-resize;'
      case 'w':
        return 'left: -3px; top: 8px; bottom: 8px; width: 7px; cursor: ew-resize;'
      case 'ne':
        return 'top: -3px; right: -3px; width: 14px; height: 14px; cursor: nesw-resize;'
      case 'nw':
        return 'top: -3px; left: -3px; width: 14px; height: 14px; cursor: nwse-resize;'
      case 'se':
        return 'bottom: -3px; right: -3px; width: 14px; height: 14px; cursor: nwse-resize;'
      case 'sw':
        return 'bottom: -3px; left: -3px; width: 14px; height: 14px; cursor: nesw-resize;'
    }
  }}
`

/* 最小化收敛为左下角 chip 条 */
export const Chips = styled.div`
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  gap: 6px;
  max-width: calc(100% - 24px);
  overflow-x: auto;
`

export const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--chrome-border);
  border-radius: 14px;
  background: var(--chrome-raised);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--elevation-soft);
  transition:
    color var(--transition-fast) ease,
    border-color var(--transition-fast) ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--primary-color);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
