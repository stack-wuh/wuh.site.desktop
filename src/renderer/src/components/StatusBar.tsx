/**
 * 状态栏：左区宿主信息（当前文件 / git 分支 / 插件 left 项），右区光标·字数 / 插件 right 项 / 保存状态。
 * 插件状态项来自 manifest 声明 + 运行时更新（statusItems 注册表），渲染在同源 chrome token 上。
 */
import { useSyncExternalStore } from 'react'
import type { WorkspaceInfo } from '@shared/types'
import { AppIcon } from './ui/AppIcon'
import { IconGitBranch, pluginIcon } from './icons'
import { useWorkspaceStore } from '../store'
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

export function StatusBar(props: { workspace: WorkspaceInfo | null }): React.JSX.Element {
  const { activePath, dirty, cursor, wordCount } = useWorkspaceStore()
  useSyncExternalStore(statusItemsStore.subscribe, statusItemsStore.get)
  const items = visibleStatusItems()
  const ws = props.workspace

  return (
    <footer className="status-bar">
      <div className="status-zone">
        <span className="status-item doc-path" title={activePath ?? undefined}>
          {activePath ?? 'no file'}
        </span>
        {ws?.isGitRepo && ws.branch && (
          <span className="status-item git-branch" title="当前分支">
            <AppIcon icon={IconGitBranch} size="xs" />
            {ws.branch}
            {ws.ahead > 0 ? ` ↑${ws.ahead}` : ''}
            {ws.behind > 0 ? ` ↓${ws.behind}` : ''}
          </span>
        )}
        {items
          .filter((s) => s.alignment === 'left')
          .map((s) => (
            <PluginStatusItem key={s.key} item={s} />
          ))}
      </div>
      <div className="status-zone">
        {cursor && (
          <span className="status-item" title="光标位置">
            行 {cursor.line}，列 {cursor.col}
          </span>
        )}
        {wordCount != null && <span className="status-item">{wordCount} 字</span>}
        {items
          .filter((s) => s.alignment === 'right')
          .map((s) => (
            <PluginStatusItem key={s.key} item={s} />
          ))}
        {dirty && (
          <span className="status-item dirty" role="status">
            ● 未保存
          </span>
        )}
      </div>
    </footer>
  )
}
