// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { Compartment, EditorState } from '@codemirror/state'
import { livePreviewField } from '../components/editor/decorations'

/**
 * L3 即时渲染开关时序（20260924-fix-live-preview-toggle-rebuild）：
 * 胶囊开关/⌘/ 的 toggleRender 只派发 Compartment.reconfigure——该事务无
 * docChanged、无 selection，装饰层 StateField 必须响应 tr.reconfigured
 * 立即重建，否则切入渲染态后画面保持源码样直到下一次输入（用户实测 bug）。
 * 注：光标行按设计保持源码态（符号浮现），取证时光标一律放非装饰目标行。
 */
const DOC = '# 标题\n\n正文内容'

describe('即时渲染开关时序', () => {
  it('回归：reconfigure 切入渲染态后装饰立即生效，不依赖下一次输入', () => {
    const renderComp = new Compartment()
    // 源码态挂载（等价持久化偏好 source），光标置于文末正文行
    const state = EditorState.create({
      doc: DOC,
      extensions: [renderComp.of([])],
      selection: { anchor: DOC.length }
    })
    // 与 MarkdownEditor toggleRender 分支同构：只派发 reconfigure
    const afterToggle = state.update({ effects: renderComp.reconfigure(livePreviewField) }).state
    expect(afterToggle.field(livePreviewField).size).toBeGreaterThan(0)
  })

  it('光标行保持源码态：光标压在标题行时该行不被装饰', () => {
    const state = EditorState.create({
      doc: DOC,
      extensions: [new Compartment().of(livePreviewField)],
      selection: { anchor: 1 }
    })
    const typed = state.update({ changes: { from: DOC.length, insert: 'x' } })
    expect(typed.state.field(livePreviewField).size).toBe(0)
  })

  it('渲染态首次输入：光标不在标题行时标题行被装饰', () => {
    const state = EditorState.create({
      doc: DOC,
      extensions: [new Compartment().of(livePreviewField)],
      selection: { anchor: DOC.length }
    })
    const typed = state.update({
      changes: { from: DOC.length, insert: 'x' },
      selection: { anchor: DOC.length + 1 }
    })
    expect(typed.state.field(livePreviewField).size).toBeGreaterThan(0)
  })
})
