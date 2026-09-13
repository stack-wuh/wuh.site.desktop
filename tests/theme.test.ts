import { describe, expect, it } from 'vitest'
import { DARK, LIGHT, PALETTES, paletteToCssVars } from '@renderer/theme/tokens'

describe('theme tokens', () => {
  it('两套调色板 token 结构一致', () => {
    expect(Object.keys(DARK).sort()).toEqual(Object.keys(LIGHT).sort())
  })

  it('paletteToCssVars 覆盖全部 token 且生成 --kebab-case 变量', () => {
    const darkVars = paletteToCssVars(DARK)
    const lightVars = paletteToCssVars(LIGHT)
    expect(Object.keys(darkVars).length).toBe(Object.keys(DARK).length)
    expect(Object.keys(darkVars).sort()).toEqual(Object.keys(lightVars).sort())
    expect(darkVars['--bg-panel']).toBe(DARK.bgPanel)
    expect(darkVars['--accent-soft']).toBe(DARK.accentSoft)
    expect(lightVars['--fg-dim']).toBe(LIGHT.fgDim)
  })

  it('PALETTES 注册全部主题名', () => {
    expect(Object.keys(PALETTES)).toEqual(['dark', 'light'])
  })
})
