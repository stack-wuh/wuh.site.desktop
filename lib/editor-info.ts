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

/**
 * 大纲跟随：光标所在行归属的标题序号（parseOutline 序列中行号 ≤ 当前行且最近者）；
 * 首个标题之前返回 -1。围栏内的 # 行不在 outline 里，天然不参与归属。
 */
export function activeOutlineIndex(content: string, line: number): number {
  let active = -1
  const outline = parseOutline(content)
  for (let i = 0; i < outline.length; i++) {
    if (outline[i].line > line) break
    active = i
  }
  return active
}

/** 阅读时长（分钟）：每分钟约 400 字（CJK 字符 + 拉丁词混合口径），零字 0、不足 1 分钟按 1 */
export function estimateReadingMinutes(words: number): number {
  if (words <= 0) return 0
  return Math.max(1, Math.round(words / 400))
}

/**
 * 书口刻度（素笺手记 20261014，/editor 右缘大纲点集）：
 * 大纲 → 书口点集，密度自适应——≤cap 全量保留；超 cap 均匀采样（首尾必含、
 * 升序去重）。index 恒为原 outline 序号（跳章 scrollToHeading 消费原序号）。
 */
export interface SpineTick {
  /** 原 parseOutline 序列序号（scrollToHeading 的 index） */
  index: number
  level: number
  text: string
  line: number
}

export const SPINE_TICK_CAP = 24

export function spineTicks(outline: OutlineItem[], cap: number = SPINE_TICK_CAP): SpineTick[] {
  const n = outline.length
  if (n === 0) return []
  const width = Math.max(2, cap)
  if (n <= width) return outline.map((o, i) => ({ index: i, ...o }))
  const idx = new Set<number>([0, n - 1])
  for (let k = 1; k <= width - 2; k++) {
    idx.add(Math.round((k * (n - 1)) / (width - 1)))
  }
  return [...idx]
    .sort((a, b) => a - b)
    .map((i) => {
      const o = outline[i]
      return { index: i, level: o.level, text: o.text, line: o.line }
    })
}

/**
 * 书口距离档位（墨色层次）：0=当前章（朱竖线）、1=相邻（62% 墨）、2=更远（34% 墨）；
 * 无当前章（activeHeading -1）全部为 2。
 */
export function spineDistance(active: number, index: number): 0 | 1 | 2 {
  if (active < 0) return 2
  const d = Math.abs(active - index)
  return d === 0 ? 0 : d === 1 ? 1 : 2
}
