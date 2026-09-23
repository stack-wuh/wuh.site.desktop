/**
 * CM6 命令适配层（host 侧纯逻辑，无 DOM 依赖可独立测试）——把胶囊命令通道的
 * 语义映射为 CodeMirror 6 TransactionSpec：
 * - 格式化/链接复用 store 的 applyMarkdownInsert（位置计算唯一事实源），
 *   以整文档替换事务落位（命令低频，一次 undo 步，选区语义与 textarea 时代一致）；
 * - 外部注入（openDoc/startDraft/插件帧 doc.set）全量替换并保留光标 head（越界收敛），
 *   防回环守卫（内容比对）在 MarkdownEditor 组件侧以 pushedRef 承担；
 * - 大纲跳转把 parseOutline 的行号换算为标题行行首绝对偏移。
 */
import { EditorSelection, type EditorState, type Text, type TransactionSpec } from '@codemirror/state'
import { applyMarkdownInsert, type MarkdownInsertAction } from './store'
import { INSERT_SNIPPETS, parseOutline } from './editor-info'

export function cmApplyFormat(state: EditorState, action: MarkdownInsertAction): TransactionSpec {
  const range = state.selection.main
  const result = applyMarkdownInsert(
    state.doc.toString(),
    range.from,
    range.to,
    action
  )
  return {
    changes: { from: 0, to: state.doc.length, insert: result.content },
    selection: EditorSelection.range(result.selStart, result.selEnd)
  }
}

export function cmInsertSnippet(
  state: EditorState,
  snippet: keyof typeof INSERT_SNIPPETS
): TransactionSpec {
  const text = INSERT_SNIPPETS[snippet]
  const at = state.selection.main.to
  return {
    changes: { from: at, insert: text },
    selection: EditorSelection.cursor(at + text.length)
  }
}

export function cmExternalContent(state: EditorState, content: string | null): TransactionSpec {
  const next = content ?? ''
  if (next === state.doc.toString()) return {}
  const head = Math.min(state.selection.main.head, next.length)
  return {
    changes: { from: 0, to: state.doc.length, insert: next },
    selection: EditorSelection.cursor(head)
  }
}

/** parseOutline 序号 → 标题行行首绝对偏移；序号无效返回 null（调用方不消费） */
export function cmHeadingCursor(doc: Text, index: number): number | null {
  const item = parseOutline(doc.toString())[index]
  if (!item || index < 0) return null
  return doc.line(item.line + 1).from
}

// ===== L3 即时渲染纯逻辑（20260923-feature-cm-live-preview）=====
// 行级块结构 / 光标行集合 / 行内标记扫描——decorations 层（components/editor）
// 的事实源，全部无 DOM 依赖可独立测试。

export type BlockKind = 'heading' | 'quote' | 'fence' | 'list' | 'hr' | 'math' | 'table'

export interface BlockSpan {
  kind: BlockKind
  /** 起止行号（0 起，含端点） */
  fromLine: number
  toLine: number
  /** heading 层级 1-6 */
  level?: number
  /** fence 语言标记 */
  lang?: string
  /** fence/math 的内容行区间（不含围栏行本身；未闭合时延伸到文末） */
  contentFromLine?: number
  contentToLine?: number
}

const FENCE_OPEN_RE = /^\s{0,3}(`{3,}|~{3,})\s*(\S*)/
const HEADING_RE = /^\s{0,3}(#{1,6})\s+/
const QUOTE_RE = /^\s{0,3}>/
const LIST_RE = /^\s*(?:[-*+]|\d{1,9}[.)])\s/
const HR_RE = /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/
const MATH_RE = /^\s{0,3}\$\$\s*$/
const TABLE_RE = /^\s{0,3}\|/

/**
 * 行级块结构解析（与 parseOutline 同一围栏约定：围栏内一律视为围栏内容）。
 * `---` 统一按 hr 装饰（不区分 setext 下划线——装饰层语义差异可忽略）。
 */
export function parseBlocks(content: string): BlockSpan[] {
  if (!content) return []
  const lines = content.split(/\r?\n/)
  const blocks: BlockSpan[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const fence = line.match(FENCE_OPEN_RE)
    if (fence) {
      const mark = fence[1]
      const closeRe = new RegExp(`^\\s{0,3}\\${mark[0]}{${mark.length},}\\s*$`)
      let j = i + 1
      while (j < lines.length && !closeRe.test(lines[j])) j++
      const closed = j < lines.length
      const toLine = closed ? j : lines.length - 1
      blocks.push({
        kind: 'fence',
        fromLine: i,
        toLine,
        lang: fence[2] ?? '',
        contentFromLine: i + 1,
        contentToLine: closed ? toLine - 1 : toLine
      })
      i = toLine + 1
      continue
    }
    if (MATH_RE.test(line)) {
      let j = i + 1
      while (j < lines.length && !MATH_RE.test(lines[j])) j++
      const closed = j < lines.length
      const toLine = closed ? j : lines.length - 1
      blocks.push({
        kind: 'math',
        fromLine: i,
        toLine,
        contentFromLine: i + 1,
        contentToLine: closed ? toLine - 1 : toLine
      })
      i = toLine + 1
      continue
    }
    const heading = line.match(HEADING_RE)
    if (heading) {
      blocks.push({ kind: 'heading', fromLine: i, toLine: i, level: heading[1].length })
      i++
      continue
    }
    if (HR_RE.test(line)) {
      blocks.push({ kind: 'hr', fromLine: i, toLine: i })
      i++
      continue
    }
    if (QUOTE_RE.test(line) || LIST_RE.test(line) || TABLE_RE.test(line)) {
      const kind: BlockKind = QUOTE_RE.test(line) ? 'quote' : TABLE_RE.test(line) ? 'table' : 'list'
      let j = i + 1
      while (j < lines.length) {
        if (kind === 'quote' && !QUOTE_RE.test(lines[j])) break
        if (kind === 'table' && !TABLE_RE.test(lines[j])) break
        if (kind === 'list' && !LIST_RE.test(lines[j])) break
        j++
      }
      blocks.push({ kind, fromLine: i, toLine: j - 1 })
      i = j
      continue
    }
    i++
  }
  return blocks
}

/** 光标行集合：所有选区触及的行号（0 起）——这些行保持源码态（符号浮现） */
export function selectionLineSet(state: EditorState): Set<number> {
  const set = new Set<number>()
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number
    const last = state.doc.lineAt(range.to).number
    for (let n = first; n <= last; n++) set.add(n - 1)
  }
  return set
}

export type InlineStyleKind =
  | 'strong'
  | 'em'
  | 'code'
  | 'del'
  | 'linkText'
  | 'linkUrl'
  | 'image'

export interface InlineScan {
  /** 语法标记符区间（绝对偏移）：光标行外隐藏、光标行内保留 */
  symbols: { from: number; to: number }[]
  /** 内容样式区间（绝对偏移）：装饰层按 kind 挂 mark 高亮 */
  styled: { from: number; to: number; kind: InlineStyleKind }[]
}

// 交替顺序即优先级：code 原子 > image（先于 link，! 前缀整体原子）> strong > del > em > link
const INLINE_RE =
  /(`[^`\n]+`)|(!\[[^\]\n]*\]\([^)\n]*\))|(\*\*(?=\S)[^\n]*?\S\*\*)|(~~(?=\S)[^\n]*?\S~~)|(\*(?=\S)[^\n]*?\S\*)|(\[[^\]\n]*\]\([^)\n]*\))/g

/**
 * 行内标记扫描（装饰性扫描，非 markdown 规范解析器）：不完整/未闭合标记不产出
 * 区间；行内代码为原子样式不拆符号；下划线式粗斜体不处理（CJK 写作低频，
 * markdown-it 默认同样关闭词内下划线）。
 */
export function scanInlineMarks(line: string, base: number): InlineScan {
  const scan: InlineScan = { symbols: [], styled: [] }
  if (!line) return scan
  for (const m of line.matchAll(INLINE_RE)) {
    const b = base + (m.index ?? 0)
    const text = m[0]
    if (m[1]) {
      scan.styled.push({ from: b, to: b + text.length, kind: 'code' })
    } else if (m[2]) {
      // 图片整段原子：非光标行由 widget 整体替换，无符号区间
      scan.styled.push({ from: b, to: b + text.length, kind: 'image' })
    } else if (m[3] || m[4]) {
      scan.symbols.push({ from: b, to: b + 2 }, { from: b + text.length - 2, to: b + text.length })
      scan.styled.push({
        from: b + 2,
        to: b + text.length - 2,
        kind: m[3] ? 'strong' : 'del'
      })
    } else if (m[5]) {
      scan.symbols.push({ from: b, to: b + 1 }, { from: b + text.length - 1, to: b + text.length })
      scan.styled.push({ from: b + 1, to: b + text.length - 1, kind: 'em' })
    } else if (m[6]) {
      const inner = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(text)
      if (!inner) continue
      const textStart = b + 1
      const urlStart = b + 1 + inner[1].length + 2
      scan.symbols.push(
        { from: b, to: b + 1 },
        { from: b + 1 + inner[1].length, to: b + 1 + inner[1].length + 1 },
        { from: urlStart - 1, to: urlStart },
        { from: b + text.length - 1, to: b + text.length }
      )
      scan.styled.push(
        { from: textStart, to: textStart + inner[1].length, kind: 'linkText' },
        { from: urlStart, to: urlStart + inner[2].length, kind: 'linkUrl' }
      )
    }
  }
  return scan
}
