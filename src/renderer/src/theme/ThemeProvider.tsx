import { createContext, useContext, useEffect, useState } from 'react'
import {
  buildThemeCss,
  type ColorScheme,
  type ThemeFamily
} from './tokens'

const STORAGE_KEY = 'wd.theme'

export interface ThemeState {
  family: ThemeFamily
  scheme: ColorScheme
}

interface ThemeContextValue extends ThemeState {
  setFamily: (family: ThemeFamily) => void
  setScheme: (scheme: ColorScheme) => void
  toggleScheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  family: 'wine',
  scheme: 'dark',
  setFamily: () => undefined,
  setScheme: () => undefined,
  toggleScheme: () => undefined
})

function readStored(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeState>
      return {
        family: parsed.family === 'plain' ? 'plain' : 'wine',
        scheme: parsed.scheme === 'light' ? 'light' : 'dark'
      }
    }
  } catch {
    // 存储不可用时走默认
  }
  return { family: 'wine', scheme: 'dark' }
}

/** 主题 CSS 只注入一次（变量路由全靠 data 属性切换） */
let styleInjected = false
function injectThemeCss(): void {
  if (styleInjected) return
  const style = document.createElement('style')
  style.id = 'wd-theme-vars'
  style.textContent = buildThemeCss()
  document.head.appendChild(style)
  styleInjected = true
}

function applyAttrs(state: ThemeState): void {
  const root = document.documentElement
  root.setAttribute('data-theme-family', state.family)
  root.setAttribute('data-color-scheme', state.scheme)
}

export function ThemeProvider(props: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<ThemeState>(readStored)

  useEffect(() => {
    // 无闪动：先禁过渡，应用属性并强制重排，再恢复（对齐站点 data-no-transition 方案）
    const root = document.documentElement
    root.setAttribute('data-no-transition', '')
    injectThemeCss()
    applyAttrs(state)
    void root.offsetHeight
    root.removeAttribute('data-no-transition')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 忽略持久化失败
    }
  }, [state])

  const value: ThemeContextValue = {
    ...state,
    setFamily: (family) => setState((s) => ({ ...s, family })),
    setScheme: (scheme) => setState((s) => ({ ...s, scheme })),
    toggleScheme: () =>
      setState((s) => ({ ...s, scheme: s.scheme === 'dark' ? 'light' : 'dark' }))
  }

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
