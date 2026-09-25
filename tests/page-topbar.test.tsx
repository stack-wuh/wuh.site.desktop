// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PageTopbar } from '../components/ui/PageTopbar'
import { LocaleProvider } from '../lib/i18n/context'

/**
 * 右栏页面共享顶栏（20260925-fix-page-header-sticky）：渲染返回按钮（icon +
 * 文案 + aria-label）与页面标题；点击返回触发 onBack。组件由页面根 flex 列
 * 容器固定在滚动流之外（flex:none），页头不随内容滚动。
 */

beforeEach(() => {
  ;(document.body as HTMLElement).innerHTML = ''
})

function renderTopbar(): { onBack: ReturnType<typeof vi.fn>; container: HTMLElement } {
  const onBack = vi.fn()
  const { container } = render(
    <LocaleProvider>
      <PageTopbar title="设置" backLabel="返回" backAria="返回首页" onBack={onBack} />
    </LocaleProvider>
  )
  return { onBack, container }
}

describe('PageTopbar（页头吸顶共享组件）', () => {
  it('渲染返回按钮（aria-label + 文案）与页面标题', () => {
    renderTopbar()
    const back = screen.getByRole('button', { name: '返回首页' })
    expect(back.textContent).toContain('返回')
    expect(screen.getByText('设置')).toBeTruthy()
  })

  it('点击返回触发 onBack', () => {
    const { onBack } = renderTopbar()
    fireEvent.click(screen.getByRole('button', { name: '返回首页' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('顶栏行内结构：返回按钮在前、标题在后（单行常驻结构）', () => {
    const { container } = renderTopbar()
    const row = container.firstElementChild as HTMLElement
    expect(row).toBeTruthy()
    const back = screen.getByRole('button', { name: '返回首页' })
    const title = screen.getByText('设置')
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })})
