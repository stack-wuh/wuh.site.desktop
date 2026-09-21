import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..')
const SPLASH_PATH = resolve(ROOT, 'src/main/splash.html')
const BRAND_PATH = resolve(ROOT, 'components/icons/brand.tsx')

const splash = readFileSync(SPLASH_PATH, 'utf8')
const brandSrc = readFileSync(BRAND_PATH, 'utf8')

describe('splash.html（启动 Loading 页）静态契约', () => {
  it('自包含：data: URL 加载，不允许任何外部引用', () => {
    expect(splash).not.toMatch(/<script[^>]*\ssrc=/i)
    expect(splash).not.toMatch(/<link\s/i)
    expect(splash).not.toMatch(/@import/i)
    expect(splash).not.toMatch(/url\(/i)
    // img/object/iframe 等带 src 的资源标签一律不允许（svg 内联绘制）
    expect(splash).not.toMatch(/<(img|object|iframe|embed|video|audio)\b/i)
    // 唯一允许的 http 引用是 SVG 命名空间
    const httpRefs = splash.match(/https?:\/\/[^"'\s>]+/g) ?? []
    for (const ref of httpRefs) {
      expect(ref, '仅允许 xmlns 命名空间').toBe('http://www.w3.org/2000/svg')
    }
  })

  it('独立 CSP：默认拒绝一切，仅放行内联样式', () => {
    const meta = splash.match(/<meta[^>]*Content-Security-Policy[^>]*>/i)
    expect(meta, '必须有 CSP meta').toBeTruthy()
    expect(meta?.[0]).toContain("default-src 'none'")
    expect(meta?.[0]).toContain("style-src 'unsafe-inline'")
    expect(meta?.[0]).not.toContain('script-src')
  })

  it('品牌标几何与 brand.tsx 同源（第三同步锚点）', () => {
    const dAttrs = [...brandSrc.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1])
    expect(dAttrs.length).toBeGreaterThanOrEqual(2)
    for (const d of dAttrs) {
      expect(splash).toContain(`d="${d}"`)
    }
    const rectAttrs = [...brandSrc.matchAll(/<rect[^>]*\bx="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)].map(
      (m) => `x="${m[1]}" y="${m[2]}" width="${m[3]}" height="${m[4]}"`
    )
    expect(rectAttrs.length).toBe(2)
    for (const rect of rectAttrs) {
      expect(splash).toContain(rect)
    }
    // 描边规格同源：圆头 + 120 网格 stroke 6
    expect(splash).toContain('stroke-width="6"')
    expect(splash).toContain('stroke-linecap="round"')
  })

  it('亮暗双底色随系统切换，颜色带 token 同步锚点注释', () => {
    expect(splash).toContain('prefers-color-scheme')
    // wine 族 --background-900：light #F5F0EC / dark #2f2a2a
    expect(splash).toContain('#F5F0EC')
    expect(splash).toContain('#2f2a2a')
    // --text-primary：light normal-900 #2A1E16 / dark normal-500 #adadad
    expect(splash).toContain('#2A1E16')
    expect(splash).toContain('#adadad')
    // --primary-color（primary-500）：light #C94A44 / dark #E36A64
    expect(splash).toContain('#C94A44')
    expect(splash).toContain('#E36A64')
    expect(splash).toContain('sync:')
  })

  it('淡出动效与 reduced-motion 降级', () => {
    expect(splash).toContain('splash--hide')
    expect(splash).toMatch(/transition:[^;]*opacity[^;]*;/)
    expect(splash).toContain('prefers-reduced-motion')
  })

  it('可访问性：logo 具备可读名称，文档声明语言', () => {
    expect(splash).toMatch(/<title>[^<]+<\/title>/)
    expect(splash).toMatch(/<html[^>]*\slang="/)
  })
})
