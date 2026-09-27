'use client'

/**
 * 单个浮窗（拆分自 FloatLayer 单文件，20260927-refactor-midsize-component-split）：
 * 窗口 chrome（头部拖拽、最小化/关闭钮、8 向缩放手柄）+ 插件视图插槽；
 * 拖拽上下文（DragContext）由宿主 FloatLayer 持有并注入。
 */
import {
  closeFloat,
  focusFloat,
  minimizeFloat,
  moveFloat,
  resizeFloat,
  type FloatState
} from '../../lib/floats'
import { PluginView } from '../plugins/PluginFrameHost'
import { AppIcon } from '../ui/AppIcon'
import { IconChevronDown, IconClose, pluginIcon } from '../icons'
import { nextGeometry, RESIZE_DIRS, viewportOf, type DragContext, type ResizeDir } from './geometry'
import { Actions, Header, ResizeHandle, WinBody, WinBtn, Window, WinTitle } from './styles'

export function FloatWindow(props: {
  float: FloatState
  focused: boolean
  containerRef: React.RefObject<HTMLElement | null>
  dragRef: React.MutableRefObject<DragContext | null>
}): React.JSX.Element {
  const { float, focused, containerRef, dragRef } = props
  const geometry = float.geometry

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if ((e.target as HTMLElement).closest('button')) return
    focusFloat(float.key)
    dragRef.current = {
      key: float.key,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: geometry
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const ctx = dragRef.current
    if (!ctx || ctx.dir !== undefined || ctx.pointerId !== e.pointerId) return
    moveFloat(
      ctx.key,
      ctx.origin.x + (e.clientX - ctx.startX),
      ctx.origin.y + (e.clientY - ctx.startY),
      viewportOf(containerRef.current)
    )
  }

  const onHandlePointerDown = (dir: ResizeDir): ((e: React.PointerEvent<HTMLDivElement>) => void) =>
    (e) => {
      e.stopPropagation()
      focusFloat(float.key)
      dragRef.current = {
        key: float.key,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origin: geometry,
        dir
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    }

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const ctx = dragRef.current
    if (!ctx || !ctx.dir || ctx.pointerId !== e.pointerId) return
    resizeFloat(
      ctx.key,
      nextGeometry(ctx.dir, ctx.origin, e.clientX - ctx.startX, e.clientY - ctx.startY),
      viewportOf(containerRef.current)
    )
  }

  const onPointerUp = (e: React.PointerEvent<HTMLElement>): void => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null
  }

  return (
    <Window
      $minimized={float.minimized}
      $focused={focused}
      style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height, zIndex: float.z + 1 }}
      role="dialog"
      aria-label={float.title}
      onPointerDown={() => focusFloat(float.key)}
    >
      <Header
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        <AppIcon icon={pluginIcon(float.icon)} size="sm" />
        <WinTitle>{float.title}</WinTitle>
        <Actions>
          <WinBtn
            type="button"
            title="最小化"
            aria-label={`最小化 ${float.title}`}
            onClick={() => minimizeFloat(float.key)}
          >
            <AppIcon icon={IconChevronDown} size="sm" />
          </WinBtn>
          <WinBtn
            type="button"
            title="关闭"
            aria-label={`关闭 ${float.title}`}
            onClick={() => closeFloat(float.key)}
          >
            <AppIcon icon={IconClose} size="sm" />
          </WinBtn>
        </Actions>
      </Header>
      <WinBody>
        <PluginView
          pluginId={float.pluginId}
          view={{
            id: float.viewId,
            area: 'float',
            title: float.title,
            icon: float.icon,
            entry: float.entry,
            order: 10
          }}
        />
      </WinBody>
      {RESIZE_DIRS.map((dir) => (
        <ResizeHandle
          key={dir}
          $dir={dir}
          onPointerDown={onHandlePointerDown(dir)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onPointerUp}
          onLostPointerCapture={onPointerUp}
        />
      ))}
    </Window>
  )
}
