'use client'

/**
 * 插件视图槽位（拆分自 PluginFrameHost 单文件，20260926-refactor-mega-component-split）：
 * 挂载/卸载沙箱帧，握手失败呈错误文案；帧 key = <pluginId>#<view.id>。
 */
import { useEffect, useRef, useState } from 'react'
import type { PluginViewContribution } from '@shared/plugin'
import { pluginViewUrl } from '@shared/plugin'
import { ViewError, ViewSlot } from './styles'
import { closeFrame, FRAME_KEY, openFrame } from './frameProtocol'

/** 插件视图槽位：挂载/卸载沙箱帧 */
export function PluginView(props: {
  pluginId: string
  view: PluginViewContribution
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { pluginId, view } = props

  useEffect(() => {
    let alive = true
    setError(null)
    const el = hostRef.current
    if (!el) return
    void openFrame(pluginId, view.id, pluginViewUrl(pluginId, view.entry), el).catch((err: unknown) => {
      if (alive) setError(err instanceof Error ? err.message : String(err))
    })
    return () => {
      alive = false
      closeFrame(FRAME_KEY(pluginId, view.id))
    }
  }, [pluginId, view.id, view.entry])

  if (error) {
    return (
      <ViewSlot>
        <ViewError>插件视图加载失败：{error}</ViewError>
      </ViewSlot>
    )
  }
  return <ViewSlot ref={hostRef} />
}
