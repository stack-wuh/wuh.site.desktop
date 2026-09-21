import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  // 依赖全部打进 bundle：pnpm 布局的 node_modules 不会被 electron-builder 正确收集，
  // 且本应用主进程依赖（simple-git/octokit/js-yaml）均为纯 JS，可安全内联。
  // 渲染层已迁 Next（app/ 由 `next build` 导出至 dist/next，见 next.config.ts），
  // 此处仅保留 main/preload。
  main: {
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    }
  },
  preload: {
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    }
  }
})
