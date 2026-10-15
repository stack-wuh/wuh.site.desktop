'use client'

/**
 * 分段单选控件（20261015-feature-workbench-shell 收敛 ImageHostSection 的
 * ModeGroup/ModeButton 先例为通用件）：受控 radiogroup——外观/主题/语言/上传模式
 * 等枚举型设置行共用。键盘可达（按钮原生 Tab）、焦点规范与壳层一致。
 */
import styled from 'styled-components'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

const Group = styled.div`
  display: inline-flex;
  gap: 0;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
`

const Btn = styled.button<{ $active: boolean }>`
  font: inherit;
  font-size: 12px;
  padding: 5px 12px;
  border: none;
  cursor: pointer;
  background: ${(props) =>
    props.$active ? 'color-mix(in oklab, var(--primary-color) 14%, transparent)' : 'transparent'};
  color: ${(props) => (props.$active ? 'var(--primary-color)' : 'var(--text-secondary)')};

  & + & {
    border-left: 1px solid var(--chrome-border);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export function SegmentedControl<T extends string>(props: {
  ariaLabel: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <Group role="radiogroup" aria-label={props.ariaLabel}>
      {props.options.map((opt) => {
        const active = props.value === opt.value
        return (
          <Btn
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            $active={active}
            onClick={() => props.onChange(opt.value)}
          >
            {opt.label}
          </Btn>
        )
      })}
    </Group>
  )
}
