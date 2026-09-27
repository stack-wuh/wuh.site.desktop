'use client'

/**
 * 插件 main 视图路由宿主（/plugin/<pluginId>/<viewId>）：
 * 从启用插件注册表解析视图并挂载沙箱帧；插件停用/视图消失时给 Empty 兜底
 * （静态导出下路由文件始终存在，运行时有效性由注册表裁决）。
 */
import { useSyncExternalStore } from 'react'
import { hostGeneration, listMainViews, PluginView, usePluginsReady } from './PluginFrameHost'
import { Empty } from '../ui/Empty'
import { useLocale } from '../../lib/i18n/context'

export function PluginMainView(props: { pluginId: string; viewId: string }): React.JSX.Element {
  const ready = usePluginsReady()
  const { t } = useLocale()
  useSyncExternalStore(hostGeneration.subscribe, hostGeneration.get, hostGeneration.get)

  const entry = ready
    ? listMainViews().find(
        ({ pluginId, view }) => pluginId === props.pluginId && view.id === props.viewId
      )
    : undefined

  if (!entry) {
    return <Empty title={t('pluginView.disabledTitle')} hint={t('pluginView.disabledHint')} />
  }
  return <PluginView pluginId={entry.pluginId} view={entry.view} />
}
