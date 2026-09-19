import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string
}

export default defineConfig({
  // 依赖全部打进 bundle：pnpm 布局的 node_modules 不会被 electron-builder 正确收集，
  // 且本应用主进程依赖（simple-git/octokit/js-yaml）均为纯 JS，可安全内联
  main: {
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    }
  },
  preload: {
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    }
  },
  renderer: {
    plugins: [react()],
    // 构建期注入应用版本（设置页「关于」区块消费），不走 preload/broker 通道
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    }
  }
})
