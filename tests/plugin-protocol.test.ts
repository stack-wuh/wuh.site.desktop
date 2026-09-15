import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() },
  net: { fetch: vi.fn() }
}))

import { buildLogicHostHtml, mimeFor, parsePluginUrl } from '../src/main/plugins/protocol'

describe('parsePluginUrl', () => {
  it('解析插件资源为 { pluginId, relPath }', () => {
    expect(parsePluginUrl('plugin://git-history/view/index.html')).toEqual({
      pluginId: 'git-history',
      relPath: 'view/index.html'
    })
    expect(parsePluginUrl('plugin://gh/style.css')).toEqual({ pluginId: 'gh', relPath: 'style.css' })
  })

  it('URL 解析折叠点段（含编码态），反斜杠 .. 越界被拒', () => {
    // WHATWG URL 把 a/../ 与 %2e%2e 都折叠为目录内路径，不构成越界面
    expect(parsePluginUrl('plugin://gh/a/../b.html')).toEqual({ pluginId: 'gh', relPath: 'b.html' })
    expect(parsePluginUrl('plugin://gh/%2e%2e/secrets')).toEqual({ pluginId: 'gh', relPath: 'secrets' })
    // 反斜杠不参与 URL 折叠，解码后出现 .. 段必须拒绝
    expect(parsePluginUrl('plugin://gh/%5c..%5c..%5cwin.ini')).toBeNull()
  })

  it('空路径 / 非法 host 拒绝', () => {
    expect(parsePluginUrl('plugin://gh/')).toBeNull()
    expect(parsePluginUrl('http://gh/x.js')).toBeNull()
  })

  it('@core 虚拟路径单独标识', () => {
    expect(parsePluginUrl('plugin://gh/@core/sdk.js')).toEqual({ pluginId: 'gh', relPath: '@core/sdk.js' })
  })
})

describe('mimeFor', () => {
  it('常见资源类型', () => {
    expect(mimeFor('view/index.html')).toBe('text/html; charset=utf-8')
    expect(mimeFor('logic.js')).toBe('text/javascript; charset=utf-8')
    expect(mimeFor('style.css')).toBe('text/css; charset=utf-8')
    expect(mimeFor('img.png')).toBe('image/png')
    expect(mimeFor('font.woff2')).toBe('font/woff2')
  })

  it('未知扩展回退 octet-stream', () => {
    expect(mimeFor('data.bin')).toBe('application/octet-stream')
  })
})

describe('buildLogicHostHtml', () => {
  it('合成入口先加载 SDK 再 import 插件逻辑', () => {
    const html = buildLogicHostHtml('/logic/index.js')
    expect(html).toContain('/@core/sdk.js')
    expect(html).toContain('__startLogic')
    expect(html).toContain('/logic/index.js')
  })
})
