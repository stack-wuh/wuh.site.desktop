/**
 * 编辑器导出（host 侧逻辑，20260923-feature-capsule-control-center）：
 * 复用 renderPipeline 的 renderService（与预览/插件预览同源渲染，公式/mermaid
 * 等 html:false 转义边界一致），产出独立 HTML 文档——复制到剪贴板或写为
 * 文档同目录 `<stem>.html` 文件（复用 saveAs 的 writeFile 能力链）。
 */
import { workspaceStore } from './store'
import { renderService } from './renderPipeline'

/** 独立 HTML 包装：内联基础排版样式，色值走系统字体/中性灰（脱离应用主题自洽） */
function wrapStandaloneHtml(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title.replace(/[<>&]/g, '')}</title>
<style>
  body { margin: 0; padding: 40px 24px; background: #fff; color: #222;
    font-family: -apple-system, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 15px; line-height: 1.8; }
  main { max-width: 760px; margin: 0 auto; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.35; margin: 1.2em 0 0.5em; }
  h1 { font-size: 26px; } h2 { font-size: 21px; } h3 { font-size: 18px; }
  a { color: #0b62c4; }
  code { font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace; font-size: 0.9em;
    background: #f4f4f5; padding: 1px 5px; border-radius: 4px; }
  pre { background: #f7f7f8; padding: 12px 14px; border-radius: 8px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  blockquote { margin: 8px 0; padding: 2px 14px; border-left: 3px solid #d9d9de; color: #666; }
  img { max-width: 100%; border-radius: 8px; }
  table { border-collapse: collapse; } th, td { border: 1px solid #d9d9de; padding: 4px 10px; }
  hr { border: none; border-top: 1px solid #d9d9de; }
</style>
</head>
<body><main>${bodyHtml}</main></body>
</html>`
}

/** 渲染当前文档为独立 HTML；无内容时抛错（调用方提示） */
export async function buildStandaloneHtml(): Promise<string> {
  const doc = workspaceStore.get()
  const content = doc.content ?? ''
  if (!content.trim()) throw new Error('当前文档为空')
  const { html } = await renderService.execute({ root: doc.root, docPath: doc.activePath }, content)
  const title = doc.activePath?.split('/').pop()?.replace(/\.md$/i, '') ?? 'export'
  return wrapStandaloneHtml(html, title)
}

/** 复制为 HTML 到剪贴板 */
export async function copyAsHtml(): Promise<void> {
  const html = await buildStandaloneHtml()
  await navigator.clipboard.writeText(html)
}

/** 导出为 `<stem>.html` 文件（文档同目录）；未保存草稿抛错（先保存再导出） */
export async function exportHtmlFile(): Promise<string> {
  const doc = workspaceStore.get()
  if (!doc.activePath) throw new Error('请先保存文档，再导出 HTML')
  const html = await buildStandaloneHtml()
  const rel = doc.activePath.replace(/\.md$/i, '.html')
  await window.api.writeFile(rel, html)
  return rel
}
