/**
 * 壳层导航桥（20261015-feature-workbench-shell task-13）：非组件层（帧宿主等）
 * 需要 router 导航时的唯一出口——layout 挂载时 setShellNavigate 注入 router.push，
 * 插件命令等经 shellNavigate 转发；未注入时静默忽略（如测试环境）。
 */
type NavigateFn = (path: string) => void

let impl: NavigateFn | null = null

export function setShellNavigate(fn: NavigateFn): void {
  impl = fn
}

export function shellNavigate(path: string): void {
  impl?.(path)
}

export function resetShellNavigateForTests(): void {
  impl = null
}
