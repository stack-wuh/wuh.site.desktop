import { describe, expect, it } from 'vitest'
import { defaultLocale, localeLabels, locales, type Locale } from '../lib/i18n/locales'

const LOCALE_LIST: Locale[] = ['zh', 'en', 'ja']

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
