import styled from 'styled-components'

/**
 * 呼墨样式（素笺手记 20261014 视觉稿无损移植）：
 * chrome-raised 浮层 + 墨晕高亮行 + 键位角标；颜色只写语义 token。
 */

export const Panel = styled.div`
  position: absolute;
  z-index: 30;
  width: 300px;
  padding: 6px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-lg, 16px);
  box-shadow: var(--elevation-card);
`

export const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px 8px;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--text-muted);
`

export const EscChip = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  border: 1px solid var(--chrome-border);
  border-radius: 4px;
  padding: 1px 5px;
`

export const Item = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--border-radius-base, 8px);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  &:hover,
  &[aria-selected='true'] {
    background: color-mix(in oklab, var(--primary-color) 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export const ItemIcon = styled.span`
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: var(--border-radius-sm, 4px);
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  background: color-mix(in oklab, var(--normal-300, var(--chrome-border)) 40%, transparent);
`

export const ItemText = styled.span`
  display: block;
  min-width: 0;
`

export const ItemLabel = styled.span`
  display: block;
  font-size: 13px;
  color: var(--text-primary);
`

export const ItemDesc = styled.span`
  display: block;
  font-size: 11px;
  margin-top: 1px;
  color: var(--text-muted);
`

export const Sep = styled.div`
  height: 1px;
  background: var(--chrome-border);
  margin: 5px 8px;
`

export const Empty = styled.div`
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-muted);
`
