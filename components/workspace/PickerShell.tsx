'use client'

/**
 * Picker 共享外壳（20260922 由首页 ProjectSection 拆迁）：
 * 样式骨架 + 触发按钮 + popover 开合 hook + errText 工具。
 * 面板操作行（20260922-fix-editor-panel-controls 恢复）与胶囊面板共用。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

export const PickerWrap = styled.span`
  position: relative;
  display: inline-flex;
`

export const PickerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  max-width: 220px;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;

  &:hover {
    background: var(--chrome-hover);
    border-color: var(--primary-color);
  }

  &[aria-expanded='true'] {
    border-color: var(--primary-color);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const PickerName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PickerPanel = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 300px;
  max-width: 380px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: 0 8px 28px color-mix(in oklab, var(--text-primary) 14%, transparent);
`

export const PanelLabel = styled.h4`
  margin: 0;
  font-size: 12px;
  color: var(--text-primary);
`

export const PanelTitle = styled.div`
  font-size: 11px;
  color: var(--text-muted);
`

export const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  word-break: break-all;
`

export const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--danger-color);
  word-break: break-all;
`

export const Muted = styled.span`
  font-size: 12px;
  color: var(--text-muted);
`

export const RowList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow: auto;
`

export const Row = styled.li`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);

  &:hover {
    background: color-mix(in oklab, var(--primary-color) 8%, transparent);
  }
`

export const RowPath = styled.span`
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** popover 通用开合行为：Esc / 面板外 mousedown 关闭（20260922-fix-editor-panel-controls 恢复） */
export function usePickerOpen(): [boolean, () => void, React.RefObject<HTMLSpanElement | null>] {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])
  return [open, toggle, ref]
}
