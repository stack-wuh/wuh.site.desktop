/// <reference lib="dom" />
// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
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
  it('渲染态出现可点选 checkbox（任务行不再叠加圆点），点击改写源码且保留其余内容', () => {
    const doc = '- [ ] 待办事项\n- [x] 已完成'
    const { view, mount } = makeView(doc)
    // 光标在文末 → 第二行保持源码态；第一行任务框替换 `[ ]`（2-5），列表标记隐藏（非 widget）
    expect(widgetRanges(view.state.field(livePreviewField))).toEqual(['2-5'])

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

  it('链接渲染态隐藏 url（hover title 保留），源码不变', () => {
    // 两行文档：光标固定在第二行，让第一行保持渲染态
    const doc = '参见[站点](https://x.wuh.site/guide)说明\n第二行'
    const { view } = makeView(doc, doc.length)
    const live = view.state.field(livePreviewField)
    // 隐藏装饰：[ ] ( ) 符号 ×4 + url 整段（7-29）
    const hiddenRanges: string[] = []
    let title: string | undefined
    live.between(0, Number.MAX_SAFE_INTEGER, (from, to, value) => {
      const spec = value.spec as { class?: string; attributes?: { title?: string } }
      if (spec.class === 'cm-live-hidden') hiddenRanges.push(`${from}-${to}`)
      if (spec.attributes?.title) title = spec.attributes.title
    })
    expect(hiddenRanges).toEqual(['2-3', '5-6', '6-7', '7-31', '31-32'])
    expect(title).toBe('https://x.wuh.site/guide')
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
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

describe('笺条卡片（素笺签名元素，20261014-feature-editor-paper-rebuild）', () => {
  it('独立链接行整行替换为笺条 widget：元数据填充、点击外开、doc 字节不变', async () => {
    const openExternal = vi.fn()
    ;(window as unknown as { api: unknown }).api = {
      fetchLinkMeta: vi.fn(async () => ({
        title: '元数据标题',
        description: '摘语内容',
        image: '',
        favicon: ''
      })),
      openExternal
    }
    const line = '[标题](https://a.b/c)'
    const doc = `前文\n${line}\n尾行`
    // 光标在文末（尾行）→ 第二行为非光标行，笺条呈现
    const { view, mount } = makeView(doc, doc.length)
    const cardFrom = '前文\n'.length
    expect(widgetRanges(view.state.field(livePreviewField))).toEqual([
      `${cardFrom}-${cardFrom + line.length}`
    ])
    expect(view.state.doc.toString()).toBe(doc)

    const card = await vi.waitFor(() => {
      const el = mount.querySelector<HTMLAnchorElement>('a.cm-live-card')
      if (!el) throw new Error('笺条未渲染')
      return el
    })
    // 元数据到达后笺题为 og:title（源码仍是链接语法——字节保真，展示与内容分离）
    await vi.waitFor(() => {
      expect(card.querySelector('.cm-live-card-title')?.textContent).toBe('元数据标题')
    })
    card.click()
    expect(openExternal).toHaveBeenCalledWith('https://a.b/c')
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
    mount.remove()
  })

  it('裸 URL 行也是笺条；宿主 API 缺失回退虚笺（正文不丢）', () => {
    delete (window as unknown as { api?: unknown }).api
    const doc = 'https://x.y/page\n尾行'
    const { view, mount } = makeView(doc, doc.length)
    const card = mount.querySelector<HTMLAnchorElement>('a.cm-live-card')
    expect(card).not.toBeNull()
    expect(card?.classList.contains('cm-live-card--fallback')).toBe(true)
    expect(card?.querySelector('.cm-live-card-title')?.textContent).toBe('https://x.y/page')
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
    mount.remove()
  })

  it('光标进入笺条行：widget 撤除回源码态（墨迹未干），字节不变', () => {
    ;(window as unknown as { api: unknown }).api = {
      fetchLinkMeta: vi.fn(async () => ({ title: 't', description: '', image: '', favicon: '' })),
      openExternal: vi.fn()
    }
    const line = '[a](https://a.b)'
    const doc = `前文\n${line}\n尾行`
    const { view, mount } = makeView(doc, doc.length)
    expect(mount.querySelector('a.cm-live-card')).not.toBeNull()
    // 光标移入笺条行 → 该行回到源码态
    view.dispatch({ selection: EditorSelection.cursor('前文\n'.length + 2) })
    expect(mount.querySelector('a.cm-live-card')).toBeNull()
    expect(view.state.doc.toString()).toBe(doc)
    view.destroy()
    mount.remove()
  })
})
