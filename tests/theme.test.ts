import { describe, expect, it } from 'vitest'
import {
  borderRadius,
  buildThemeCss,
  fontSizes,
  motion,
  palettes,
  spaces
} from '../components/theme/tokens'

const LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const

describe('palette 快照（与站点 generator-color.ts 对齐）', () => {
  it('四主题族 × primary/normal/background × 9 级齐全', () => {
    for (const prefix of ['wl', 'wd', 'pl', 'pd'] as const) {
      for (const family of ['primary', 'normal', 'background'] as const) {
        for (const lv of LEVELS) {
          expect(palettes[prefix][family][lv], `${prefix}.${family}.${lv}`).toBeTruthy()
        }
      }
    }
  })

  it('共享语义色 light/dark × 9 级齐全', () => {
    for (const name of ['success', 'danger', 'warning'] as const) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const lv of LEVELS) {
          expect(palettes[name][scheme][lv], `${name}.${scheme}.${lv}`).toBeTruthy()
        }
      }
    }
  })

  it('抽样值与站点源一致（酒红主色 / 素雅主色 / 语义色）', () => {
    expect(palettes.wl.primary[500]).toBe('#C94A44')
    expect(palettes.wd.primary[500]).toBe('#E36A64')
    expect(palettes.pl.primary[500]).toBe('#C89060')
    expect(palettes.danger.light[500]).toBe('#ff4d4f')
    expect(palettes.danger.light[600]).toBe('#f5222d')
    expect(palettes.success.dark[600]).toBe('#49aa19')
    expect(palettes.wl.background[900]).toBe('#F5F0EC')
  })
})

describe('非颜色 token 快照', () => {
  it('spaces/fontSizes/borderRadius/motion 与站点 index.ts 对齐（抽样）', () => {
    expect(spaces.xs).toBe('8px')
    expect(spaces.md).toBe('clamp(20px, 4vw, 28px)')
    expect(fontSizes.base).toBe('15px')
    expect(borderRadius['2xl']).toBe('24px')
    expect(motion['dur-quick']).toBe('150ms')
  })
})

describe('buildThemeCss 三层结构', () => {
  const css = buildThemeCss()

  it('Layer1 输出全部 raw 调色板变量', () => {
    expect(css).toContain('--_wl-primary-500: #C94A44;')
    expect(css).toContain('--_pd-background-900: #0b0908;')
    expect(css).toContain('--_danger-dark-500: #a61d24;')
  })

  it('Layer2 四组路由 selector 与站点 data 属性一致', () => {
    expect(css).toContain('[data-theme-family="plain"] {')
    expect(css).toContain('[data-color-scheme="dark"] {')
    expect(css).toContain('[data-theme-family="plain"][data-color-scheme="dark"] {')
    expect(css).toContain('--primary-500: var(--_wl-primary-500);')
  })

  it('Layer3 非颜色 token + 语义 token + desktop chrome 派生', () => {
    expect(css).toContain('--space-xs: 8px;')
    expect(css).toContain('--font-size-base: 15px;')
    expect(css).toContain('--border-radius-2xl: 24px;')
    expect(css).toContain('--motion-dur-quick: 150ms;')
    expect(css).toContain('--primary-color: var(--primary-500);')
    expect(css).toContain('--font-sans:')
    expect(css).toContain('--font-mono:')
    expect(css).toContain('--chrome-panel:')
  })

  it('dark 语义 override 与站点一致', () => {
    expect(css).toContain('--text-primary: var(--normal-500);')
  })

  it('plain 语义 override：主色取 600 级、accent #C89060', () => {
    expect(css).toMatch(/\[data-theme-family="plain"\][\s\S]*?--primary-color: var\(--primary-600\)/)
    expect(css).toContain('--accent-color: #C89060;')
  })
})
