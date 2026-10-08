import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 全局滚动条隐藏守卫（20261007 交互优化）：
 * 全应用不显示滚动条（观感裁决），滚动能力保留；收口唯一在 app/globals.css。
 * 源码级锁定：Chromium 经 ::-webkit-scrollbar display:none、标准侧经 scrollbar-width:none；
 * 同时禁止组件层重新引入 ::-webkit-scrollbar 定制样式（避免逐页再造滚动条外观）。
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('全局滚动条隐藏（滚动条不得可见）', () => {
  it('globals.css 收口隐藏声明齐备', () => {
    const css = readFileSync(join(root, 'app/globals.css'), 'utf8')
    expect(css).toMatch(/scrollbar-width:\s*none/)
    expect(css).toMatch(/::-webkit-scrollbar\s*\{[^}]*display:\s*none/)
  })

  it('组件层无再造的 ::-webkit-scrollbar 样式', () => {
    const dirs = ['app', 'components', 'lib']
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules') walk(p)
        } else if (/\.(css|ts|tsx)$/.test(entry.name) && /::-webkit-scrollbar/.test(readFileSync(p, 'utf8'))) {
          offenders.push(relative(root, p))
        }
      }
    }
    for (const d of dirs) walk(join(root, d))
    expect(offenders, `滚动条样式必须收口在 globals.css：${offenders.join(', ')}`).toEqual([
      join('app', 'globals.css')
    ])
  })
})
