import { describe, expect, it } from 'vitest'
import {
  buildIssueBody,
  parseFrontmatter,
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
