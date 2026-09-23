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
