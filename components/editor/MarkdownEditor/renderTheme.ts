/**
 * 编辑器渲染主题（拆分自 MarkdownEditor 单文件，20260926-refactor-mega-component-split）：
 * CM6 EditorView.theme（含 L3 即时渲染语言样式段）与语法 HighlightStyle。
 * 主题桥接约束：只写 var(--token)，明暗随 data 属性路由自动生效；
 * 语法配色仅语义 token，禁硬编码色值。
 */
import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

/** 语法配色：仅语义 token（标题/强调/链接/标记符等），明暗自动跟随 */
export const editorHighlight = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--text-primary)', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--primary-color)' },
  { tag: tags.url, color: 'var(--text-muted)' },
  { tag: tags.monospace, color: 'var(--text-primary)' },
  { tag: tags.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: tags.list, color: 'var(--primary-color)' },
  { tag: tags.contentSeparator, color: 'var(--text-muted)' },
  { tag: tags.processingInstruction, color: 'var(--text-muted)' },
  { tag: tags.meta, color: 'var(--text-muted)' }
])

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--editor-font-size, 14px)'
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-sans)'
  },
  '.cm-content': {
    caretColor: 'var(--primary-color)',
    lineHeight: 'var(--editor-line-height, 1.7)',
    padding: '8px 2px 12px 0',
    maxWidth: 'var(--editor-measure, none)',
    margin: '0 auto'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--primary-color)'
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in oklab, var(--primary-color) 22%, transparent)'
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent'
  },
  '.cm-placeholder': {
    color: 'var(--text-muted)'
  },

  /* ===== L3 渲染语言（设计稿 PART 1；全部语义 token） ===== */
  '.cm-live-hidden': {
    display: 'none'
  },

  /* 标题：行级字号字重 */
  '.cm-live-h1': { fontSize: '22px', fontWeight: '700', lineHeight: 'var(--line-height-heading, 1.35)' },
  '.cm-live-h2': {
    fontSize: '17px',
    fontWeight: '700',
    lineHeight: 'var(--line-height-heading, 1.35)',
    paddingBottom: '4px',
    boxShadow: 'inset 0 -1px 0 color-mix(in oklab, var(--chrome-border) 70%, transparent)'
  },
  '.cm-live-h3': { fontSize: '15px', fontWeight: '700' },
  '.cm-live-h4, .cm-live-h5, .cm-live-h6': { fontWeight: '700' },

  /* 引用：主题色竖线 + 淡底 */
  '.cm-live-quote': {
    borderLeft: '3px solid color-mix(in oklab, var(--primary-color) 55%, transparent)',
    background: 'color-mix(in oklab, var(--primary-color) 6%, transparent)',
    color: 'var(--text-secondary)',
    padding: '1px 0 1px 10px'
  },

  /* 围栏：内容行底色 + 语言标头 */
  '.cm-live-fence': {
    background: 'color-mix(in oklab, var(--chrome-raised) 72%, transparent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12.5px'
  },
  '.cm-live-fence-head': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '3px 10px',
    background: 'var(--chrome-raised)',
    borderBottom: '1px solid color-mix(in oklab, var(--chrome-border) 55%, transparent)',
    borderRadius: '6px 6px 0 0',
    fontFamily: 'var(--font-mono)'
  },
  '.cm-live-fence-lang': {
    fontSize: '10.5px',
    letterSpacing: '1px',
    color: 'var(--text-muted)'
  },
  '.cm-live-fence-copy': {
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '10.5px',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  '.cm-live-fence-copy:hover': {
    color: 'var(--text-primary)',
    background: 'var(--chrome-hover)'
  },

  /* mermaid 渲染态 */
  '.cm-live-mermaid': {
    display: 'block',
    padding: '10px 12px',
    background: 'color-mix(in oklab, var(--chrome-raised) 55%, transparent)',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 70%, transparent)',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontFamily: 'var(--font-mono)'
  },
  '.cm-live-mermaid--ok': {
    textAlign: 'center'
  },
  '.cm-live-mermaid--ok svg': {
    maxWidth: '100%'
  },
  '.cm-live-mermaid--error': {
    borderLeft: '3px solid var(--danger-color)'
  },

  /* 公式渲染态：hover 虚线框提示可编辑，点击回源码 */
  '.cm-live-math': {
    display: 'block',
    textAlign: 'center',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px dashed transparent',
    cursor: 'pointer',
    color: 'var(--text-primary)'
  },
  '.cm-live-math:hover': {
    borderColor: 'color-mix(in oklab, var(--primary-color) 35%, transparent)',
    background: 'color-mix(in oklab, var(--primary-color) 4%, transparent)'
  },

  /* 图片内联缩略图 */
  '.cm-live-img': {
    position: 'relative',
    display: 'inline-block',
    margin: '2px 0',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--chrome-border)',
    boxShadow: 'var(--elevation-soft)'
  },
  '.cm-live-img img': {
    display: 'block',
    maxWidth: 'min(320px, 100%)',
    borderRadius: '7px'
  },
  '.cm-live-img--broken': {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)'
  },

  /* 分割线：渐变细线 */
  '.cm-live-hr': {
    display: 'block',
    height: '1px',
    margin: '10px 0',
    background:
      'linear-gradient(90deg, transparent, var(--chrome-border) 18%, var(--chrome-border) 82%, transparent)'
  },

  /* 列表：主题色圆点 / 有序号 primary */
  '.cm-live-list': {
    paddingLeft: '2px'
  },
  '.cm-live-bullet::before': {
    content: "'•'",
    color: 'color-mix(in oklab, var(--primary-color) 65%, transparent)',
    fontWeight: '700'
  },
  '.cm-live-olnum': {
    color: 'color-mix(in oklab, var(--primary-color) 75%, var(--text-primary))',
    fontFamily: 'var(--font-mono)',
    fontSize: '12.5px'
  },

  /* 行内样式 */
  '.cm-live-strong': { fontWeight: '700' },
  '.cm-live-em': { fontStyle: 'italic' },
  '.cm-live-del': {
    textDecoration: 'line-through',
    color: 'var(--text-muted)'
  },
  '.cm-live-code': {
    fontFamily: 'var(--font-mono)',
    fontSize: '12.5px',
    background: 'var(--chrome-raised)',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 60%, transparent)',
    padding: '1px 5px',
    borderRadius: '4px'
  },
  '.cm-live-linktext': {
    color: 'var(--primary-color)',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    textDecorationColor: 'color-mix(in oklab, var(--primary-color) 45%, transparent)'
  },
  '.cm-live-linkurl': {
    color: 'var(--text-muted)',
    fontSize: '11px'
  },
  '.cm-live-table': {
    background: 'color-mix(in oklab, var(--chrome-raised) 40%, transparent)'
  },

  /* 查找面板（CM 内联条）配色 */
  '.cm-panel.cm-search': {
    background: 'var(--chrome-raised)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '4px 4px 0 0',
    padding: '4px 8px',
    fontFamily: 'var(--font-sans)'
  },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    background: 'var(--background-color)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    padding: '2px 6px'
  },
  '.cm-panel.cm-search button': {
    cursor: 'pointer',
    background: 'var(--chrome-panel)'
  },
  '.cm-panel.cm-search button:hover': {
    background: 'var(--chrome-hover)'
  },
  '.cm-panel.cm-search label': {
    fontSize: '11px',
    color: 'var(--text-secondary)'
  }
})
