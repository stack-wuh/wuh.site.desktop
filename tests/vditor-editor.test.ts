import { afterEach, describe, expect, it } from 'vitest'
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
    const consumed = publishEditorCommand({ kind: 'focus' })
    expect(consumed).toBe(false)
  })

  it('有订阅者消费时返回 true，命令原样送达', () => {
    const seen: EditorCommand[] = []
    subscribeEditorCommands((cmd) => {
      seen.push(cmd)
      return true
    })
    const consumed = publishEditorCommand({ kind: 'format', action: 'bold' })
    expect(consumed).toBe(true)
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

  it('连字符词算一个词', () => {
    expect(countWords('state-of-the-art CI')).toEqual({ words: 2, chars: 18 })
  })
})

describe('插入片段模板（INSERT_SNIPPETS）', () => {
  it('表格/代码块/分隔线模板为可直接插入的 Markdown 文本', () => {
    expect(INSERT_SNIPPETS.table).toContain('| --- |')
    expect(INSERT_SNIPPETS.codeBlock).toMatch(/^```/)
    expect(INSERT_SNIPPETS.hr).toMatch(/---/)
  })
})
