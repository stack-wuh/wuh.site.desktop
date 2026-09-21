/**
 * 受特权自定义协议契约（帧可达性前提）。
 *
 * 背景：插件视图运行在 sandbox="allow-scripts" 的不透明源帧（origin: null），
 * 帧内 <script type="module">、SDK 下发与逻辑入口 import() 都是 CORS 模式的
 * 跨源请求。Chromium 只对已启用 CORS 的协议放行，process 侧少一位 corsEnabled
 * 就会让帧「导航成功但握手永不就绪」，且报错只在帧内 DevTools 可见——用契约
 * 测试把这一位钉住。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_SCHEME, LOCAL_RESOURCE_SCHEME, PRIVILEGED_SCHEMES } from '../src/main/schemes'
import { PLUGIN_SCHEME } from '../src/shared/plugin'

function privilegesOf(scheme: string): NonNullable<(typeof PRIVILEGED_SCHEMES)[number]['privileges']> {
  const entry = PRIVILEGED_SCHEMES.find((s) => s.scheme === scheme)
  if (!entry?.privileges) throw new Error(`未注册受特权 scheme: ${scheme}`)
  return entry.privileges
}

describe('受特权自定义协议表', () => {
  it('三个 scheme 均为 standard + secure + supportFetchAPI + stream', () => {
    for (const scheme of [LOCAL_RESOURCE_SCHEME, PLUGIN_SCHEME, APP_SCHEME]) {
      const p = privilegesOf(scheme)
      expect({ scheme, standard: p.standard, secure: p.secure }).toEqual({
        scheme,
        standard: true,
        secure: true
      })
      expect({ scheme, supportFetchAPI: p.supportFetchAPI, stream: p.stream }).toEqual({
        scheme,
        supportFetchAPI: true,
        stream: true
      })
    }
  })

  it('plugin 具 CORS 资格——不透明沙箱帧的 module/子资源请求前提', () => {
    expect(privilegesOf(PLUGIN_SCHEME).corsEnabled).toBe(true)
  })

  it('local-resource 具 CORS 资格——插件帧内跨源取本地图片的前提', () => {
    expect(privilegesOf(LOCAL_RESOURCE_SCHEME).corsEnabled).toBe(true)
  })

  it('协议表是唯一声明点：主进程只引用表，不再内联注册', () => {
    const mainSource = readFileSync(resolve(__dirname, '../src/main/index.ts'), 'utf8')
    expect(mainSource).toContain('registerSchemesAsPrivileged(PRIVILEGED_SCHEMES)')
    expect(mainSource).not.toMatch(/registerSchemesAsPrivileged\(\s*\[/)
  })
})
