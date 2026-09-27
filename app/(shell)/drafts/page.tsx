'use client'

/**
 * 草稿箱页路由出口（App Router 约定文件，20260927-refactor-midsize-component-split 起为
 * 薄入口）：视图主体与样式在 ./DraftsPage、./styles。
 */
import { DraftsPage } from './DraftsPage'

/** App Router 页面出口（右栏普通页面，返回语义走 router） */
export default function Page(): React.JSX.Element {
  return <DraftsPage />
}
