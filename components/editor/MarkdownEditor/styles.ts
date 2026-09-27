'use client'

/**
 * 主编辑器挂载样式（拆分自 MarkdownEditor 单文件，20260926-refactor-mega-component-split）：
 * 挂载容器与面板内提示条。布局与滚动在这里，视觉（背景/光标/选区/语法色/L3）
 * 全在 ./renderTheme 的 editorTheme。
 */
import styled from 'styled-components'

export const MIN_EDITOR_HEIGHT = 140

/* 挂载容器：布局与滚动在这里，视觉（背景/光标/选区/语法色/L3）全在 editorTheme。
   reduced-motion 降级在这里统一关停（renderTheme 的沉静过渡均为颜色类属性，
   首页面板与 /editor 页共用本容器，两挂载点无分叉） */
export const EditorMount = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: ${MIN_EDITOR_HEIGHT}px;

  @media (prefers-reduced-motion: reduce) {
    .cm-editor [class*='cm-live'],
    .cm-editor .cm-panel.cm-search button,
    .cm-editor .cm-panel.cm-search input {
      transition: none;
    }
  }
`

export const Notice = styled.div`
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  padding: 6px 10px;
  border-radius: var(--border-radius-base);
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  font-size: 12px;
  color: var(--text-secondary);
  pointer-events: none;
`
