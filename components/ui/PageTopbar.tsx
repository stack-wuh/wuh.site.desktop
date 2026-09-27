'use client'

/**
 * 右栏页面共享顶栏（20260925-fix-page-header-sticky）：返回按钮（可选）+ 页面标题
 * + 右缘动作插槽（20260927-style-shell-visual-consistency）。由页面根 flex 列容器
 * 固定在滚动流之外（/editor TopBar 同范式）——页头不随内容滚动，长列表页保持常驻
 * 的页面上下文；设置页左列 SettingsNav 等 sticky 元素以页面内容滚动容器为基准继续生效。
 * 返回钮仅在有 onBack 时渲染（草稿箱/项目页等顶层视图无返回语义）；actions 承载
 * 计数徽标/动作按钮（项目页「打开目录」即此处）。
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

const Actions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

export function PageTopbar(props: {
  title: string
  backLabel?: string
  backAria?: string
  onBack?: () => void
  actions?: React.ReactNode
}): React.JSX.Element {
  return (
    <Row>
      {props.onBack && (
        <Button variant="ghost" onClick={props.onBack} aria-label={props.backAria}>
          <AppIcon icon={IconChevronLeft} size="sm" />
          {props.backLabel}
        </Button>
      )}
      <Title>{props.title}</Title>
      {props.actions != null && <Actions>{props.actions}</Actions>}
    </Row>
  )
}
