'use client'

/**
 * 右栏页面共享顶栏（20260925-fix-page-header-sticky）：返回按钮 + 页面标题。
 * 由页面根 flex 列容器固定在滚动流之外（/editor TopBar 同范式）——页头不随
 * 内容滚动，长列表页保持常驻的页面上下文与返回入口；设置页左列 SettingsNav
 * 等 sticky 元素以页面内容滚动容器为基准继续生效。
 */
import styled from 'styled-components'
import { AppIcon } from './AppIcon'
import { Button } from './Button'
import { IconChevronLeft } from '../icons'

const Row = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 32px 14px;

  @media (max-width: 768px) {
    padding: 16px 16px 10px;
  }
`

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
`

export function PageTopbar(props: {
  title: string
  backLabel: string
  backAria: string
  onBack: () => void
}): React.JSX.Element {
  return (
    <Row>
      <Button variant="ghost" onClick={props.onBack} aria-label={props.backAria}>
        <AppIcon icon={IconChevronLeft} size="sm" />
        {props.backLabel}
      </Button>
      <Title>{props.title}</Title>
    </Row>
  )
}
