import { describe, expect, it } from 'vitest'
import { EditorSelection, EditorState } from '@codemirror/state'
import { parseBlocks, scanInlineMarks, selectionLineSet } from '../lib/editor-cm'
import { activeOutlineIndex, estimateReadingMinutes } from '../lib/editor-info'

/**
 * L3 即时渲染纯逻辑（20260923-feature-cm-live-preview）：
 * parseBlocks 行级块结构 / selectionLineSet 光标行集合 / scanInlineMarks
 * 行内标记扫描 / activeOutlineIndex 大纲跟随 / estimateReadingMinutes 阅读时长。
 * 全部无 DOM 依赖，node 环境直接验证。
 */

describe('parseBlocks（行级块结构解析）', () => {
  it('标题行：层级与单行区间', () => {
    expect(parseBlocks('# 一级\n正文\n### 三级')).toEqual([
      { kind: 'heading', fromLine: 0, toLine: 0, level: 1 },
      { kind: 'heading', fromLine: 2, toLine: 2, level: 3 }
    ])
  })

  it('围栏：语言捕获、内容行区间、围栏行自闭合', () => {
    const blocks = parseBlocks('a\n```ts\nconst x = 1\nconst y = 2\n```\nb')
    expect(blocks).toEqual([
      { kind: 'fence', fromLine: 1, toLine: 4, lang: 'ts', contentFromLine: 2, contentToLine: 3 }
    ])
  })

  it('未闭合围栏延伸到文末', () => {
    const blocks = parseBlocks('```\nnever closed')
    expect(blocks).toEqual([
      { kind: 'fence', fromLine: 0, toLine: 1, lang: '', contentFromLine: 1, contentToLine: 1 }
    ])
  })

  it('波浪线围栏不与反引号围栏互相闭合', () => {
    const blocks = parseBlocks('```ts\n~~~\nstill fenced\n~~~\n```')
    expect(blocks).toEqual([
      { kind: 'fence', fromLine: 0, toLine: 4, lang: 'ts', contentFromLine: 1, contentToLine: 3 }
    ])
  })

  it('公式块：$$ 独占行开合，内容行为公式源', () => {
    const blocks = parseBlocks('前文\n$$\nE = mc^2\n$$\n后文')
    expect(blocks).toEqual([
      { kind: 'math', fromLine: 1, toLine: 3, contentFromLine: 2, contentToLine: 2 }
    ])
  })

  it('引用块：连续 > 行并为一段', () => {
    expect(parseBlocks('> 一\n> 二\n\n正文')).toEqual([
      { kind: 'quote', fromLine: 0, toLine: 1 }
    ])
  })

  it('列表块：连续列表行并为一段，ul/ol 混排也算连续', () => {
    expect(parseBlocks('- a\n- b\n1. c\n正文')).toEqual([
      { kind: 'list', fromLine: 0, toLine: 2 }
    ])
  })

  it('分割线与表格', () => {
    expect(parseBlocks('---')).toEqual([{ kind: 'hr', fromLine: 0, toLine: 0 }])
    expect(parseBlocks('| a | b |\n| - | - |\n| 1 | 2 |')).toEqual([
      { kind: 'table', fromLine: 0, toLine: 2 }
    ])
  })

  it('围栏内的 #、> 、列表行不按块结构解析', () => {
    const blocks = parseBlocks('```\n# not heading\n> not quote\n- not list\n```\n# real')
    expect(blocks).toEqual([
      { kind: 'fence', fromLine: 0, toLine: 4, lang: '', contentFromLine: 1, contentToLine: 3 },
      { kind: 'heading', fromLine: 5, toLine: 5, level: 1 }
    ])
  })

  it('空内容返回空数组', () => {
    expect(parseBlocks('')).toEqual([])
  })
})

describe('selectionLineSet（光标行集合）', () => {
  const lines = (doc: string, from: number, to: number): Set<number> =>
    selectionLineSet(EditorState.create({ doc, selection: EditorSelection.range(from, to) }))

  it('单光标只落在所在行', () => {
    expect(lines('ab\ncd\nef', 3, 3)).toEqual(new Set([1]))
  })

  it('跨行选区覆盖所有触及行', () => {
    // 'ab\ncd\nef'：偏移 6 起为第三行，1..6 触及三行
    expect(lines('ab\ncd\nef', 1, 6)).toEqual(new Set([0, 1, 2]))
  })

  it('多选区取并集', () => {
    // CM6 默认折叠多选区，显式开启 allowMultipleSelections 验证并集语义
    const state = EditorState.create({
      doc: 'ab\ncd\nef',
      extensions: EditorState.allowMultipleSelections.of(true),
      selection: EditorSelection.create([
        EditorSelection.cursor(0),
        EditorSelection.cursor(6)
      ])
    })
    expect(selectionLineSet(state)).toEqual(new Set([0, 2]))
  })
})

describe('scanInlineMarks（行内标记扫描）', () => {
  it('加粗：符号区间与内容样式区间分离', () => {
    const scan = scanInlineMarks('see **bold** ok', 0)
    expect(scan.symbols).toEqual([
      { from: 4, to: 6 },
      { from: 10, to: 12 }
    ])
    expect(scan.styled).toEqual([{ from: 6, to: 10, kind: 'strong' }])
  })

  it('斜体与删除线', () => {
    const scan = scanInlineMarks('a *em* b ~~gone~~', 0)
    expect(scan.symbols).toEqual([
      { from: 2, to: 3 },
      { from: 5, to: 6 },
      { from: 9, to: 11 },
      { from: 15, to: 17 }
    ])
    expect(scan.styled).toEqual([
      { from: 3, to: 5, kind: 'em' },
      { from: 11, to: 15, kind: 'del' }
    ])
  })

  it('行内代码为原子样式，无符号隐藏', () => {
    const scan = scanInlineMarks('use `cm` now', 0)
    expect(scan.symbols).toEqual([])
    expect(scan.styled).toEqual([{ from: 4, to: 8, kind: 'code' }])
  })

  it('链接：文本与 URL 分色，括号方括号为符号', () => {
    const scan = scanInlineMarks('go [home](/path) now', 0)
    expect(scan.styled).toEqual([
      { from: 4, to: 8, kind: 'linkText' },
      { from: 10, to: 15, kind: 'linkUrl' }
    ])
    expect(scan.symbols).toEqual([
      { from: 3, to: 4 },
      { from: 8, to: 9 },
      { from: 9, to: 10 },
      { from: 15, to: 16 }
    ])
  })

  it('base 偏移换算：扫描结果带行首绝对偏移', () => {
    const scan = scanInlineMarks('**x**', 100)
    expect(scan.symbols[0]).toEqual({ from: 100, to: 102 })
    expect(scan.styled[0]).toEqual({ from: 102, to: 103, kind: 'strong' })
  })

  it('图片为整段原子区间（widget 替换用），先于链接匹配', () => {
    const scan = scanInlineMarks('![](a.png)', 0)
    expect(scan.styled).toEqual([{ from: 0, to: 10, kind: 'image' }])
    expect(scan.symbols).toEqual([])
    const scan2 = scanInlineMarks('see ![alt](b.png) end', 10)
    expect(scan2.styled).toEqual([{ from: 14, to: 27, kind: 'image' }])
  })

  it('不完整标记（未闭合）不产出区间', () => {
    const scan = scanInlineMarks('a ** b', 0)
    expect(scan.symbols).toEqual([])
    expect(scan.styled).toEqual([])
  })
})

describe('activeOutlineIndex（大纲跟随）', () => {
  const content = '# A\n\n正文\n## B\n```bash\n# 注释\n```\n### C'

  it('光标行落在某标题之后时返回最近标题序号', () => {
    expect(activeOutlineIndex(content, 2)).toBe(0)
    expect(activeOutlineIndex(content, 3)).toBe(1)
    expect(activeOutlineIndex(content, 7)).toBe(2)
  })

  it('光标在首个标题之前返回 -1', () => {
    expect(activeOutlineIndex(content, -1)).toBe(-1)
  })

  it('围栏内注释行不参与归属，光标在围栏内仍归前一标题', () => {
    expect(activeOutlineIndex(content, 5)).toBe(1)
  })
})

describe('estimateReadingMinutes（阅读时长）', () => {
  it('零字返回 0，不足一分钟按 1 分钟', () => {
    expect(estimateReadingMinutes(0)).toBe(0)
    expect(estimateReadingMinutes(399)).toBe(1)
  })

  it('按每分钟 400 字取整', () => {
    expect(estimateReadingMinutes(801)).toBe(2)
    expect(estimateReadingMinutes(1200)).toBe(3)
  })
})
