/**
 * 最近项目持久化（userData/recent-workspaces.json）：
 * 主进程独占读写；upsert 纯函数可独立测试（cap 8 / 按 path 去重置顶）。
 * 登记入口统一在 workspace.setWorkspace 成功后（对话框打开 / clone / 列表点开三条路自动覆盖）。
 */
import { app } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { RecentWorkspace } from '@shared/types'

const MAX_RECENT = 8

/** 纯函数：entry 置顶、同 path 去重、超出 cap 挤掉最旧 */
export function upsertRecent(
  list: RecentWorkspace[],
  entry: { path: string; name: string }
): RecentWorkspace[] {
  const next: RecentWorkspace[] = [
    { path: entry.path, name: entry.name, openedAt: Date.now() },
    ...list.filter((r) => r.path !== entry.path)
  ]
  return next.slice(0, MAX_RECENT)
}

function recentFile(): string {
  return path.join(app.getPath('userData'), 'recent-workspaces.json')
}

export async function readRecent(): Promise<RecentWorkspace[]> {
  try {
    const arr: unknown = JSON.parse(await fsp.readFile(recentFile(), 'utf-8'))
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (r): r is RecentWorkspace =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as RecentWorkspace).path === 'string' &&
        typeof (r as RecentWorkspace).name === 'string' &&
        typeof (r as RecentWorkspace).openedAt === 'number'
    )
  } catch {
    return []
  }
}

export async function recordRecent(entry: { path: string; name: string }): Promise<void> {
  const next = upsertRecent(await readRecent(), entry)
  await fsp.writeFile(recentFile(), JSON.stringify(next, null, 2), 'utf-8')
}
