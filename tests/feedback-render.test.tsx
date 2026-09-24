// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AlertHost, FeedbackHost, MessageBannerStack, ToastStack } from '../components/ui/FeedbackHost'
import { LocaleProvider } from '../lib/i18n/context'
import { alert, dismissToast, message, resetFeedbackForTests, toast } from '../lib/feedback'
import { captureRenderConsole, resetRenderEnv } from './helpers/dom-env'

/**
 * 反馈提示宿主渲染（20260924-feature-ui-feedback-system · Phase 1）：
 * 真实 DOM 断言三机制结构/aria、操作按钮与关闭的收敛（dismissMessage /
 * resolveAlert）、Alert 必须响应语义（Esc 不关闭）、三机制并存与零 React 告警。
 */

beforeEach(() => {
  resetRenderEnv()
  resetFeedbackForTests()
})

function renderHosts(): ReturnType<typeof render> {
  return render(
    <LocaleProvider>
      <ToastStack />
      <MessageBannerStack />
      <AlertHost />
    </LocaleProvider>
  )
}

describe('ToastStack', () => {
  it('aria-live 区域常驻；入队即渲染文案；移除即消失', () => {
    const ctx = captureRenderConsole()
    try {
      renderHosts()
      // 区域常驻（空态也挂，保证首条播报不被「区域刚创建」吞掉）
      expect(screen.getByRole('status', { name: '操作提示' })).toBeTruthy()

      let id: string | null = null
      act(() => {
        id = toast({ text: '配置已保存', kind: 'success' })
      })
      expect(screen.getByText('配置已保存')).toBeTruthy()

      act(() => {
        dismissToast(id as unknown as string)
      })
      expect(screen.queryByText('配置已保存')).toBeNull()
      expect(ctx.errors).toEqual([])
    } finally {
      ctx.restore()
    }
  })
})

describe('MessageBannerStack', () => {
  it('标题/正文/操作按钮/关闭按钮结构；点击操作 resolve 对应 id', async () => {
    const ctx = captureRenderConsole()
    try {
      renderHosts()
      let resolution: string | null | undefined
      act(() => {
        void message({
          title: '保存失败',
          text: '磁盘空间不足',
          kind: 'error',
          actions: [{ id: 'retry', label: '重试', variant: 'primary' }]
        }).then((r) => {
          resolution = r
        })
      })
      expect(screen.getByText('保存失败')).toBeTruthy()
      expect(screen.getByText('磁盘空间不足')).toBeTruthy()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '重试' }))
      })
      expect(screen.queryByText('保存失败')).toBeNull()
      expect(resolution).toBe('retry')
      expect(ctx.errors).toEqual([])
    } finally {
      ctx.restore()
    }
  })

  it('关闭按钮收敛为 null 并移除横幅', async () => {
    renderHosts()
    let resolution: string | null | undefined
    act(() => {
      void message({ text: '网络异常' }).then((r) => {
        resolution = r
      })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    })
    expect(screen.queryByText('网络异常')).toBeNull()
    expect(resolution).toBeNull()
  })
})

describe('AlertHost（必须明确响应）', () => {
  it('模态渲染标题/正文/按钮；点击按钮 resolve 按钮 id', async () => {
    const ctx = captureRenderConsole()
    try {
      renderHosts()
      let resolution: string | undefined
      act(() => {
        void alert({ title: '服务中断', text: '连接已断开' }).then((r) => {
          resolution = r
        })
      })
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(screen.getByText('服务中断')).toBeTruthy()
      expect(screen.getByText('连接已断开')).toBeTruthy()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '确定' }))
      })
      expect(resolution).toBe('ok')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(ctx.errors).toEqual([])
    } finally {
      ctx.restore()
    }
  })

  it('Esc 不关闭（必须明确响应）；串行展示第二条', async () => {
    renderHosts()
    act(() => {
      void alert({ text: '第一条' })
      void alert({
        text: '第二条',
        buttons: [
          { id: 'cancel', label: '取消' },
          { id: 'go', label: '继续', variant: 'primary' }
        ]
      })
    })
    expect(screen.getByText('第一条')).toBeTruthy()
    expect(screen.queryByText('第二条')).toBeNull()
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    // Esc 后仍在（AlertHost 的 onClose 为 no-op）
    expect(screen.getByText('第一条')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '确定' }))
    })
    // 第二条接管展示
    expect(screen.getByText('第二条')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '继续' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('三机制并存', () => {
  it('toast / message / alert 同屏互不干扰', () => {
    renderHosts()
    act(() => {
      toast({ text: '轻提示' })
      void message({ text: '常驻横幅' })
      void alert({ text: '模态告警' })
    })
    expect(screen.getByText('轻提示')).toBeTruthy()
    expect(screen.getByText('常驻横幅')).toBeTruthy()
    expect(screen.getByText('模态告警')).toBeTruthy()
  })
})

describe('系统通知降级接线（Phase 3）', () => {
  it('alert 入队即 fire-and-forget 调用 notifySystem（载荷含 title/text）', () => {
    const notifySystem = vi.fn(async () => undefined)
    ;(window as unknown as { api: unknown }).api = { notifySystem }
    render(
      <LocaleProvider>
        <FeedbackHost />
      </LocaleProvider>
    )
    act(() => {
      void alert({ title: '服务中断', text: '连接已断开' })
    })
    expect(notifySystem).toHaveBeenCalledTimes(1)
    expect(notifySystem).toHaveBeenCalledWith({ title: '服务中断', text: '连接已断开' })
  })

  it('旧 preload 缺 notifySystem 时不抛错（静默降级为纯应用内）', () => {
    ;(window as unknown as { api: unknown }).api = {}
    const ctx = captureRenderConsole()
    try {
      render(
        <LocaleProvider>
          <FeedbackHost />
        </LocaleProvider>
      )
      act(() => {
        void alert({ text: '缺方法也能弹' })
      })
      expect(screen.getByText('缺方法也能弹')).toBeTruthy()
      expect(ctx.errors).toEqual([])
    } finally {
      ctx.restore()
    }
  })
})
