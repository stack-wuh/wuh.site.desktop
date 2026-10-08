// YAML frontmatter 解析/序列化（插件自带，语义与站点 blog 规范一致；依赖 vendor/js-yaml 的 jsyaml 全局）
export function parseFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '')
  if (!/^---\r?\n/.test(text)) return { data: {}, body: text }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: text }
  const yamlSrc = text.slice(4, end)
  const body = text.slice(end + 4).replace(/^(?:\r?\n)+/, '')
  try {
    return { data: jsyaml.load(yamlSrc) ?? {}, body }
  } catch {
    return { data: {}, body: text }
  }
}

export function stringifyFrontmatter(data, body) {
  if (!data || Object.keys(data).length === 0) return body.replace(/^\s+/, '')
  const y = jsyaml.dump(data, { lineWidth: -1, noRefs: true, sortKeys: false })
  return `---\n${y}---\n\n${body.replace(/^\s+/, '')}`
}

export function toComma(v) {
  return Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v)
}

export function fromComma(v) {
  return v.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
}

// 标题建议清洗——口径对齐主进程 suggestFileStem（src/main/saveDialog.ts）：
// 非法字符转空格、压缩空白、去尾部点空格、80 截断；帧沙箱不能 import 主进程模块，
// 两处若调整口径须同步（20261007-feature-frontmatter-editor-hide 空态一键创建用）。
const ILLEGAL_NAME_CHARS = /[/\\:*?"<>|\u0000-\u001f]/g
const HEADING_RE = /^#{1,6}[^\S\n]*(.+?)[. ]*$/m

/** 空态「创建」的标题来源：正文首个标题 → 文件名（去扩展名）→ 空串（调用方词表兜底） */
export function suggestTitle(body, fileName) {
  const m = (body || '').match(HEADING_RE)
  const raw = m ? m[1] : (fileName || '').replace(/\.[^./\\]+$/, '')
  const cleaned = raw
    .replace(ILLEGAL_NAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .replace(/[. ]+$/, '')
  return cleaned
}
