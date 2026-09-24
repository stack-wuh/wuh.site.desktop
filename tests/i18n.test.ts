import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultLocale, localeLabels, locales, type Locale } from '../lib/i18n/locales'

const LOCALE_LIST: Locale[] = ['zh', 'en', 'ja']

const ROOT = fileURLToPath(new URL('..', import.meta.url))
/** 源码扫描范围：渲染层三目录（主进程/插件不走这本字典） */
const SOURCE_DIRS = ['app', 'components', 'lib']

function collectSourceFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (/\.tsx?$/.test(entry.name) && !p.endsWith(path.join('i18n', 'locales.ts'))) out.push(p)
    }
  }
  for (const dir of SOURCE_DIRS) walk(path.join(ROOT, dir))
  return out
}

const SOURCE_FILES = collectSourceFiles()
const DEFINED = new Set(Object.keys(locales[defaultLocale]))
/** 字典里出现过的命名空间（键首段）：用于识别「形如文案键」的字符串字面量 */
const NAMESPACES = new Set([...DEFINED].map((k) => k.split('.')[0]))

describe('i18n 字典完整性', () => {
  it('三语字典 key 集合严格一致', () => {
    const zhKeys = Object.keys(locales.zh).sort()
    for (const locale of ['en', 'ja'] as const) {
      expect(Object.keys(locales[locale]).sort(), `${locale} 与 zh key 集合不一致`).toEqual(zhKeys)
    }
  })

  it('所有文案非空且类型为字符串', () => {
    for (const locale of LOCALE_LIST) {
      for (const [key, value] of Object.entries(locales[locale])) {
        expect(typeof value, `${locale}.${key} 应为字符串`).toBe('string')
        expect(value.trim().length, `${locale}.${key} 不应为空`).toBeGreaterThan(0)
      }
    }
  })

  it('默认 locale 为 zh，语言展示名固定为本语言书写', () => {
    expect(defaultLocale).toBe('zh')
    expect(localeLabels.zh.native).toBe('中文')
    expect(localeLabels.en.native).toBe('English')
    expect(localeLabels.ja.native).toBe('日本語')
  })
})

/**
 * 源码键覆盖（20260924 修订）：translate() 缺键静默回落为 key 本身——
 * UI 会直接显示裸 key（如 menu.projects），既有 parity 测试只比对三语集合一致性，查不出这类漏配。
 * 两道扫描：① 字面量 t('x') 直接调用；② 命名空间守卫的字面量扫描（覆盖三元/映射表等间接传键）。
 */
describe('i18n 源码键覆盖', () => {
  it('字面量 t() 调用的键全部有定义', () => {
    const missing: string[] = []
    for (const file of SOURCE_FILES) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/\bt\(\s*(['"])([A-Za-z0-9_.]+)\1/g)) {
        if (!DEFINED.has(m[2])) missing.push(`${path.relative(ROOT, file)} → ${m[2]}`)
      }
    }
    expect(missing, `源代码引用了未定义的文案键（UI 将显示裸 key）:\n${missing.join('\n')}`).toEqual([])
  })

  it('形如文案键的字面量（按命名空间识别）全部有定义', () => {
    const missing: string[] = []
    for (const file of SOURCE_FILES) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/(['"])([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)\1/g)) {
        const key = m[2]
        if (!NAMESPACES.has(key.split('.')[0])) continue
        if (!DEFINED.has(key)) missing.push(`${path.relative(ROOT, file)} → ${key}`)
      }
    }
    expect(missing, `疑似漏配的文案键:\n${missing.join('\n')}`).toEqual([])
  })
})
