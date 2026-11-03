import { useEffect, type RefObject } from 'react'

/**
 * 可关闭面（20261103-refactor-shared-hooks-sweep）：收敛 Esc + 点外关的三处
 * 分叉实现（Dialog 仅 Esc；MenuPopover mousedown + capture + stopPropagation；
 * Capsule click + 归属豁免）。行为等价红线：React 18 离散事件会同步刷 passive
 * effects，打开那次点击仍会冒泡到 window——豁免区命中一律不关
 * （20260924-fix-capsule-self-close）。监听只在 open 期挂载，随开合装卸。
 */
export interface DismissableOptions {
  open: boolean
  onClose: () => void
  /** 豁免区引用：内部命中不关闭。省略 pointerEvent 时仅承载 Esc 通道 */
  rootRef?: RefObject<HTMLElement | null>
  /** 点外监听的指针事件：click（Capsule 形态）| mousedown（MenuPopover 形态） */
  pointerEvent?: 'click' | 'mousedown'
  /** Esc 挂捕获阶段（先于 bubble 侧其他 Esc 消费方） */
  escCapture?: boolean
  /** Esc 处理内 stopPropagation（MenuPopover 需要拦住后续 bubble 侧消费者） */
  escStopPropagation?: boolean
}

export function useDismissable(options: DismissableOptions): void {
  const { open, onClose, rootRef, pointerEvent, escCapture = false, escStopPropagation = false } = options

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (escStopPropagation) event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, escCapture)
    return () => window.removeEventListener('keydown', onKey, escCapture)
  }, [open, onClose, escCapture, escStopPropagation])

  useEffect(() => {
    if (!open || !pointerEvent) return
    const onPointer = (event: Event): void => {
      const root = rootRef?.current
      // 归属豁免：打开那次点击冒泡到 window 时目标在豁免区内，不关（同帧时序坑）
      if (root && event.target instanceof Node && root.contains(event.target)) return
      onClose()
    }
    window.addEventListener(pointerEvent, onPointer)
    return () => window.removeEventListener(pointerEvent, onPointer)
  }, [open, onClose, pointerEvent, rootRef])
}
