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
