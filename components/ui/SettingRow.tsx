'use client'

/**
 * 行式设置行：左列标题 + 描述，右列控件（ui-patterns 行式布局基元）。
 * 传入 htmlFor 时标题渲染为 <label> 与控件关联；窄屏（≤768px）堆叠。
 */
import styled from 'styled-components'

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`

const Meta = styled.div`
  min-width: 0;
`

const Title = styled.div`
  font-size: 13px;
  color: var(--text-primary);
  line-height: var(--line-height-heading);
`

const Description = styled.p`
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted);
`

const Control = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`

interface Props {
  /** 控件 id：提供时标题渲染为 <label htmlFor>，建立表单关联 */
  htmlFor?: string
  label: string
  description?: React.ReactNode
  children: React.ReactNode
}

export function SettingRow(props: Props): React.JSX.Element {
  const { htmlFor, label, description, children } = props
  return (
    <Row>
      <Meta>
        <Title as={htmlFor ? 'label' : 'div'} {...(htmlFor ? { htmlFor } : {})}>
          {label}
        </Title>
        {description && <Description>{description}</Description>}
      </Meta>
      <Control>{children}</Control>
    </Row>
  )
}
