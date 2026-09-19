#!/usr/bin/env node
/**
 * Dock 图标栅格化 — build/icon.svg（设计源）→ build/icon.png（1024×1024）+ build/icon.icns
 *
 * 用法:
 *   node scripts/build-icon.mjs                 # 暗底变体（默认）
 *   node scripts/build-icon.mjs --variant light # 亮底变体 → build/icon-light.png
 *
 * 变体按 build/icon.svg 头部注释的 token 整串替换，亮/暗两版几何完全同源。
 * macOS 上额外用 iconutil 合成 icon.icns（mac 打包直接取用，不依赖 electron-builder 的转换器）。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SVG_PATH = resolve(ROOT, 'build/icon.svg')

/** 亮底变体 token 替换表（与 build/icon.svg 头部注释一一对应；dark 为 master 本体） */
const LIGHT_TOKENS = [
  ['#3A1B1E', '#FFFDFB'],
  ['#150C0D', '#F3E1D3'],
  ['#F8F3EE', '#2A1E16'],
  ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.10)'],
  ['stop-opacity="0.14"', 'stop-opacity="0.10"']
]

/** iconset 各尺寸（含 @2x），key 为 iconutil 约定文件名 */
const ICONSET_SIZES = {
  'icon_16x16.png': 16,
  'icon_16x16@2x.png': 32,
  'icon_32x32.png': 32,
  'icon_32x32@2x.png': 64,
  'icon_128x128.png': 128,
  'icon_128x128@2x.png': 256,
  'icon_256x256.png': 256,
  'icon_256x256@2x.png': 512,
  'icon_512x512.png': 512,
  'icon_512x512@2x.png': 1024
}

/** @param {string} svg @param {'dark'|'light'} variant */
export function applyVariant(svg, variant) {
  if (variant === 'dark') return svg
  if (variant !== 'light') throw new Error(`未知变体: ${String(variant)}`)
  let out = svg
  for (const [from, to] of LIGHT_TOKENS) {
    if (!out.includes(from)) throw new Error(`token 未命中: ${from}`)
    out = out.split(from).join(to)
  }
  return out
}

/** @param {string} svg @param {number} width @returns {Buffer} */
export function renderPng(svg, width = 1024) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  return resvg.render().asPng()
}

/** macOS iconutil 合成 icns；非 darwin 跳过（返回 null） */
function buildIcns(svg) {
  if (process.platform !== 'darwin') return null
  const iconsetDir = resolve(tmpdir(), 'wuh-site-icon.iconset')
  rmSync(iconsetDir, { recursive: true, force: true })
  mkdirSync(iconsetDir)
  for (const [name, size] of Object.entries(ICONSET_SIZES)) {
    writeFileSync(resolve(iconsetDir, name), renderPng(svg, size))
  }
  const outPath = resolve(ROOT, 'build/icon.icns')
  execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', outPath])
  rmSync(iconsetDir, { recursive: true, force: true })
  return outPath
}

function main() {
  const flagIndex = process.argv.indexOf('--variant')
  const variant = flagIndex > -1 ? process.argv[flagIndex + 1] : 'dark'
  const outName = variant === 'light' ? 'icon-light.png' : 'icon.png'
  const outPath = resolve(ROOT, 'build', outName)

  const scaled = applyVariant(readFileSync(SVG_PATH, 'utf8'), variant)
  const png = renderPng(scaled, 1024)
  writeFileSync(outPath, png)
  process.stdout.write(`build/icon.svg (${variant}) → build/${outName} (${png.length} bytes)\n`)

  if (variant === 'dark') {
    const icns = buildIcns(scaled)
    if (icns) process.stdout.write(`build/icon.icns (${existsSync(icns) ? 'ok' : 'missing'})\n`)
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main()
}
