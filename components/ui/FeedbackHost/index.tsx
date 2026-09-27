'use client'

/**
 * 反馈提示宿主（20260924-feature-ui-feedback-system · Phase 1）——总线（lib/feedback）
 * 的三个渲染落点，全部只读订阅 useFeedback()，无本地队列状态。三 Host 拆分为
 * 独立文件（20260927-refactor-midsize-component-split）：ToastStack / MessageBannerStack /
 * AlertHost 经本入口 re-export，对外具名导出面不变；共享语义映射见 ./styles。
 * 本文件保留壳层根挂载 FeedbackHost（Toast + Alert；Message 横幅由壳层放右栏文档流）
 * 与系统通知降级接线。
 * 主题只写语义 token；图标经注册表（components/icons）；三语 aria 见 feedback.* keys。
 */
import { useEffect } from 'react'
import type { DesktopApi } from '@shared/types'
import { configureSystemNotify } from '../../../lib/feedback'
import { ToastStack } from './ToastStack'
import { MessageBannerStack } from './MessageBannerStack'
import { AlertHost } from './AlertHost'

// 保持旧导入路径 `components/ui/FeedbackHost` 的四名具名导出可达（layout.tsx 与 tests 消费）
export { ToastStack, MessageBannerStack, AlertHost }

/** 壳层根挂载（Toast + Alert；Message 横幅由壳层放右栏文档流） */
export function FeedbackHost(): React.JSX.Element {
  // 系统通知降级接线：Alert 入队即发 notifySystem（fire-and-forget），主进程按
  // 窗口焦点裁决是否真弹 OS 通知；preload 落后（缺方法）时静默降级为纯应用内
  useEffect(() => {
    configureSystemNotify((payload) => {
      const api = window.api as Partial<DesktopApi> | undefined
      if (!api || typeof api.notifySystem !== 'function') return
      void api.notifySystem(payload).catch(() => undefined)
    })
    return () => configureSystemNotify(null)
  }, [])

  return (
    <>
      <ToastStack />
      <AlertHost />
    </>
  )
}
