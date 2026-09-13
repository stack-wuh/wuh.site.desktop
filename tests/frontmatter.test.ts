import { describe, expect, it } from 'vitest'
import {
  buildIssueBody,
  parseFrontmatter,
  stringifyFrontmatter,
  toPublishFields,
  METADATA_MARKER
} from '@shared/frontmatter'

describe('parseFrontmatter', () => {
  it('解析 title/labels/summary/cover/keywords 并分离正文', () => {
    const raw = [
      '---',
      'title: Docker 部署 MongoDB',
      'labels:',
      '  - docker',
      '  - mongodb',
      'summary: 摘要',
      'cover: https://cdn.example.com/a.png',
      'keywords: [mongo, docker]',
      '---',
      '',
      '# 正文',
      '',
      '内容'
    ].join('\n')

    const { data, body } = parseFrontmatter(raw)
    expect(data.title).toBe('Docker 部署 MongoDB')
    expect(data.labels).toEqual(['docker', 'mongodb'])
    expect(data.summary).toBe('摘要')
    expect(data.cover).toBe('https://cdn.example.com/a.png')
    expect(data.keywords).toEqual(['mongo', 'docker'])
    expect(body).toBe('# 正文\n\n内容')
  })

  it('无 frontmatter 时 body 等于原文', () => {
    const raw = '# 只有正文\n\n一段话'
    const { data, body } = parseFrontmatter(raw)
    expect(data).toEqual({})
    expect(body).toBe(raw)
  })
})

describe('toPublishFields', () => {
  it('title/labels 直传，summary/cover/keywords 进 metadata 尾注', () => {
    const raw = [
      '---',
      'title: T',
      'labels: [a, b]',
      'summary: s',
      'cover: c.png',
      'keywords: [k]',
      '---',
      '',
      '正文'
    ].join('\n')
    const f = toPublishFields(raw)
    expect(f.title).toBe('T')
    expect(f.labels).toEqual(['a', 'b'])
    expect(f.body).toBe('正文')
    expect(f.metadata).toEqual({ summary: 's', cover: 'c.png', keywords: ['k'] })
    expect(buildIssueBody(f.body, f.metadata)).toContain(METADATA_MARKER)
  })
})

describe('stringifyFrontmatter round-trip', () => {
  it('写回后再解析得到相同 data 与 body', () => {
    const data = {
      title: '标题',
      labels: ['a', 'b'],
      summary: '摘要',
      cover: 'https://cdn.example.com/a.png',
      keywords: ['k1']
    }
    const out = stringifyFrontmatter(data, '正文\n\n内容')
    const parsed = parseFrontmatter(out)
    expect(parsed.data).toEqual(data)
    expect(parsed.body).toBe('正文\n\n内容')
    expect(out.startsWith('---\n')).toBe(true)
  })

  it('空 data 时仅返回正文', () => {
    expect(stringifyFrontmatter({}, '正文')).toBe('正文')
  })
})

describe('buildIssueBody', () => {
  it('追加 wuh-site-metadata 尾部注释（blog 发布规范格式）', () => {
    const body = '正文内容'
    const out = buildIssueBody(body, {
      summary: '摘要',
      cover: 'https://cdn.example.com/a.png',
      keywords: ['mongo']
    })
    expect(out).toBe(
      '正文内容\n\n<!-- wuh-site-metadata: {"summary":"摘要","cover":"https://cdn.example.com/a.png","keywords":["mongo"]} -->'
    )
    expect(out).toContain(METADATA_MARKER)
  })

  it('无 metadata 时正文原样返回（仅去尾部空白）', () => {
    expect(buildIssueBody('正文\n\n\n', undefined)).toBe('正文')
  })
})
