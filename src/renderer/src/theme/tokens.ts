/** desktop 内部设计 token——与站点组件库解耦，仅服务本应用 */

export interface ThemePalette {
  bg: string
  bgPanel: string
  bgRaised: string
  border: string
  fg: string
  fgDim: string
  accent: string
  accentSoft: string
  danger: string
  ok: string
  warning: string
}

export type ThemeName = 'dark' | 'light'

export const DARK: ThemePalette = {
  bg: '#1e1f22',
  bgPanel: '#252629',
  bgRaised: '#2d2e31',
  border: '#3a3b3f',
  fg: '#d7d7db',
  fgDim: '#8b8d92',
  accent: '#5b9bf5',
  accentSoft: 'rgba(91, 155, 245, 0.28)',
  danger: '#e06c75',
  ok: '#98c379',
  warning: '#c7902c'
}

export const LIGHT: ThemePalette = {
  bg: '#f5f5f7',
  bgPanel: '#ffffff',
  bgRaised: '#ececf1',
  border: '#d5d5da',
  fg: '#242428',
  fgDim: '#71717a',
  accent: '#2f6fe0',
  accentSoft: 'rgba(47, 111, 224, 0.18)',
  danger: '#d4545e',
  ok: '#4a9e5c',
  warning: '#b07d1e'
}

export const PALETTES: Record<ThemeName, ThemePalette> = { dark: DARK, light: LIGHT }

/** camelCase token → --kebab-case CSS 变量 */
export function paletteToCssVars(p: ThemePalette): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, value] of Object.entries(p)) {
    const kebab = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    vars[`--${kebab}`] = value
  }
  return vars
}
