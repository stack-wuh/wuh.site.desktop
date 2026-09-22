'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  buildThemeCss,
  type ColorScheme,
  type ThemeFamily
} from './tokens'

const STORAGE_KEY = 'wd.theme'

/** 外观设置：system = 跟随系统 prefers-color-scheme，其余为显式指定 */
export type SchemeSetting = 'system' | ColorScheme

export interface ThemeState {
  family: ThemeFamily
  scheme: SchemeSetting
}

interface ThemeContextValue extends ThemeState {
  setFamily: (family: ThemeFamily) => void
  setScheme: (scheme: SchemeSetting) => void
  toggleScheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  family: 'wine',
  scheme: 'dark',
  setFamily: () => undefined,
  setScheme: () => undefined,
  toggleScheme: () => undefined
})

function isScheme(value: unknown): value is SchemeSetting {
  return value === 'system' || value === 'light' || value === 'dark'
}

function readStored(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeState>
      return {
        family: parsed.family === 'plain' ? 'plain' : 'wine',
        scheme: isScheme(parsed.scheme) ? parsed.scheme : 'dark'
      }
    }
  } catch {
    // 存储不可用时走默认
  }
  return { family: 'wine', scheme: 'dark' }
}

/** system 偏好的即时解析（data-color-scheme 只接受 light/dark，CSS 变量路由不变） */
function systemScheme(): ColorScheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 主题 CSS 只注入一次（变量路由全靠 data 属性切换） */
let styleInjected = false
function injectThemeCss(): void {
  if (styleInjected) return
  // 导出产物的 <head> 已内联同 id 样式（app/layout.tsx 首帧地基），存在即视为已注入
  if (document.getElementById('wd-theme-vars')) {
    styleInjected = true
    return
  }
  const style = document.createElement('style')
  style.id = 'wd-theme-vars'
  style.textContent = buildThemeCss()
  document.head.appendChild(style)
  styleInjected = true
}

function applyAttrs(state: ThemeState): void {
  const root = document.documentElement
  root.setAttribute('data-theme-family', state.family)
  root.setAttribute('data-color-scheme', state.scheme === 'system' ? systemScheme() : state.scheme)
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

  // 跟随系统时监听系统明暗切换，即时重应用属性（CSS 变量路由即时生效）
  useEffect(() => {
    if (state.scheme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => applyAttrs(state)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [state])

  const value: ThemeContextValue = {
    ...state,
    setFamily: (family) => setState((s) => ({ ...s, family })),
    setScheme: (scheme) => setState((s) => ({ ...s, scheme })),
    toggleScheme: () =>
      setState((s) => {
        const resolved = s.scheme === 'system' ? systemScheme() : s.scheme
        return { ...s, scheme: resolved === 'dark' ? 'light' : 'dark' }
      })
  }

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
