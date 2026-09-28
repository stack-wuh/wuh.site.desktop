import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 插件视图跑在 sandbox="allow-scripts" 不透明源帧里，握手与 window.wuh 全靠
// /@core/sdk.js（协议处理器不注入，视图 HTML 必须自带）。20260927 实证：三个
// 官方插件漏引导致帧内脚本恒 TypeError、宿主 5s 握手超时（只有 git-history 幸存）。
const pluginsDir = path.resolve(__dirname, '..', 'plugins')

describe('插件视图 HTML 必须自带宿主 SDK', () => {
  const pluginIds = readdirSync(pluginsDir).filter((id) =>
    existsSync(path.join(pluginsDir, id, 'view', 'index.html'))
  )

  it('至少覆盖一个插件视图（目录结构防呆）', () => {
    expect(pluginIds.length).toBeGreaterThan(0)
  })

  for (const id of pluginIds) {
    it(`${id}/view/index.html 引入 /@core/sdk.js 且在 view.js 之前`, () => {
      const html = readFileSync(path.join(pluginsDir, id, 'view', 'index.html'), 'utf8')
      const sdkAt = html.indexOf('/@core/sdk.js')
      expect(sdkAt).toBeGreaterThanOrEqual(0)
      const entryAt = html.search(/view\.(js|mjs)/)
      expect(entryAt).toBeGreaterThanOrEqual(0)
      expect(sdkAt).toBeLessThan(entryAt)
    })
  }
})
