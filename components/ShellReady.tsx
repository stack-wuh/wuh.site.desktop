'use client'

import { useEffect } from 'react'

/**
 * 启动就绪信号：壳层 layout 挂载后通知主进程撤下 splash 窗并显示主窗。
 * 双 rAF 等首个带样式的帧绘制完成再发（ThemeProvider 的属性应用是同一次提交内的
 * 父级 effect，早于首帧）；失败静默——主进程有超时兜底，不阻塞启动。
 */
export default function ShellReady(): null {
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void window.api.rendererReady().catch(() => undefined)
      })
    })
  }, [])
  return null
}
