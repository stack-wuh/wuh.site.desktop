/**
 * 原生保存面板（20260924-feature-native-save-dialog）：
 * saveAs 与「打开项目」统一为「选文件系统位置一律系统原生弹窗」——
 * dialog.showSaveDialog 目录+文件名一次选定，上次保存目录持久化到
 * userData/save-dialog.json 作为后续缺省（defaultPath 显式传入时优先）。
 * 建议文件名主干在此清洗（IPC 边界入参不可信）；纯逻辑（suggestFileStem /
 * parseSaveDialogState）与 fs 目录（configureSaveDialogDir）拆出可独立测试。
 * 保存边界（必须在当前工作区内）由渲染层经 shared 的 workspaceRelativePath
 * 裁决，writeFile 侧 safeJoin 仍兜底。
 */
import { app, BrowserWindow, dialog } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import type { SaveDialogOptions, SaveDialogResult } from '@shared/types'

/** 文件名主干上限（不含扩展名）；非法字符与 Windows 保留尾缀一并处理 */
const MAX_STEM = 80
const ILLEGAL_NAME_CHARS = /[/\\:*?"<>|\u0000-\u001f]/g
const FALLBACK_STEM = '未命名'

/** 纯函数：标题 → 建议文件名主干（非法字符转空格、压缩空白、去尾点空格、截断；空回退「未命名」） */
export function suggestFileStem(title: string | null | undefined): string {
  const cleaned = (title ?? '')
    .replace(ILLEGAL_NAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_STEM)
    .replace(/[. ]+$/, '')
  return cleaned || FALLBACK_STEM
}

export interface SaveDialogState {
  lastDir?: string
}

/** 纯函数：持久化 JSON → 状态（损坏 / 非绝对路径一律空状态） */
export function parseSaveDialogState(raw: string): SaveDialogState {
  try {
    const obj: unknown = JSON.parse(raw)
    const lastDir = (obj as SaveDialogState | null)?.lastDir
    return typeof lastDir === 'string' && path.isAbsolute(lastDir) ? { lastDir } : {}
  } catch {
    return {}
  }
}

let dirOverride: string | null = null

/** 测试注入持久化目录；null 回落 electron userData */
export function configureSaveDialogDir(dir: string | null): void {
  dirOverride = dir
}

function storeFile(): string {
  return path.join(dirOverride ?? app.getPath('userData'), 'save-dialog.json')
}

export async function readLastDir(): Promise<string | undefined> {
  try {
    const state = parseSaveDialogState(await fsp.readFile(storeFile(), 'utf-8'))
    if (!state.lastDir) return undefined
    const info = await fsp.stat(state.lastDir).catch(() => null)
    return info?.isDirectory() ? state.lastDir : undefined
  } catch {
    return undefined
  }
}

export async function recordLastDir(dir: string): Promise<void> {
  if (!path.isAbsolute(dir)) return
  const state: SaveDialogState = { lastDir: dir }
  await fsp.writeFile(storeFile(), JSON.stringify(state, null, 2), 'utf-8')
}

implement('pickSaveLocation', async ([opts]): Promise<SaveDialogResult> => {
  const o: SaveDialogOptions = opts ?? {}
  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const baseDir = o.defaultPath || (await readLastDir()) || app.getPath('documents')
  const res = await dialog.showSaveDialog(win as BrowserWindow, {
    title: o.title,
    defaultPath: path.join(baseDir, `${suggestFileStem(o.fileName)}.md`),
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    properties: ['createDirectory', 'showOverwriteConfirmation']
  })
  if (res.canceled || !res.filePath) return { canceled: true }
  // 记忆本次目录；失败不阻断保存（仅影响下次缺省位置）
  await recordLastDir(path.dirname(res.filePath)).catch((err: unknown) => {
    console.error('保存位置记忆失败:', err)
  })
  const result: SaveDialogResult = { canceled: false, path: res.filePath }
  return result
})
