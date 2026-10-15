import styled from 'styled-components'

/** 上下文面板样式（20261015-feature-workbench-shell task-3） */

export const Panel = styled.aside`
  display: flex;
  flex-direction: column;
  width: 224px;
  flex: none;
  min-height: 0;
  background: var(--chrome-panel);
  border-right: 1px solid var(--chrome-border);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  /* ⌘B 隐藏走 hidden 属性（保挂载保留树缓存），显式 display 需自兜底 */
  &[hidden] {
    display: none;
  }
`

export const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 6px 8px 14px;
  flex: none;
`

export const ProjectName = styled.span`
  font-size: 12.5px;
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
