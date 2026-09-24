/**
 * 系统通知降级（20260924-feature-ui-feedback-system · Phase 3）：
 * 渲染层 Alert 入队时并行发 notifySystem，主进程按窗口状态裁决是否发 OS 通知——
 * 聚焦且未最小化时 no-op（应用内 Alert 已可达且必须响应）；失焦/最小化才弹系统
 * 通知，点击聚焦主窗（应用内 Alert 仍留在队列，回到窗口照样要求响应）。
 * 裁决 shouldSystemNotify 与通知器工厂 createSystemNotifier 走依赖注入，纯逻辑可测；
 * 模块级实现只在 Electron 环境触达真实 Notification（测试不 import 真实窗口）。
 */
import { BrowserWindow, Notification, app } from 'electron'
import { implement } from './ipc'

export interface SystemNotifyPayload {
  title?: string
  text: string
}

export interface WindowState {
  focused: boolean
  minimized: boolean
}

/** 纯函数裁决：聚焦且未最小化 → 不发（应用内可达）；失焦/最小化 → 发 */
export function shouldSystemNotify(state: WindowState): boolean {
  return !state.focused || state.minimized
}

export interface NotifiableWindow {
  isDestroyed(): boolean
  isFocused(): boolean
  isMinimized(): boolean
  restore(): void
  show(): void
  focus(): void
}

export interface SystemNotifyDeps {
  /** 壳窗（排除 splash 等内嵌页窗）；无窗返回 null */
  getWindow(): NotifiableWindow | null
  isSupported(): boolean
  show(input: { title: string; body: string; onClick: () => void }): void
  /** 通知标题缺省回退（应用名） */
  appName(): string
}

export type SystemNotifyResult =
  | { shown: true }
  | { shown: false; reason: 'empty' | 'no-window' | 'focused' | 'unsupported' }

export function createSystemNotifier(
  deps: SystemNotifyDeps
): (payload: SystemNotifyPayload) => SystemNotifyResult {
  return (payload) => {
    const text = typeof payload?.text === 'string' ? payload.text.trim() : ''
    const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
    if (!text && !title) return { shown: false, reason: 'empty' }
    const win = deps.getWindow()
    if (!win || win.isDestroyed()) return { shown: false, reason: 'no-window' }
    if (!shouldSystemNotify({ focused: win.isFocused(), minimized: win.isMinimized() })) {
      return { shown: false, reason: 'focused' }
    }
    if (!deps.isSupported()) return { shown: false, reason: 'unsupported' }
    deps.show({
      title: title || deps.appName(),
      body: text || title,
      onClick: () => {
        if (win.isDestroyed()) return
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
    })
    return { shown: true }
  }
}

/** 壳窗识别：启动期 splash（data: URL 内嵌页）与主窗并存，取非内嵌页窗；兜底首个存活窗 */
function findShellWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed())
  return windows.find((w) => !w.webContents.getURL().startsWith('data:')) ?? windows[0] ?? null
}

const notifier = createSystemNotifier({
  getWindow: () => findShellWindow(),
  isSupported: () => Notification.isSupported(),
  show: ({ title, body, onClick }) => {
    const notice = new Notification({ title, body })
    notice.on('click', onClick)
    notice.show()
  },
  appName: () => app.getName()
})

/** 真实依赖装配下的通知器（供 ipc 转发与 Electron 冒烟脚本直接调用） */
export function notifySystem(payload: SystemNotifyPayload): SystemNotifyResult {
  return notifier(payload)
}

implement('notifySystem', async ([payload]) => {
  notifySystem(payload as SystemNotifyPayload)
})
