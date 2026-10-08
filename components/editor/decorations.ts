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
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType
} from '@codemirror/view'
import {
  footnoteDefPrefix,
  headingFoldTarget,
  parseBlocks,
  scanInlineMarks,
  selectionLineSet
} from '../../lib/editor-cm'
import { workspaceStore } from '../../lib/store'
import {
  CommentWidget,
  FenceHeaderWidget,
  FoldChevronWidget,
  FoldPlaceholderWidget,
  HrWidget,
  ImageWidget,
  MathWidget,
  MermaidWidget,
  TaskToggleWidget,
  wdFoldEffect
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
  linkUrl: 'cm-live-linkurl',
  footref: 'cm-live-footref'
}

/** 任务列表行：列表标记后的 `[ ]`/`[x]`/`[X]`（改写经 toggleTaskLine，Phase 1 纯逻辑） */
const TASK_MARK_RE = /^(\s*(?:[-*+]|\d{1,9}[.)])\s+)\[([ xX])\]/

/** 文档头 frontmatter 完全隐藏（20261007-feature-frontmatter-editor-hide）：
 * 零尺寸块替换、无占位呈现——展示与修改由 Frontmatter 插件视图承担 */
class FrontmatterHiddenWidget extends WidgetType {
  eq(): boolean {
    return true
  }

  toDOM(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'cm-live-fm-hidden'
    el.setAttribute('aria-hidden', 'true')
    return el
  }

  ignoreEvent(): boolean {
    return true
  }
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

    if (block.kind === 'frontmatter') {
      // 文档头 frontmatter：光标未触及整块完全隐藏（字节不动，展示/修改在 Frontmatter 插件）；
      // 光标进入浮现源码（editor.md「光标触及行保持源码态」设计语义）
      if (!cursorTouches) {
        const first = doc.line(block.fromLine + 1)
        const last = doc.line(block.toLine + 1)
        // 替换须吞掉闭合行后的换行符——否则残留空 view-line（视觉空行）；
        // 闭合行即末行时无换行可吞，钳到文档末尾
        decos.push({
          from: first.from,
          to: Math.min(last.to + 1, doc.length),
          value: Decoration.replace({ widget: new FrontmatterHiddenWidget(), block: true })
        })
        spanLines.forEach((n) => replacedLines.add(n))
      }
      continue
    }

    if (block.kind === 'comment') {
      // HTML 注释：光标未触及时整块收成标注条（预览/导出不渲染，语义一致）；光标进入展开源码
      if (!cursorTouches) {
        const first = doc.line(block.fromLine + 1)
        const last = doc.line(block.toLine + 1)
        const text = spanLines
          .map((n) => docLines[n] ?? '')
          .join(' ')
          .replace(/^\s*<!--/, '')
          .replace(/-->\s*$/, '')
          .trim()
        decos.push({
          from: first.from,
          to: last.to,
          value: Decoration.replace({ widget: new CommentWidget(text, first.from), block: true })
        })
        spanLines.forEach((n) => replacedLines.add(n))
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
        // GFM 任务标记：`[ ]`/`[x]` 替换为可点选 checkbox（改写走 toggleTaskLine 纯函数）
        const tm = TASK_MARK_RE.exec(line.text)
        if (tm) {
          const boxFrom = line.from + tm[1].length
          decos.push({
            from: boxFrom,
            to: boxFrom + tm[2].length + 2,
            value: Decoration.replace({
              widget: new TaskToggleWidget(line.number, tm[2] !== ' ')
            })
          })
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
    // 脚注定义行：分节样式 + 隐藏 `[^id]:` 前缀（不做跳转，语义与预览面板一致）
    const defPrefix = footnoteDefPrefix(text)
    if (defPrefix != null) {
      decos.push({ from: line.from, to: line.from, value: lineCls('cm-live-footdef') })
      decos.push({ from: line.from, to: line.from + defPrefix, value: hidden })
      continue
    }
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
 * 原子区子集：仅 widget replace 装饰（mermaid/公式/图片/圆点/分割线/围栏标头——
 * 不可进入的替换呈现）。mark/hidden/line 装饰若一并原子化，光标会被挡在样式
 * 文本之外、点击一律吸附到 span 边缘（20260924-fix-cm-selection-atomic）。
 */
export function atomicSubset(decos: DecorationSet): DecorationSet {
  return decos.update({ filter: (_from, _to, value) => value.spec?.widget != null })
}

/**
 * 标题折叠状态（0 起标题行号集合）。重建契约与 livePreviewField 同源：
 * doc/selection 事务即重算，selection 触及折叠区自动展开；docChanged 清空
 * 折叠（v1 语义：文档结构变化后折叠目标不可信）。不持久化（v1 视图内存活）。
 */
function foldDecorations(state: EditorState, folded: ReadonlySet<number>): DecorationSet {
  if (!folded.size) return Decoration.none
  const doc = state.doc
  const blocks = parseBlocks(doc.toString())
  const decos: Deco[] = []
  for (const startLine of folded) {
    const block = blocks.find((b) => b.kind === 'heading' && b.fromLine === startLine)
    if (!block || block.kind !== 'heading') continue
    const target = headingFoldTarget(blocks, block.fromLine, block.level ?? 1, doc.lines)
    if (!target) continue
    const count = target.toLine - target.fromLine + 1
    decos.push({
      from: doc.line(target.fromLine + 1).from,
      to: doc.line(target.toLine + 1).to,
      value: Decoration.replace({
        widget: new FoldPlaceholderWidget(block.fromLine, count),
        block: true
      })
    })
  }
  return Decoration.set(
    decos.map((d) => d.value.range(d.from, d.to)),
    true
  )
}

/** 测试/调试辅助：读取 view 当前折叠占位装饰集（foldField 的 widget replace 子集） */
export function wdFoldRangesForTest(view: EditorView): DecorationSet {
  return foldDecorations(view.state, view.state.field(foldField))
}

export const foldField = StateField.define<Set<number>>({
  create: () => new Set<number>(),
  update(folded, tr) {
    let next = folded
    let changed = false
    for (const effect of tr.effects) {
      if (effect.is(wdFoldEffect)) {
        if (!changed) {
          next = new Set(folded)
          changed = true
        }
        if (effect.value.fold) next.add(effect.value.line)
        else next.delete(effect.value.line)
      }
    }
    if (tr.docChanged) return new Set<number>()
    if (tr.selection && folded.size) {
      // 光标进入折叠区 → 自动展开（selection 事务本就触发装饰重建）
      const doc = tr.state.doc
      const blocks = parseBlocks(doc.toString())
      const sel = tr.selection.main
      for (const startLine of folded) {
        const block = blocks.find((b) => b.kind === 'heading' && b.fromLine === startLine)
        if (!block || block.kind !== 'heading') continue
        const target = headingFoldTarget(blocks, block.fromLine, block.level ?? 1, doc.lines)
        if (!target) continue
        const from = doc.line(target.fromLine + 1).from
        const to = doc.line(target.toLine + 1).to
        if (sel.from < to && sel.to > from) {
          if (!changed) {
            next = new Set(folded)
            changed = true
          }
          next.delete(startLine)
        }
      }
    }
    return next
  },
  provide: (field) => [
    // 折叠占位（widget replace 块级替换）+ 标题折叠箭头（每标题行首，hover 浮现）。
    // 依赖 'doc'：文档变化即重算，避免行号漂移导致的装饰越界。
    EditorView.decorations.compute([field, 'doc'], (state) => {
      const folded = state.field(field)
      const decos: Deco[] = []
      if (folded.size) {
        const set = foldDecorations(state, folded)
        set.between(0, state.doc.length, (from, to, value) => {
          decos.push({ from, to, value })
        })
      }
      if (state.doc.length) {
        const blocks = parseBlocks(state.doc.toString())
        for (const block of blocks) {
          if (block.kind !== 'heading') continue
          const line = state.doc.line(block.fromLine + 1)
          decos.push({
            from: line.from,
            to: line.from,
            value: Decoration.widget({ widget: new FoldChevronWidget(line.number), side: -1 })
          })
        }
      }
      return Decoration.set(
        decos.map((d) => d.value.range(d.from, d.to)),
        true
      )
    }),
    // 原子区：本域全部为 widget replace（占位条），契约「只供 widget 子集」天然满足
    EditorView.atomicRanges.compute([field, 'doc'], (state) => {
      const set = foldDecorations(state, state.field(field))
      return () => set
    })
  ]
})

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
    // atomicRanges 的供给形态是 (view) => RangeSet：闭包持有本状态代的装饰集，
    // 经 atomicSubset 收窄为仅 widget replace（整集供给会锁死样式文本的光标）
    EditorView.atomicRanges.from(field, (decos) => () => atomicSubset(decos))
  ]
})
