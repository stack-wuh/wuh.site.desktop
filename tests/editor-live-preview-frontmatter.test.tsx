/// <reference lib="dom" />
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { Compartment, EditorSelection, EditorState } from '@codemirror/state'
import { drawSelection, EditorView, type DecorationSet } from '@codemirror/view'
import { atomicSubset, livePreviewField } from '../components/editor/decorations'

/**
 * 文档头 frontmatter 渲染态完全隐藏（20261007-feature-frontmatter-editor-hide）：
 * 即时渲染态把闭合的 `---…---` 块整块 widget replace 为不可见占位（无标注条），
 * 展示与修改移交 Frontmatter 插件视图；纯源码态完整可见；光标触及头部行一律
 * 浮现源码（与注释/折叠同源的「光标行保持源码态」设计语义）。核心契约：装饰
 * 无论怎么替换呈现，doc 字节不变（字节保真，editor.md 硬约束）。
 */

const FM_DOC = '---\ntitle: T\nlabels: [a]\n---\n\n# 正文'
// 替换须吞掉闭合行的换行符（CM6 block replace 只有覆盖行尾 \n 才不留空 view-line），
// CM Line.to 为不含换行的独占端点 → 整块替换区间 0-29
const FM_END = 29

function widgetRanges(set: DecorationSet): string[] {
  const out: string[] = []
  set.between(0, Number.MAX_SAFE_INTEGER, (from, to, value) => {
    if ((value.spec as { widget?: unknown }).widget != null) out.push(`${from}-${to}`)
  })
  return out
}

function makeView(doc: string, cursor: number, withPreview = true): { view: EditorView; mount: HTMLElement } {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const comp = new Compartment()
  const view = new EditorView({
    parent: mount,
    state: EditorState.create({
      doc,
      extensions: [drawSelection(), comp.of(withPreview ? livePreviewField : [])],
      selection: EditorSelection.cursor(cursor)
    })
  })
  view.dispatch({ selection: EditorSelection.cursor(cursor) })
  return { view, mount }
}

describe('frontmatter 渲染态完全隐藏（StateField 级）', () => {
  it('光标在正文：头部块产出整块 widget replace（0-19），覆盖全部头部行', () => {
    const { view } = makeView(FM_DOC, FM_DOC.length)
    expect(widgetRanges(view.state.field(livePreviewField))).toContain(`0-${FM_END}`)
    view.destroy()
  })

  it('光标触及头部行：不产出隐藏替换（源码浮现）', () => {
    const titleLine = FM_DOC.indexOf('title: T')
    const { view } = makeView(FM_DOC, titleLine)
    expect(widgetRanges(view.state.field(livePreviewField))).not.toContain(`0-${FM_END}`)
    view.destroy()
  })

  it('光标移到文档起始（Home 落位头部块首行）：同样浮现', () => {
    const { view } = makeView(FM_DOC, FM_DOC.length)
    view.dispatch({ selection: EditorSelection.cursor(0) })
    expect(widgetRanges(view.state.field(livePreviewField))).not.toContain(`0-${FM_END}`)
    view.destroy()
  })

  it('字节保真：隐藏装饰不改 doc 内容', () => {
    const { view } = makeView(FM_DOC, FM_DOC.length)
    expect(view.state.doc.toString()).toBe(FM_DOC)
    view.destroy()
  })

  it('无 frontmatter 文档：零头部装饰（回归护栏）', () => {
    const { view } = makeView('# 标题\n\n正文', 1)
    expect(widgetRanges(view.state.field(livePreviewField))).not.toContain('0-19')
    view.destroy()
  })

  it('未闭合头部块不隐藏（回退源码态）', () => {
    const doc = '---\ntitle: T\n# 正文无闭合'
    const { view, mount } = makeView(doc, doc.length)
    // 首行 `---` 按 hr 处理（正常），但 title 行不被任何块级替换吞掉
    const titleEnd = doc.indexOf('title: T') + 'title: T'.length
    for (const r of widgetRanges(view.state.field(livePreviewField))) {
      const [from, to] = r.split('-').map(Number)
      expect(from === 0 && to >= titleEnd).toBe(false)
    }
    expect(mount.textContent ?? '').toContain('title: T')
    view.destroy()
    mount.remove()
  })

  it('atomicSubset 契约：frontmatter 替换在原子集内，hidden/mark 不进', () => {
    const { view } = makeView(FM_DOC, FM_DOC.length)
    const field = view.state.field(livePreviewField)
    expect(widgetRanges(atomicSubset(field))).toContain(`0-${FM_END}`)
    view.destroy()
  })

  it('reconfigure 切入渲染态：隐藏装饰立即生效（tr.reconfigured 契约）', () => {
    const comp = new Compartment()
    const state = EditorState.create({
      doc: FM_DOC,
      extensions: [comp.of([])],
      selection: { anchor: FM_DOC.length }
    })
    const after = state.update({ effects: comp.reconfigure(livePreviewField) })
    expect(widgetRanges(after.state.field(livePreviewField))).toContain(`0-${FM_END}`)
  })
})

describe('frontmatter 渲染态完全隐藏（DOM 级）', () => {
  it('渲染态：头部行文本不在视图 DOM 中，正文照常渲染', () => {
    const { view, mount } = makeView(FM_DOC, FM_DOC.length)
    const text = mount.textContent ?? ''
    expect(text).not.toContain('title: T')
    expect(text).not.toContain('labels: [a]')
    expect(text).toContain('正文')
    view.destroy()
    mount.remove()
  })

  it('纯源码态（不挂 livePreviewField）：头部块完整可见', () => {
    const { view, mount } = makeView(FM_DOC, FM_DOC.length, false)
    const text = mount.textContent ?? ''
    expect(text).toContain('title: T')
    expect(text).toContain('labels: [a]')
    view.destroy()
    mount.remove()
  })

  it('光标进入头部块：该行文本浮现回 DOM', () => {
    const { view, mount } = makeView(FM_DOC, FM_DOC.length)
    expect(mount.textContent ?? '').not.toContain('title: T')
    view.dispatch({ selection: EditorSelection.cursor(FM_DOC.indexOf('labels: [a]')) })
    expect(mount.textContent ?? '').toContain('labels: [a]')
    view.destroy()
    mount.remove()
  })
})
