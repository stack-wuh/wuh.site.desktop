import styled from 'styled-components'

/**
 * 笔帘样式（素笺手记 20261014 视觉稿无损移植）：
 * chrome-raised 药丸 + 墨针指向选区；ghost 态按钮 hover 泛朱。
 */

export const Bar = styled.div`
  position: absolute;
  z-index: 29;
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 5px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-lg, 16px);
  box-shadow: var(--elevation-card);
  transform: translateX(-50%);

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    width: 9px;
    height: 9px;
    transform: translateX(-50%) rotate(45deg);
    background: var(--chrome-raised);
    border-right: 1px solid var(--chrome-border);
    border-bottom: 1px solid var(--chrome-border);
  }
`

export const BarButton = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--border-radius-sm, 4px);
  background: transparent;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  &:hover:not(:disabled) {
    background: var(--chrome-hover);
    color: var(--primary-color);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export const Sep = styled.span`
  width: 1px;
  height: 16px;
  background: var(--chrome-border);
  margin: 0 3px;
`
