// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { EditorSelection, EditorState } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import { atomicSubset, livePreviewField } from '../components/editor/decorations'

/**
 * livePreviewField 原子区契约（20260924-fix-cm-selection-atomic）：
 * atomicRanges 只供 widget replace 子集——mark/hidden/line 装饰若一并原子化，
 * CM6 会把光标挡在样式文本之外（点击吸附 span 边缘），即用户实测的
 * 「光标点不进粗体、拖选吸附」缺陷。归 .tsx 族：node 侧 tsconfig 无 DOM lib，
 * 装饰层组件图只能进 tests tsconfig（同 editor-live-preview-toggle）。
 */

/** 建态后派发一次 selection 事务触发装饰重建（StateField create 初值为空集） */
function buildField(doc: string, cursor: number): DecorationSet {
  const state = EditorState.create({
    doc,
    extensions: [livePreviewField],
    selection: EditorSelection.cursor(cursor)
  })
  return state.update({ selection: EditorSelection.cursor(cursor) }).state.field(livePreviewField)
}

function rangesOf(set: DecorationSet): string[] {
  const out: string[] = []
  set.between(0, Number.MAX_SAFE_INTEGER, (from, to) => {
    out.push(`${from}-${to}`)
  })
  return out
}

describe('livePreviewField 原子区契约（20260924-fix-cm-selection-atomic）', () => {
  it('mark/hidden 装饰不进原子区：装饰集照常产出而原子集为空', () => {
    // 光标在第二行 → 第一行 `**bold**` 产出 hidden 符号(5-7,11-13)与 strong mark(7-11)
    const field = buildField('para **bold** tail\nother', 22)
    expect(rangesOf(field)).toEqual(expect.arrayContaining(['5-7', '7-11', '11-13']))
    expect(rangesOf(atomicSubset(field))).toEqual([])
  })

  it('原子区恰为 widget replace 区间（围栏语言标头行），隐藏闭栏不原子', () => {
    const field = buildField('```ts\nconst a = 1\n```\ntail', 23)
    expect(rangesOf(field)).toContain('18-21')
    expect(rangesOf(atomicSubset(field))).toEqual(['0-5'])
  })

  it('空文档无装饰无原子区', () => {
    const field = buildField('', 0)
    expect(field.size).toBe(0)
    expect(atomicSubset(field).size).toBe(0)
  })
})
