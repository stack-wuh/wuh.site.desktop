import { describe, expect, it } from 'vitest'
import { isAllowedTopNavigation } from '../src/main/navigationGuard'

const prod = { isDev: false, devUrl: 'http://localhost:3000' }
const dev = { isDev: true, devUrl: 'http://localhost:3000' }

describe('isAllowedTopNavigation', () => {
  it('放行生产壳层 app://shell 的任意路径', () => {
    expect(isAllowedTopNavigation('app://shell/index.html', prod)).toBe(true)
    expect(isAllowedTopNavigation('app://shell/settings', prod)).toBe(true)
  })

  it('拒绝伪造 host 与其它 app:// host', () => {
    expect(isAllowedTopNavigation('app://shell.evil.com/index.html', prod)).toBe(false)
    expect(isAllowedTopNavigation('app://evil/index.html', prod)).toBe(false)
  })

  it('拒绝插件帧与本地资源协议', () => {
    expect(isAllowedTopNavigation('plugin://git-history/view/index.html', prod)).toBe(false)
    expect(isAllowedTopNavigation('local-resource:///etc/passwd', prod)).toBe(false)
  })

  it('dev 放行 next dev 源，生产不放行', () => {
    expect(isAllowedTopNavigation('http://localhost:3000/settings', dev)).toBe(true)
    expect(isAllowedTopNavigation('http://localhost:3000/settings', prod)).toBe(false)
    expect(isAllowedTopNavigation('http://localhost:4000/settings', dev)).toBe(false)
  })

  it('拒绝外部站点、关于页与不可解析输入', () => {
    expect(isAllowedTopNavigation('https://example.com/', dev)).toBe(false)
    expect(isAllowedTopNavigation('about:blank', dev)).toBe(false)
    expect(isAllowedTopNavigation('javascript:alert(1)', dev)).toBe(false)
    expect(isAllowedTopNavigation('not a url', dev)).toBe(false)
  })
})
