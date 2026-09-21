'use client'

import styled from 'styled-components'

const TagBox = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  border-radius: var(--border-radius-lg);
  padding: 1px 10px;
  font-size: 12px;
  line-height: 18px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
`

const Remove = styled.button`
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.7;
  padding: 0 2px;
  font-size: 13px;
  cursor: pointer;
  line-height: 1;

  &:hover {
    opacity: 1;
  }
`

interface Props {
  color?: string
  onRemove?: () => void
  children: React.ReactNode
  className?: string
}

/** 彩色标签：color 为 hex（GitHub labels 风格），缺省用主题色 */
export function Tag(props: Props): React.JSX.Element {
  const { color, onRemove, children, className } = props
  return (
    <TagBox className={className} style={color ? { backgroundColor: color } : undefined}>
      {children}
      {onRemove && (
        <Remove type="button" aria-label="删除" onClick={onRemove}>
          ×
        </Remove>
      )}
    </TagBox>
  )
}
