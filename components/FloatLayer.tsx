'use client'

/**
 * 壳层浮窗层：main-area 内的通用 slot，渲染 floats 注册表中的全部开窗。
 *
 * 交互契约：头部拖拽、8 向边缘/角缩放、点按置顶、最小化为角落 chip
 * （帧保持挂载，窗口整体隐藏）、Esc 关闭聚焦浮窗（确认框打开时让位）；
 * 几何/开合状态由 floats 注册表持有，本组件卸载不影响还原。
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import styled, { keyframes } from 'styled-components'
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
} from '../lib/floats'
import { PluginView } from './plugins/PluginFrameHost'
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

const Layer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;

  & > * {
    pointer-events: auto;
  }
`

const floatIn = keyframes`
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
`

const Window = styled.section<{ $minimized: boolean; $focused: boolean }>`
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 280px;
  overflow: hidden;
  background: var(--background-color);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
  box-shadow: var(--elevation-card);
  animation: ${floatIn} var(--transition-fast) ease-out;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  ${(props) =>
    props.$focused &&
    `
    border-color: color-mix(in oklab, var(--primary-color) 35%, var(--chrome-border));
  `}

  /* 最小化：整窗隐藏（帧保持挂载），入口收敛为角落 chip */
  ${(props) =>
    props.$minimized &&
    `
    display: none;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 6px 0 12px;
  flex-shrink: 0;
  color: var(--text-secondary);
  background: var(--chrome-panel);
  border-bottom: 1px solid var(--chrome-border);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`

const WinTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
`

const Actions = styled.span`
  display: flex;
  align-items: center;
`

const WinBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--transition-fast) ease,
    background var(--transition-fast) ease;

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const WinBody = styled.div`
  flex: 1;
  min-height: 0;
  background: var(--chrome-panel);
`

const ResizeHandle = styled.div<{ $dir: ResizeDir }>`
  position: absolute;
  z-index: 2;
  touch-action: none;

  ${(props) => {
    switch (props.$dir) {
      case 'n':
        return 'top: -3px; left: 8px; right: 8px; height: 7px; cursor: ns-resize;'
      case 's':
        return 'bottom: -3px; left: 8px; right: 8px; height: 7px; cursor: ns-resize;'
      case 'e':
        return 'right: -3px; top: 8px; bottom: 8px; width: 7px; cursor: ew-resize;'
      case 'w':
        return 'left: -3px; top: 8px; bottom: 8px; width: 7px; cursor: ew-resize;'
      case 'ne':
        return 'top: -3px; right: -3px; width: 14px; height: 14px; cursor: nesw-resize;'
      case 'nw':
        return 'top: -3px; left: -3px; width: 14px; height: 14px; cursor: nwse-resize;'
      case 'se':
        return 'bottom: -3px; right: -3px; width: 14px; height: 14px; cursor: nwse-resize;'
      case 'sw':
        return 'bottom: -3px; left: -3px; width: 14px; height: 14px; cursor: nesw-resize;'
    }
  }}
`

/* 最小化收敛为左下角 chip 条 */
const Chips = styled.div`
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  gap: 6px;
  max-width: calc(100% - 24px);
  overflow-x: auto;
`

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--chrome-border);
  border-radius: 14px;
  background: var(--chrome-raised);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--elevation-soft);
  transition:
    color var(--transition-fast) ease,
    border-color var(--transition-fast) ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--primary-color);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

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
