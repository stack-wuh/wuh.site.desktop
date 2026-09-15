/**
 * plugin://<id>/<相对路径> 自定义协议：
 * - 插件目录资源经主进程读取下发（带 CORS *，供不透明沙箱帧 fetch）；
 * - `@core/sdk.js` 虚拟文件由主进程 bundle 内字符串常量下发，无独立构建步骤；
 * - `@core/logic-host.html` 为逻辑帧的合成入口（先加载 SDK，再 import 插件 logic）。
 */
import { protocol } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { LOGIC_HOST_PATH, PLUGIN_SCHEME, SDK_VIRTUAL_PATH } from '@shared/plugin'

export interface PluginProtocolDeps {
  /** 插件 id → 目录绝对路径；null 表示未安装 */
  getPluginDir: (pluginId: string) => string | null
  /** 插件 id → 逻辑入口相对路径（无 logic 时 null） */
  getLogicEntry: (pluginId: string) => string | null
  /** SDK 纯 JS 源码（打包进主进程 bundle 的字符串常量） */
  getSdkSource: () => string
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
}

export function mimeFor(relPath: string): string {
  const ext = path.extname(relPath).toLowerCase()
  return MIME[ext] ?? 'application/octet-stream'
}

/** 纯解析：非法（scheme/host/空路径/.. 越界）返回 null */
export function parsePluginUrl(
  requestUrl: string
): { pluginId: string; relPath: string } | null {
  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    return null
  }
  if (url.protocol !== `${PLUGIN_SCHEME}:`) return null
  const pluginId = url.host
  if (!pluginId) return null
  let raw = ''
  try {
    raw = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  const rel = raw.replace(/^\/+/, '').replace(/\/+$/, '')
  if (!rel) return null
  if (rel.split(/[\\/]/).includes('..')) return null
  return { pluginId, relPath: rel }
}

export function buildLogicHostHtml(logicEntryUrl: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>plugin logic host</title></head>
<body>
<script type="module">
import { __startLogic } from '/${SDK_VIRTUAL_PATH}';
__startLogic(${JSON.stringify(logicEntryUrl)});
</script>
</body></html>`
}

function response(body: string | Uint8Array, contentType: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    }
  })
}

export function initPluginProtocol(deps: PluginProtocolDeps): void {
  protocol.handle(`${PLUGIN_SCHEME}:`, async (request) => {
    const parsed = parsePluginUrl(request.url)
    if (!parsed) return response('bad request', 'text/plain', 400)
    const { pluginId, relPath } = parsed

    if (relPath === SDK_VIRTUAL_PATH) {
      return response(deps.getSdkSource(), 'text/javascript; charset=utf-8')
    }
    if (relPath === LOGIC_HOST_PATH) {
      const logic = deps.getLogicEntry(pluginId)
      if (!logic) return response('no logic entry', 'text/plain', 404)
      return response(buildLogicHostHtml(`/${logic}`), 'text/html; charset=utf-8')
    }

    const dir = deps.getPluginDir(pluginId)
    if (!dir) return response('unknown plugin', 'text/plain', 404)
    const abs = path.resolve(dir, relPath)
    if (abs !== path.resolve(dir) && !abs.startsWith(path.resolve(dir) + path.sep)) {
      return response('forbidden', 'text/plain', 403)
    }
    try {
      const data = await fsp.readFile(abs)
      return response(new Uint8Array(data), mimeFor(relPath))
    } catch {
      return response('not found', 'text/plain', 404)
    }
  })
}
