import { describe, expect, it } from 'vitest'
import { EditorSelection, EditorState } from '@codemirror/state'
import {
  cmApplyFormat,
  cmExternalContent,
  cmHeadingCursor,
  cmInsertSnippet
} from '../lib/editor-cm'

/**
 * CM6 命令适配层（20260922-refactor-codemirror-editor）：胶囊命令 → CM6
 * TransactionSpec 的纯逻辑映射。EditorState/Transaction 均可无 DOM 构造，
 * node 环境直接验证 doc/selection 结果。
 */

function stateOf(doc: string, selFrom: number, selTo: number): EditorState {
  return EditorState.create({ doc, selection: EditorSelection.range(selFrom, selTo) })
}

function applyDoc(state: EditorState, spec: ReturnType<typeof cmApplyFormat>): EditorState {
  return state.update(spec).state
}

describe('cmApplyFormat（格式化命令 → 事务）', () => {
  it('bold 包裹选区：内容与选区落位与纯逻辑一致', () => {
    const state = stateOf('abc hello xyz', 4, 9)
    const next = applyDoc(state, cmApplyFormat(state, 'bold'))
    expect(next.doc.toString()).toBe('abc **hello** xyz')
    expect(next.selection.main.from).toBe(6)
    expect(next.selection.main.to).toBe(11)
  })

  it('bold 无选区：插入空标记，光标落在标记中间待输入', () => {
    const state = stateOf('abc ', 4, 4)
    const next = applyDoc(state, cmApplyFormat(state, 'bold'))
    expect(next.doc.toString()).toBe('abc ****')
    expect(next.selection.main.from).toBe(6)
    expect(next.selection.main.to).toBe(6)
  })

  it('h1 为所在行加前缀，光标保持行内相对位置', () => {
    const state = stateOf('# t\nabc', 5, 5)
    const next = applyDoc(state, cmApplyFormat(state, 'h1'))
    expect(next.doc.toString()).toBe('# t\n# abc')
    expect(next.selection.main.from).toBe(7)
  })

  it('ul 多行选区：逐行加前缀且选区扩展覆盖前缀', () => {
    const state = stateOf('a\nb\nc', 0, 5)
    const next = applyDoc(state, cmApplyFormat(state, 'ul'))
    expect(next.doc.toString()).toBe('- a\n- b\n- c')
    expect(next.selection.main.from).toBe(0)
    expect(next.selection.main.to).toBe(11)
  })

  it('link：选区变 [text]()，光标落 url 待输入位', () => {
    const state = stateOf('see hello now', 4, 9)
    const next = applyDoc(state, cmApplyFormat(state, 'link'))
    expect(next.doc.toString()).toBe('see [hello]() now')
    expect(next.selection.main.from).toBe(12)
    expect(next.selection.main.to).toBe(12)
  })

  it('italic 与 code 复用同一词表', () => {
    const s1 = stateOf('hi', 0, 2)
    expect(applyDoc(s1, cmApplyFormat(s1, 'italic')).doc.toString()).toBe('*hi*')
    const s2 = stateOf('hi', 0, 2)
    expect(applyDoc(s2, cmApplyFormat(s2, 'code')).doc.toString()).toBe('`hi`')
  })
})

describe('cmInsertSnippet（插入模板）', () => {
  it('在光标处插入模板，光标落在模板末尾', () => {
    const state = stateOf('Hi', 2, 2)
    const next = applyDoc(state, cmInsertSnippet(state, 'table'))
    expect(next.doc.toString()).toBe('Hi| Header | Header |\n| --- | --- |\n| Cell | Cell |')
    expect(next.selection.main.from).toBe(2 + '| Header | Header |\n| --- | --- |\n| Cell | Cell |'.length)
  })
})

describe('cmExternalContent（外部注入 → 事务，防回环）', () => {
  it('全量替换内容，光标按原 head 保留', () => {
    const state = stateOf('old doc', 4, 4)
    const next = applyDoc(state, cmExternalContent(state, 'new content here'))
    expect(next.doc.toString()).toBe('new content here')
    expect(next.selection.main.from).toBe(4)
  })

  it('原 head 超出新内容长度时收敛到末尾', () => {
    const state = stateOf('a long document', 15, 15)
    const next = applyDoc(state, cmExternalContent(state, 'hi'))
    expect(next.selection.main.from).toBe(2)
  })

  it('content 为 null（关文档态）清空编辑器', () => {
    const state = stateOf('some text', 0, 0)
    const next = applyDoc(state, cmExternalContent(state, null))
    expect(next.doc.toString()).toBe('')
  })

  it('内容未变化时返回空 spec（调用方按 no-op 处理）', () => {
    const state = stateOf('same', 0, 0)
    const spec = cmExternalContent(state, 'same')
    expect(spec.changes).toBeUndefined()
  })
})

describe('cmHeadingCursor（大纲跳转定位）', () => {
  const doc = EditorState.create({ doc: '# H1\n\ntext\n## H2' }).doc

  it('按 parseOutline 序号定位标题行行首绝对偏移', () => {
    expect(cmHeadingCursor(doc, 0)).toBe(0)
    expect(cmHeadingCursor(doc, 1)).toBe(11)
  })

  it('序号越界返回 null（调用方不消费）', () => {
    expect(cmHeadingCursor(doc, 2)).toBeNull()
    expect(cmHeadingCursor(doc, -1)).toBeNull()
  })
})

// ---------- 契约回归（原 vditor-editor.test.ts，内核无关，随换引擎平移） ----------

import { afterEach } from 'vitest'
import {
  publishEditorCommand,
  resetEditorCommandsForTests,
  subscribeEditorCommands,
  type EditorCommand
} from '../lib/editor-commands'
import { countWords, INSERT_SNIPPETS, parseOutline } from '../lib/editor-info'

afterEach(() => resetEditorCommandsForTests())

describe('编辑器命令通道（editor-commands）', () => {
  it('无订阅者时发布返回 false（no-op 语义）', () => {
    expect(publishEditorCommand({ kind: 'focus' })).toBe(false)
  })

  it('有订阅者消费时返回 true，命令原样送达', () => {
    const seen: EditorCommand[] = []
    subscribeEditorCommands((cmd) => {
      seen.push(cmd)
      return true
    })
    expect(publishEditorCommand({ kind: 'format', action: 'bold' })).toBe(true)
    expect(seen).toEqual([{ kind: 'format', action: 'bold' }])
  })

  it('任一订阅者消费即算消费（编辑器与宿主各自认领不同 kind）', () => {
    subscribeEditorCommands((cmd) => cmd.kind === 'format')
    subscribeEditorCommands((cmd) => cmd.kind === 'save')
    expect(publishEditorCommand({ kind: 'save' })).toBe(true)
    expect(publishEditorCommand({ kind: 'insert', snippet: 'table' })).toBe(false)
  })

  it('订阅可撤销：退订后命令不再送达', () => {
    let count = 0
    const off = subscribeEditorCommands(() => {
      count += 1
      return true
    })
    publishEditorCommand({ kind: 'focus' })
    off()
    publishEditorCommand({ kind: 'focus' })
    expect(count).toBe(1)
  })
})

describe('大纲解析（parseOutline）', () => {
  it('解析 ATX 标题的层级、文本与行号', () => {
    const outline = parseOutline('# 标题一\n\n正文\n## 小节 A\n###深度无空格不算\ntail')
    expect(outline).toEqual([
      { level: 1, text: '标题一', line: 0 },
      { level: 2, text: '小节 A', line: 3 }
    ])
  })

  it('代码围栏内的 # 行不算标题，围栏可闭合', () => {
    const outline = parseOutline('# 真.标题\n```bash\n# 这只是注释\n## 注释也是\n```\n## 假后真标题')
    expect(outline).toEqual([
      { level: 1, text: '真.标题', line: 0 },
      { level: 2, text: '假后真标题', line: 5 }
    ])
  })

  it('无标题内容返回空数组；行尾闭合标记被剥离', () => {
    expect(parseOutline('普通段落\n- 列表')).toEqual([])
    expect(parseOutline('## 带闭合 ##')).toEqual([{ level: 2, text: '带闭合', line: 0 }])
    expect(parseOutline('')).toEqual([])
  })
})

describe('字数统计（countWords）', () => {
  it('CJK 按字符计、拉丁按词计、空白不计', () => {
    expect(countWords('你好 world')).toEqual({ words: 3, chars: 7 })
    expect(countWords('こんにちは ja_ne')).toEqual({ words: 7, chars: 10 })
  })

  it('空串与纯空白返回零', () => {
    expect(countWords('')).toEqual({ words: 0, chars: 0 })
    expect(countWords('  \n\t ')).toEqual({ words: 0, chars: 0 })
  })
})

describe('插入片段模板（INSERT_SNIPPETS）', () => {
  it('表格/代码块/分隔线模板为可直接插入的 Markdown 文本', () => {
    expect(INSERT_SNIPPETS.table).toContain('| --- |')
    expect(INSERT_SNIPPETS.codeBlock).toMatch(/^```/)
    expect(INSERT_SNIPPETS.hr).toMatch(/---/)
  })
})
