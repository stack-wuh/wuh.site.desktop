/**
 * 编辑器渲染主题（拆分自 MarkdownEditor 单文件，20260926-refactor-mega-component-split）：
 * CM6 EditorView.theme（含 L3 即时渲染语言样式段）与语法 HighlightStyle。
 * 主题桥接约束：只写 var(--token)（含 color-mix），明暗随 data 属性路由自动生效；
 * 语法配色仅语义 token，禁硬编码色值。
 *
 * 20260927-style-editor-render-language「墨水层次」重设计（原型已验收）：
 * 非光标行 = 沉淀的排版（接近成品的安静渲染），光标行 = 墨迹未干的源码（符号浮现）。
 * 链接墨水下划、引用细线墨晕、行内代码纸面凹槽、列表几何圆点、图片自然尺寸大图内联；
 * 交互过渡统一 var(--motion-dur-quick) + var(--motion-ease-out-soft)。
 * 20261014-feature-editor-paper-rebuild「素笺手记」升级（视觉稿无损移植）：
 * 衬线题阶（h1 30px 渐隐墨线 60% / h2 22px 朱线 22% / h3 18px，--font-serif 系统衬线栈）、
 * 正文两端对齐 + 测宽 46em 呼吸、引用 2px 朱线 + 5% 墨晕渐隐、链接改墨色下划。
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
  /* 写作面不需要焦点环（光标即焦点指示）——关掉 CM6 默认的聚焦虚线框
     （素笺纸面上它会加倍显眼，20261016 走查修复） */
  '&.cm-focused': {
    outline: 'none'
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-sans)'
  },
  '.cm-content': {
    caretColor: 'var(--primary-color)',
    lineHeight: 'var(--editor-line-height, 1.9)',
    padding: '8px 2px 12px 0',
    maxWidth: 'var(--editor-measure, none)',
    margin: '0 auto',
    textAlign: 'justify'
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

  /* 标题：衬线题阶（素笺手记）——h1 题名 30px + 渐隐墨线 60%；h2 22px 朱线 22%；
     h3 18px；字距 0.02em；线一律背景图实现（CM 行元素禁伪元素，干扰文本测量） */
  '.cm-live-h1': {
    fontFamily: 'var(--font-serif)',
    fontSize: '30px',
    fontWeight: '600',
    lineHeight: 'var(--line-height-heading, 1.35)',
    letterSpacing: '0.02em',
    padding: '16px 0 14px',
    backgroundImage:
      'linear-gradient(90deg, color-mix(in oklab, var(--text-primary) 18%, transparent), transparent 60%)',
    backgroundSize: '100% 1px',
    backgroundPosition: '0 100%',
    backgroundRepeat: 'no-repeat'
  },
  '.cm-live-h2': {
    fontFamily: 'var(--font-serif)',
    fontSize: '22px',
    fontWeight: '600',
    lineHeight: 'var(--line-height-heading, 1.35)',
    letterSpacing: '0.02em',
    paddingBottom: '8px',
    backgroundImage:
      'linear-gradient(90deg, color-mix(in oklab, var(--primary-color) 22%, transparent), transparent 70%)',
    backgroundSize: '100% 1px',
    backgroundPosition: '0 100%',
    backgroundRepeat: 'no-repeat'
  },
  '.cm-live-h3': {
    fontFamily: 'var(--font-serif)',
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '0.02em',
    padding: '8px 0 2px'
  },
  '.cm-live-h4, .cm-live-h5, .cm-live-h6': {
    fontWeight: '600',
    color: 'var(--text-secondary)',
    padding: '6px 0 2px'
  },

  /* 引用：2px 朱线 + 5% 墨晕渐隐（去斜体；多行引用逐行贴合同一左右内边距） */
  '.cm-live-quote': {
    borderLeft: '2px solid color-mix(in oklab, var(--primary-color) 55%, var(--text-primary))',
    backgroundImage:
      'linear-gradient(90deg, color-mix(in oklab, var(--primary-color) 5%, transparent), transparent 65%)',
    color: 'var(--text-secondary)',
    padding: '4px 0 4px 16px',
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

  /* 图片：自然尺寸大图内联（解除 320px 上限，随行宽收敛），hover 浮起。
     包裹器必须显式 width:100%——inline-block 收缩_fit + 子元素 max-width:100%
     的循环依赖会让 img 坍缩到 2px（20260927 实测） */
  '.cm-live-img': {
    position: 'relative',
    display: 'inline-block',
    width: '100%',
    margin: '4px 0',
    textAlign: 'center'
  },
  '.cm-live-img img': {
    display: 'inline-block',
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 55%, transparent)',
    boxShadow: 'var(--elevation-soft)',
    cursor: 'zoom-in',
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

  /* ===== 笺条（素笺签名元素，20261014 视觉稿无损移植）===== */
  '.cm-live-card': {
    position: 'relative',
    display: 'flex',
    gap: '16px',
    alignItems: 'stretch',
    maxWidth: '100%',
    margin: '6px 0',
    padding: '16px 16px 16px 16px',
    background: 'var(--chrome-raised)',
    border: '1px solid var(--chrome-border)',
    borderRadius: '12px',
    color: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer',
    transition:
      INK_TRANSITION +
      ', transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out), ' +
      'box-shadow var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out)'
  },
  /* 签名细节：贴笺折角 */
  '.cm-live-card::before': {
    content: "''",
    position: 'absolute',
    top: '0',
    right: '0',
    width: '18px',
    height: '18px',
    background:
      'linear-gradient(225deg, var(--background-color) 0 50%, color-mix(in oklab, var(--chrome-border) 70%, var(--background-color)) 50% 100%)',
    borderLeft: '1px solid var(--chrome-border)',
    borderBottom: '1px solid var(--chrome-border)',
    borderBottomLeftRadius: '4px'
  },
  '.cm-live-card:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 'var(--elevation-card)',
    borderColor: 'color-mix(in oklab, var(--primary-color) 35%, var(--chrome-border))'
  },
  '.cm-live-card-seal': {
    flex: 'none',
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    display: 'grid',
    placeItems: 'center',
    background: 'color-mix(in oklab, var(--primary-color) 10%, var(--background-color))',
    border: '1px solid color-mix(in oklab, var(--primary-color) 25%, var(--chrome-border))',
    color: 'var(--primary-color)'
  },
  '.cm-live-card-seal svg': {
    width: '18px',
    height: '18px'
  },
  '.cm-live-card-body': {
    display: 'block',
    flex: '1',
    minWidth: '0'
  },
  '.cm-live-card-title': {
    display: '-webkit-box',
    WebkitLineClamp: '1',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    fontFamily: 'var(--font-serif)',
    fontSize: '15px',
    fontWeight: '600',
    lineHeight: '1.5',
    color: 'var(--text-primary)'
  },
  '.cm-live-card-desc': {
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    fontSize: '13px',
    lineHeight: '1.6',
    marginTop: '3px',
    color: 'var(--text-secondary)'
  },
  '.cm-live-card-meta': {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginTop: '8px',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.02em',
    color: 'var(--text-muted)'
  },
  '.cm-live-card-favicon': {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    flex: 'none'
  },
  '.cm-live-card-skeleton': {
    borderRadius: '4px',
    display: 'inline-block',
    backgroundImage:
      'linear-gradient(90deg, var(--chrome-border) 25%, var(--chrome-hover) 45%, var(--chrome-border) 65%)',
    backgroundSize: '240% 100%',
    color: 'transparent !important'
  },
  '.cm-live-card--loading .cm-live-card-title': {
    width: '70%'
  },
  '.cm-live-card--loading .cm-live-card-desc': {
    width: '92%',
    height: '12px'
  },
  /* 失败回退：虚笺 + 原链 + 重试（永不丢内容） */
  '.cm-live-card--fallback': {
    borderStyle: 'dashed'
  },
  '.cm-live-card--fallback:hover': {
    transform: 'none',
    boxShadow: 'none'
  },
  '.cm-live-card-retry': {
    marginLeft: 'auto',
    flex: 'none',
    border: '1px solid color-mix(in oklab, var(--primary-color) 35%, transparent)',
    background: 'transparent',
    color: 'var(--primary-color)',
    fontSize: '12px',
    fontFamily: 'var(--font-sans)',
    borderRadius: '8px',
    padding: '3px 10px',
    cursor: 'pointer',
    transition: INK_TRANSITION
  },
  '.cm-live-card-retry:hover': {
    background: 'color-mix(in oklab, var(--primary-color) 10%, transparent)'
  },
  '.cm-live-card-retry:focus-visible': {
    outline: '2px solid var(--primary-color)',
    outlineOffset: '-2px'
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
  /* 链接：墨水下划——静止 35% 墨色细线（墨色非主题色，书卷气），hover 满墨 */
  '.cm-live-linktext': {
    color: 'var(--text-primary)',
    textDecoration: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '4px',
    textDecorationColor: 'color-mix(in oklab, var(--text-primary) 35%, transparent)',
    cursor: 'pointer',
    transition: INK_TRANSITION
  },
  '.cm-live-linktext:hover': {
    textDecorationColor: 'var(--text-primary)'
  },
  /* 链接 url 在渲染态隐藏（hover title 提示 + Ctrl/Cmd+点击打开），不再显示原文 */
  '.cm-live-table': {
    background: 'color-mix(in oklab, var(--chrome-raised) 40%, transparent)',
    transition: INK_TRANSITION
  },

  /* ===== L4 交互元素（20260927-feature-editor-interactions；墨水层次 token） ===== */

  /* GFM 任务列表渲染态 checkbox（点击改写源码，字节保真） */
  '.cm-live-taskbox': {
    display: 'inline-block',
    width: '13px',
    height: '13px',
    boxSizing: 'border-box',
    border: '1.5px solid color-mix(in oklab, var(--chrome-border) 90%, transparent)',
    borderRadius: '4px',
    verticalAlign: '-2px',
    cursor: 'pointer',
    position: 'relative',
    transition: INK_TRANSITION
  },
  '.cm-live-taskbox:hover': {
    borderColor: 'var(--primary-color)'
  },
  '.cm-live-taskbox.done': {
    background: 'var(--primary-color)',
    borderColor: 'var(--primary-color)'
  },
  '.cm-live-taskbox.done::after': {
    content: "''",
    position: 'absolute',
    left: '3.5px',
    top: '0.5px',
    width: '4px',
    height: '7px',
    border: 'solid #fff',
    borderWidth: '0 1.5px 1.5px 0',
    transform: 'rotate(42deg)'
  },

  /* HTML 注释标注条 */
  '.cm-live-comment': {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '8px',
    maxWidth: '100%',
    padding: '3px 12px',
    border: '1px dashed color-mix(in oklab, var(--chrome-border) 75%, transparent)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: INK_TRANSITION
  },
  '.cm-live-comment-tag': {
    flex: 'none',
    fontSize: '10px',
    letterSpacing: '1px',
    color: 'var(--text-muted)',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 70%, transparent)',
    borderRadius: '3px',
    padding: '0 5px'
  },
  '.cm-live-comment-text': {
    fontSize: '12px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  /* 脚注：引用上标墨色（无跳转）；定义行分节 */
  '.cm-live-footref': {
    fontSize: '0.78em',
    verticalAlign: 'super',
    lineHeight: '0',
    color: 'var(--primary-color)'
  },
  '.cm-live-footdef': {
    borderTop: '1px solid color-mix(in oklab, var(--chrome-border) 55%, transparent)',
    marginTop: '14px',
    paddingTop: '6px',
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },

  /* 标题折叠：hover 箭头（行首浮现）+ 折叠占位条 */
  '.cm-live-foldchev': {
    display: 'inline-block',
    width: '14px',
    marginLeft: '-14px',
    color: 'var(--text-muted)',
    opacity: '0',
    cursor: 'pointer',
    transition: 'opacity var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out)'
  },
  '.cm-line:hover .cm-live-foldchev': {
    opacity: '1'
  },
  '.cm-live-foldchev:hover': {
    color: 'var(--primary-color)'
  },
  '.cm-live-fold': {
    display: 'inline-block',
    margin: '2px 0',
    padding: '2px 12px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    background: 'color-mix(in oklab, var(--chrome-raised) 55%, transparent)',
    border: '1px solid color-mix(in oklab, var(--chrome-border) 55%, transparent)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: INK_TRANSITION
  },
  '.cm-live-fold:hover': {
    color: 'var(--text-primary)',
    borderColor: 'color-mix(in oklab, var(--primary-color) 40%, transparent)'
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
