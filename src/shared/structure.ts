import type { StructureKind, StructureMatch } from './types'

export interface StructurePreset {
  yearDirs: RegExp
  monthDirs: RegExp
  topicDirs: RegExp
  assetDirSuffix: string
}

/** blog 内置预设：docs/{YYYY}/{YYYY-MM}/标题.md、docs/{$专题}/文章.md、同名 .assets */
export const BLOG_PRESET: StructurePreset = {
  yearDirs: /^\d{4}$/,
  monthDirs: /^\d{4}-\d{2}$/,
  topicDirs: /^\$/,
  assetDirSuffix: '.assets'
}

export function classifyRelPath(
  relPath: string,
  preset: StructurePreset = BLOG_PRESET
): StructureMatch {
  const segs = relPath.split('/')
  const dirs = segs.slice(0, -1)

  if (dirs.some((d) => d.endsWith(preset.assetDirSuffix))) {
    const owner = dirs[dirs.length - 2]
    return { kind: 'assetDir', group: owner ?? null }
  }

  for (let i = 0; i < dirs.length - 1; i++) {
    if (
      preset.yearDirs.test(dirs[i]) &&
      preset.monthDirs.test(dirs[i + 1])
    ) {
      return { kind: 'blogPost', group: `${dirs[i]}/${dirs[i + 1]}` }
    }
  }

  const topic = dirs.find((d) => preset.topicDirs.test(d))
  if (topic) {
    return { kind: 'topicPost', group: topic }
  }

  return { kind: 'other', group: null }
}

export interface StructuredEntry {
  path: string
  name: string
  month?: string
}

export interface StructuredGroup {
  title: string
  entries: StructuredEntry[]
}

export interface StructuredSection {
  kind: 'years' | 'topics' | 'other'
  title: string
  groups?: StructuredGroup[]
  entries?: StructuredEntry[]
}

const byStringAsc = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const byStringDesc = (a: string, b: string): number => byStringAsc(b, a)

/** 把扁平路径列表整理为 年份(倒序)→月份 / 专题 / 其他 三段式结构 */
export function buildStructuredSections(
  paths: string[],
  preset: StructurePreset = BLOG_PRESET
): StructuredSection[] {
  const yearMap = new Map<string, Map<string, StructuredEntry[]>>()
  const topicMap = new Map<string, StructuredEntry[]>()
  const others: StructuredEntry[] = []

  for (const path of paths) {
    if (classifyRelPath(path, preset).kind === 'assetDir') continue
    const m = classifyRelPath(path, preset)
    const name = path.split('/').pop() ?? path
    if (m.kind === 'blogPost' && m.group) {
      const [year, month] = m.group.split('/')
      const months = yearMap.get(year) ?? new Map<string, StructuredEntry[]>()
      const entries = months.get(month) ?? []
      entries.push({ path, name, month })
      months.set(month, entries)
      yearMap.set(year, months)
    } else if (m.kind === 'topicPost' && m.group) {
      const entries = topicMap.get(m.group) ?? []
      entries.push({ path, name })
      topicMap.set(m.group, entries)
    } else {
      others.push({ path, name })
    }
  }

  const sections: StructuredSection[] = []

  if (yearMap.size > 0) {
    sections.push({
      kind: 'years',
      title: '博客',
      groups: [...yearMap.keys()].sort(byStringDesc).map((year) => ({
        title: year,
        entries: [...(yearMap.get(year) as Map<string, StructuredEntry[]>).keys()]
          .sort(byStringDesc)
          .flatMap((month) =>
            (yearMap.get(year) as Map<string, StructuredEntry[]>).get(month) ?? []
          )
      }))
    })
  }

  if (topicMap.size > 0) {
    sections.push({
      kind: 'topics',
      title: '专题',
      groups: [...topicMap.keys()].sort(byStringAsc).map((topic) => ({
        title: topic,
        entries: topicMap.get(topic) ?? []
      }))
    })
  }

  if (others.length > 0) {
    sections.push({ kind: 'other', title: '其他', entries: others })
  }

  return sections
}
