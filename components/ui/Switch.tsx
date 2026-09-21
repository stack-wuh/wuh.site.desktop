'use client'

/**
 * 开关（role="switch"）：36×20 轨道 + 14 thumb，Space 触发（原生 button）。
 * 选中 primary / 未选中 chrome 灰阶；thumb transform 过渡（非布局位移），
 * prefers-reduced-motion 下瞬时切换。无可见文本，调用方必须传 aria-label。
 */
import styled from 'styled-components'

const Track = styled.button<{ $checked: boolean }>`
  position: relative;
  width: 36px;
  height: 20px;
  padding: 0;
  flex-shrink: 0;
  border: 1px solid var(--chrome-border);
  border-radius: 999px;
  background: var(--chrome-hover);
  cursor: pointer;
  transition:
    background-color 200ms ease-out,
    border-color 200ms ease-out;

  ${(props) =>
    props.$checked &&
    `
    background: var(--primary-color);
    border-color: var(--primary-color);
  `}

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary-color) 30%, transparent);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Thumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 50%;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--normal-100);
  box-shadow: 0 0 0 1px var(--chrome-border);
  transform: translateY(-50%);
  transition: transform 200ms ease-out;

  ${(props) => props.$checked && `transform: translate(16px, -50%);`}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  'aria-label': string
}

export function Switch(props: Props): React.JSX.Element {
  const { checked, onChange, disabled, 'aria-label': ariaLabel } = props
  return (
    <Track
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      $checked={checked}
      onClick={() => onChange(!checked)}
    >
      <Thumb $checked={checked} aria-hidden />
    </Track>
  )
}
