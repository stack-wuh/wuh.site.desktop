import styled from 'styled-components'

/**
 * Dock 样式（20261015-feature-workbench-shell task-6）：收起态细条（dockbar）↔
 * 展开态面板（dock 面板）互斥；z 带 25（浮窗 58 之下，主内容之上）。
 */

export const Bar = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 0 10px;
  background: var(--chrome-panel);
  border-top: 1px solid var(--chrome-border);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
  position: relative;
  z-index: 25;
`

export const Panel = styled.section`
  flex: none;
  height: 216px;
  display: flex;
  flex-direction: column;
  background: var(--chrome-panel);
  border-top: 1px solid var(--chrome-border);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
  position: relative;
  z-index: 25;
`

export const Head = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px 4px;
`

export const TabBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 4px 11px;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  ${({ $active }) =>
    $active
      ? `
    background: color-mix(in oklab, var(--primary-color) 12%, transparent);
    color: var(--primary-color);
  `
      : ''}
`

export const TabCount = styled.span`
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-muted);
`

export const HeadEnd = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

export const UndockBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  padding: 4px 11px;
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

export const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
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

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 16px 12px;
`

export const Hint = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
`

