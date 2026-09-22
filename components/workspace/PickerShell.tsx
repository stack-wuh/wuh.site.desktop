'use client'

/**
 * Picker 共享外壳（20260922 由首页 ProjectSection 拆迁）：
 * 样式骨架 + errText 工具。胶囊化后 picker 以「面板内容」形态嵌入
 * 胶囊编辑器分区（开合由胶囊面板统一管理），不再自带触发按钮与弹层。
 */
import styled from 'styled-components'

export const PickerWrap = styled.span`
  position: relative;
  display: inline-flex;
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
