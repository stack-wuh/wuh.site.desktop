/**
 * 原生文件/目录选择与剪贴板能力（20261007-feature-image-host-plugin）：
 * pickImages / pickDirectory / listImages / clipboardWrite，宿主与 image-host
 * 插件共用（插件经 CAPABILITY_METHODS 白名单 + fs.picker.read / ui.clipboard.write
 * 权限裁决后走 broker 复用同一实现）。
 * 安全设计：picker 选中的一切路径登记进内存白名单，uploadImages 只接受白名单
 * 内的路径（防插件夹带任意路径让主进程读文件外传）；白名单不持久化，随会话存活。
 */
import { BrowserWindow, clipboard, dialog } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import type { PickedDirectoryResult, PickedPathsResult } from '@shared/types'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'])
/** 剪贴板文本上限（链接复制场景远用不到） */
const MAX_CLIPBOARD_CHARS = 100_000

// ---------- 路径白名单（可独立测试的纯注册表） ----------

let allowedPaths: Set<string> = new Set()

function normalize(p: string): string {
  return path.resolve(p)
}

/** 登记本会话 picker 返回的路径（文件精确放行、目录放行其内所有路径） */
export function rememberPickedPaths(paths: readonly string[]): void {
  const next = new Set(allowedPaths)
  for (const p of paths) {
    if (typeof p === 'string' && path.isAbsolute(p)) next.add(normalize(p))
  }
  allowedPaths = next
}

/** 路径是否在白名单内：等于登记的文件路径，或位于登记的目录之内 */
export function isAllowedPickedPath(target: string): boolean {
  const t = normalize(target)
  for (const allowed of allowedPaths) {
    if (t === allowed) return true
    // 目录内：允许项是目录且目标在其直接前缀下（resolve 后以分隔符交界，避免 /tmp/pic 匹配 /tmp/pics/*）
    if (t.startsWith(`${allowed}${path.sep}`)) return true
  }
  return false
}

export function filterAllowedPaths(paths: readonly string[]): { allowed: string[]; denied: string[] } {
  const allowed: string[] = []
  const denied: string[] = []
  for (const p of paths) {
    ;(isAllowedPickedPath(p) ? allowed : denied).push(p)
  }
  return { allowed, denied }
}

export function resetPickedPaths(): void {
  allowedPaths = new Set()
}

// ---------- electron 实现 ----------

function focusedWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? undefined
}

implement('pickImages', async (): Promise<PickedPathsResult> => {
  const res = await dialog.showOpenDialog(focusedWindow() as BrowserWindow, {
    title: '选择图片',
    filters: [{ name: '图片', extensions: [...IMAGE_EXTENSIONS] }],
    properties: ['openFile', 'multiSelections']
  })
  if (res.canceled || res.filePaths.length === 0) return { canceled: true }
  rememberPickedPaths(res.filePaths)
  return { canceled: false, paths: res.filePaths }
})

implement('pickDirectory', async (): Promise<PickedDirectoryResult> => {
  const res = await dialog.showOpenDialog(focusedWindow() as BrowserWindow, {
    title: '选择图片目录',
    properties: ['openDirectory']
  })
  if (res.canceled || res.filePaths.length === 0) return { canceled: true }
  rememberPickedPaths(res.filePaths)
  return { canceled: false, path: res.filePaths[0] }
})

implement('listImages', async ([dirPath]): Promise<string[]> => {
  const dir = String(dirPath ?? '')
  if (!isAllowedPickedPath(dir)) {
    throw new Error('目录未经本会话文件选择器授权')
  }
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).replace(/^\./, '').toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }))
    .map((name) => path.join(dir, name))
})

implement('clipboardWrite', async ([text]): Promise<boolean> => {
  const value = String(text ?? '')
  if (!value || value.length > MAX_CLIPBOARD_CHARS) return false
  clipboard.writeText(value)
  return true
})
