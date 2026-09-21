'use client'

/**
 * 状态栏（壳层骨架）：左右分区仅承载插件 statusItems（manifest 声明 + 运行时更新）。
 * 编辑器相关分区（文件路径/光标/字数/未保存）已随内置编辑器移除（两栏布局变更）。
 */
import { useSyncExternalStore } from 'react'
import styled from 'styled-components'
import { AppIcon } from './ui/AppIcon'
import { pluginIcon } from './icons'
import { statusItemsStore, visibleStatusItems, type StatusItemState } from '../lib/statusItems'

const Bar = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  background: var(--chrome-panel);
  border-top: 1px solid var(--chrome-border);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

const Zone = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const Item = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  color: var(--text-secondary);

  & > svg {
    color: var(--primary-color);
    opacity: 0.8;
  }
`

function PluginStatusItem(props: { item: StatusItemState }): React.JSX.Element {
  const { item } = props
  return (
    <Item title={item.title ?? undefined}>
      <AppIcon icon={pluginIcon(item.icon)} size="xs" decorative={false} label={item.title ?? item.text} />
      {item.text}
    </Item>
  )
}

export function StatusBar(): React.JSX.Element {
  useSyncExternalStore(statusItemsStore.subscribe, statusItemsStore.get, statusItemsStore.get)
  const items = visibleStatusItems()

  return (
    <Bar>
      <Zone>
        {items
          .filter((s) => s.alignment === 'left')
          .map((s) => (
            <PluginStatusItem key={s.key} item={s} />
          ))}
      </Zone>
      <Zone>
        {items
          .filter((s) => s.alignment === 'right')
          .map((s) => (
            <PluginStatusItem key={s.key} item={s} />
          ))}
      </Zone>
    </Bar>
  )
}
