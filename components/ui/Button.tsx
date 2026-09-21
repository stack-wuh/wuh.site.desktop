'use client'

import styled from 'styled-components'

/** 站点设计语言：语义 token + 圆角 + 焦点态（原 ui-btn 段的 styled 化） */

const Base = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
  background: var(--chrome-raised);
  color: var(--text-primary);
  cursor: pointer;
  font-family: var(--font-sans);
  transition:
    border-color var(--transition-fast) ease,
    background var(--transition-fast) ease,
    color var(--transition-fast) ease;

  &:hover:not(:disabled) {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

const Md = styled(Base)`
  padding: 5px 14px;
  font-size: 13px;
`

const Sm = styled(Md)`
  padding: 2px 9px;
  font-size: 12px;
  border-radius: var(--border-radius-sm);
`

const Primary = styled(Sm)<{ $sm: boolean }>`
  padding: ${(props) => (props.$sm ? undefined : '5px 14px')};
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;

  &:hover:not(:disabled) {
    background: color-mix(in oklab, var(--primary-color) 88%, #fff);
    color: #fff;
  }
`

const Danger = styled(Sm)<{ $sm: boolean }>`
  padding: ${(props) => (props.$sm ? undefined : '5px 14px')};
  background: transparent;
  border-color: var(--danger-color);
  color: var(--danger-color);

  &:hover:not(:disabled) {
    background: var(--danger-color);
    color: #fff;
  }
`

const Ghost = styled(Sm)<{ $sm: boolean }>`
  padding: ${(props) => (props.$sm ? undefined : '5px 14px')};
  background: transparent;
  border-color: transparent;
  color: var(--text-muted);

  &:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  &.active {
    color: var(--primary-color);
  }
`

type Variant = 'default' | 'primary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button(props: Props): React.JSX.Element {
  const { variant = 'default', size = 'md', ...rest } = props
  if (variant === 'primary') return <Primary $sm={size === 'sm'} {...rest} />
  if (variant === 'danger') return <Danger $sm={size === 'sm'} {...rest} />
  if (variant === 'ghost') return <Ghost $sm={size === 'sm'} {...rest} />
  return size === 'sm' ? <Sm {...rest} /> : <Md {...rest} />
}
