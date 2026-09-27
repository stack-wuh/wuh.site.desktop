'use client'

/**
 * 首页编辑器面板样式原子（拆分自 EditorPanel 单文件，20260927-refactor-midsize-component-split）：
 * 面板壳（容器查询宿主）、上下文行、分栏体、动作行与文档 chip。
 */
import styled from 'styled-components'
import { Button } from '../../ui/Button'

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  /* 上内缩 10px：编辑区与面板边框留出呼吸间距（主题修复后编辑区透明底，
     无白框外溢问题；不设 overflow:hidden——会裁掉向下展开的项目/文件 popover） */
  padding: 10px 4px 0;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-lg, var(--border-radius-md));
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  &:focus-within {
    border-color: color-mix(in oklab, var(--primary-color) 55%, var(--chrome-border));
  }
`

export const ContextRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 8px;
`

/* 容器查询宿主：分栏方向随面板实际宽度（非视口）切换 */
export const EditorBody = styled.div`
  display: flex;
  min-height: 0;
  container-type: inline-size;
`

export const Split = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: row;
  max-height: 45vh;

  /* 分栏间距：第二栏起画分隔线（方向切换时由查询内覆盖） */
  & > * + * {
    border-left: 1px solid var(--chrome-border);
  }

  @container (max-width: 700px) {
    flex-direction: column;

    & > * + * {
      border-left: none;
      border-top: 1px solid var(--chrome-border);
    }
  }
`

export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 8px;
`

export const Spacer = styled.span`
  flex: 1;
`

export const DocChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 46%;
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

/** 预览入口（ghost 语义壳）：不再恒定降灰——0.45 与 Button disabled 撞值，
 * 可用/禁用不可辨（20260927-fix-shell-ux-defects）；降级语义由 title/aria-pressed 表达 */
export const GhostButton = styled(Button)``
