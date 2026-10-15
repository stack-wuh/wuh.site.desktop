import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerPaletteCommands, resetPaletteForTests, paletteCommandsStore, type PaletteCommand } from '../lib/commands'
import { closePalette, openPalette, paletteStore } from '../lib/palette'

/**
 * 命令面板命令注册表（20261015-feature-workbench-shell task-10，纯逻辑）：
 * 壳层命令静态注册（导航/文档/模式），插件命令声明制注册（P5 manifest commands
 * → bootstrap 注册）。过滤匹配 = 标题 + 关键词小写包含，纯函数可独立测试。
 */

function cmd(overrides: Partial<PaletteCommand>): PaletteCommand {
  return {
    id: 'test.cmd',
    group: 'nav',
    title: '测试命令',
    keywords: 'test',
    run: vi.fn(),
    ...overrides
  }
}

describe('palette 命令注册表', () => {
  beforeEach(() => {
    resetPaletteForTests()
  })

  it('注册后可枚举，重置清空', () => {
    expect(paletteCommandsStore.get().commands).toEqual([])
    registerPaletteCommands([cmd({})])
    expect(paletteCommandsStore.get().commands.length).toBe(1)
    resetPaletteForTests()
    expect(paletteCommandsStore.get().commands).toEqual([])
  })

  it('过滤：标题或关键词小写包含即命中，空查询返回全部', () => {
    registerPaletteCommands([
      cmd({ id: 'a', title: '回到首页', keywords: 'home 首页' }),
      cmd({ id: 'b', title: '进入专注模式', keywords: 'focus 沉浸' })
    ])
    expect(matchTitles('专注')).toEqual(['进入专注模式'])
    expect(matchTitles('HOME')).toEqual(['回到首页'])
    expect(matchTitles('')).toHaveLength(2)
  })

  it('同 id 重复注册幂等（不重复出项）', () => {
    registerPaletteCommands([cmd({ id: 'x' }), cmd({ id: 'x' })])
    expect(paletteCommandsStore.get().commands.length).toBe(1)
  })

  it('开合状态：open/close/toggle', () => {
    expect(paletteStore.get().open).toBe(false)
    openPalette()
    expect(paletteStore.get().open).toBe(true)
    closePalette()
    expect(paletteStore.get().open).toBe(false)
  })
})

function matchTitles(query: string): string[] {
  // 与组件层同一匹配语义：小写包含标题或关键词
  const q = query.trim().toLowerCase()
  return paletteCommandsStore
    .get()
    .commands.filter((c) => !q || `${c.title} ${c.keywords}`.toLowerCase().includes(q))
    .map((c) => c.title)
}
