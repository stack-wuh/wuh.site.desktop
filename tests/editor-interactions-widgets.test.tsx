/// <reference lib="dom" />
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { EditorSelection, EditorState } from '@codemirror/state'
import { drawSelection, EditorView, type DecorationSet } from '@codemirror/view'
import { foldField, livePreviewField, wdFoldRangesForTest } from '../components/editor/decorations'
import { wdFoldEffect } from '../components/editor/widgets'

/**
 * L4 交互组件级行为（20260927-feature-editor-interactions）：任务点选改写源码、
 * 标题折叠/展开与光标自动展开、注释标注条、脚注样式。核心契约断言：装饰无论
 * 如何替换呈现，doc 字节不变（字节保真）。
 * 链接 Ctrl/Cmd+点击依赖 posAtCoords 真实布局几何，happy-dom 不可复现——
 * 位置计算已由 tests/editor-interactions.test.ts 纯逻辑覆盖，接线留 runtime 走查。
 */

function makeView(doc: string, cursor = doc.length): { view: EditorView; mount: HTMLElement } {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const view = new EditorView({
    parent: mount,
    state: EditorState.create({
      doc,
      extensions: [drawSelection(), livePreviewField, foldField],
      selection: EditorSelection.cursor(cursor)
    })
  })
  // 派发 selection 事务触发 StateField 装饰重建（create 初值为空）
  view.dispatch({ selection: EditorSelection.cursor(cursor) })
  return { view, mount }
}

function widgetRanges(set: DecorationSet): string[] {
  const out: string[] = []
  set.between(0, Number.MAX_SAFE_INTEGER, (from, to, value) => {
    if ((value.spec as { widget?: unknown }).widget != null) out.push(`${from}-${to}`)
  })
  return out
}

function classesOf(set: DecorationSet): string[] {
  const out: string[] = []
  set.between(0, Number.MAX_SAFE_INTEGER, (_from, _to, value) => {
    const cls = (value.spec as { class?: string }).class
    if (cls) out.push(cls)
  })
  return out
}

describe('任务列表点选', () => {
  it('渲染态出现可点选 checkbox，点击改写源码且保留其余内容', () => {
    const doc = '- [ ] 待办事项\n- [x] 已完成'
    const { view, mount } = makeView(doc)
    // 光标在文末 → 第二行保持源码态；第一行产出圆点(0-1)与任务框(2-5)
    expect(widgetRanges(view.state.field(livePreviewField))).toEqual(['0-1', '2-5'])

    const box = mount.querySelector<HTMLElement>('.cm-live-taskbox')
    expect(box).not.toBeNull()
    expect(box?.getAttribute('role')).toBe('checkbox')
    box?.click()
    expect(view.state.doc.toString()).toBe('- [x] 待办事项\n- [x] 已完成')

    const box2 = mount.querySelector<HTMLElement>('.cm-live-taskbox')
    box2?.click()
    expect(view.state.doc.toString()).toBe('- [ ] 待办事项\n- [x] 已完成')
    view.destroy()
    mount.remove()
  })

  it('光标行保持源码态（checkbox 不替换）', () => {
    const doc = '- [ ] 待办事项\n其他'
    const { view } = makeView(doc, 0)
    expect(widgetRanges(view.state.field(livePreviewField))).toEqual([])
    view.destroy()
  })
})

describe('标题折叠', () => {
  it('fold effect 折叠后占位条出现、doc 字节不变；展开复原', () => {
    const doc = '# 一\n内容 A\n内容 B'
    const { view, mount } = makeView(doc)
    view.dispatch({ effects: wdFoldEffect.of({ line: 0, fold: true }) })
    expect(view.state.doc.toString()).toBe(doc)
    expect(widgetRanges(wdFoldRangesForTest(view)).length).toBeGreaterThan(0)
    expect(mount.querySelector('.cm-live-fold')?.textContent).toContain('2')

    view.dispatch({ effects: wdFoldEffect.of({ line: 0, fold: false }) })
    expect(widgetRanges(wdFoldRangesForTest(view))).toEqual([])
    view.destroy()
    mount.remove()
  })

  it('光标进入折叠区自动展开', () => {
    const doc = '# 一\n内容 A\n内容 B'
    const { view } = makeView(doc)
    view.dispatch({ effects: wdFoldEffect.of({ line: 0, fold: true }) })
    expect(widgetRanges(wdFoldRangesForTest(view)).length).toBeGreaterThan(0)
    view.dispatch({ selection: EditorSelection.cursor(6) })
    expect(widgetRanges(wdFoldRangesForTest(view))).toEqual([])
    view.destroy()
  })

  it('折叠域原子区全部为 widget replace（atomicRanges 契约）', () => {
    const doc = '# 一\n内容 A\n- 列表\n内容 B'
    const { view } = makeView(doc)
    view.dispatch({ effects: wdFoldEffect.of({ line: 0, fold: true }) })
    const set = wdFoldRangesForTest(view)
    set.between(0, Number.MAX_SAFE_INTEGER, (_f, _t, value) => {
      expect((value.spec as { widget?: unknown }).widget).not.toBeNull()
    })
    view.destroy()
  })

  it('标题行首出现折叠箭头 widget', () => {
    const doc = '# 一\n内容 A'
    const { view, mount } = makeView(doc)
    const chev = mount.querySelector('.cm-live-foldchev')
    expect(chev).not.toBeNull()
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
    mount.remove()
  })
})

describe('注释标注条与脚注', () => {
  it('注释块收成标注条（光标远离时），doc 不变', () => {
    const doc = '<!-- 内部笔记 -->\n正文'
    const { view, mount } = makeView(doc, doc.length)
    expect(widgetRanges(view.state.field(livePreviewField))).toEqual(['0-13'])
    expect(mount.querySelector('.cm-live-comment-tag')?.textContent).toBe('注释')
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
    mount.remove()
  })

  it('脚注引用上标 + 定义行分节', () => {
    const doc = '正文[^1]引用\n\n[^1]: 定义文本'
    // 光标置于中间空行（pos 9）：两处内容行均为非光标行
    const { view, mount } = makeView(doc, 9)
    const live = view.state.field(livePreviewField)
    expect(classesOf(live)).toContain('cm-live-footref')
    expect(classesOf(live)).toContain('cm-live-footdef')
    expect(mount.querySelector('.cm-live-footref')).not.toBeNull()
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
    mount.remove()
  })
})
