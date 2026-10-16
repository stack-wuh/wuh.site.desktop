import fsp from 'node:fs/promises'
import path from 'node:path'
import { app, net } from 'electron'
import { implement } from './ipc'
import type { LinkMeta } from '@shared/types'

/**
 * 笺条元数据抓取（素笺手记 20261014-feature-editor-paper-rebuild）：
 * URL → og:title / og:description / og:image / favicon，渲染层笺条卡片的展示数据。
 * 不变量（brief INV-6）：只放行 http/https 绝对地址；只做文本解析不执行远程内容；
 * 缓存落 userData/link-meta.json（TTL 7 天、cap 256、抓取失败回退过期缓存、无缓存抛错）。
 * 纯逻辑（守卫/解析/缓存合并）与 Electron 装配分离，vitest 直测。
 */

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 256
const FETCH_TIMEOUT_MS = 8000
/** HTML 读取上限：元数据都在 head，超限截断防超大页面拖垮主进程 */
const MAX_HTML_BYTES = 512 * 1024
const UA = 'Mozilla/5.0 (Macintosh) wuh-site-desktop-linkmeta/1.0'

export function isFetchableUrl(url: string): boolean {
  return /^https?:\/\/\S+/i.test(url)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)
  return m ? m[1] : null
}

/** 语义键：og:title 属性序无关；普通 meta 的 name 兜底（description） */
function metaContent(html: string, prop: string, nameFallback?: string): string {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]
    const content = attr(tag, 'content')
    if (!content) continue
    const property = attr(tag, 'property') ?? attr(tag, 'name')
    if (property && property.toLowerCase() === prop) return decodeEntities(content).trim()
  }
  if (nameFallback) return metaContent(html, nameFallback)
  return ''
}

function absolute(href: string, base: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return ''
  }
}

/** HTML → 笺条元数据：og 优先、<title> 兜底、favicon 相对地址补全（无则 Google s2 服务） */
export function parseLinkMeta(html: string, baseUrl: string): LinkMeta {
  const ogTitle = metaContent(html, 'og:title')
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  const title = (ogTitle || decodeEntities((titleTag?.[1] ?? '').replace(/<[^>]*>/g, '')).trim())
  const description = metaContent(html, 'og:description', 'description')
  const image = absolute(metaContent(html, 'og:image'), baseUrl)

  let favicon = ''
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(m[0], 'rel') ?? '').toLowerCase()
    if (!rel.includes('icon')) continue
    const href = attr(m[0], 'href')
    if (!href) continue
    const abs = absolute(href, baseUrl)
    if (abs) {
      favicon = abs
      break
    }
  }
  if (!favicon) {
    try {
      const host = new URL(baseUrl).host
      favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=64`
    } catch {
      favicon = ''
    }
  }
  return { title, description, image, favicon }
}

// ===== 缓存（userData/link-meta.json）：{ [url]: { t, meta } } =====

interface CacheEntry {
  t: number
  meta: LinkMeta
}
type CacheFile = Record<string, CacheEntry>

function cachePath(): string {
  return path.join(app.getPath('userData'), 'link-meta.json')
}

async function loadCache(): Promise<CacheFile> {
  try {
    const raw = await fsp.readFile(cachePath(), 'utf8')
    const parsed = JSON.parse(raw) as CacheFile
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeCacheEntry(url: string, meta: LinkMeta): Promise<void> {
  try {
    const cache = await loadCache()
    const now = Date.now()
    cache[url] = { t: now, meta }
    const entries = Object.entries(cache)
      .filter(([, e]) => now - e.t < CACHE_TTL_MS)
      .sort((a, b) => b[1].t - a[1].t)
      .slice(0, CACHE_MAX_ENTRIES)
    await fsp.writeFile(cachePath(), JSON.stringify(Object.fromEntries(entries)), 'utf8')
  } catch {
    // 缓存不可用（盘只读等）不影响抓取主链路
  }
}

/** 抓取并缓存；命中未过期缓存直返，失败回退过期缓存，无缓存抛错（渲染层回退虚笺） */
export async function fetchLinkMetaWithCache(url: string): Promise<LinkMeta> {
  if (!isFetchableUrl(url)) throw new Error(`不允许的笺条地址: ${url}`)
  const cache = await loadCache()
  const hit = cache[url]
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.meta
  try {
    const res = await net.fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`笺条元数据抓取返回 ${res.status}`)
    const html = (await res.text()).slice(0, MAX_HTML_BYTES)
    const meta = parseLinkMeta(html, url)
    await writeCacheEntry(url, meta)
    return meta
  } catch (err) {
    if (hit) return hit.meta
    throw err instanceof Error ? err : new Error(String(err))
  }
}

implement('fetchLinkMeta', async ([url]) => fetchLinkMetaWithCache(url))
