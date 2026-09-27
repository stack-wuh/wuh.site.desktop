/**
 * L3 渲染 widget（20260923-feature-cm-live-preview）：CM6 WidgetType 子类，
 * 负责非光标行的块级/行内替换呈现——图片内联缩略图、KaTeX 公式渲染态、
 * mermaid 图渲染态、分割线、围栏语言标头。异步库（katex/mermaid）经动态
 * import 惰性分块（首块出现才加载，离线可用），加载失败一律回退纯文本。
 * 点击公式块把光标送回块内 → decorations 检测到光标行后自动换回源码态。
 */
import { EditorState, StateEffect } from '@codemirror/state'
import { EditorView, WidgetType } from '@codemirror/view'
import { isExternalRef, toFileUrl } from '@shared/url'
import { toggleTaskLine } from '../../lib/editor-cm'
import { storedLocale, translateText } from '../../lib/i18n/locales'

/** 标题折叠状态效果（fold StateField 消费； widgets 层定义避免与 decorations 循环依赖） */
export const wdFoldEffect = StateEffect.define<{ line: number; fold: boolean }>()

/** 由 widget DOM 反查所属编辑器实例（MathWidget 先例：EditorView.findFromDOM） */
function findView(el: HTMLElement): EditorView | null {
  return EditorView.findFromDOM(el)
}

/** 相对图片引用 → local-resource 绝对地址（与 PreviewPane 同一解析链） */
export function resolveImageUrl(src: string, root: string | null, docPath: string | null): string {
  if (!src || isExternalRef(src)) return src
  if (!root || !docPath) return src
  const docDir = docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/')) : ''
  try {
    return toFileUrl(root, docDir, src)
  } catch {
    return src
  }
}

/** 图片内联大图：点击派发 lightbox 事件（MarkdownEditor portal 承载）；加载失败显示占位 */
export class ImageWidget extends WidgetType {
  constructor(
    readonly alt: string,
    readonly src: string,
    readonly root: string | null,
    readonly docPath: string | null
  ) {
    super()
  }

  eq(other: ImageWidget): boolean {
    return other.alt === this.alt && other.src === this.src && other.root === this.root
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'cm-live-img'
    const img = document.createElement('img')
    img.alt = this.alt
    img.src = resolveImageUrl(this.src, this.root, this.docPath)
    img.loading = 'lazy'
    img.addEventListener('click', () => {
      window.dispatchEvent(
        new CustomEvent('wd-editor-lightbox', {
          detail: { src: img.src, alt: this.alt }
        })
      )
    })
    img.addEventListener('error', () => {
      wrap.classList.add('cm-live-img--broken')
      wrap.textContent = this.alt || this.src || 'image'
    })
    wrap.appendChild(img)
    return wrap
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** GFM 任务列表渲染态 checkbox：点击经 toggleTaskLine 纯函数改写源码（字节保真） */
export class TaskToggleWidget extends WidgetType {
  constructor(
    /** CM 1-based 行号（装饰重建即刷新，点击时重读行文本，脏则 no-op） */
    readonly lineNo: number,
    readonly checked: boolean
  ) {
    super()
  }

  eq(other: TaskToggleWidget): boolean {
    return other.lineNo === this.lineNo && other.checked === this.checked
  }

  toDOM(): HTMLElement {
    const box = document.createElement('span')
    box.className = 'cm-live-taskbox' + (this.checked ? ' done' : '')
    box.setAttribute('role', 'checkbox')
    box.setAttribute('aria-checked', String(this.checked))
    box.setAttribute('aria-label', translateText(storedLocale(), 'editor.taskToggle'))
    box.addEventListener('click', () => {
      const view = findView(box)
      if (!view) return
      const line = view.state.doc.line(this.lineNo)
      const next = toggleTaskLine(line.text)
      if (next == null || next === line.text) return
      view.dispatch({ changes: { from: line.from, to: line.to, insert: next } })
    })
    return box
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** 标题折叠箭头（hover 浮现，点击折叠本节） */
export class FoldChevronWidget extends WidgetType {
  constructor(readonly lineNo: number) {
    super()
  }

  eq(other: FoldChevronWidget): boolean {
    return other.lineNo === this.lineNo
  }

  toDOM(): HTMLElement {
    const chev = document.createElement('span')
    chev.className = 'cm-live-foldchev'
    chev.setAttribute('role', 'button')
    chev.setAttribute('aria-label', translateText(storedLocale(), 'editor.foldAction'))
    chev.textContent = '▸'
    chev.addEventListener('click', () => {
      const view = findView(chev)
      if (!view) return
      view.dispatch({ effects: wdFoldEffect.of({ line: this.lineNo - 1, fold: true }) })
    })
    return chev
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** 折叠占位条：整段内容行替换，点击展开 */
export class FoldPlaceholderWidget extends WidgetType {
  constructor(
    readonly startLine: number,
    readonly count: number
  ) {
    super()
  }

  eq(other: FoldPlaceholderWidget): boolean {
    return other.startLine === this.startLine && other.count === this.count
  }

  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'cm-live-fold'
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', translateText(storedLocale(), 'editor.foldLines', { count: this.count }))
    el.textContent = translateText(storedLocale(), 'editor.foldLines', { count: this.count })
    el.addEventListener('click', () => {
      const view = findView(el)
      if (!view) return
      view.dispatch({ effects: wdFoldEffect.of({ line: this.startLine, fold: false }) })
      view.focus()
    })
    return el
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** HTML 注释标注条：整块替换为淡色标注（点击回源码态展开） */
export class CommentWidget extends WidgetType {
  constructor(
    readonly text: string,
    /** 点击时把光标送回的位置（注释块首行行首绝对偏移） */
    readonly at: number
  ) {
    super()
  }

  eq(other: CommentWidget): boolean {
    return other.text === this.text && other.at === this.at
  }

  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'cm-live-comment'
    const tag = document.createElement('span')
    tag.className = 'cm-live-comment-tag'
    tag.textContent = translateText(storedLocale(), 'editor.commentTag')
    const body = document.createElement('span')
    body.className = 'cm-live-comment-text'
    body.textContent = this.text
    el.append(tag, body)
    el.addEventListener('click', () => {
      const view = findView(el)
      if (!view) return
      view.dispatch({ selection: { anchor: this.at }, scrollIntoView: true })
      view.focus()
    })
    return el
  }

  ignoreEvent(): boolean {
    return false
  }
}

let katexPromise: Promise<{ renderToString(src: string, opts?: Record<string, unknown>): string }> | null = null

function ensureKatex(): Promise<{
  renderToString(src: string, opts?: Record<string, unknown>): string
}> {
  katexPromise ??= import('katex').then((m) => m.default ?? (m as never as { renderToString: never }))
  return katexPromise
}

/** 公式渲染态：KaTeX 排版 HTML；库未就绪前显示源码占位，失败回退源码。点击回源码态 */
export class MathWidget extends WidgetType {
  constructor(
    readonly source: string,
    /** 点击时把光标送回的位置（公式内容行行首绝对偏移） */
    readonly at: number
  ) {
    super()
  }

  eq(other: MathWidget): boolean {
    return other.source === this.source && other.at === this.at
  }

  toDOM(): HTMLElement {
    const block = document.createElement('span')
    block.className = 'cm-live-math'
    block.textContent = this.source
    block.title = '点击编辑'
    block.addEventListener('click', () => {
      const view = EditorView.findFromDOM(block)
      if (!view) return
      view.dispatch({ selection: { anchor: this.at }, scrollIntoView: true })
      view.focus()
    })
    void ensureKatex()
      .then((katex) => {
        block.textContent = ''
        block.innerHTML = katex.renderToString(this.source, {
          throwOnError: false,
          displayMode: false
        })
      })
      .catch((err: unknown) => {
        console.warn('KaTeX 渲染失败，回退源码', err)
      })
    return block
  }

  ignoreEvent(): boolean {
    return false
  }
}

type MermaidLike = {
  initialize(opts: Record<string, unknown>): void
  render(id: string, text: string): Promise<{ svg: string }>
}

let mermaidPromise: Promise<MermaidLike> | null = null

function ensureMermaid(): Promise<MermaidLike> {
  mermaidPromise ??= import('mermaid').then((m) => {
    const mermaid = (m.default ?? m) as MermaidLike
    const dark = document.documentElement.dataset.colorScheme === 'dark'
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'neutral' })
    return mermaid
  })
  return mermaidPromise
}

let mermaidSeq = 0

/** mermaid 渲染态：代码块内容行整体替换为 SVG；失败回退源码 */
export class MermaidWidget extends WidgetType {
  constructor(readonly source: string) {
    super()
  }

  eq(other: MermaidWidget): boolean {
    return other.source === this.source
  }

  toDOM(): HTMLElement {
    const block = document.createElement('span')
    block.className = 'cm-live-mermaid'
    const pre = document.createElement('pre')
    pre.textContent = this.source
    block.appendChild(pre)
    const id = `cm-mermaid-${++mermaidSeq}`
    void ensureMermaid()
      .then((mermaid) => mermaid.render(id, this.source))
      .then(({ svg }) => {
        if (!pre.isConnected) return
        block.classList.add('cm-live-mermaid--ok')
        block.innerHTML = svg
      })
      .catch(() => {
        // 渲染失败保留源码，块级提示语法错误（标题角标变红）
        block.classList.add('cm-live-mermaid--error')
      })
    return block
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** 分割线：整行替换为渐变细线 */
export class HrWidget extends WidgetType {
  eq(other: HrWidget): boolean {
    return true
  }

  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'cm-live-hr'
    el.setAttribute('aria-hidden', 'true')
    return el
  }
}

/** 围栏语言标头：替换开栏行（lang 角标 + 复制按钮）；无语言时仅复制钮 */
export class FenceHeaderWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly code: string
  ) {
    super()
  }

  eq(other: FenceHeaderWidget): boolean {
    return other.lang === this.lang && other.code === this.code
  }

  toDOM(): HTMLElement {
    const head = document.createElement('span')
    head.className = 'cm-live-fence-head'
    if (this.lang) {
      const tag = document.createElement('span')
      tag.className = 'cm-live-fence-lang'
      tag.textContent = this.lang.toUpperCase()
      head.appendChild(tag)
    }
    const copy = document.createElement('button')
    copy.type = 'button'
    copy.className = 'cm-live-fence-copy'
    copy.textContent = '复制'
    copy.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      void navigator.clipboard.writeText(this.code)
      copy.textContent = '已复制'
      setTimeout(() => {
        copy.textContent = '复制'
      }, 1200)
    })
    head.appendChild(copy)
    return head
  }

  ignoreEvent(): boolean {
    return true
  }
}
