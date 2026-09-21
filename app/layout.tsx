import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import AppProviders from '../components/AppProviders'
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

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="zh-CN">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
