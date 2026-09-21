/**
 * 状态栏（壳层骨架）：左右分区仅承载插件 statusItems（manifest 声明 + 运行时更新）。
 * 编辑器相关分区（文件路径/光标/字数/未保存）已随内置编辑器移除（两栏布局变更）。
 */
import { useSyncExternalStore } from 'react'
import { AppIcon } from './ui/AppIcon'
import { pluginIcon } from './icons'
import { statusItemsStore, visibleStatusItems, type StatusItemState } from '../plugins/statusItems'

function PluginStatusItem(props: { item: StatusItemState }): React.JSX.Element {
  const { item } = props
  return (
    <span className="status-item plugin-item" title={item.title ?? undefined}>
      <AppIcon icon={pluginIcon(item.icon)} size="xs" decorative={false} label={item.title ?? item.text} />
      {item.text}
    </span>
  )
}

export function StatusBar(): React.JSX.Element {
  useSyncExternalStore(statusItemsStore.subscribe, statusItemsStore.get)
  const items = visibleStatusItems()

  return (
    <footer className="status-bar">
      <div className="status-zone">
        {items
          .filter((s) => s.alignment === 'left')
          .map((s) => (
            <PluginStatusItem key={s.key} item={s} />
          ))}
      </div>
      <div className="status-zone">
        {items
          .filter((s) => s.alignment === 'right')
          .map((s) => (
            <PluginStatusItem key={s.key} item={s} />
          ))}
      </div>
    </footer>
  )
}
