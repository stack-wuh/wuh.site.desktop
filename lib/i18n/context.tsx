'use client'

/**
 * 壳层 locale 状态（两段式渲染）：初始固定 defaultLocale，与静态导出 HTML 一致，
 * mount 后切到 localStorage 存储值（键 `wd.locale`，与 wd.theme 同模式）——避免
 * hydration mismatch；启动切换瞬间的中文闪帧由 splash 窗覆盖，运行时切换即时生效。
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { defaultLocale, locales, type Locale } from './locales'

const STORAGE_KEY = 'wd.locale'

function isLocale(value: unknown): value is Locale {
  return value === 'zh' || value === 'en' || value === 'ja'
}

function readStored(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (isLocale(raw)) return raw
  } catch {
    // 存储不可用时走默认
  }
  return defaultLocale
}

export type Translate = (key: string, params?: Record<string, string | number>) => string

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  setLocale: () => undefined,
  t: (key) => key
})

function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = locales[locale][key] ?? locales[defaultLocale][key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

export function LocaleProvider(props: { children: ReactNode }): React.JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const stored = readStored()
    if (stored !== defaultLocale) setLocaleState(stored)
  }, [])

  const setLocale = useCallback((next: Locale): void => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 忽略持久化失败（与 ThemeProvider 同语义）
    }
  }, [])

  const t = useCallback<Translate>((key, params) => translate(locale, key, params), [locale])

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{props.children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}
