/**
 * 阿里云 OSS 图床直传（20261007-feature-image-host-plugin）：
 * - 纯逻辑层（key 生成 / 外链解析 / 配置校验）可独立测试，不触碰 electron 与网络；
 * - 传输层经 createAliOssTransport 惰性加载 ali-oss（AccessKey 只进主进程，
 *   凭证不入 settings.json，存 userData 下 safeStorage 加密文件，见 credentials.ts）；
 * - 外链默认 https://{bucket}.{endpoint}/{key}，绑定自定义域名时整体替换，
 *   签名与上传细节交 SDK，本模块只做装配与错误归一（报错文案不携带凭证）。
 */
import { createHash } from 'node:crypto'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { OssSettings, UploadResult } from '@shared/types'
import type { OssCredentials } from './credentials'

export interface OssConfig {
  endpoint: string
  bucket: string
  customDomain: string | null
  prefixTemplate: string | null
}

/** settings.json 的 oss 段 → 纯配置视图 */
export function toOssConfig(oss: OssSettings | null | undefined): OssConfig | null {
  if (!oss || !oss.endpoint || !oss.bucket) return null
  return { endpoint: oss.endpoint, bucket: oss.bucket, customDomain: oss.customDomain, prefixTemplate: oss.prefixTemplate }
}

/** 前缀清洗：去首尾斜杠、压缩连续斜杠与空白；空回退空串（桶根） */
export function sanitizePrefix(prefix: string): string {
  return prefix
    .trim()
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 前缀模板渲染：{yyyy} {MM} {dd} 按 UTC 口径替换（确定性，测试可固定） */
export function renderPrefixTemplate(template: string, now: Date): string {
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return template.replaceAll('{yyyy}', yyyy).replaceAll('{MM}', mm).replaceAll('{dd}', dd)
}

const EXT_RE = /^[a-z0-9]{1,8}$/

/** 内容 hash 前 8 位（sha256），同内容恒定、不同内容几乎不撞 */
function hash8(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

function utcStamp(now: Date): string {
  const p = (n: number, len = 2): string => String(n).padStart(len, '0')
  return (
    `${p(now.getUTCFullYear(), 4)}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `-${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`
  )
}

function extensionFor(originalName: string): string {
  const ext = path.extname(originalName).replace(/^\./, '').toLowerCase()
  return EXT_RE.test(ext) ? ext : 'bin'
}

/** key 生成：[前缀/]yyyyMMdd-HHmmss-hash8.ext；显式 prefix 优先于模板 */
export function buildObjectKey(input: {
  originalName: string
  content: Buffer | string
  now?: Date
  prefixTemplate?: string | null
  prefix?: string | null
}): string {
  const now = input.now ?? new Date()
  const rawPrefix = input.prefix != null && input.prefix !== '' ? input.prefix : (input.prefixTemplate ?? '')
  const prefix = sanitizePrefix(renderPrefixTemplate(rawPrefix, now))
  const stem = `${utcStamp(now)}-${hash8(input.content)}`
  const ext = extensionFor(input.originalName)
  return prefix ? `${prefix}/${stem}.${ext}` : `${stem}.${ext}`
}

function withScheme(host: string): string {
  return /^[a-z]+:\/\//i.test(host) ? host.replace(/\/+$/, '') : `https://${host.replace(/\/+$/, '')}`
}

/** 外链解析：自定义域名优先，否则 https://{bucket}.{endpoint}/{key} */
export function resolvePublicUrl(config: OssConfig, key: string): string {
  if (config.customDomain && config.customDomain.trim()) {
    return `${withScheme(config.customDomain.trim())}/${key}`
  }
  const host = config.endpoint.replace(/^[a-z]+:\/\//i, '').replace(/\/+$/, '')
  const bucketHost = host.startsWith(`${config.bucket}.`) ? host : `${config.bucket}.${host}`
  return `https://${bucketHost}/${key}`
}

/** 配置校验：返回错误文案，null = 通过 */
export function validateOssConfig(config: OssConfig): string | null {
  if (!config.bucket.trim()) return '缺少 bucket'
  const host = config.endpoint.replace(/^[a-z]+:\/\//i, '').trim()
  if (!host || !host.includes('.') || /\s/.test(host)) return 'endpoint 无效（形如 oss-cn-hangzhou.aliyuncs.com）'
  return null
}

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon'
}

export function contentTypeFor(name: string): string {
  return CONTENT_TYPES[extensionFor(name)] ?? 'application/octet-stream'
}

// ---------- 传输层（electron 主进程运行时；测试注入替换） ----------

export interface OssTransport {
  /** 上传对象并返回外链 URL（由传输层按配置解析） */
  put(key: string, content: Buffer, contentType: string): Promise<string>
  /** 连接测试：轻量列举，验证配置与凭证 */
  test(): Promise<void>
}

type AliOssCtor = new (opts: {
  region?: string
  endpoint?: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
}) => {
  put: (key: string, content: Buffer, opts?: { mime?: string }) => Promise<{ url?: string }>
  listV2: (opts: { 'max-keys': number }) => Promise<unknown>
}

/** 惰性加载 ali-oss（CJS；测试环境不触发） */
export function loadAliOss(): AliOssCtor {
  const req = createRequire(import.meta.url)
  return req('ali-oss') as AliOssCtor
}

export function createAliOssTransport(config: OssConfig, credentials: OssCredentials): OssTransport {
  const endpoint = withScheme(config.endpoint)
  const OSS = loadAliOss()
  const client = new OSS({
    endpoint,
    accessKeyId: credentials.accessKeyId,
    accessKeySecret: credentials.accessKeySecret,
    bucket: config.bucket
  })
  return {
    async put(key, content, contentType) {
      const res = await client.put(key, content, { mime: contentType })
      const url = typeof res?.url === 'string' && res.url ? res.url : resolvePublicUrl(config, key)
      // SDK 返回的 url 带 bucket 子域；绑定了自定义域名时统一替换成域名外链
      if (config.customDomain && config.customDomain.trim()) {
        return resolvePublicUrl(config, key)
      }
      return url.replace(/^http:/, 'https:')
    },
    async test() {
      await client.listV2({ 'max-keys': 1 })
    }
  }
}

type TransportFactory = (config: OssConfig, credentials: OssCredentials) => OssTransport

let transportFactory: TransportFactory = createAliOssTransport

/** 测试注入传输工厂；null 回落 ali-oss 实现 */
export function configureOssTransport(factory: TransportFactory | null): void {
  transportFactory = factory ?? createAliOssTransport
}

let ossStore: (() => Promise<{ config: OssConfig; credentials: OssCredentials } | null>) | null = null

/** 注入配置与凭证读取（credentials.ts 装配；测试注入假源） */
export function configureOssStore(
  loader: (() => Promise<{ config: OssConfig; credentials: OssCredentials } | null>) | null
): void {
  ossStore = loader
}

export class OssConfigError extends Error {}

/** 读取当前 OSS 目标（配置 + 凭证）；未配置抛带文案的错误 */
async function loadTarget(): Promise<{ config: OssConfig; transport: OssTransport }> {
  if (!ossStore) throw new OssConfigError('OSS 未配置')
  const target = await ossStore()
  if (!target) throw new OssConfigError('OSS 未配置（设置 → 图床，填写 endpoint/bucket 并保存 AccessKey）')
  const invalid = validateOssConfig(target.config)
  if (invalid) throw new OssConfigError(`OSS 配置无效：${invalid}`)
  return { config: target.config, transport: transportFactory(target.config, target.credentials) }
}

/** 单文件 OSS 上传：读文件 → 生成 key → 传输 → 返回外链；错误归一为 UploadResult */
export async function uploadToOssFile(absPath: string, opts?: { prefix?: string }): Promise<UploadResult> {
  let target: { config: OssConfig; transport: OssTransport }
  try {
    target = await loadTarget()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  try {
    const content = await fsp.readFile(absPath)
    const key = buildObjectKey({
      originalName: path.basename(absPath),
      content,
      prefixTemplate: target.config.prefixTemplate,
      prefix: opts?.prefix
    })
    const url = await target.transport.put(key, content, contentTypeFor(absPath))
    return { ok: true, url }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `OSS 上传失败：${message}` }
  }
}

/** OSS 连接测试（设置页）；错误归一，不泄漏凭证 */
export async function testOssConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const target = await loadTarget()
    await target.transport.test()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
