/**
 * 编辑器内容信息纯函数（host 侧，可独立测试）——胶囊编辑器分区的大纲/字数
 * 数据源：从 workspaceStore.content 派生，不接触编辑器实例，SSR/测试环境同构。
 */

export interface OutlineItem {
  /** 标题层级 1-6 */
  level: number
  /** 标题文本（剥离行尾闭合标记） */
  text: string
  /** 所在行号（0 起），供编辑器滚动定位 */
  line: number
}

/**
 * 解析 ATX 标题（#{1,6} + 空格）；代码围栏（``` / ~~~）内的 # 行不算标题，
 * 围栏以同字符行闭合。不解析 setext 风格（===/--- 下划线式）标题。
 */
export function parseOutline(content: string): OutlineItem[] {
  if (!content) return []
  const out: OutlineItem[] = []
  let fenceMark: string | null = null
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence) {
      if (!fenceMark) fenceMark = fence[1]
      else if (fence[1][0] === fenceMark[0]) fenceMark = null
      continue
    }
    if (fenceMark) continue
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/)
    if (heading) {
      out.push({
        level: heading[1].length,
        text: heading[2].trim().replace(/#+\s*$/, '').trim(),
        line: i
      })
    }
  }
  return out
}

export interface WordCount {
  /** CJK 字符逐字计 + 拉丁词计 */
  words: number
  /** 非空白字符数 */
  chars: number
}

/** 字数统计：中日韩（含假名/谚文）按字符、拉丁字母数字串按词，空白不计入 */
export function countWords(content: string): WordCount {
  const cjk = content.match(/[\u4e00-\u9fff\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af]/g)?.length ?? 0
  const latin = content.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g)?.length ?? 0
  const chars = content.replace(/\s/g, '').length
  return { words: cjk + latin, chars }
}

/** 插入片段模板（胶囊「插入类」用）；内容语言中立，不进 i18n */
export const INSERT_SNIPPETS: Record<'table' | 'codeBlock' | 'hr', string> = {
  table: '| Header | Header |\n| --- | --- |\n| Cell | Cell |',
  codeBlock: '```\n\n```',
  hr: '\n\n---\n\n'
}
