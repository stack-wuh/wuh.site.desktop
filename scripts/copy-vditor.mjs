/**
 * 将 node_modules/vditor/dist 的运行时资源按需复制到 public/vditor/dist。
 *
 * Vditor 实例化时的 cdn 选项指向 '/vditor'，其懒加载脚本（lute/katex/mermaid/
 * highlight.js/i18n 等）按 `{cdn}/dist/js/...` 约定取文件——桌面端为离线静态导出
 * （app:// 协议），必须整体本地化，不能落在默认 unpkg CDN 上。
 *
 * 只复制启用能力所需子集（公式=katex、图表=mermaid、代码高亮=highlight.js、
 * 内核=lute、界面语言=i18n、工具栏图形=icons、表情=images），跳过 echarts/
 * mathjax/markmap/plantuml 等未启用的大体积目录。产物进 .gitignore，dev/build
 * 前经 prepare:vditor 脚本再生。
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'vditor', 'dist')
const dest = join(root, 'public', 'vditor', 'dist')

const COPY_ENTRIES = ['css', 'images', 'js/lute', 'js/highlight.js', 'js/katex', 'js/mermaid', 'js/i18n', 'js/icons']

if (!existsSync(src)) {
  console.error('[copy-vditor] 未找到 node_modules/vditor/dist，请先 pnpm install')
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
for (const entry of COPY_ENTRIES) {
  const from = join(src, entry)
  if (!existsSync(from)) {
    console.warn(`[copy-vditor] 跳过不存在的资源目录: ${entry}`)
    continue
  }
  cpSync(from, join(dest, entry), { recursive: true })
}
console.log(`[copy-vditor] 已本地化 Vditor 运行时资源 → public/vditor/dist`)
