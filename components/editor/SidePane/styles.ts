import styled from 'styled-components'

/** 编辑器右缘上下文侧栏样式（20261015-feature-workbench-shell task-9） */

export const Pane = styled.aside`
  display: flex;
  flex-direction: column;
  width: 248px;
  flex: none;
  min-height: 0;
  background: var(--chrome-panel);
  border-left: 1px solid var(--chrome-border);

  &[hidden] {
    display: none;
  }
`

export const Tabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 8px 8px 0;
  flex: none;
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
