'use client'

/**
 * 设置分区卡：锚点 id + 标题/描述头部 + 可选头部动作区。
 * id 供 SettingsNav 滚动定位（scroll-margin-top 预留粘性偏移）。
 */
import styled from 'styled-components'

const Card = styled.section`
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  padding: 16px;
  scroll-margin-top: 16px;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
`

const TitleGroup = styled.div`
  min-width: 0;
`

const Title = styled.h3`
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
`

const Description = styled.p`
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted);
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

interface Props {
  /** 锚点 id（SettingsNav 定位用，须与导航项 id 一致） */
  id: string
  title: string
  description?: string
  /** 头部右侧动作区（如「重载插件」） */
  actions?: React.ReactNode
  children: React.ReactNode
}

export function SettingSection(props: Props): React.JSX.Element {
  const { id, title, description, actions, children } = props
  return (
    <Card id={id}>
      <Head>
        <TitleGroup>
          <Title>{title}</Title>
          {description && <Description>{description}</Description>}
        </TitleGroup>
        {actions && <Actions>{actions}</Actions>}
      </Head>
      {children}
    </Card>
  )
}
