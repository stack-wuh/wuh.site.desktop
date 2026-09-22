import { ipcMain } from 'electron'
import type { DesktopApi } from '@shared/types'

/**
 * 按 DesktopApi 的方法名注册 ipcMain.handle。
 * channel 即方法名，preload 侧按同一契约转发，保证两端类型一致。
 * 各业务模块通过 implement() 在加载时覆盖默认实现。
 */
const handlers: {
  [K in keyof DesktopApi]: (payload: Parameters<DesktopApi[K]>) => ReturnType<DesktopApi[K]>
} = {
  ping: () => Promise.resolve('pong'),
  // 默认即成功：splash 撤下逻辑由 index.ts 经 implement() 接管，此处仅保证 channel 存在
  rendererReady: () => Promise.resolve(),
  openWorkspace: () => { throw new Error('not implemented') },
  cloneWorkspace: () => { throw new Error('not implemented') },
  openWorkspaceByPath: () => { throw new Error('not implemented') },
  listRecentWorkspaces: () => { throw new Error('not implemented') },
  getWorkspace: () => { throw new Error('not implemented') },
  readTree: () => { throw new Error('not implemented') },
  readFile: () => { throw new Error('not implemented') },
  writeFile: () => { throw new Error('not implemented') },
  savePastedImage: () => { throw new Error('not implemented') },
  gitStatus: () => { throw new Error('not implemented') },
  gitStage: () => { throw new Error('not implemented') },
  gitCommit: () => { throw new Error('not implemented') },
  gitPush: () => { throw new Error('not implemented') },
  gitPull: () => { throw new Error('not implemented') },
  gitLog: () => { throw new Error('not implemented') },
  gitShow: () => { throw new Error('not implemented') },
  planRevert: () => { throw new Error('not implemented') },
  executeRevert: () => { throw new Error('not implemented') },
  githubListIssues: () => { throw new Error('not implemented') },
  githubGetIssueComments: () => { throw new Error('not implemented') },
  githubAddIssueComment: () => { throw new Error('not implemented') },
  githubListLabels: () => { throw new Error('not implemented') },
  githubUpsertLabel: () => { throw new Error('not implemented') },
  githubDeleteLabel: () => { throw new Error('not implemented') },
  githubUpsertIssue: () => { throw new Error('not implemented') },
  publish: () => { throw new Error('not implemented') },
  uploadImage: () => { throw new Error('not implemented') },
  getAboutActivity: () => { throw new Error('not implemented') },
  getSettings: () => { throw new Error('not implemented') },
  setSettings: () => { throw new Error('not implemented') },
  setGithubToken: () => { throw new Error('not implemented') },
  clearGithubToken: () => { throw new Error('not implemented') },
  startGithubDeviceFlow: () => { throw new Error('not implemented') },
  getGithubDeviceFlowStatus: () => { throw new Error('not implemented') },
  cancelGithubDeviceFlow: () => { throw new Error('not implemented') },
  getGithubIdentity: () => { throw new Error('not implemented') },
  listUserRepos: () => { throw new Error('not implemented') },
  openExternal: () => { throw new Error('not implemented') }
}

/** 各业务模块调用以覆盖默认的 not implemented 实现 */
export function implement<K extends keyof DesktopApi>(
  name: K,
  fn: (payload: Parameters<DesktopApi[K]>) => ReturnType<DesktopApi[K]>
): void {
  handlers[name] = fn as (typeof handlers)[typeof name]
}

/** 供插件 broker 复用同一能力表；channel 名即 DesktopApi 方法名。白名单在 broker 层强制 */
export async function callHandler(name: string, payload: unknown[]): Promise<unknown> {
  const entry = (handlers as unknown as Record<string, unknown>)[name]
  if (typeof entry !== 'function') throw new Error(`未知能力: ${name}`)
  return await (entry as (p: unknown[]) => unknown)(payload)
}

export function registerIpc(): void {
  for (const [name, fn] of Object.entries(handlers)) {
    ipcMain.removeHandler(name)
    ipcMain.handle(name, async (_event, ...payload: unknown[]) => {
      try {
        return { ok: true, data: await (fn as (p: never) => unknown)(payload as never) }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    })
  }
}
