import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { NextConfig } from 'next'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string
}

// 并入 pnpm workspace 后依赖实体在仓库根 node_modules/.pnpm，turbopack 的
// 编译根必须指向根锁文件所在目录；独立克隆（无根锁文件）时退回本包目录
const MONOREPO_ROOT = resolve(__dirname, '../..')
const turbopackRoot = existsSync(resolve(MONOREPO_ROOT, 'pnpm-lock.yaml'))
  ? MONOREPO_ROOT
  : __dirname

const nextConfig: NextConfig = {
  // 桌面静态导出：产物由主进程 app:// 协议离线加载，无服务器运行时（RSC/Route Handlers 不适用）
  output: 'export',
  distDir: './dist/next',
  // styled-components 必须经 SWC 转换：组件 ID 由文件+位置哈希，保证两端一致（与 site 同因同配）
  compiler: { styledComponents: true },
  // CSS 内联进导出 HTML：离线 app:// 加载下消除 <link> 样式晚于首帧到达的无样式闪屏
  experimental: { inlineCss: true },
  typescript: { tsconfigPath: './tsconfig.next.json', ignoreBuildErrors: true },
  // 导出模式不支持图片优化管线；桌面端无 next/image 消费
  images: { unoptimized: true },
  // 桌面应用不需要 dev 指示器悬浮标
  devIndicators: false,
  turbopack: { root: turbopackRoot },
  env: {
    // 构建期内联应用版本（设置页「关于」区块消费），不走 preload/broker 通道
    NEXT_PUBLIC_APP_VERSION: pkg.version
  }
}

export default nextConfig
