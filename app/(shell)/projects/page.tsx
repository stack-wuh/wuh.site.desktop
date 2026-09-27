'use client'

/**
 * 项目页路由出口（App Router 约定文件，20260927-refactor-midsize-component-split 起为
 * 薄入口）：视图主体与样式在 ./ProjectsPage、./styles。
 */
import { ProjectsPage } from './ProjectsPage'

/** App Router 页面出口（右栏普通页面） */
export default function Page(): React.JSX.Element {
  return <ProjectsPage />
}
