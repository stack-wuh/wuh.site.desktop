import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 默认 node 环境（纯逻辑测试保持原速）；DOM 渲染测试经文件头
    // `// @vitest-environment happy-dom` 按文件启用（见 tests/capsule-render.test.tsx）
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
    // 本机 fork 池存在随机 SIGSEGV，改用线程池串行执行
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } }
  },
  // tsx 走自动 JSX 运行时（与 Next app 一致，无需每文件 import React）
  esbuild: {
    jsx: 'automatic'
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
