import { describe, expect, it } from 'vitest'
import {
  BLOG_PRESET,
  buildStructuredSections,
  classifyRelPath
} from '@shared/structure'

describe('classifyRelPath（blog 预设）', () => {
  it('年/月目录下的文章 → blogPost，分组为 年/月', () => {
    const m = classifyRelPath('docs/2024/2024-11/docker.md')
    expect(m.kind).toBe('blogPost')
    expect(m.group).toBe('2024/2024-11')
  })

  it('$专题 目录下的文章 → topicPost', () => {
    const m = classifyRelPath('docs/$pnpm/如何使用pnpm.md')
    expect(m.kind).toBe('topicPost')
    expect(m.group).toBe('$pnpm')
  })

  it('.assets 目录 → assetDir', () => {
    const m = classifyRelPath('docs/$pnpm/如何使用pnpm.assets/img.png')
    expect(m.kind).toBe('assetDir')
  })

  it('其他路径 → other', () => {
    const m = classifyRelPath('README.md')
    expect(m.kind).toBe('other')
    expect(m.group).toBeNull()
  })
})

describe('buildStructuredSections', () => {
  it('按 年份(倒序)/月份/专题/其他 分组', () => {
    const paths = [
      'docs/2022/2022-01/a.md',
      'docs/2024/2024-11/b.md',
      'docs/2024/2024-03/c.md',
      'docs/$AST/1.md',
      'docs/$pnpm/2.md',
      'README.md'
    ]
    const sections = buildStructuredSections(paths)
    const kinds = sections.map((s) => s.kind)
    expect(kinds).toEqual(['years', 'topics', 'other'])

    const years = sections[0]
    expect(years.groups?.map((g) => g.title)).toEqual(['2024', '2022'])
    const g2024 = years.groups?.[0]
    expect(g2024?.entries.map((e) => e.path)).toEqual([
      'docs/2024/2024-11/b.md',
      'docs/2024/2024-03/c.md'
    ])

    expect(sections[1]?.groups?.map((g) => g.title)).toEqual(['$AST', '$pnpm'])
    expect(sections[2]?.entries?.map((e) => e.path)).toEqual(['README.md'])
  })

  it('空输入返回空数组', () => {
    expect(buildStructuredSections([], BLOG_PRESET)).toEqual([])
  })
})
