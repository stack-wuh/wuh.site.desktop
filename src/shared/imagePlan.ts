/** blog 约定：图片落在与文档同目录的同名 `.assets` 文件夹内 */

export function assetsDirNameFor(docRelPath: string): string {
  const base = docRelPath.split('/').pop() ?? docRelPath
  const stem = base.replace(/\.[^./]+$/, '')
  return `${stem}.assets`
}

export function sanitizeImageName(name: string): string {
  const m = /^(.*?)(\.[a-zA-Z0-9]+)?$/.exec(name.trim())
  const stem = (m?.[1] ?? name)
    .replace(/\s+/g, '-')
    // CJK 之间的连字符无 URL 价值，按中文文件名惯例去除
    .replace(/(?<=[\u4e00-\u9fff])-(?=[\u4e00-\u9fff])/g, '')
  const ext = m?.[2] ?? '.png'
  return `${stem}${ext}`
}

function stamp(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
}

export interface ImageSavePlan {
  assetsDirName: string
  fileName: string
  /** 相对文档目录的 Markdown 引用 */
  markdownRef: string
}

export function planImageSave(input: {
  docRelPath: string
  originalName: string
  existingNames: string[]
  now?: Date
}): ImageSavePlan {
  const now = input.now ?? new Date()
  const assetsDirName = assetsDirNameFor(input.docRelPath)
  const clean = sanitizeImageName(input.originalName)
  const dot = clean.lastIndexOf('.')
  const stem = clean.slice(0, dot)
  const ext = clean.slice(dot)
  const existing = new Set(input.existingNames)
  const ts = stamp(now)
  let fileName = `${stem}-${ts}${ext}`
  let n = 2
  while (existing.has(fileName)) {
    fileName = `${stem}-${ts}-${n}${ext}`
    n++
  }
  return { assetsDirName, fileName, markdownRef: `${assetsDirName}/${fileName}` }
}
