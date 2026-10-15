import styled from 'styled-components'

/** 专注模式浮条样式（20261015-feature-workbench-shell task-8）：顶部居中胶囊条 */
export const BarBox = styled.div`
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 45;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: calc(100% - 32px);
  padding: 6px 8px 6px 16px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: 999px;
  box-shadow: var(--elevation-card);
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
`

export const DocTitle = styled.span`
  color: var(--text-primary);
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const SaveState = styled.span<{ $dirty: boolean }>`
  color: ${(props) => (props.$dirty ? 'var(--warning-color)' : 'var(--success-color)')};
`

export const WordCount = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
`

export const ExitBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--chrome-border);
  border-radius: 999px;
  padding: 3px 11px;
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
