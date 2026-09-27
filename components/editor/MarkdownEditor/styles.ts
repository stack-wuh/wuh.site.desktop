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

/* 图片 lightbox（20260927-feature-editor-interactions）：portal 至 body，
   data-dialog-overlay 让浮窗层 Esc 让位；z 130 > Dialog 100（覆盖一切编辑器外浮层） */
export const Lightbox = styled.div`
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: color-mix(in oklab, var(--background-color) 18%, #000 82%);
  outline: none;
  animation: wd-lightbox-in var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  img {
    max-width: 90vw;
    max-height: 82vh;
    border-radius: var(--border-radius-base);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  }

  @keyframes wd-lightbox-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const LightboxCap = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);

  kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--border-radius-xs);
    padding: 0 4px;
    margin: 0 2px;
  }
`
