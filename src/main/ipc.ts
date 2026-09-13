import { ipcMain } from 'electron'
import type {
  AppSettings,
  CommitDetail,
  CommitSummary,
  DesktopApi,
  FileContent,
  FileNode,
  GitStatusSummary,
  IssueComment,
  IssueSummary,
  LabelInfo,
  PublishRequest,
  PublishResult,
  RevertDecisionInput,
  RevertPlan,
  SaveResult,
  SavedImage,
  SettingsStatus,
  UploadResult,
  WorkspaceInfo
} from '@shared/types'

/**
 * 按 DesktopApi 的方法名注册 ipcMain.handle。
 * channel 即方法名，preload 侧按同一契约转发，保证两端类型一致。
 */
const handlers: {
  [K in keyof DesktopApi]: (payload: Parameters<DesktopApi[K]>) => ReturnType<DesktopApi[K]>
} = {
  ping: () => Promise.resolve('pong'),
  openWorkspace: () => { throw new Error('not implemented') },
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
  publish: () => { throw new Error('not implemented') },
  uploadImage: () => { throw new Error('not implemented') },
  getSettings: () => { throw new Error('not implemented') },
  setSettings: () => { throw new Error('not implemented') },
  setGithubToken: () => { throw new Error('not implemented') },
  clearGithubToken: () => { throw new Error('not implemented') }
}

/** 各业务模块调用以覆盖默认的 not implemented 实现 */
export function implement<K extends keyof DesktopApi>(
  name: K,
  fn: (payload: Parameters<DesktopApi[K]>) => ReturnType<DesktopApi[K]>
): void {
  handlers[name] = fn as (typeof handlers)[typeof name]
}

export function registerIpc(): void {
  for (const [name, fn] of Object.entries(handlers)) {
    ipcMain.removeHandler(name)
    ipcMain.handle(name, async (_event, ...payload: unknown[]) => {
      try {
        return { ok: true, data: await fn(payload as never) }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    })
  }
}

// 仅为了让上面 import 的类型在阶段骨架里被消费，避免 unused 报错
export type IpcContract = [
  WorkspaceInfo,
  FileNode,
  FileContent,
  SaveResult,
  SavedImage,
  GitStatusSummary,
  CommitSummary,
  CommitDetail,
  RevertDecisionInput,
  RevertPlan,
  IssueSummary,
  IssueComment,
  LabelInfo,
  PublishRequest,
  PublishResult,
  UploadResult,
  SettingsStatus,
  AppSettings
]
