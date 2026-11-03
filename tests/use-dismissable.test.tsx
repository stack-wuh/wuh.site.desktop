// @vitest-environment happy-dom
import { act, useState, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { render, screen, fireEvent } from '@testing-library/react'
import { useDismissable } from '../lib/hooks/useDismissable'
import { useStore } from '../lib/hooks/useStore'
import { createStore } from '../lib/createStore'

/**
 * 共享 hooks（20261103-refactor-shared-hooks-sweep）：useDismissable 收敛
 * 「Esc + 点外关」三处分叉实现（Dialog 仅 Esc / MenuPopover mousedown+capture /
 * Capsule click+归属豁免）；useStore 收敛 useSyncExternalStore 三参样板。
 * 行为等价红线：React 18 离散事件同步刷 passive effects——打开那次点击仍会
 * 冒泡到 window，目标在豁免区内不得误关（20260924-fix-capsule-self-close）。
 */

function Probe(props: {
  pointerEvent?: 'click' | 'mousedown'
  escCapture?: boolean
  escStopPropagation?: boolean
  onClosed?: () => void
}): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const ref = useRef<HTMLDivElement | null>(null)
  const close = (): void => {
    setOpen(false)
    props.onClosed?.()
  }
  useDismissable({
    open,
    onClose: close,
    rootRef: ref,
    pointerEvent: props.pointerEvent,
    escCapture: props.escCapture,
    escStopPropagation: props.escStopPropagation
  })
  return (
    <div ref={ref} data-testid="root">
      <button data-testid="inside" onClick={() => undefined}>
        inside
      </button>
    </div>
  )
}

describe('useDismissable', () => {
  it('Esc closes; click outside closes; click inside stays open (click variant)', () => {
    const onClosed = vi.fn()
    const first = render(<Probe pointerEvent="click" onClosed={onClosed} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClosed).toHaveBeenCalledTimes(1)
    first.unmount()
    render(<Probe pointerEvent="click" onClosed={onClosed} />)
    fireEvent.click(screen.getByTestId('inside'))
    expect(onClosed).toHaveBeenCalledTimes(1) // 内部点击豁免
    fireEvent.click(document.body)
    expect(onClosed).toHaveBeenCalledTimes(2) // 点外关闭
  })

  it('mousedown variant listens to mousedown outside (MenuPopover semantics)', () => {
    const onClosed = vi.fn()
    render(<Probe pointerEvent="mousedown" onClosed={onClosed} />)
    fireEvent.mouseDown(document.body)
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('inside-root same-tick click does not close (exemption wins)', () => {
    const onClosed = vi.fn()
    function SelfOpeningInside(): React.JSX.Element {
      const [open, setOpen] = useState(false)
      const ref = useRef<HTMLDivElement | null>(null)
      useDismissable({ open, onClose: () => { setOpen(false); onClosed() }, rootRef: ref, pointerEvent: 'click' })
      return (
        <div ref={ref} data-testid="root3">
          <button
            data-testid="opener3"
            onClick={() => {
              setOpen(true)
              fireEvent.click(screen.getByTestId('opener3'))
            }}
          >
            open
          </button>
        </div>
      )
    }
    render(<SelfOpeningInside />)
    fireEvent.click(screen.getByTestId('opener3'))
    expect(onClosed).not.toHaveBeenCalled()
  })
})

describe('useStore', () => {
  it('subscribes with the get-as-server-snapshot triple', () => {
    const store = createStore<{ n: number }>({ n: 0 })
    function Reader(): React.JSX.Element {
      const snap = useStore(store)
      return <span data-testid="n">{snap.n}</span>
    }
    render(<Reader />)
    expect(screen.getByTestId('n').textContent).toBe('0')
    act(() => store.commit({ n: 3 }))
    expect(screen.getByTestId('n').textContent).toBe('3')
  })
})
