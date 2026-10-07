import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 页面根滚动封顶守卫（20261007-fix-shell-page-scroll）：
 * 「页面根 flex 列 + 内容独立滚动容器」（PageTopbar 吸顶范式，renderer-shell-routing 卡）
 * 依赖页面根 min-height: 0 封顶——缺省时 flex 的 min-height:auto 以内容高度托底，
 * 长页把根容器撑破壳层，滚动落到文档层，整个壳层（含 SideMenu/TitleBar）跟随滚动。
 * 源码级锁定四个采用该范式的页面根（editor 自带 min-height:0、home 自滚动，不在列）。
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const PAGE_ROOTS: Array<{ file: string; name: string }> = [
  { file: 'components/settings/SettingsPage.tsx', name: 'Page' },
  { file: 'app/(shell)/drafts/styles.ts', name: 'PageShell' },
  { file: 'app/(shell)/projects/styles.ts', name: 'PageShell' },
  { file: 'components/account/AccountPage/styles.tsx', name: 'Page' }
]

describe('页面根 min-height: 0 守卫（文档层不得成为滚动容器）', () => {
  it.each(PAGE_ROOTS)('$file 的 $name 根容器高度封顶', ({ file, name }) => {
    const src = readFileSync(join(root, file), 'utf8')
    const start = src.indexOf(`const ${name} = styled.`)
    expect(start, `${file} 中找不到 ${name}`).toBeGreaterThanOrEqual(0)
    const open = src.indexOf('`', start)
    const body = src.slice(open, src.indexOf('`', open + 1))
    expect(body, `${file} ${name} 缺 min-height: 0（长页会撑破壳层导致侧栏跟随滚动）`).toContain(
      'min-height: 0'
    )
  })
})
