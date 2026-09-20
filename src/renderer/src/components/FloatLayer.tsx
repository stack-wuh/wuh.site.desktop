/**
 * 壳层浮窗层：work 视图内的通用 slot，渲染 floats 注册表中的全部开窗。
 *
 * 交互契约：头部拖拽、8 向边缘/角缩放、点按置顶、最小化为角落 chip
 * （帧保持挂载，窗口整体隐藏）、Esc 关闭聚焦浮窗（确认框打开时让位）；
 * 几何/开合状态由 floats 注册表持有，本组件卸载不影响还原。
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  clampGeometry,
  closeFloat,
  floatsStore,
  focusFloat,
  minimizeFloat,
  moveFloat,
  resizeFloat,
  restoreFloat,
  topFloat,
  type FloatGeometry,
  type FloatState
} from '../plugins/floats'
import { PluginView } from '../plugins/PluginFrameHost'
import { AppIcon } from './ui/AppIcon'
import { IconChevronDown, IconClose, pluginIcon } from './icons'

const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
type ResizeDir = (typeof RESIZE_DIRS)[number]

const MIN_WIDTH = 280
const MIN_HEIGHT = 180

interface DragContext {
  key: string
  pointerId: number
  startX: number
  startY: number
  origin: FloatGeometry
  dir?: ResizeDir
}

function viewportOf(el: HTMLElement | null): { width: number; height: number } {
  const rect = el?.getBoundingClientRect()
  return { width: rect?.width ?? window.innerWidth, height: rect?.height ?? window.innerHeight }
}

function nextGeometry(
  dir: ResizeDir,
  origin: FloatGeometry,
  dx: number,
  dy: number
): FloatGeometry {
  let { x, y, width, height } = origin
  if (dir.includes('e')) width = origin.width + dx
  if (dir.includes('s')) height = origin.height + dy
  if (dir.includes('w')) {
    width = origin.width - dx
    x = origin.x + dx
    if (width < MIN_WIDTH) {
      width = MIN_WIDTH
      x = origin.x + origin.width - MIN_WIDTH
    }
  }
  if (dir.includes('n')) {
    height = origin.height - dy
    y = origin.y + dy
    if (height < MIN_HEIGHT) {
      height = MIN_HEIGHT
      y = origin.y + origin.height - MIN_HEIGHT
    }
  }
  return clampGeometry({ x, y, width, height })
}

function FloatWindow(props: {
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
    <section
      className={`float-window${float.minimized ? ' minimized' : ''}${focused ? ' focused' : ''}`}
      style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height, zIndex: float.z + 1 }}
      role="dialog"
      aria-label={float.title}
      onPointerDown={() => focusFloat(float.key)}
    >
      <div
        className="float-header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        <AppIcon icon={pluginIcon(float.icon)} size="sm" />
        <span className="float-title">{float.title}</span>
        <span className="float-actions">
          <button
            type="button"
            className="float-btn"
            title="最小化"
            aria-label={`最小化 ${float.title}`}
            onClick={() => minimizeFloat(float.key)}
          >
            <AppIcon icon={IconChevronDown} size="sm" />
          </button>
          <button
            type="button"
            className="float-btn"
            title="关闭"
            aria-label={`关闭 ${float.title}`}
            onClick={() => closeFloat(float.key)}
          >
            <AppIcon icon={IconClose} size="sm" />
          </button>
        </span>
      </div>
      <div className="float-body">
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
      </div>
      {RESIZE_DIRS.map((dir) => (
        <div
          key={dir}
          className={`float-resize dir-${dir}`}
          onPointerDown={onHandlePointerDown(dir)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onPointerUp}
          onLostPointerCapture={onPointerUp}
        />
      ))}
    </section>
  )
}

export function FloatLayer(props: { containerRef: React.RefObject<HTMLElement | null> }): React.JSX.Element {
  const snapshot = useSyncExternalStore(floatsStore.subscribe, floatsStore.get)
  const containerRef = props.containerRef
  const dragRef = useRef<DragContext | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (document.querySelector('.ui-dialog-overlay')) return
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
    <div className="float-layer">
      {snapshot.floats.map((float) => (
        <FloatWindow key={float.key} float={float} focused={float.key === topKey} containerRef={containerRef} dragRef={dragRef} />
      ))}
      {minimized.length > 0 && (
        <div className="float-chips" role="toolbar" aria-label="最小化浮窗">
          {minimized.map((float) => (
            <button
              key={float.key}
              type="button"
              className="float-chip"
              title={`还原 ${float.title}`}
              onClick={() => restoreFloat(float.key)}
            >
              <AppIcon icon={pluginIcon(float.icon)} size="sm" />
              <span>{float.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
