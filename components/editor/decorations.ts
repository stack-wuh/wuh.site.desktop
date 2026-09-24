/**
 * L3 即时渲染装饰层（20260923-feature-cm-live-preview）：把 lib/editor-cm 的
 * 纯逻辑（块结构 / 光标行集合 / 行内标记）落成 DecorationSet。
 * 规则（设计稿 PART 1）：光标触及的行一律保持源码态（符号浮现），其余行——
 * 标题加级、引用竖线、围栏换语言标头、mermaid/公式块整体换渲染 widget、
 * 列表符换主题色圆点、分割线换渐变线、图片换内联缩略图、行内符号隐藏 + 内容分色。
 * 渲染失败/库未就绪一律回退源码；纯装饰不改变文档内容与双通道行为。
 *
 * 实现注记：装饰集必须经 StateField 直供（EditorView.decorations.from）——
 * CM 禁止插件函数式提供跨行 replace 装饰（RangeError: "Decorations that
 * replace line breaks may not be specified via plugins"），mermaid/公式块的
 * 多行块替换只有直供合法；doc/selection 事务即重建。line decoration 一律
 * 零长挂行首（非零长 CM 直接抛 RangeError）。
 */
import { EditorState, StateField, type Transaction } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { parseBlocks, scanInlineMarks, selectionLineSet } from '../../lib/editor-cm'
import { workspaceStore } from '../../lib/store'
import {
  FenceHeaderWidget,
  HrWidget,
  ImageWidget,
  MathWidget,
  MermaidWidget
} from './widgets'

const hidden = Decoration.mark({ class: 'cm-live-hidden' })
const lineCls = (cls: string): Decoration => Decoration.line({ class: cls })
const markCls = (cls: string): Decoration => Decoration.mark({ class: cls })

const INLINE_CLASS: Record<string, string> = {
  strong: 'cm-live-strong',
  em: 'cm-live-em',
  code: 'cm-live-code',
  del: 'cm-live-del',
  linkText: 'cm-live-linktext',
  linkUrl: 'cm-live-linkurl'
}

interface Deco {
  from: number
  to: number
  value: Decoration
}

/** 行文本前缀正则 */
const PREFIX = {
  heading: /^#{1,6}\s+/,
  quote: /^\s{0,3}>+\s?/,
  list: /^(\s*)([-*+]|\d{1,9}[.)])(\s+)/,
  fenceClose: /^\s{0,3}(?:`{3,}|~{3,})\s*$/
}

function buildDecorations(state: EditorState): DecorationSet {
  const doc = state.doc
  const docLines = doc.toString().split('\n')
  const cursorLines = selectionLineSet(state)
  const blocks = parseBlocks(doc.toString())
  const decos: Deco[] = []
  /** 被块级 widget 替换的行：行内扫描跳过（避免重叠装饰） */
  const replacedLines = new Set<number>()

  const contentLinesOf = (block: (typeof blocks)[number]): number[] => {
    const out: number[] = []
    for (let n = block.contentFromLine ?? 0; n <= (block.contentToLine ?? -1); n++) out.push(n)
    return out
  }

  for (const block of blocks) {
    const spanLines: number[] = []
    for (let n = block.fromLine; n <= block.toLine; n++) spanLines.push(n)
    const cursorTouches = spanLines.some((n) => cursorLines.has(n))

    if (block.kind === 'heading' && !cursorTouches) {
      const line = doc.line(block.fromLine + 1)
      const prefix = PREFIX.heading.exec(line.text)?.[0]
      // line decoration 必须零长挂行首（非零长 CM 抛 RangeError）
      decos.push({ from: line.from, to: line.from, value: lineCls(`cm-live-heading cm-live-h${block.level}`) })
      if (prefix) {
        decos.push({ from: line.from, to: line.from + prefix.length, value: hidden })
      }
      continue
    }

    if (block.kind === 'quote') {
      for (const n of spanLines) {
        const line = doc.line(n + 1)
        decos.push({ from: line.from, to: line.from, value: lineCls('cm-live-quote') })
        if (!cursorLines.has(n)) {
          const prefix = PREFIX.quote.exec(line.text)?.[0]
          if (prefix) decos.push({ from: line.from, to: line.from + prefix.length, value: hidden })
        }
      }
      continue
    }

    if (block.kind === 'fence') {
      const openLine = doc.line(block.fromLine + 1)
      const contents = contentLinesOf(block)
      const closeLineNo = block.toLine
      const contentCursor = contents.some((n) => cursorLines.has(n))
      const isMermaid = (block.lang ?? '').toLowerCase() === 'mermaid'
      if (isMermaid && !contentCursor && contents.length > 0) {
        const first = doc.line(contents[0] + 1)
        const last = doc.line(contents[contents.length - 1] + 1)
        const source = contents.map((n) => docLines[n]).join('\n')
        decos.push({
          from: first.from,
          to: last.to,
          value: Decoration.replace({ widget: new MermaidWidget(source), block: true })
        })
        contents.forEach((n) => replacedLines.add(n))
      } else if (!cursorLines.has(block.fromLine) && contents.length > 0) {
        const code = contents.map((n) => docLines[n]).join('\n')
        decos.push({
          from: openLine.from,
          to: openLine.to,
          value: Decoration.replace({ widget: new FenceHeaderWidget(block.lang ?? '', code) })
        })
        replacedLines.add(block.fromLine)
      }
      for (const n of contents) {
        const line = doc.line(n + 1)
        decos.push({ from: line.from, to: line.from, value: lineCls('cm-live-fence') })
      }
      if (!cursorLines.has(closeLineNo) && closeLineNo !== block.fromLine) {
        const closeLine = doc.line(closeLineNo + 1)
        if (PREFIX.fenceClose.test(closeLine.text)) {
          decos.push({ from: closeLine.from, to: closeLine.to, value: hidden })
        }
      }
      continue
    }

    if (block.kind === 'math') {
      const contents = contentLinesOf(block)
      const contentCursor = contents.some((n) => cursorLines.has(n))
      const openLine = doc.line(block.fromLine + 1)
      const closeLineNo = block.toLine
      if (!contentCursor && contents.length > 0) {
        const first = doc.line(contents[0] + 1)
        const last = doc.line(contents[contents.length - 1] + 1)
        const source = contents.map((n) => docLines[n]).join('\n').trim()
        decos.push({
          from: first.from,
          to: last.to,
          value: Decoration.replace({ widget: new MathWidget(source, first.from), block: true })
        })
        contents.forEach((n) => replacedLines.add(n))
        decos.push({ from: openLine.from, to: openLine.to, value: hidden })
        if (closeLineNo !== openLine.number - 1) {
          const closeLine = doc.line(closeLineNo + 1)
          decos.push({ from: closeLine.from, to: closeLine.to, value: hidden })
        }
      }
      continue
    }

    if (block.kind === 'list') {
      for (const n of spanLines) {
        const line = doc.line(n + 1)
        decos.push({ from: line.from, to: line.from, value: lineCls('cm-live-list') })
        if (cursorLines.has(n)) continue
        const m = PREFIX.list.exec(line.text)
        if (!m) continue
        const markFrom = line.from + m[1].length
        const markTo = markFrom + m[2].length
        if (/[-*+]/.test(m[2])) {
          decos.push({
            from: markFrom,
            to: markTo,
            value: Decoration.replace({ widget: new BulletWidget() })
          })
        } else {
          decos.push({ from: markFrom, to: markTo, value: markCls('cm-live-olnum') })
        }
      }
      continue
    }

    if (block.kind === 'hr') {
      const line = doc.line(block.fromLine + 1)
      if (!cursorTouches) {
        decos.push({
          from: line.from,
          to: line.to,
          value: Decoration.replace({ widget: new HrWidget(), block: true })
        })
      }
      continue
    }

    if (block.kind === 'table') {
      for (const n of spanLines) {
        const line = doc.line(n + 1)
        decos.push({ from: line.from, to: line.from, value: lineCls('cm-live-table') })
      }
      continue
    }
  }

  // 行内装饰：光标行与块级替换行之外逐行扫描
  for (let n = 1; n <= doc.lines; n++) {
    if (cursorLines.has(n - 1) || replacedLines.has(n - 1)) continue
    const line = doc.line(n)
    const text = docLines[n - 1]
    if (!text || text.startsWith('```') || text.startsWith('~~~')) continue
    const scan = scanInlineMarks(text, line.from)
    for (const sym of scan.symbols) {
      decos.push({ from: sym.from, to: sym.to, value: hidden })
    }
    for (const style of scan.styled) {
      if (style.kind === 'image') {
        const raw = doc.sliceString(style.from, style.to)
        const m = /^!\[([^\]]*)\]\(([^)]*)\)$/.exec(raw)
        if (m) {
          const ws = workspaceStore.get()
          decos.push({
            from: style.from,
            to: style.to,
            value: Decoration.replace({
              widget: new ImageWidget(m[1], m[2], ws.root, ws.activePath),
              block: false
            })
          })
        }
        continue
      }
      const cls = INLINE_CLASS[style.kind]
      if (cls) decos.push({ from: style.from, to: style.to, value: markCls(cls) })
    }
  }

  return Decoration.set(
    decos.map((d) => d.value.range(d.from, d.to)),
    true
  )
}

/** 无序列表圆点（主题色） */
class BulletWidget extends WidgetType {
  eq(): boolean {
    return true
  }

  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'cm-live-bullet'
    el.setAttribute('aria-hidden', 'true')
    return el
  }

  ignoreEvent(): boolean {
    return true
  }
}

/** 装饰重建条件：doc/selection 变化的事务，或 Compartment 重配（开关切入渲染态时装饰集须立即重建） */
function rebuildNeeded(tr: Transaction): boolean {
  return tr.docChanged || tr.selection != null || tr.reconfigured
}

/**
 * L3 装饰扩展：StateField 直供装饰集与原子区（mermaid/公式块的跨行 replace
 * 只有直供合法）。挂载即参与渲染管线，卸载（纯源码态 Compartment 切空）零残留。
 */
export const livePreviewField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    if (!rebuildNeeded(tr)) return value
    return buildDecorations(tr.state)
  },
  provide: (field) => [
    EditorView.decorations.from(field),
    // atomicRanges 的供给形态是 (view) => RangeSet：闭包持有本状态代的装饰集
    EditorView.atomicRanges.from(field, (decos) => () => decos)
  ]
})
