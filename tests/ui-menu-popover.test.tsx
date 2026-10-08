// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MenuPopover, type MenuPopoverOption } from '../components/ui/MenuPopover'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

/**
 * 共享轻量下拉菜单（20261008-feature-image-upload-choice）：编辑工具条与壳层胶囊
 * 图片入口的同一动作菜单件。守 interaction.md/壳层契约——Escape 关闭、点外关用
 * target 归属守卫（点菜单自身不关）、焦点移入菜单项并归还触发钮、aria 齐备。
 */

function renderPopover(disabledId?: string): string[] {
  const log: string[] = []
  const option = (id: string): MenuPopoverOption => ({
    id,
    label: `项-${id}`,
    disabled: id === disabledId,
    onSelect: () => log.push(id)
  })
  const cap = captureRenderConsole()
  try {
    render(
      <MenuPopover
        ariaLabel="图片"
        icon={<span aria-hidden="true">▤</span>}
        options={[option('a'), option('b'), option('c')]}
      />
    )
  } finally {
    cap.restore()
  }
  return log
}

function trigger(): HTMLButtonElement {
  return screen.getByRole('button', { name: '图片' }) as HTMLButtonElement
}

beforeEach(() => {
  resetRenderEnv()
  cleanup()
})

describe('MenuPopover（共享下拉菜单）', () => {
  it('T11 点触发钮展开：aria-expanded 翻转、role=menu 与菜单项就位', () => {
    renderPopover()
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger())
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    const menu = screen.getByRole('menu', { name: '图片' })
    expect(menu.querySelectorAll('[role="menuitem"]')).toHaveLength(3)
  })

  it('T12 Escape 关闭并把焦点归还触发钮', () => {
    renderPopover()
    fireEvent.click(trigger())
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger())
  })

  it('T13 点外关（target 归属守卫）：外部关闭、菜单内部点击不关', () => {
    renderPopover()
    fireEvent.click(trigger())
    fireEvent.mouseDown(screen.getByRole('menu', { name: '图片' }))
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    fireEvent.mouseDown(document.body)
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('T14 菜单项点击回调并收起；disabled 项不可点', () => {
    const log = renderPopover('b')
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: '项-a' }))
    expect(log).toEqual(['a'])
    expect(trigger().getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(trigger())
    const b = screen.getByRole('menuitem', { name: '项-b' }) as HTMLButtonElement
    expect(b.disabled).toBe(true)
    fireEvent.click(b)
    expect(log).toEqual(['a'])
  })
})
