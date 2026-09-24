// 草稿箱跨进程共享契约（20260924-feature-editor-simplify-draft-box）。
// 仅类型与纯函数，禁止引入 node/electron API；主进程在写盘时物化派生结果，
// 渲染层列表只消费元数据、不读正文。

/** 草稿元数据（userData/drafts/index.json，主进程独占读写） */
export interface DraftMeta {
  id: string
  /** 标题：首个 ATX 标题或首行截断（≤40 字符）；空内容为空串（展示层回落「无标题」） */
  title: string
  /** 摘要：标题行之后的首个非空行（≤80 字符） */
  excerpt: string
  /** 最近更新时间（epoch ms，列表排序依据） */
  updatedAt: number
  /** 内容字符数（content.length，规模展示用） */
  chars: number
}

const TITLE_MAX = 40
const EXCERPT_MAX = 80

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

/**
 * 纯函数：从 Markdown 内容派生草稿标题。
 * 首个非空行若是 ATX 标题（# 后须有空格，与 parseOutline 规则一致）则取标题文本
 * （剥离标记与行尾闭合 #），否则取该行原文；均 trim 后截断 40 字符。
 */
export function deriveDraftTitle(content: string): string {
  const line = content.split('\n').find((l) => l.trim() !== '')
  if (line === undefined) return ''
  const heading = /^#{1,6}\s+(.+)$/.exec(line.trim())
  const text = heading
    ? heading[1].replace(/ +#+\s*$/, '').trim()
    : line.trim()
  return truncate(text, TITLE_MAX)
}

/**
 * 纯函数：从 Markdown 内容派生草稿摘要。
 * 取标题来源行之后的首个非空行（trim），截断 80 字符；单行/空内容返回空串。
 */
export function deriveDraftExcerpt(content: string): string {
  const lines = content.split('\n')
  const titleLine = lines.findIndex((l) => l.trim() !== '')
  if (titleLine === -1) return ''
  for (let i = titleLine + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed !== '') return truncate(trimmed, EXCERPT_MAX)
  }
  return ''
}
