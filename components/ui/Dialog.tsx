'use client'

import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Button } from './Button'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: background-color 0.3s ease;
`

const Box = styled.div`
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-lg);
  min-width: 360px;
  max-width: 520px;
  box-shadow: var(--elevation-card);
`

const Title = styled.div`
  padding: 14px 18px 0;
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
`

const Body = styled.div`
  padding: 12px 18px;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 18px 16px;
`

const Message = styled.div`
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
`

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
    <Overlay
      data-dialog-overlay="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <Box role="dialog" aria-modal="true">
        {title && <Title>{title}</Title>}
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Box>
    </Overlay>
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
      <Message>{pending?.opts.message}</Message>
    </Dialog>
  )
}
