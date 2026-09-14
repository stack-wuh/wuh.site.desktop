/**
 * 设计 token —— x.wuh.site 设计系统快照
 *
 * source: packages/components/themes/{generator-color.ts, index.ts, cssVariableProvider.tsx}
 * source commit: a48b1aa (x.wuh.site main, 2026-09-13)
 *
 * 站点调色板为源码直出、跨仓库不可消费，按 brief 决策快照复制值；
 * 变量命名、data 属性、三层结构与站点完全一致，保证视觉同源。
 * 站点更新调色板时需同步此文件（见文件头 source commit）。
 */

export type ThemeFamily = 'wine' | 'plain'
export type ColorScheme = 'light' | 'dark'

const LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const
type Level = (typeof LEVELS)[number]
type ColorScale = Record<Level, string>
type FamilyPalette = { primary: ColorScale; normal: ColorScale; background: ColorScale }

const toScale = (
  ...colors: [string, string, string, string, string, string, string, string, string]
): ColorScale =>
  LEVELS.reduce((acc, lv, i) => {
    acc[lv] = colors[i]
    return acc
  }, {} as ColorScale)

// ======== Wine / 酒红 ========
const wineLight: FamilyPalette = {
  primary: toScale('#FCEDEC', '#F8D8D6', '#F2BEBB', '#E2928D', '#C94A44', '#A13531', '#8A2A26', '#6B1F1E', '#4D1515'),
  normal: toScale('#FFFDFB', '#F8F3EE', '#EBE2D8', '#D4C8B8', '#B9A998', '#A08878', '#8A6E5C', '#5A4438', '#2A1E16'),
  background: toScale('#FFFBF8', '#FDF3EC', '#FAE5D8', '#F5D0BC', '#EBB89E', '#DE9A7C', '#C88062', '#A86A50', '#F5F0EC')
}

const wineDark: FamilyPalette = {
  primary: toScale('#3A1516', '#4A1B1C', '#5B2223', '#7A2F2F', '#E36A64', '#F07A73', '#F6A09B', '#F9C5C1', '#FCE6E4'),
  // generate('#ffffff', { theme: 'dark' })
  normal: toScale('#2c2c2c', '#454545', '#5b5b5b', '#7e7e7e', '#adadad', '#dcdcdc', '#e8e8e8', '#f3f3f3', '#f8f8f8'),
  // generate('#0a0404', { theme: 'dark' })
  background: toScale('#111111', '#0f0f0f', '#110f0f', '#100d0d', '#0e0a0a', '#0c0606', '#170e0e', '#231a1a', '#2f2a2a')
}

// ======== Plain / 素雅 ========
const plainLight: FamilyPalette = {
  primary: toScale('#FBF4EE', '#F5E4D6', '#EBC9AE', '#DBA87E', '#C89060', '#A87348', '#8C5A35', '#6B4325', '#4A2C18'),
  normal: toScale('#FDFCFA', '#F5F1EA', '#E8E2D6', '#D4CBB8', '#B8AC98', '#9B8D78', '#6B5E4E', '#4A3F32', '#2A2218'),
  background: toScale('#FFFDF9', '#F8F3EC', '#F0E8DC', '#E5D8C4', '#D4C4AC', '#BFA88C', '#A68B6C', '#8B7052', '#F2EDE4')
}

const plainDark: FamilyPalette = {
  primary: toScale('#2a1a0c', '#3a2412', '#4e2e18', '#6a3e20', '#D4A478', '#deb896', '#e8ccb4', '#f2e0d2', '#faf0ea'),
  normal: toScale(
    '#201a14', '#28221a',
    'rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.14)',
    'rgba(255, 255, 255, 0.20)', 'rgba(255, 255, 255, 0.30)',
    'rgba(255, 255, 255, 0.42)', 'rgba(255, 255, 255, 0.58)',
    'rgba(255, 255, 255, 0.72)'
  ),
  background: toScale('#1c1814', '#221c18', '#2a221c', '#322820', '#3a2e24', '#44362a', '#504032', '#5c4a3a', '#0b0908')
}

// ======== 共享语义色（antd 标准色板前 9 级） ========
const successLight = toScale('#f6ffed', '#d9f7be', '#b7eb8f', '#95de64', '#73d13d', '#52c41a', '#389e0d', '#237804', '#135200')
const successDark = toScale('#162312', '#1d3712', '#274916', '#306317', '#3c8618', '#49aa19', '#6abe39', '#8fd460', '#b2e58b')
const dangerLight = toScale('#fff1f0', '#ffccc7', '#ffa39e', '#ff7875', '#ff4d4f', '#f5222d', '#cf1322', '#a8071a', '#820014')
const dangerDark = toScale('#2a1215', '#431418', '#58181c', '#791a1f', '#a61d24', '#d32029', '#e84749', '#f37370', '#f89f9a')
const warningLight = toScale('#fff7e6', '#ffe7ba', '#ffd591', '#ffc069', '#ffa940', '#fa8c16', '#d46b08', '#ad4e00', '#873800')
const warningDark = toScale('#2b1d11', '#442a11', '#593815', '#7c4a15', '#aa6215', '#d87a16', '#e89a3c', '#f3b765', '#f8cf8d')

export const palettes = {
  wl: wineLight,
  wd: wineDark,
  pl: plainLight,
  pd: plainDark,
  success: { light: successLight, dark: successDark },
  danger: { light: dangerLight, dark: dangerDark },
  warning: { light: warningLight, dark: warningDark }
} as const

// ======== 非颜色 token（快照自 themes/index.ts） ========
export const spaces = {
  none: '0px', xs: '8px', base: '12px', sm: '16px',
  md: 'clamp(20px, 4vw, 28px)', lg: 'clamp(24px, 5vw, 36px)',
  xl: 'clamp(32px, 6vw, 48px)', '2xl': 'clamp(48px, 8vw, 72px)', '3xl': 'clamp(64px, 10vw, 96px)'
} as const

export const fontSizes = {
  none: '0px', xs: '12px', sm: '13px', base: '15px', md: '17px',
  lg: '22px', xl: '30px', '2xl': '38px', '3xl': '52px'
} as const

export const borderRadius = {
  none: '0px', xs: '2px', sm: '4px', base: '8px', md: '12px',
  lg: '16px', xl: '20px', '2xl': '24px', '3xl': '28px'
} as const

export const motion = {
  'ease-out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
  'ease-in-out-soft': 'cubic-bezier(0.45, 0, 0.25, 1)',
  'dur-quick': '150ms',
  'dur-reveal': '600ms',
  'dur-write': '400ms'
} as const

// ======== CSS 生成（三层结构，与站点 cssVariableProvider 同构） ========

function emitLayer1(): string {
  const lines: string[] = []
  for (const [prefix, palette] of Object.entries(palettes)) {
    for (const [colorName, levels] of Object.entries(palette)) {
      if (colorName === 'light' || colorName === 'dark') {
        for (const [level, value] of Object.entries(levels as ColorScale)) {
          lines.push(`--_${prefix}-${colorName}-${level}: ${value};`)
        }
      } else {
        for (const [level, value] of Object.entries(levels as ColorScale)) {
          lines.push(`--_${prefix}-${colorName}-${level}: ${value};`)
        }
      }
    }
  }
  return lines.join('\n    ')
}

const FAMILY_NAMES = ['primary', 'normal', 'background'] as const
const SHARED_NAMES = ['success', 'danger', 'warning'] as const

function emitFamilyVars(prefix: string): string {
  return FAMILY_NAMES.flatMap((name) =>
    LEVELS.map((lv) => `--${name}-${lv}: var(--_${prefix}-${name}-${lv});`)
  ).join('\n    ')
}

function emitSharedVars(scheme: 'light' | 'dark'): string {
  return SHARED_NAMES.flatMap((name) =>
    LEVELS.map((lv) => `--${name}-${lv}: var(--_${name}-${scheme}-${lv});`)
  ).join('\n    ')
}

function emitNonColorTokens(): string {
  const lines: string[] = []
  for (const [k, v] of Object.entries(spaces)) lines.push(`--space-${k}: ${v};`)
  for (const [k, v] of Object.entries(fontSizes)) lines.push(`--font-size-${k}: ${v};`)
  for (const [k, v] of Object.entries(borderRadius)) lines.push(`--border-radius-${k}: ${v};`)
  for (const [k, v] of Object.entries(motion)) lines.push(`--motion-${k}: ${v};`)
  return lines.join('\n    ')
}

/**
 * 全量主题 CSS。选择器与站点一致（data-theme-family / data-color-scheme），
 * 直接注入 document head 的 <style>。
 */
export function buildThemeCss(): string {
  return `
/* ===== Layer 1: raw palette ===== */
:root {
    ${emitLayer1()}
}

/* ===== Layer 2: routing ===== */
:root {
    ${emitFamilyVars('wl')}
    ${emitSharedVars('light')}
}

[data-theme-family="plain"] {
    ${emitFamilyVars('pl')}
}

[data-color-scheme="dark"] {
    ${emitFamilyVars('wd')}
    ${emitSharedVars('dark')}
}

[data-theme-family="plain"][data-color-scheme="dark"] {
    ${emitFamilyVars('pd')}
}

/* ===== Layer 3: non-color tokens ===== */
:root {
    ${emitNonColorTokens()}
    --font-sans: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    --font-mono: 'JetBrains Mono', 'Noto Sans SC', ui-monospace, SFMono-Regular, Menlo, monospace;
    --line-height-body: 1.8;
    --line-height-heading: 1.35;
}

/* ===== Semantic & UI tokens ===== */
:root {
    --primary-color: var(--primary-500);
    --secondary-color: var(--normal-500);
    --success-color: var(--success-500);
    --danger-color: var(--danger-500);
    --warning-color: var(--warning-500);
    --text-color: var(--normal-900);
    --text-primary: var(--normal-900);
    --text-secondary: var(--normal-700);
    --text-muted: var(--normal-700);
    --background-color: var(--background-900);
    --accent-color: #E3B567;
    --transition-fast: 180ms;
    --elevation-soft: 0 4px 14px rgba(0,0,0,.06);
    --elevation-card: 0 20px 40px rgba(0,0,0,0.08);
    --radius-card: var(--border-radius-2xl);
    /* desktop chrome：由语义色派生，四主题自适应 */
    --chrome-panel: color-mix(in oklab, var(--background-color) 94%, var(--text-primary) 6%);
    --chrome-raised: color-mix(in oklab, var(--background-color) 88%, var(--text-primary) 12%);
    --chrome-border: color-mix(in oklab, var(--background-color) 80%, var(--text-primary) 20%);
    --chrome-hover: color-mix(in oklab, var(--background-color) 90%, var(--text-primary) 10%);
}

[data-color-scheme="dark"] {
    --text-color: var(--normal-500);
    --text-primary: var(--normal-500);
    --text-secondary: var(--normal-600);
    --text-muted: var(--normal-700);
    --elevation-soft: 0 4px 14px rgba(0,0,0,.25);
    --elevation-card: 0 18px 36px rgba(0,0,0,0.45);
    --chrome-panel: color-mix(in oklab, var(--background-color) 88%, #000 12%);
    --chrome-raised: color-mix(in oklab, var(--background-color) 80%, #000 20%);
    --chrome-border: color-mix(in oklab, var(--background-color) 70%, #fff 14%);
    --chrome-hover: color-mix(in oklab, var(--background-color) 84%, #fff 8%);
}

[data-theme-family="plain"] {
    --primary-color: var(--primary-600);
    --secondary-color: var(--normal-600);
    --text-primary: var(--normal-900);
    --text-secondary: var(--normal-700);
    --text-muted: var(--normal-600);
    --text-color: var(--normal-900);
    --accent-color: #C89060;
    --elevation-soft: 0 2px 8px rgba(0,0,0,.04);
    --elevation-card: 0 4px 16px rgba(0,0,0,.06);
    --font-size-sm: 15px;
    --font-size-md: 17px;
    --font-size-lg: 19px;
    --font-size-xl: 22px;
    --font-size-2xl: 27px;
    --line-height-body: 2.0;
    --line-height-heading: 1.4;
}

[data-theme-family="plain"][data-color-scheme="dark"] {
    --text-primary: var(--normal-900);
    --text-secondary: rgba(245, 241, 234, 0.82);
    --text-muted: rgba(245, 241, 234, 0.68);
    --text-color: var(--normal-900);
    --elevation-soft: 0 2px 8px rgba(0,0,0,.22);
    --elevation-card: 0 4px 16px rgba(0,0,0,.36);
}
`
}
