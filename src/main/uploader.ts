import { execFile } from 'node:child_process'
import { implement } from './ipc'
import { loadSettings } from './credentials'
import { testOssConnection as runOssTest, uploadToOssFile } from './oss'
import { isAllowedPickedPath } from './pickers'
import type { OssTestResult, UploadMode, UploadResult } from '@shared/types'

function runCommand(
  cmd: string,
  args: string[],
  timeoutMs = 60_000
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { timeout: timeoutMs, encoding: 'utf-8', shell: false },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`${cmd} 执行失败: ${err.message}${stderr ? `\n${stderr}` : ''}`))
        } else {
          resolve({ stdout, stderr })
        }
      }
    )
  })
}

/**
 * 自定义上传命令适配器（宿主「图床上传命令」设置）：
 * - 命令以图片绝对路径作为最后一个参数执行（命令含 {file} 时做占位替换）
 * - 从 stdout 提取第一个 http(s) URL 作为图床地址
 */
export async function uploadViaCommand(absPath: string): Promise<UploadResult> {
  const settings = await loadSettings()
  const command = settings.uploadCommand?.trim()
  if (!command) {
    return { ok: false, error: '未配置上传命令（设置 → 图床上传命令）' }
  }

  const segments = command.split(/\s+/).filter(Boolean)
  const placeholderIdx = segments.findIndex((s) => s.includes('{file}'))
  const args = [...segments]
  if (placeholderIdx >= 0) {
    args[placeholderIdx] = args[placeholderIdx].replace('{file}', absPath)
  } else {
    args.push(absPath)
  }

  try {
    const { stdout } = await runCommand(args[0], args.slice(1))
    const url = /https?:\/\/\S+/.exec(stdout)?.[0]
    if (!url) {
      return { ok: false, error: `上传命令未输出 URL，stdout: ${stdout.slice(0, 200)}` }
    }
    return { ok: true, url }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** 保留宿主单图上传入口（ DesktopApi 契约不变） */
implement('uploadImage', async ([absPath]): Promise<UploadResult> => {
  return uploadViaCommand(absPath)
})

// ---------- 批量上传编排（宿主与 image-host 插件共用） ----------

/** 按上传模式路由：local = 未启用图床（返回 null，调用方给未启用文案） */
export function pickUploadRoute(mode: UploadMode): 'oss' | 'command' | null {
  if (mode === 'oss') return 'oss'
  if (mode === 'command') return 'command'
  return null
}

export interface UploadImagesDeps {
  getMode: () => Promise<UploadMode>
  /** 路径是否在 picker 白名单内（pickers.ts 登记表） */
  isAllowed: (absPath: string) => boolean
  ossUpload: (absPath: string, prefix?: string) => Promise<UploadResult>
  commandUpload: (absPath: string) => Promise<UploadResult>
}

const NOT_ENABLED_ERROR = '未启用图床上传（设置 → 图床，选择 OSS 或上传命令模式）'
const DENIED_ERROR = '路径未经本会话文件选择器授权，拒绝上传'

/**
 * 批量上传编排：逐文件路由 + 白名单校验 + 单文件失败不阻断，保序聚合。
 * 路径白名单是插件侧安全边界——picker 之外的上传请求一律拒绝。
 */
export async function uploadImagesCore(
  absPaths: readonly string[],
  opts: { prefix?: string } | undefined,
  deps: UploadImagesDeps
): Promise<UploadResult[]> {
  const route = pickUploadRoute(await deps.getMode())
  const results: UploadResult[] = []
  for (const absPath of absPaths) {
    if (!route) {
      results.push({ ok: false, error: NOT_ENABLED_ERROR })
      continue
    }
    if (!deps.isAllowed(absPath)) {
      results.push({ ok: false, error: DENIED_ERROR })
      continue
    }
    results.push(route === 'oss' ? await deps.ossUpload(absPath, opts?.prefix) : await deps.commandUpload(absPath))
  }
  return results
}

implement('uploadImages', async ([absPaths, opts]): Promise<UploadResult[]> => {
  const paths = Array.isArray(absPaths) ? absPaths.map(String) : []
  return uploadImagesCore(paths, opts, {
    getMode: async () => (await loadSettings()).uploadMode ?? 'local',
    isAllowed: isAllowedPickedPath,
    ossUpload: (absPath, prefix) => uploadToOssFile(absPath, prefix ? { prefix } : undefined),
    commandUpload: uploadViaCommand
  })
})

implement('testOssConnection', async (): Promise<OssTestResult> => runOssTest())
