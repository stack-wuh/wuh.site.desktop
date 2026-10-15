import styled from 'styled-components'

/** 命令面板样式（20261015-feature-workbench-shell task-10）：z85 = Toast(90)/Dialog(100)
 * 之下、胶囊面板(70) 之上的独立带 */
export const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 85;
  background: color-mix(in oklab, var(--background-color) 55%, transparent);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 86px;
`

export const Box = styled.div`
  width: min(480px, calc(100% - 48px));
  max-height: 380px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: 13px;
  box-shadow: var(--elevation-card);
`

export const InputRow = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--chrome-border);

  input {
    flex: 1;
    font: inherit;
    font-size: 13.5px;
    color: var(--text-primary);
    background: none;
    border: none;
    outline: none;

    &::placeholder {
      color: var(--text-muted);
    }
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-muted);
    border: 1px solid var(--chrome-border);
    border-radius: 4px;
    padding: 0 5px;
  }
`

export const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 10px;
`

export const Group = styled.div`
  font-size: 10.5px;
  color: var(--text-muted);
  padding: 8px 10px 3px;
  letter-spacing: 0.05em;
`

export const Item = styled.button<{ $hot?: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 12.5px;
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;

  &:hover,
  &[data-hot='true'] {
    background: color-mix(in oklab, var(--primary-color) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export const ItemKbd = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-muted);
`

export const Empty = styled.div`
  padding: 18px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12.5px;
`
