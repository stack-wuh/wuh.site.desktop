import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi } from '@shared/types'

/**
 * 与主进程 ipc.ts 的 handlers 表按方法名一一对应；
 * 返回值统一为 IpcResult 包装，在此拆包并抛错，渲染层直接拿到 data 或异常。
 */
function invoke<K extends keyof DesktopApi>(
  name: K,
  ...args: Parameters<DesktopApi[K]>
): Promise<ReturnType<DesktopApi[K]>> {
  return ipcRenderer.invoke(name, ...args).then((res) => {
    if (res && typeof res === 'object' && 'ok' in res) {
      if (res.ok) return res.data as ReturnType<DesktopApi[K]>
      throw new Error(res.error)
    }
    return res as ReturnType<DesktopApi[K]>
  })
}

const api: DesktopApi = {
  ping: () => invoke('ping'),
  openWorkspace: () => invoke('openWorkspace'),
  getWorkspace: () => invoke('getWorkspace'),
  readTree: () => invoke('readTree'),
  readFile: (p) => invoke('readFile', p),
  writeFile: (p, c) => invoke('writeFile', p, c),
  savePastedImage: (d, n, b) => invoke('savePastedImage', d, n, b),
  gitStatus: () => invoke('gitStatus'),
  gitStage: (paths) => invoke('gitStage', paths),
  gitCommit: (m, paths) => invoke('gitCommit', m, paths),
  gitPush: () => invoke('gitPush'),
  gitPull: () => invoke('gitPull'),
  gitLog: (opts) => invoke('gitLog', opts),
  gitShow: (hash, path) => invoke('gitShow', hash, path),
  planRevert: (input) => invoke('planRevert', input),
  executeRevert: (plan) => invoke('executeRevert', plan),
  githubListIssues: () => invoke('githubListIssues'),
  githubGetIssueComments: (n) => invoke('githubGetIssueComments', n),
  githubAddIssueComment: (n, b) => invoke('githubAddIssueComment', n, b),
  githubListLabels: () => invoke('githubListLabels'),
  githubUpsertLabel: (l) => invoke('githubUpsertLabel', l),
  githubDeleteLabel: (n) => invoke('githubDeleteLabel', n),
  publish: (req) => invoke('publish', req),
  uploadImage: (abs) => invoke('uploadImage', abs),
  getSettings: () => invoke('getSettings'),
  setSettings: (patch) => invoke('setSettings', patch),
  setGithubToken: (t) => invoke('setGithubToken', t),
  clearGithubToken: () => invoke('clearGithubToken')
}

contextBridge.exposeInMainWorld('api', api)
