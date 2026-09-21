import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..')
const SVG_PATH = resolve(ROOT, 'build/icon.svg')
const PNG_PATH = resolve(ROOT, 'build/icon.png')
const ICO_PATH = resolve(ROOT, 'build/icon.ico')

/** PNG IHDR：宽高位于第 16-24 字节（大端） */
function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    .toBe(true)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** ICO 目录解析：ICONDIR(6B) + ICONDIRENTRY(16B × N)，宽高 0 表示 256 */
function icoEntries(buf: Buffer): { size: number; bytes: number; offset: number }[] {
  expect(buf.readUInt16LE(0)).toBe(0)
  expect(buf.readUInt16LE(2)).toBe(1)
  const count = buf.readUInt16LE(4)
  return Array.from({ length: count }, (_, i) => {
    const e = 6 + i * 16
    return {
      size: buf.readUInt8(e) || 256,
      bytes: buf.readUInt32LE(e + 8),
      offset: buf.readUInt32LE(e + 12)
    }
  })
}

describe('build/icon.svg 设计源（Dock 图标 master）', () => {
  it('存在且为 1024 网格 macOS 圆角方底 + 同源 W 几何', () => {
    expect(existsSync(SVG_PATH)).toBe(true)
    const svg = readFileSync(SVG_PATH, 'utf8')
    expect(svg).toContain('viewBox="0 0 1024 1024"')
    // 圆角方底（Apple 网格：824 内容区 / 185 圆角）
    expect(svg).toMatch(/<rect[^>]*width="824"[^>]*rx="185"/)
    // 与 brand.tsx 同源的 W 几何（两个圆头 V，scale 7 后）
    expect(svg).toContain('M176 414 L281 610 L386 414')
    expect(svg).toContain('M386 414 L491 610 L596 414')
  })
})

describe('build/icon.png 栅格化产物', () => {
  it(
    'build:icon 脚本可复现：重跑字节不变、尺寸 1024×1024',
    // vitest 签名为 (name, options, fn)；脚本要跑 11 次 resvg 渲染 + iconutil，远超默认 5s
    { timeout: 30000 },
    () => {
      expect(existsSync(PNG_PATH)).toBe(true)
      const before = readFileSync(PNG_PATH)
      const icoBefore = existsSync(ICO_PATH) ? readFileSync(ICO_PATH) : null

      const run = spawnSync('node', [resolve(ROOT, 'scripts/build-icon.mjs')], {
        cwd: ROOT,
        encoding: 'utf8'
      })
      expect(run.status).toBe(0)

      const after = readFileSync(PNG_PATH)
      expect(after.equals(before)).toBe(true)
      expect(pngSize(after)).toEqual({ width: 1024, height: 1024 })
      if (icoBefore) {
        expect(readFileSync(ICO_PATH).equals(icoBefore)).toBe(true)
      }
    }
  )
})

describe('build/icon.ico Windows 产物', () => {
  const SIZES = [16, 24, 32, 48, 64, 128, 256]

  it('容器结构：PNG 压缩条目七档尺寸、偏移自洽不越界', () => {
    expect(existsSync(ICO_PATH)).toBe(true)
    const buf = readFileSync(ICO_PATH)
    const entries = icoEntries(buf)
    expect(entries.map((e) => e.size)).toEqual(SIZES)
    expect(entries[0].offset).toBe(6 + 16 * entries.length)
    for (const entry of entries) {
      // 每条目数据头必须是 PNG 魔数，且数据区不越界
      expect(buf.subarray(entry.offset, entry.offset + 8).equals(PNG_MAGIC)).toBe(true)
      expect(entry.offset + entry.bytes).toBeLessThanOrEqual(buf.length)
    }
    // 最后一个条目（256）应正好收在文件尾
    const last = entries[entries.length - 1]
    expect(last.offset + last.bytes).toBe(buf.length)
  })
})
