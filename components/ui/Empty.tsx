'use client'

import styled from 'styled-components'

const Box = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted);
`

const Icon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  color: var(--primary-color);
  opacity: 0.65;
`

const Title = styled.div`
  font-size: 13px;
`

const Hint = styled.div`
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.8;
`

interface Props {
  icon?: React.ReactNode
  title: string
  hint?: string
}

export function Empty(props: Props): React.JSX.Element {
  return (
    <Box className="ui-empty">
      {props.icon && <Icon>{props.icon}</Icon>}
      <Title>{props.title}</Title>
      {props.hint && <Hint>{props.hint}</Hint>}
    </Box>
  )
}
