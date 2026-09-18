#!/usr/bin/env node
/**
 * 应用图标生成器（零依赖）：SDF 几何直接光栅化 PNG。
 *
 * 设计语言 = wuh.site 品牌：
 * - 酒红渐变圆角方（macOS squircle 比例，1024 画布 / 824 内容 / 22.4% 圆角）
 * - W 字标（站点 logo 的 M14 16 L24 44 … 折线，圆帽圆角连接，奶油白描边）
 * - 金色菱形点缀（站点 ornament 母题 + accent 色 #E3B567）
 *
 * 用法：node scripts/generate-app-icon.mjs [尺寸]
 * 输出：build/icon.png（默认 1024，同时生成 build/iconset/* 供 iconutil 打 icns）
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MASTER = 1024

// ---------- SDF 基元 ----------

/** 圆角矩形（居中式：half = 半宽高, r = 圆角半径） */
function sdRoundRect(px, py, cx, cy, half, r) {
  const qx = Math.abs(px - cx) - (half - r)
  const qy = Math.abs(py - cy) - (half - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

/** 胶囊（线段 + 圆帽，radius = 描边半径） */
function sdSegment(px, py, ax, ay, bx, by, r) {
  const pax = px - ax
  const pay = py - ay
  const bax = bx - ax
  const bay = by - ay
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
  return Math.hypot(pax - bax * h, pay - bay * h) - r
}

/** 菱形（half = 顶点到中心的距离），精确欧氏距离 */
function sdDiamond(px, py, cx, cy, half) {
  const qx = Math.abs(px - cx)
  const qy = Math.abs(py - cy)
  return (qx + qy - half) / Math.SQRT2
}

const mix = (a, b, t) => a + (b - a) * t
const mixRGB = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)]
/** sRGB 空间近似平滑（视觉够用） */
const coverage = (d, aa) => Math.max(0, Math.min(1, 0.5 - d / aa))

// ---------- 设计参数（品牌 token 快照） ----------

const DESIGN = {
  bg: { from: [0xdb, 0x6b, 0x60], to: [0x7e, 0x24, 0x22] }, // wine 400→700 方向渐变
  w: [0xfd, 0xf1, 0xec], // 奶油白（background-100）
  gold: [0xe3, 0xb5, 0x67], // accent
  squircle: { half: 412, r: 185 },
  /** 站点 logo 的 W 折线（120×60 空间） */
  wPath: [
    [14, 16],
    [24, 44],
    [34, 16],
    [44, 44],
    [54, 16]
  ],
  wScale: 14, // W 宽 40 单位 → 560px
  wCenter: [512, 500],
  wStroke: 6 * 14, // logo strokeWidth 6 → 84px
  diamonds: [
    { cx: 852, cy: 220, half: 42, alpha: 1 },
    { cx: 176, cy: 800, half: 26, alpha: 0.45 }
  ]
}

function designAt(px, py, aa) {
  // 1) 圆角方底 + 对角渐变
  const dSq = sdRoundRect(px, py, 512, 512, DESIGN.squircle.half, DESIGN.squircle.r)
  const cSq = coverage(dSq, aa)
  if (cSq <= 0) return [0, 0, 0, 0]
  const t = Math.max(0, Math.min(1, (px + py) / (2 * MASTER)))
  let rgb = mixRGB(DESIGN.bg.from, DESIGN.bg.to, t)
  let alpha = cSq

  // 2) 金色菱形
  for (const d of DESIGN.diamonds) {
    const c = coverage(sdDiamond(px, py, d.cx, d.cy, d.half), aa) * d.alpha
    if (c > 0) {
      rgb = mixRGB(rgb, DESIGN.gold, c)
    }
  }

  // 3) W 字标（圆帽描边，覆盖在上）
  const s = DESIGN.wScale
  const [wcx, wcy] = DESIGN.wCenter
  const r = DESIGN.wStroke / 2
  let dW = Infinity
  for (let i = 0; i < DESIGN.wPath.length - 1; i++) {
    const [ax, ay] = DESIGN.wPath[i]
    const [bx, by] = DESIGN.wPath[i + 1]
    dW = Math.min(
      dW,
      sdSegment(px, py, (ax - 34) * s + wcx, (ay - 30) * s + wcy, (bx - 34) * s + wcx, (by - 30) * s + wcy, r)
    )
  }
  const cW = coverage(dW, aa)
  if (cW > 0) rgb = mixRGB(rgb, DESIGN.w, cW)

  return [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2]), Math.round(alpha * 255)]
}

// ---------- 光栅化（3×3 超采样抗锯齿） ----------

function render(size) {
  const buf = Buffer.alloc(size * size * 4)
  const ss = 3
  const scale = MASTER / size
  const aa = 1.5 * scale * ss
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = (x + (sx + 0.5) / ss) * scale
          const py = (y + (sy + 0.5) / ss) * scale
          const [pr, pg, pb, pa] = designAt(px, py, aa)
          r += pr * pa
          g += pg * pa
          b += pb * pa
          a += pa
        }
      }
      const n = ss * ss * 255
      const i = (y * size + x) * 4
      // 预乘累加后按 alpha 总量归一（除以 a，而非再乘 255 —— 否则 Buffer 回绕会反相）
      buf[i] = a > 0 ? Math.round(r / a) : 0
      buf[i + 1] = a > 0 ? Math.round(g / a) : 0
      buf[i + 2] = a > 0 ? Math.round(b / a) : 0
      buf[i + 3] = Math.round(a / n * 255)
    }
  }
  return buf
}

// ---------- PNG 编码（RGBA8，filter 0） ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(rgba, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- 主流程 ----------

const outDir = join(root, 'build')
mkdirSync(outDir, { recursive: true })
const master = render(MASTER)
writeFileSync(join(outDir, 'icon.png'), encodePNG(master, MASTER))
console.log(`build/icon.png (${MASTER}×${MASTER})`)

// iconset：macOS 全尺寸 + @2x
const iconset = join(outDir, 'icon.iconset')
mkdirSync(iconset, { recursive: true })
for (const s of [16, 32, 64, 128, 256, 512, 1024]) {
  const png = encodePNG(s === MASTER ? master : render(s), s)
  if (s <= 512) writeFileSync(join(iconset, `icon_${s}x${s}.png`), png)
  if (s >= 32) writeFileSync(join(iconset, `icon_${s / 2}x${s / 2}@2x.png`), png)
}
execSync(`iconutil -c icns "${iconset}" -o "${join(outDir, 'icon.icns')}"`)
console.log('build/icon.icns + build/icon.iconset/')
