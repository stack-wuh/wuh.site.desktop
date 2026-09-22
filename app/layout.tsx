import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import AppProviders from '../components/AppProviders'
import { buildThemeCss } from '../components/theme/tokens'
import './globals.css'

export const metadata: Metadata = {
  title: 'wuh.site'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
}

/**
 * CSP 随 index.html 迁入（导出模式 headers() 不可用，只能 meta）：
 * script-src 'unsafe-inline' 为 Next 导出的 flight 内联数据所必需；
 * dev 下追加 'unsafe-eval'（React 开发模式调试栈需要 eval，生产构建不用）；
 * frame-src plugin: 承接插件沙箱帧（PR #9 修复语义不变）；
 * connect-src 的 ws/localhost 仅供 next dev 的 HMR 通道。
 */
const isDev = process.env.NODE_ENV !== 'production'
const CSP = `default-src 'self'; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' local-resource: data: https: http:; frame-src plugin:; connect-src 'self' ws://localhost:3000 http://localhost:3000`

// 与 ThemeProvider 的 STORAGE_KEY 保持一致（client 模块常量不可被 server 组件导入，故锚点同步）
// 主题预置脚本的键名即 'wd.theme'
const THEME_STORAGE_KEY = 'wd.theme'

/**
 * 首帧前生效的主题地基（根治无样式闪屏）：
 * - 构建期内联全部 token CSS（static export 每页携带，运行时 ThemeProvider 只做属性路由）；
 * - <html> 预置默认主题（wine/dark），pre-paint 脚本按 localStorage 纠偏——首帧即终态主题，
 *   不再等 hydration 后的 useEffect。
 */
const THEME_PREPAINT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'');var r=document.documentElement;if(t.family==='plain')r.setAttribute('data-theme-family','plain');if(t.scheme==='light')r.setAttribute('data-color-scheme','light');else if(t.scheme==='dark')r.setAttribute('data-color-scheme','dark');else if(t.scheme==='system')r.setAttribute('data-color-scheme',matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}})()`

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="zh-CN" data-theme-family="wine" data-color-scheme="dark">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <style id="wd-theme-vars" dangerouslySetInnerHTML={{ __html: buildThemeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT_SCRIPT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
