'use client'

/**
 * 编辑器模块区 section 局部样式原子（拆分自 EditorSection 单文件，
 * 20260926-refactor-mega-component-split）：文档 chip、图标网格、大纲列表、
 * 迷你动作钮。其中 DocChip/DocPath/DirtyDot 为早期迭代遗留、当前 JSX 未消费，
 * 按机械搬移原则原样携带，删除留给后续清理变更。
 */
import styled from 'styled-components'

export const DocChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

export const DocPath = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const DirtyDot = styled.span`
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning-color);
`

export const IconRow = styled.div`
  display: flex;
  align-items: center;
  /* 横密纵疏：图标间 2px，换行两排之间 6px（20260924-fix-capsule-header-chrome
     ——gap 横纵共用以致换行工具条贴死） */
  column-gap: 2px;
  row-gap: 6px;
  padding: 6px 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`

export const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  &[aria-expanded='true'] {
    background: color-mix(in oklab, var(--primary-color) 16%, transparent);
    color: var(--text-primary);
  }
`

export const OutlineList = styled.ul`
  list-style: none;
  margin: 2px 10px 6px;
  padding: 0;
  max-height: 132px;
  overflow: auto;
  border-top: 1px solid var(--chrome-border);
`

export const OutlineItem = styled.li<{ $level: number; $active?: boolean }>`
  padding: 4px 6px;
  padding-left: ${(props) => 6 + (props.$level - 1) * 12}px;
  font-size: 12px;
  color: ${(props) => (props.$active ? 'var(--primary-color)' : 'var(--text-secondary)')};
  font-weight: ${(props) => (props.$active ? '700' : '400')};
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
    background: color-mix(in oklab, var(--primary-color) 8%, transparent);
  }
`

export const OutlineEmpty = styled.li`
  padding: 6px;
  font-size: 12px;
  color: var(--text-muted);
`

/** 文档卡内迷你动作钮 */
export const ActionMini = styled.button<{ $accent?: boolean }>`
  flex: 1;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: color-mix(in oklab, var(--background-color) 45%, var(--chrome-raised));
  border: 1px solid color-mix(in oklab, var(--chrome-border) 70%, transparent);
  border-radius: 7px;
  color: ${(props) => (props.$accent ? 'var(--primary-color)' : 'var(--text-secondary)')};
  font-size: 10.5px;
  font-family: var(--font-sans);
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }
`
