import yaml from 'js-yaml'
import type { PublishRequest } from './types'

export const METADATA_MARKER = 'wuh-site-metadata'

export interface PostMeta {
  title?: string
  labels?: string[]
  summary?: string
  cover?: string
  keywords?: string[]
  [key: string]: unknown
}

/** 解析 YAML frontmatter；无 frontmatter 时 data 为空、body 原样返回 */
export function parseFrontmatter(raw: string): { data: PostMeta; body: string } {
  const text = raw.replace(/^\uFEFF/, '')
  if (!/^---\r?\n/.test(text)) {
    return { data: {}, body: text }
  }
  const end = text.indexOf('\n---', 3)
  if (end === -1) {
    return { data: {}, body: text }
  }
  const yamlSrc = text.slice(4, end)
  const body = text.slice(end + 4).replace(/^(?:\r?\n)+/, '')
  try {
    const data = (yaml.load(yamlSrc) as PostMeta | null) ?? {}
    return { data, body }
  } catch {
    return { data: {}, body: text }
  }
}

/** 序列化回 `---\n yaml \n---\n\n body` 结构（面板写回用） */
export function stringifyFrontmatter(data: PostMeta, body: string): string {
  if (!data || Object.keys(data).length === 0) {
    return body.replace(/^\s+/, '')
  }
  const y = yaml.dump(data, { lineWidth: -1, noRefs: true, sortKeys: false })
  return `---\n${y}---\n\n${body.replace(/^\s+/, '')}`
}

/** blog 发布规范：metadata 以 HTML 注释追加到 body 末尾，不影响渲染 */
export function buildIssueBody(
  body: string,
  metadata?: Record<string, unknown>
): string {
  const trimmed = body.replace(/\s+$/, '')
  if (!metadata || Object.keys(metadata).length === 0) {
    return trimmed
  }
  return `${trimmed}\n\n<!-- ${METADATA_MARKER}: ${JSON.stringify(metadata)} -->`
}

/** 从文档全文提取发布请求所需字段（title/labels 直传，summary/cover/keywords 进 metadata 尾注） */
export function toPublishFields(raw: string): {
  title: string
  labels: string[]
  body: string
  metadata: Record<string, unknown>
} {
  const { data, body } = parseFrontmatter(raw)
  const { title, labels, summary, cover, keywords, ...rest } = data
  const metadata: Record<string, unknown> = { ...rest }
  if (summary !== undefined) metadata['summary'] = summary
  if (cover !== undefined) metadata['cover'] = cover
  if (keywords !== undefined) metadata['keywords'] = keywords
  return {
    title: title ?? '',
    labels: Array.isArray(labels) ? labels : [],
    body,
    metadata: Object.keys(metadata).length > 0 ? metadata : {}
  }
}

export type { PublishRequest }
