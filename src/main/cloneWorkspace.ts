/**
 * clone 远程仓库为新工作区（v1 仅公开 https；git@ scp 形态由 shared 解析层转 https）。
 * 流程：解析 URL → 系统对话框选目标位置（默认名 = repo 名）→ 已存在且非空拒绝 →
 * simple-git clone → 失败清理半成品目录 → 成功 setWorkspace（登记最近项目）。
 * v1 不解析 git stderr 进度百分比，进行中状态由渲染层自身提交态表达。
 */
import { BrowserWindow, dialog } from 'electron'
import fsp from 'node:fs/promises'
import { simpleGit } from 'simple-git'
import { implement } from './ipc'
import { parseGitCloneUrl } from '@shared/workspace'
import { setWorkspace } from './workspace'

implement('cloneWorkspace', async ([rawUrl]) => {
  const parsed = parseGitCloneUrl(String(rawUrl ?? ''))
  if (!parsed) throw new Error('无法识别的仓库地址，请使用 https:// 形式（git@ 形式可自动转换）')

  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const res = await dialog.showSaveDialog(win as BrowserWindow, {
    title: '选择 clone 目标位置',
    defaultPath: parsed.repoName,
    properties: ['createDirectory']
  })
  if (res.canceled || !res.filePath) return null
  const target = res.filePath

  const existing = await fsp.readdir(target).catch(() => null)
  if (existing !== null && existing.length > 0) {
    throw new Error('目标目录已存在且非空，请换一个位置')
  }

  try {
    await simpleGit().clone(parsed.httpsUrl, target, ['--progress'])
  } catch (err) {
    // 半成品目录清理属兜底（clone 失败可能留下空壳）；清理失败不掩盖原始错误
    await fsp.rm(target, { recursive: true, force: true }).catch(() => undefined)
    throw err instanceof Error ? err : new Error(String(err))
  }
  return setWorkspace(target)
})
