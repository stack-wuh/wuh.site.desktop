/**
 * OSS key 生成纯逻辑（20261007-fix-image-host-settings-ux 自 src/main/oss.ts 抽出）：
 * 渲染层设置页要做「上传路径示例」实时预览，必须与主进程上传共用同一实现（单一事实源），
 * 故本模块保持 node/electron-free（哈希用纯 JS FNV-1a 32 位——8 位十六进制，
 * 文件名去重场景碰撞空间充足；主进程不做 sha256 依赖）。
 */

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

/** FNV-1a 32 位 → 8 位十六进制（同内容恒定、不同内容几乎不撞） */
function hash8(content: string | Uint8Array): string {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content
  let hash = 0x811c9dc5
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i]!
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function utcStamp(now: Date): string {
  const p = (n: number, len = 2): string => String(n).padStart(len, '0')
  return (
    `${p(now.getUTCFullYear(), 4)}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `-${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`
  )
}

const EXT_RE = /^[a-z0-9]{1,8}$/

function extensionFor(originalName: string): string {
  const dot = originalName.lastIndexOf('.')
  const ext = dot >= 0 ? originalName.slice(dot + 1).toLowerCase() : ''
  return EXT_RE.test(ext) ? ext : 'bin'
}

/** key 生成：[前缀/]yyyyMMdd-HHmmss-hash8.ext；显式 prefix 优先于模板（面板覆盖场景） */
export function buildObjectKey(input: {
  originalName: string
  content: string | Uint8Array
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
