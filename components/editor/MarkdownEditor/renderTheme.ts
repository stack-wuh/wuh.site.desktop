/**
 * 编辑器渲染主题（拆分自 MarkdownEditor 单文件，20260926-refactor-mega-component-split）：
 * CM6 EditorView.theme（含 L3 即时渲染语言样式段）与语法 HighlightStyle。
 * 主题桥接约束：只写 var(--token)（含 color-mix），明暗随 data 属性路由自动生效；
 * 语法配色仅语义 token，禁硬编码色值。
 *
 * 20260927-style-editor-render-language「墨水层次」重设计（原型已验收）：
 * 非光标行 = 沉淀的排版（接近成品的安静渲染），光标行 = 墨迹未干的源码（符号浮现）。
 * 链接墨水下划、引用细线墨晕、行内代码纸面凹槽、标题字阶拉开节奏（h2 渐隐发丝线）、
 * 列表几何圆点、图片自然尺寸大图内联；半 px 字号归整（12.5→13 / 10.5→10、11）；
 * 交互过渡统一 var(--motion-dur-quick) + var(--motion-ease-out-soft)。
 */
import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

/** 语法配色：仅语义 token（标题/强调/链接/标记符等），明暗自动跟随（源码态） */
export const editorHighlight = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--text-primary)', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--primary-color)' },
  { tag: tags.url, color: 'var(--text-muted)' },
  { tag: tags.monospace, color: 'var(--text-primary)' },
  { tag: tags.quote, color: 'var(--text-muted)' },
  { tag: tags.list, color: 'var(--primary-color)' },
  { tag: tags.contentSeparator, color: 'var(--text-muted)' },
  { tag: tags.processingInstruction, color: 'var(--text-muted)' },
  { tag: tags.meta, color: 'var(--text-muted)' }
])

/** 沉静过渡：颜色/透明度类属性（禁布局位移），reduced-motion 由挂载容器统一关停 */
const INK_TRANSITION =
  'background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out), ' +
  'color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out), ' +
  'border-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out), ' +
  'text-decoration-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out), ' +
  'box-shadow var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out)'

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

  /* ===== L3 渲染语言（墨水层次；全部语义 token） ===== */
  '.cm-live-hidden': {
    display: 'none'
  },

  /* 标题：字阶拉开节奏；h2 下缘墨色渐隐发丝线（背景图实现，不用伪元素） */
  '.cm-live-h1': {
    fontSize: '23px',
    fontWeight: '700',
    lineHeight: 'var(--line-height-heading, 1.35)',
    letterSpacing: '0.01em',
    padding: '16px 0 4px'
  },
  '.cm-live-h2': {
    fontSize: '18px',
    fontWeight: '700',
    lineHeight: 'var(--line-height-heading, 1.35)',
    paddingBottom: '6px',
    backgroundImage:
      'linear-gradient(90deg, color-mix(in oklab, var(--primary-color) 28%, transparent), color-mix(in oklab, var(--chrome-border) 55%, transparent) 30%, transparent 92%)',
    backgroundSize: '100% 1px',
    backgroundPosition: '0 100%',
    backgroundRepeat: 'no-repeat'
  },
  '.cm-live-h3': { fontSize: '15px', fontWeight: '700', padding: '8px 0 2px' },
  '.cm-live-h4, .cm-live-h5, .cm-live-h6': { fontWeight: '700', padding: '6px 0 2px' },

  /* 引用：细线 + 墨晕（去斜体；多行引用逐行贴合同一左右内边距） */
  '.cm-live-quote': {
    borderLeft: '2px solid color-mix(in oklab, var(--primary-color) 45%, transparent)',
    background: 'color-mix(in oklab, var(--primary-color) 5%, transparent)',
    color: 'var(--text-secondary)',
    padding: '4px 0 4px 14px',
    transition: INK_TRANSITION
  },

  /* 围栏：标头栏（语言角标 + 复制钮）+ 内容行纸面凹进 */
  '.cm-live-fence': {
    background: 'color-mix(in oklab, var(--chrome-raised) 45%, transparent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.65',
    transition: INK_TRANSITION
  },
  '.cm-live-fence-head': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px 4px 12px',
    background: 'var(--chrome-raised)',
    borderBottom: '1px solid color-mix(in oklab, var(--chrome-border) 50%, transparent)',
    borderRadius: '8px 8px 0 0',
    fontFamily: 'var(--font-mono)'
  },
  '.cm-live-fence-lang': {
    fontSize: '10px',
    letterSpacing: '1.2px',
    color: 'var(--text-muted)'
  },
  '.cm-live-fence-copy': {
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: '4px',
    transition: INK_TRANSITION
  },
  '.cm-live-fence-copy:hover': {
    color: 'var(--text-primary)',
    background: 'var(--chrome-hover)'
  },
  '.cm-live-fence-copy:focus-visible': {
    outline: '2px solid var(--primary-color)',
    outlineOffset: '-2px'
  },

  /* mermaid 渲染态 */
  '.cm-live-mermaid': {
    display: 'block',
    padding: '10px 12px',
    background: 'color-mix(in oklab, var(--chrome-raised) 55%, transparent)',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 70%, transparent)',
    borderRadius: '8px',
    fontSize: '13px',
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
    color: 'var(--text-primary)',
    transition: INK_TRANSITION
  },
  '.cm-live-math:hover': {
    borderColor: 'color-mix(in oklab, var(--primary-color) 35%, transparent)',
    background: 'color-mix(in oklab, var(--primary-color) 4%, transparent)'
  },

  /* 图片：自然尺寸大图内联（解除 320px 上限，随行宽收敛），hover 浮起 */
  '.cm-live-img': {
    position: 'relative',
    display: 'inline-block',
    margin: '4px 0',
    maxWidth: '100%'
  },
  '.cm-live-img img': {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 55%, transparent)',
    boxShadow: 'var(--elevation-soft)',
    transition: INK_TRANSITION
  },
  '.cm-live-img img:hover': {
    boxShadow: 'var(--elevation-card)'
  },
  '.cm-live-img--broken': {
    display: 'inline-block',
    padding: '2px 10px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    border: '1px dashed color-mix(in oklab, var(--chrome-border) 80%, transparent)',
    borderRadius: '4px'
  },

  /* 分割线：渐变细线 */
  '.cm-live-hr': {
    display: 'block',
    height: '1px',
    margin: '12px 0',
    background:
      'linear-gradient(90deg, transparent, color-mix(in oklab, var(--chrome-border) 85%, transparent) 18%, color-mix(in oklab, var(--chrome-border) 85%, transparent) 82%, transparent)'
  },

  /* 列表：主题色几何圆点 / mono 序号墨色淡染 */
  '.cm-live-list': {
    paddingLeft: '2px'
  },
  '.cm-live-bullet': {
    display: 'inline-block',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'color-mix(in oklab, var(--primary-color) 62%, transparent)',
    verticalAlign: 'middle',
    margin: '0 2px 2px 0'
  },
  '.cm-live-olnum': {
    color: 'color-mix(in oklab, var(--primary-color) 72%, var(--text-primary))',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px'
  },

  /* 行内样式 */
  '.cm-live-strong': { fontWeight: '700' },
  '.cm-live-em': { fontStyle: 'italic' },
  '.cm-live-del': {
    textDecoration: 'line-through',
    textDecorationThickness: '1px',
    color: 'var(--text-muted)'
  },
  '.cm-live-code': {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    background: 'var(--chrome-raised)',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 55%, transparent)',
    boxShadow: 'inset 0 1px 2px color-mix(in oklab, var(--text-primary) 5%, transparent)',
    padding: '1px 6px',
    borderRadius: '4px',
    transition: INK_TRANSITION
  },
  /* 链接：墨水下划——静止 35% 墨色细线，hover 满墨（留待交互 change 接 ⌘点击） */
  '.cm-live-linktext': {
    color: 'var(--primary-color)',
    textDecoration: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '4px',
    textDecorationColor: 'color-mix(in oklab, var(--primary-color) 35%, transparent)',
    cursor: 'pointer',
    transition: INK_TRANSITION
  },
  '.cm-live-linktext:hover': {
    textDecorationColor: 'var(--primary-color)'
  },
  '.cm-live-linkurl': {
    color: 'var(--text-muted)',
    fontSize: '12px'
  },
  '.cm-live-table': {
    background: 'color-mix(in oklab, var(--chrome-raised) 40%, transparent)',
    transition: INK_TRANSITION
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
  '.cm-panel.cm-search button:focus-visible, .cm-panel.cm-search input:focus-visible': {
    outline: '2px solid var(--primary-color)',
    outlineOffset: '-2px'
  },
  '.cm-panel.cm-search label': {
    fontSize: '11px',
    color: 'var(--text-secondary)'
  }
})
