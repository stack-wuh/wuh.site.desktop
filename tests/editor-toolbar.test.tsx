// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LocaleProvider } from '../lib/i18n/context'
import { EditorToolbar } from '../components/editor/Toolbar'
import {
  publishEditorCommand,
  resetEditorCommandsForTests,
  subscribeEditorCommands,
  type EditorCommand
} from '../lib/editor-commands'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

/**
 * 编辑区工具条（20260924-feature-editor-toolbar）：纯命令发布方——
 * 词表全量复用既有 EditorCommand（format×9 / insert×3 / insertClipboardImage），
 * 断言逐钮点击发布对应命令且不新增词表项。
 */

beforeEach(() => {
  resetRenderEnv()
  resetEditorCommandsForTests()
})

/** 经 LocaleProvider 渲染（t() 走真实词典），吞渲染期噪声日志 */
function renderToolbar(): void {
  const cap = captureRenderConsole()
  render(
    <LocaleProvider>
      <EditorToolbar />
    </LocaleProvider>
  )
  cap.restore()
}

/** 订阅收集 → 点指定按钮 → 退订；按钮可寻址名 = aria-label = 词典值 */
function clickAndCollect(name: string): EditorCommand[] {
  const seen: EditorCommand[] = []
  const off = subscribeEditorCommands((command) => {
    seen.push(command)
    return true
  })
  try {
    fireEvent.click(screen.getByRole('button', { name }))
  } finally {
    off()
  }
  return seen
}

describe('EditorToolbar（命令发布方）', () => {
  it('渲染冒烟：工具条分组与全部按钮就位', () => {
    const cap = captureRenderConsole()
    try {
      render(
        <LocaleProvider>
          <EditorToolbar />
        </LocaleProvider>
      )
      expect(screen.getByRole('toolbar', { name: 'Markdown 格式化' })).toBeTruthy()
      for (const name of [
        '一级标题', '二级标题', '加粗', '斜体', '无序列表', '有序列表', '引用', '代码', '链接',
        '插入表格', '插入代码块', '插入分隔线', '插入图片（剪贴板）'
      ]) {
        expect(screen.getByRole('button', { name })).toBeTruthy()
      }
    } finally {
      cap.restore()
      cleanup()
    }
  })

  it('格式化 9 钮逐一点击发布 format 命令', () => {
    renderToolbar()
    const cases: [string, string][] = [
      ['一级标题', 'h1'],
      ['二级标题', 'h2'],
      ['加粗', 'bold'],
      ['斜体', 'italic'],
      ['无序列表', 'ul'],
      ['有序列表', 'ol'],
      ['引用', 'quote'],
      ['代码', 'code'],
      ['链接', 'link']
    ]
    for (const [name, action] of cases) {
      expect(clickAndCollect(name)).toEqual([{ kind: 'format', action }])
    }
    cleanup()
  })

  it('插入 3 钮发布 insert 命令，图片钮发布 insertClipboardImage', () => {
    renderToolbar()
    expect(clickAndCollect('插入表格')).toEqual([{ kind: 'insert', snippet: 'table' }])
    expect(clickAndCollect('插入代码块')).toEqual([{ kind: 'insert', snippet: 'codeBlock' }])
    expect(clickAndCollect('插入分隔线')).toEqual([{ kind: 'insert', snippet: 'hr' }])
    expect(clickAndCollect('插入图片（剪贴板）')).toEqual([{ kind: 'insertClipboardImage' }])
    cleanup()
  })

  it('命令通道无人订阅时点击不抛错（no-op 语义）', () => {
    renderToolbar()
    expect(() => fireEvent.click(screen.getByRole('button', { name: '加粗' }))).not.toThrow()
    cleanup()
  })

  it('发布命令走的是全局通道（与胶囊同源）', () => {
    const seen: EditorCommand[] = []
    const off = subscribeEditorCommands((command) => {
      seen.push(command)
      return true
    })
    renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    // 订阅存活期内直接 publish 亦被收到（通道未被子类化/分叉）
    expect(publishEditorCommand({ kind: 'format', action: 'bold' })).toBe(true)
    off()
    cleanup()
    expect(seen).toEqual([
      { kind: 'format', action: 'bold' },
      { kind: 'format', action: 'bold' }
    ])
  })
})
