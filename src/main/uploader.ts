import { execFile } from 'node:child_process'
import { implement } from './ipc'
import { loadSettings } from './credentials'
import type { UploadResult } from '@shared/types'

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
 * 自定义上传命令适配器：
 * - 命令以图片绝对路径作为最后一个参数执行（命令含 {file} 时做占位替换）
 * - 从 stdout 提取第一个 http(s) URL 作为图床地址
 */
implement('uploadImage', async ([absPath]): Promise<UploadResult> => {
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
})
