'use client'

/**
 * 插件 tab 行（拆分自 CapsulePanel 单文件，20260926-refactor-mega-component-split）：
 * tone 色点/白名单图标 + mono 文本 + detail；含 viewId 整行可点跳来源插件视图。
 */
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { AppIcon } from '../../ui/AppIcon'
import { pluginIcon } from '../../icons'
import type { PluginIconName } from '@shared/plugin'
import type { CapsuleTabRow } from '../../../lib/capsule'
import { ToneDot } from './styles'

const PluginTabRow = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  width: calc(100% - 8px);
  margin: 0 4px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease-out;

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const PluginTabRowStatic = styled(PluginTabRow)`
  cursor: default;

  &:hover {
    background: transparent;
  }
`

const TabRowText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 11.5px;
`

const TabRowDetail = styled.span`
  flex: none;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 10.5px;
`

/** 插件 tab 行：tone 色点/白名单图标 + mono 文本 + detail；含 viewId 整行可点跳来源视图 */
export function PluginTabRowItem(props: { row: CapsuleTabRow; pluginId: string; onNavigate: () => void }): React.JSX.Element {
  const { row, pluginId } = props
  const router = useRouter()
  const RowBase = row.viewId ? PluginTabRow : PluginTabRowStatic
  const inner = (
    <>
      {row.tone && row.tone !== 'default' && <ToneDot $tone={row.tone} />}
      {row.icon && (
        <span style={{ display: 'inline-flex', color: 'var(--primary-color)', flex: 'none' }}>
          <AppIcon icon={pluginIcon(row.icon as PluginIconName)} size="xs" decorative />
        </span>
      )}
      <TabRowText>{row.text}</TabRowText>
      {row.detail && <TabRowDetail>{row.detail}</TabRowDetail>}
    </>
  )
  if (row.viewId) {
    return (
      <RowBase
        type="button"
        onClick={() => {
          router.push(`/plugin/${pluginId}/${row.viewId}`)
          props.onNavigate()
        }}
      >
        {inner}
      </RowBase>
    )
  }
  return <RowBase>{inner}</RowBase>
}
