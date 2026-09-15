import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateManifest, type PluginManifest } from '@shared/plugin'

const PLUGINS_DIR = join(process.cwd(), 'plugins')

function pluginDirs(): string[] {
  return readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

describe('官方参考插件资产', () => {
  it('四个参考插件齐备', () => {
    expect([...pluginDirs()].sort()).toEqual(
      ['frontmatter', 'git-history', 'github-issues', 'preview-markdown'].sort()
    )
  })

  it.each(pluginDirs())('%s manifest 通过契约校验且入口文件存在', (name) => {
    const dir = join(PLUGINS_DIR, name)
    const raw: unknown = JSON.parse(readFileSync(join(dir, 'plugin.json'), 'utf-8'))
    const checked = validateManifest(raw)
    expect(checked.ok).toBe(true)
    if (!checked.ok) return
    const manifest = checked.manifest as PluginManifest
    for (const view of manifest.views) {
      expect(existsSync(join(dir, view.entry))).toBe(true)
    }
    if (manifest.logic) {
      expect(existsSync(join(dir, manifest.logic))).toBe(true)
    }
  })

  it('视图引用的资源（css/js/vendor）都在插件目录内', () => {
    for (const name of pluginDirs()) {
      const dir = join(PLUGINS_DIR, name)
      const raw = JSON.parse(readFileSync(join(dir, 'plugin.json'), 'utf-8')) as PluginManifest
      for (const view of raw.views) {
        const html = readFileSync(join(dir, view.entry), 'utf-8')
        const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith('http'))
        for (const ref of refs) {
          const rel = ref.replace(/^\.\//, '')
          const abs = join(dir, view.entry).replace(/[\\/][^\\/]+$/, '')
          expect(existsSync(join(abs, rel)), `${name}: ${view.entry} 引用缺失 ${ref}`).toBe(true)
        }
      }
    }
  })
})
