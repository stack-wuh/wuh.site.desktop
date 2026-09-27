import { describe, expect, it } from 'vitest'
import {
  findLinkTargetAt,
  footnoteDefPrefix,
  headingFoldTarget,
  parseBlocks,
  scanInlineMarks,
  toggleTaskLine
} from '../lib/editor-cm'

/**
 * L4 编辑器交互纯逻辑（20260927-feature-editor-interactions）：链接定位、
 * 任务行改写、注释块解析、脚注扫描、标题折叠区间。全部无 DOM 依赖，
 * 是渲染态交互改写源码的唯一位置计算事实源（字节保真：UI 只消费本层结果 dispatch）。
 */

describe('findLinkTargetAt 链接定位', () => {
  const doc = '参见[站点](https://x.wuh.site/guide)与说明'

  it('命中链接文本内的位置，返回 url', () => {
    const pos = doc.indexOf('站')
    expect(findLinkTargetAt(doc, pos)).toBe('https://x.wuh.site/guide')
  })

  it('命中 url 部分同样返回 url', () => {
    const pos = doc.indexOf('guide')
    expect(findLinkTargetAt(doc, pos)).toBe('https://x.wuh.site/guide')
  })

  it('命中方括号符号位也算链接', () => {
    const pos = doc.indexOf('[站点]')
    expect(findLinkTargetAt(doc, pos)).toBe('https://x.wuh.site/guide')
  })

  it('相对链接返回 null（仅放行 http/https）', () => {
    const doc2 = '回到[首页](./index.md)看看'
    expect(findLinkTargetAt(doc2, doc2.indexOf('首'))).toBeNull()
  })

  it('图片整段原子不算链接（含 http url）', () => {
    const doc2 = '看图![墨色](https://cdn.example.com/a.png)结束'
    expect(findLinkTargetAt(doc2, doc2.indexOf('墨'))).toBeNull()
    expect(findLinkTargetAt(doc2, doc2.indexOf('cdn'))).toBeNull()
  })

  it('普通文本返回 null', () => {
    expect(findLinkTargetAt(doc, doc.indexOf('与说明'))).toBeNull()
  })

  it('多行文档按行定位', () => {
    const doc2 = '第一行\n第二行有[链接](https://a.example.com/b)结尾'
    const posLine2 = doc2.indexOf('链接')
    expect(findLinkTargetAt(doc2, posLine2)).toBe('https://a.example.com/b')
    expect(findLinkTargetAt(doc2, 1)).toBeNull()
  })

  it('行内代码里的假链接不算', () => {
    const doc2 = '示例`[x](https://fake.example.com)`文本'
    expect(findLinkTargetAt(doc2, doc2.indexOf('fake'))).toBeNull()
  })
})

describe('toggleTaskLine 任务行改写', () => {
  it('未完成 → 完成', () => {
    expect(toggleTaskLine('- [ ] 待办事项')).toBe('- [x] 待办事项')
  })

  it('完成 → 未完成（小写 x）', () => {
    expect(toggleTaskLine('- [x] 已完成')).toBe('- [ ] 已完成')
  })

  it('完成（大写 X）→ 未完成', () => {
    expect(toggleTaskLine('- [X] 已完成')).toBe('- [ ] 已完成')
  })

  it('保留缩进与有序列表标记', () => {
    expect(toggleTaskLine('  1. [ ] 有序任务')).toBe('  1. [x] 有序任务')
    expect(toggleTaskLine('* [ ] 星号任务')).toBe('* [x] 星号任务')
  })

  it('非任务行返回 null', () => {
    expect(toggleTaskLine('普通段落')).toBeNull()
    expect(toggleTaskLine('- 无任务标记的列表')).toBeNull()
    expect(toggleTaskLine('正文中间的 [x] 不是任务')).toBeNull()
    expect(toggleTaskLine('- [ ]')).toBe('- [x]')
  })
})

describe('parseBlocks 注释块', () => {
  it('单行注释', () => {
    const blocks = parseBlocks('<!-- 一行注释 -->')
    expect(blocks).toEqual([{ kind: 'comment', fromLine: 0, toLine: 0 }])
  })

  it('多行注释整体成块', () => {
    const blocks = parseBlocks('<!--\n注释内容行\n-->')
    expect(blocks).toEqual([{ kind: 'comment', fromLine: 0, toLine: 2 }])
  })

  it('注释后接标题互不干扰', () => {
    const blocks = parseBlocks('<!-- a -->\n# 标题')
    expect(blocks).toEqual([
      { kind: 'comment', fromLine: 0, toLine: 0 },
      { kind: 'heading', fromLine: 1, toLine: 1, level: 1 }
    ])
  })

  it('未闭合注释回退源码态（不产出注释块）', () => {
    const blocks = parseBlocks('<!--\n没有闭合的注释')
    expect(blocks.filter((b) => b.kind === 'comment')).toEqual([])
  })
})

describe('scanInlineMarks 脚注扫描', () => {
  it('脚注引用：隐藏 [^ 与 ]，id 上标样式', () => {
    const scan = scanInlineMarks('正文[^1]继续', 0)
    const ref = scan.styled.find((s) => s.kind === 'footref')
    expect(ref).toEqual({ from: 4, to: 5, kind: 'footref' })
    expect(scan.symbols).toContainEqual({ from: 2, to: 4 })
    expect(scan.symbols).toContainEqual({ from: 5, to: 6 })
  })

  it('行内代码优先于脚注', () => {
    const scan = scanInlineMarks('`[^1]`', 0)
    expect(scan.styled).toEqual([{ from: 0, to: 6, kind: 'code' }])
    expect(scan.styled.some((s) => s.kind === 'footref')).toBe(false)
  })

  it('既有行内样式回归：粗体/斜体/链接不受词表扩展影响', () => {
    const scan = scanInlineMarks('**粗**[链接](https://a.example.com)', 0)
    expect(scan.styled.map((s) => s.kind)).toEqual(['strong', 'linkText', 'linkUrl'])
  })
})

describe('footnoteDefPrefix 脚注定义行', () => {
  it('识别定义行并返回需隐藏的前缀长度', () => {
    expect(footnoteDefPrefix('[^1]: 定义文本')).toBe(6)
    expect(footnoteDefPrefix('[^note]: 定义')).toBe(9)
  })

  it('非定义行返回 null', () => {
    expect(footnoteDefPrefix('正文 [^1] 引用')).toBeNull()
    expect(footnoteDefPrefix('普通行')).toBeNull()
  })
})

describe('headingFoldTarget 标题折叠区间', () => {
  const blocksOf = (text: string) => parseBlocks(text)
  const lines = (text: string) => text.split('\n').length

  it('折叠至下一同级标题之前', () => {
    const text = '# 一\n内容 A\n## 1.1\n内容 B\n# 二\n内容 C'
    const blocks = blocksOf(text)
    const h1 = blocks[0]
    expect(headingFoldTarget(blocks, h1.fromLine, h1.level ?? 1, lines(text))).toEqual({
      fromLine: 1,
      toLine: 3
    })
  })

  it('下级标题不截断上级折叠', () => {
    const text = '# 一\n内容 A\n## 1.1\n内容 B'
    const blocks = blocksOf(text)
    expect(headingFoldTarget(blocks, 0, 1, lines(text))).toEqual({ fromLine: 1, toLine: 3 })
  })

  it('无内容的标题返回 null', () => {
    const text = '# 一\n# 二\n内容'
    const blocks = blocksOf(text)
    expect(headingFoldTarget(blocks, 0, 1, lines(text))).toBeNull()
  })

  it('文件尾自然闭合', () => {
    const text = '# 一\n内容 A\n内容 B'
    const blocks = blocksOf(text)
    expect(headingFoldTarget(blocks, 0, 1, lines(text))).toEqual({ fromLine: 1, toLine: 2 })
  })
})
