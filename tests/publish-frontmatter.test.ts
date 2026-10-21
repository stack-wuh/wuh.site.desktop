import { describe, expect, it } from 'vitest'
import { setFrontmatterField } from '../src/shared/frontmatter'

/**
 * frontmatter 单键回写（20261020-feature-publish-interaction）：发布成功后写
 * `issue` 号。逐行编辑保序保格式——除目标键外文档字节零改动；无合法头块
 * 不造头；幂等（同值返回原字符串）。
 */

const DOC = '---\ntitle: 素笺\nlabels: [随笔]\n---\n\n正文第一行\n正文第二行\n'

describe('setFrontmatterField', () => {
  it('无键时插入闭合栅栏前（正文与其余键逐字不变）', () => {
    const next = setFrontmatterField(DOC, 'issue', '42')
    expect(next).toBe('---\ntitle: 素笺\nlabels: [随笔]\nissue: 42\n---\n\n正文第一行\n正文第二行\n')
    expect(next.slice(next.indexOf('\n---\n\n') + 1)).toBe(DOC.slice(DOC.indexOf('\n---\n\n') + 1))
  })

  it('有键时就地替换该行（保住位次，其余行不变）', () => {
    const src = '---\ntitle: T\nissue: 7\nlabels: [a]\n---\n\nbody\n'
    expect(setFrontmatterField(src, 'issue', '8')).toBe('---\ntitle: T\nissue: 8\nlabels: [a]\n---\n\nbody\n')
  })

  it('幂等：目标值已存在 → 返回原字符串（字节相等）', () => {
    const src = '---\ntitle: T\nissue: 7\n---\n\nbody\n'
    expect(setFrontmatterField(src, 'issue', '7')).toBe(src)
  })

  it('无 frontmatter 头块 → 原样返回（不造头）', () => {
    const src = '# 标题\n\n正文\n'
    expect(setFrontmatterField(src, 'issue', '7')).toBe(src)
  })

  it('未闭合 / 非法 YAML → 原样返回', () => {
    const unclosed = '---\ntitle: T\n\nbody\n'
    expect(setFrontmatterField(unclosed, 'issue', '7')).toBe(unclosed)
    const invalid = '---\ntitle: [unclosed\n---\n\nbody\n'
    expect(setFrontmatterField(invalid, 'issue', '7')).toBe(invalid)
  })

  it('头部尾随空行：新键插在最后一条非空键之后（不留空行夹层）', () => {
    const src = '---\ntitle: T\n\n---\n\nbody\n'
    expect(setFrontmatterField(src, 'issue', '9')).toBe('---\ntitle: T\nissue: 9\n\n---\n\nbody\n')
  })

  it('BOM 保留', () => {
    const src = '﻿---\ntitle: T\n---\n\nbody\n'
    expect(setFrontmatterField(src, 'issue', '3')).toBe('﻿---\ntitle: T\nissue: 3\n---\n\nbody\n')
  })
})
