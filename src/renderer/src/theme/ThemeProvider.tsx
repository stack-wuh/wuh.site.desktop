import { createContext, useContext, useEffect, useState } from 'react'
import { PALETTES, paletteToCssVars, type ThemeName } from './tokens'

const STORAGE_KEY = 'wd:theme'

interface ThemeContextValue {
  theme: ThemeName
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => undefined
})

function initialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage 不可用时走默认深色
  }
  return 'dark'
}

export function ThemeProvider(props: { children: React.ReactNode }): React.JSX.Element {
  const [theme, setTheme] = useState<ThemeName>(initialTheme)

  useEffect(() => {
    const vars = paletteToCssVars(PALETTES[theme])
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value)
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // 忽略持久化失败
    }
  }, [theme])

  const toggle = (): void => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggle }}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
