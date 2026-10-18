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
import type { LinkMeta } from '@shared/types'
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

/** GFM 管道行 → 单元格数组（剥首尾围管后按 | 切分；`\|` 转义 v1 不支持） */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}

/** 表格渲染态：GFM 管道表 → 真 <table>（素笺表格样式见 renderTheme）。点击回源码态（公式块先例） */
export class TableWidget extends WidgetType {
  constructor(
    readonly source: string,
    /** 点击时把光标送回的位置（表格块首行行首绝对偏移） */
    readonly at: number
  ) {
    super()
  }

  eq(other: TableWidget): boolean {
    return other.source === this.source && other.at === this.at
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'cm-live-table-wrap'
    const rows = this.source.split('\n').map(splitTableRow)
    const table = document.createElement('table')
    table.className = 'cm-live-table'
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    for (const cell of rows[0] ?? []) {
      const th = document.createElement('th')
      th.textContent = cell
      headRow.appendChild(th)
    }
    thead.appendChild(headRow)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    for (const row of rows.slice(2)) {
      if (row.length === 1 && row[0] === '') continue
      const tr = document.createElement('tr')
      const width = rows[0]?.length ?? 0
      for (let c = 0; c < width; c++) {
        const td = document.createElement('td')
        td.textContent = row[c] ?? ''
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    wrap.appendChild(table)
    wrap.title = '点击编辑'
    wrap.addEventListener('click', () => {
      const view = EditorView.findFromDOM(wrap)
      if (!view) return
      view.dispatch({ selection: { anchor: this.at }, scrollIntoView: true })
      view.focus()
    })
    return wrap
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

// ===== 笺条（素笺手记 20261014-feature-editor-paper-rebuild）=====

/** 笺条元数据会话缓存（渲染层内存；持久缓存在主进程 linkMeta，INV-6） */
const cardMetaCache = new Map<string, LinkMeta>()

function cardDomainOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const CARD_SEAL_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2Z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>'

/**
 * 笺条卡片：独立链接行/裸 URL 行的整行替换呈现（签名元素）。
 * 折角 + 站印 + 笺题（衬线）+ 摘语 + 域名；元数据经 fetchLinkMeta IPC 异步取
 * （会话缓存命中即显），加载中骨架、失败回退虚笺 + 重试——正文永不因抓取失败丢失。
 * 点击经 openExternal 外开（仅 http/https，检测层已钳制）；编辑经键盘光标进入
 * 该行（光标行源码态，装饰层契约）。
 */
export class CardWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly title: string
  ) {
    super()
  }

  eq(other: CardWidget): boolean {
    return other.url === this.url && other.title === this.title
  }

  toDOM(): HTMLElement {
    const a = document.createElement('a')
    a.className = 'cm-live-card'
    a.href = this.url
    a.setAttribute('title', this.url)

    const seal = document.createElement('span')
    seal.className = 'cm-live-card-seal'
    seal.innerHTML = CARD_SEAL_SVG
    const body = document.createElement('span')
    body.className = 'cm-live-card-body'
    const title = document.createElement('span')
    title.className = 'cm-live-card-title'
    const desc = document.createElement('span')
    desc.className = 'cm-live-card-desc'
    const meta = document.createElement('span')
    meta.className = 'cm-live-card-meta'
    body.append(title, desc, meta)
    a.append(seal, body)

    const fill = (m: LinkMeta): void => {
      title.textContent = m.title || this.title || this.url
      title.classList.remove('cm-live-card-skeleton')
      if (m.description) {
        desc.textContent = m.description
        desc.style.display = ''
      } else {
        desc.style.display = 'none'
      }
      meta.textContent = ''
      if (m.favicon) {
        const fav = document.createElement('img')
        fav.className = 'cm-live-card-favicon'
        fav.alt = ''
        fav.loading = 'lazy'
        fav.addEventListener('error', () => fav.remove())
        fav.src = m.favicon
        meta.appendChild(fav)
      }
      meta.appendChild(document.createTextNode(cardDomainOf(this.url)))
    }

    const showFallback = (): void => {
      a.classList.remove('cm-live-card--loading')
      a.classList.add('cm-live-card--fallback')
      title.classList.remove('cm-live-card-skeleton')
      desc.classList.remove('cm-live-card-skeleton')
      title.textContent = this.url
      desc.style.display = 'none'
      meta.textContent = ''
      const retry = document.createElement('button')
      retry.type = 'button'
      retry.className = 'cm-live-card-retry'
      retry.textContent = translateText(storedLocale(), 'editor.cardRetry')
      retry.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        load()
      })
      meta.appendChild(retry)
    }

    const load = (): void => {
      a.classList.remove('cm-live-card--fallback')
      a.classList.add('cm-live-card--loading')
      title.textContent = this.title || this.url
      title.classList.add('cm-live-card-skeleton')
      desc.style.display = ''
      desc.textContent = ''
      desc.classList.add('cm-live-card-skeleton')
      meta.textContent = ''
      const cached = cardMetaCache.get(this.url)
      const apply = (m: LinkMeta): void => {
        if (!a.isConnected) return
        cardMetaCache.set(this.url, m)
        a.classList.remove('cm-live-card--loading')
        desc.classList.remove('cm-live-card-skeleton')
        fill(m)
      }
      if (cached) {
        apply(cached)
        return
      }
      // 宿主 API 未就绪（测试/异常环境）：直接回退虚笺，正文内容不受影响
      if (typeof window === 'undefined' || !window.api?.fetchLinkMeta) {
        showFallback()
        return
      }
      window.api
        .fetchLinkMeta(this.url)
        .then(apply)
        .catch(() => {
          if (a.isConnected) showFallback()
        })
    }
    load()

    a.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      void window.api.openExternal(this.url)
    })
    return a
  }

  ignoreEvent(): boolean {
    return true
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
