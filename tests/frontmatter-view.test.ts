import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error 插件资产经典 JS 隐式 any（同 plugin-manifests-real 先例）
import { suggestTitle } from '../plugins/frontmatter/view/fm-util.js'

/**
 * Frontmatter 插件视图标准完善（20261007-feature-frontmatter-editor-hide）：
 * suggestTitle 纯逻辑（空态「创建」的一键标题，清洗口径对齐主进程 suggestFileStem：
 * 非法字符转空格、压缩空白、去尾点空格、80 截断）+ 视图三语文案源码级 guard
 * （词表 zh/en/ja 键齐全、用户可见字符串一律经 LEX，不再硬编码中文）。
 */

describe('suggestTitle（空态一键创建的标题来源）', () => {
  it('取正文首个标题', () => {
    expect(suggestTitle('# 我的文章\n\n正文', 'draft.md')).toBe('我的文章')
  })

  it('无标题回退文件名（去扩展名）', () => {
    expect(suggestTitle('纯正文一首标题都没有', '2026-10-07-notes.md')).toBe('2026-10-07-notes')
  })

  it('非法字符清洗与空白压缩（对齐主进程 suggestFileStem 口径）', () => {
    expect(suggestTitle('# a/b:c*d?  e   f. ', 'x.md')).toBe('a b c d e f')
  })

  it('超长截断 80', () => {
    const long = `# ${'标'.repeat(100)}`
    expect(suggestTitle(long, 'x.md')).toBe('标'.repeat(80))
  })

  it('标题与文件名都为空回退占位（调用方以当前语言词表兜底）', () => {
    expect(suggestTitle('', '')).toBe('')
  })
})

describe('视图三语文案 guard（源码级）', () => {
  const viewSrc = readFileSync(new URL('../plugins/frontmatter/view/view.js', import.meta.url), 'utf8')

  it('内置 zh/en/ja 三语词表', () => {
    expect(viewSrc).toMatch(/\bzh\s*:/)
    expect(viewSrc).toMatch(/\ben\s*:/)
    expect(viewSrc).toMatch(/\bja\s*:/)
  })

  it('初始语言取 wuh.locale() 并监听 locale 事件热切换', () => {
    expect(viewSrc).toContain('wuh.locale()')
    expect(viewSrc).toContain("on('locale'")
  })

  it('应用反馈经 ui.toast（成功与失败路径）', () => {
    expect(viewSrc).toContain('wuh.ui.toast')
  })

  it('用户可见标签不再直接硬编码中文字符串（一律经 LEX 查表）', () => {
    const hardCoded = viewSrc.match(/\.textContent\s*=\s*'[\u4e00-\u9fff]/g)
    expect(hardCoded).toBeNull()
  })
})
