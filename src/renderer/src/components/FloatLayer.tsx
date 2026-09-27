/**
 * 内核浮窗层：float 区域插件视图的按需窗口容器。
 *
 * 窗口态（开合/最小化/几何/z 序）在 floats 注册表（纯逻辑），本组件只做
 * 渲染与交互：头部拖拽、边缘/角缩放走 pointer capture；Esc 关闭当前聚焦
 * 浮窗；最小化收纳为右下角 chip。浮窗内容仍是沙箱插件帧（复用 PluginView）。
 * 本组件随 work 视图挂载/卸载，状态由注册表保持，返回 work 时原样还原。
 */
import { useRef, useSyncExternalStore } from 'react'
import type { PluginViewContribution } from '@shared/plugin'
import { AppIcon } from './ui/AppIcon'
import { IconChevronDown, IconClose, pluginIcon } from './icons'
import { PluginView } from '../plugins/PluginFrameHost'
import {
  closeFloat,
  floatsStore,
  focusFloat,
  floatKey,
  minimizeFloat,
  moveFloat,
  resizeFloat,
  restoreFloat,
  viewportOf,
  type FloatWindowState
} from '../plugins/floats'

export interface FloatViewEntry {
  pluginId: string
  view: PluginViewContribution
}

type DragMode = 'move' | 'e' | 's' | 'se'

interface DragSession {
  mode: DragMode
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
}

function FloatWindow(props: { win: FloatWindowState; entry: FloatViewEntry }): React.JSX.Element {
  const { win, entry } = props
  const key = win.key
  const dragRef = useRef<DragSession | null>(null)

  const startDrag = (mode: DragMode) => (e: React.PointerEvent<HTMLElement>): void => {
    if (e.button !== 0) return
    if (mode === 'move' && (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      origW: win.width,
      origH: win.height
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLElement>): void => {
    const d = dragRef.current
    if (!d) return
    const vp = viewportOf(window.innerWidth, window.innerHeight)
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.mode === 'move') moveFloat(key, d.origX + dx, d.origY + dy, vp)
    else {
      resizeFloat(
        key,
        d.origW + (d.mode === 'se' || d.mode === 'e' ? dx : 0),
        d.origH + (d.mode === 'se' || d.mode === 's' ? dy : 0),
        vp
      )
    }
  }

  const endDrag = (e: React.PointerEvent<HTMLElement>): void => {
    if (!dragRef.current) return
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeFloat(key)
    }
  }

  return (
    <section
      className="float-window"
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }}
      aria-label={entry.view.title}
      tabIndex={-1}
      onPointerDown={() => focusFloat(key)}
      onKeyDown={onKeyDown}
    >
      <header
        className="float-header"
        onPointerDown={startDrag('move')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <AppIcon icon={pluginIcon(entry.view.icon)} size="sm" />
        <span className="float-title">{entry.view.title}</span>
        <span className="float-actions">
          <button
            type="button"
            className="float-btn"
            aria-label={`最小化 ${entry.view.title}`}
            onClick={() => minimizeFloat(key)}
          >
            <AppIcon icon={IconChevronDown} size="sm" />
          </button>
          <button
            type="button"
            className="float-btn"
            aria-label={`关闭 ${entry.view.title}`}
            onClick={() => closeFloat(key)}
          >
            <AppIcon icon={IconClose} size="sm" />
          </button>
        </span>
      </header>
      <div className="float-body">
        <PluginView pluginId={entry.pluginId} view={entry.view} />
      </div>
      <div
        className="float-resize e"
        aria-hidden="true"
        onPointerDown={startDrag('e')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <div
        className="float-resize s"
        aria-hidden="true"
        onPointerDown={startDrag('s')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <div
        className="float-resize se"
        aria-hidden="true"
        onPointerDown={startDrag('se')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </section>
  )
}

function FloatChip(props: { win: FloatWindowState; entry: FloatViewEntry }): React.JSX.Element {
  const { win, entry } = props
  return (
    <button
      type="button"
      className="float-chip"
      onClick={() => {
        restoreFloat(win.key)
        focusFloat(win.key)
      }}
    >
      <AppIcon icon={pluginIcon(entry.view.icon)} size="sm" />
      <span>{entry.view.title}</span>
    </button>
  )
}

/** 浮窗层：渲染全部已开 float 视图窗口与最小化 chip 坞；无窗口时不渲染 */
export function FloatLayer(props: { floats: FloatViewEntry[] }): React.JSX.Element | null {
  const state = useSyncExternalStore(floatsStore.subscribe, floatsStore.get)
  const byKey = new Map(props.floats.map((e) => [floatKey(e.pluginId, e.view.id), e] as const))
  const openWindows = state.windows.filter((w) => w.open && !w.minimized && byKey.has(w.key))
  const minimized = state.windows.filter((w) => w.open && w.minimized && byKey.has(w.key))
  if (openWindows.length === 0 && minimized.length === 0) return null

  return (
    <div className="float-layer">
      {openWindows.map((w) => (
        <FloatWindow key={w.key} win={w} entry={byKey.get(w.key)!} />
      ))}
      {minimized.length > 0 && (
        <div className="float-chip-dock" role="toolbar" aria-label="最小化浮窗">
          {minimized.map((w) => (
            <FloatChip key={w.key} win={w} entry={byKey.get(w.key)!} />
          ))}
        </div>
      )}
    </div>
  )
}
