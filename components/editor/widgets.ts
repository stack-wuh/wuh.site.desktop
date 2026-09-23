/**
 * L3 渲染 widget（20260923-feature-cm-live-preview）：CM6 WidgetType 子类，
 * 负责非光标行的块级/行内替换呈现——图片内联缩略图、KaTeX 公式渲染态、
 * mermaid 图渲染态、分割线、围栏语言标头。异步库（katex/mermaid）经动态
 * import 惰性分块（首块出现才加载，离线可用），加载失败一律回退纯文本。
 * 点击公式块把光标送回块内 → decorations 检测到光标行后自动换回源码态。
 */
import { EditorView, WidgetType } from '@codemirror/view'
import { isExternalRef, toFileUrl } from '@shared/url'

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

/** 图片内联缩略图：hover 出尺寸角标由 CSS 承担；加载失败显示占位 */
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
