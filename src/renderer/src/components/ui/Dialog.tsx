import { useEffect, useState } from 'react'
import { Button } from './Button'

interface Props {
  open: boolean
  title?: string
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}

export function Dialog(props: Props): React.JSX.Element | null {
  const { open, title, onClose, footer, children } = props

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ui-dialog-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ui-dialog" role="dialog" aria-modal="true">
        {title && <div className="ui-dialog__title">{title}</div>}
        <div className="ui-dialog__body">{children}</div>
        {footer && <div className="ui-dialog__footer">{footer}</div>}
      </div>
    </div>
  )
}

export interface ConfirmOptions {
  title?: string
  message: string
  okText?: string
  cancelText?: string
  /** 危险动作时确认按钮显示为红色 */
  danger?: boolean
}

type Listener = (opts: ConfirmOptions, resolve: (v: boolean) => void) => void

let listener: Listener | null = null

/** 命令式确认框（可在非组件上下文使用，如 store） */
export function uiConfirm(opts: ConfirmOptions): Promise<boolean> {
  if (!listener) {
    // ConfirmHost 未挂载时退回原生 confirm，保证功能不中断
    return Promise.resolve(window.confirm(opts.message))
  }
  return new Promise((resolve) => listener?.(opts, resolve))
}

/** 应用根部挂载一次，接住 uiConfirm 的请求 */
export function ConfirmHost(): React.JSX.Element {
  const [pending, setPending] = useState<{
    opts: ConfirmOptions
    resolve: (v: boolean) => void
  } | null>(null)

  useEffect(() => {
    listener = (opts, resolve) => setPending({ opts, resolve })
    return () => {
      listener = null
    }
  }, [])

  const close = (v: boolean): void => {
    pending?.resolve(v)
    setPending(null)
  }

  return (
    <Dialog
      open={pending !== null}
      title={pending?.opts.title}
      onClose={() => close(false)}
      footer={
        <>
          <Button onClick={() => close(false)}>{pending?.opts.cancelText ?? '取消'}</Button>
          <Button
            variant={pending?.opts.danger ? 'danger' : 'primary'}
            onClick={() => close(true)}
          >
            {pending?.opts.okText ?? '确定'}
          </Button>
        </>
      }
    >
      <div className="ui-confirm-message">{pending?.opts.message}</div>
    </Dialog>
  )
}
