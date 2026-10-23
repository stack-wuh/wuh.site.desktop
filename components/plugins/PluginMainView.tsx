'use client'

/**
 * 插件 main 视图路由宿主（/plugin/<pluginId>/<viewId>）：
 * 从启用插件注册表解析视图并挂载沙箱帧；插件停用/视图消失时给 Empty 兜底
 * （静态导出下路由文件始终存在，运行时有效性由注册表裁决）。
 * 20261017 走查修复：补标准页脚手架（PageTopbar 返回 + 视图标题）——书耳/图床
 * 等入口跳进插件 main 视图后，中央路由被替换且 /editor 为菜单外路由，此前无任何
 * 返回编辑页的路径（返回 = router.back()，冷启直达无历史时回落首页）。
 */
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import styled from 'styled-components'
import { hostGeneration, listMainViews, PluginView, usePluginsReady } from './PluginFrameHost'
import { Empty } from '../ui/Empty'
import { PageTopbar } from '../ui/PageTopbar'
import { useLocale } from '@/lib/i18n/context'

const Shell = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
`

const FrameArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

export function PluginMainView(props: { pluginId: string; viewId: string }): React.JSX.Element {
  const ready = usePluginsReady()
  const { t } = useLocale()
  const router = useRouter()
  useSyncExternalStore(hostGeneration.subscribe, hostGeneration.get, hostGeneration.get)

  const entry = ready
    ? listMainViews().find(
        ({ pluginId, view }) => pluginId === props.pluginId && view.id === props.viewId
      )
    : undefined

  const title = entry?.view.title ?? `${props.pluginId}/${props.viewId}`
  const back = (): void => {
    if (window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <Shell aria-label={title}>
      <PageTopbar title={title} backLabel={t('editor.back')} backAria={t('editor.back')} onBack={back} />
      <FrameArea>
        {entry ? (
          <PluginView pluginId={entry.pluginId} view={entry.view} />
        ) : (
          <Empty title={t('pluginView.disabledTitle')} hint={t('pluginView.disabledHint')} />
        )}
      </FrameArea>
    </Shell>
  )
}
