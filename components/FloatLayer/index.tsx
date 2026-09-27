'use client'

/**
 * 壳层浮窗层：main-area 内的通用 slot，渲染 floats 注册表中的全部开窗。
 *
 * 交互契约：头部拖拽、8 向边缘/角缩放、点按置顶、最小化为角落 chip
 * （帧保持挂载，窗口整体隐藏）、Esc 关闭聚焦浮窗（确认框打开时让位）；
 * 几何/开合状态由 floats 注册表持有，本组件卸载不影响还原。
 * 拆分形态（20260927-refactor-midsize-component-split）：几何纯函数见 ./geometry，
 * 单窗口件见 ./FloatWindow，样式原子见 ./styles；对外契约不变——
 * `components/FloatLayer` 具名导出 FloatLayer。
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { closeFloat, floatsStore, restoreFloat, topFloat } from '../../lib/floats'
import { AppIcon } from '../ui/AppIcon'
import { pluginIcon } from '../icons'
import type { DragContext } from './geometry'
import { FloatWindow } from './FloatWindow'
import { Chip, Chips, Layer } from './styles'

export function FloatLayer(props: { containerRef: React.RefObject<HTMLElement | null> }): React.JSX.Element {
  const snapshot = useSyncExternalStore(floatsStore.subscribe, floatsStore.get, floatsStore.get)
  const containerRef = props.containerRef
  const dragRef = useRef<DragContext | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      // 确认框打开时让位（styled 类名是哈希，用稳定 data 属性判定）
      if (document.querySelector('[data-dialog-overlay]')) return
      const top = topFloat()
      if (top) closeFloat(top.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 全量渲染（含最小化）：最小化窗口 display:none 保持插件帧挂载
  const topKey = topFloat()?.key
  const minimized = snapshot.floats.filter((f) => f.minimized)

  return (
    <Layer>
      {snapshot.floats.map((float) => (
        <FloatWindow key={float.key} float={float} focused={float.key === topKey} containerRef={containerRef} dragRef={dragRef} />
      ))}
      {minimized.length > 0 && (
        <Chips role="toolbar" aria-label="最小化浮窗">
          {minimized.map((float) => (
            <Chip
              key={float.key}
              type="button"
              title={`还原 ${float.title}`}
              onClick={() => restoreFloat(float.key)}
            >
              <AppIcon icon={pluginIcon(float.icon)} size="sm" />
              <span>{float.title}</span>
            </Chip>
          ))}
        </Chips>
      )}
    </Layer>
  )
}
