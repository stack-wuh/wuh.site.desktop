import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi, IpcResult } from '@shared/types'
import type { PluginDispatchPayload, PluginHostApi, PluginListResult, PluginSessionInfo } from '@shared/plugin'

/**
 * 与主进程 ipc.ts 的 handlers 表按方法名一一对应；
 * 返回值统一为 IpcResult 包装，在此拆包并抛错，渲染层直接拿到 data 或异常。
 */
async function invoke<K extends keyof DesktopApi>(
  name: K,
  ...args: Parameters<DesktopApi[K]>
): Promise<Awaited<ReturnType<DesktopApi[K]>>> {
  const res = (await ipcRenderer.invoke(name, ...args)) as
    | { ok: true; data: Awaited<ReturnType<DesktopApi[K]>> }
    | { ok: false; error: string }
    | unknown
  if (res && typeof res === 'object' && 'ok' in res) {
    const r = res as { ok: boolean; data?: unknown; error?: string }
    if (r.ok) return r.data as Awaited<ReturnType<DesktopApi[K]>>
    throw new Error(r.error ?? '未知错误')
  }
  throw new Error('IPC 响应格式异常')
}

const api: DesktopApi = {
  ping: () => invoke('ping'),
  rendererReady: () => invoke('rendererReady'),
  openWorkspace: () => invoke('openWorkspace'),
  cloneWorkspace: (url) => invoke('cloneWorkspace', url),
  openWorkspaceByPath: (p) => invoke('openWorkspaceByPath', p),
  listRecentWorkspaces: () => invoke('listRecentWorkspaces'),
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
  getGitIdentityDefault: () => invoke('getGitIdentityDefault'),
  planRevert: (input) => invoke('planRevert', input),
  executeRevert: (plan) => invoke('executeRevert', plan),
  githubListIssues: () => invoke('githubListIssues'),
  githubGetIssueComments: (n) => invoke('githubGetIssueComments', n),
  githubAddIssueComment: (n, b) => invoke('githubAddIssueComment', n, b),
  githubListLabels: () => invoke('githubListLabels'),
  githubUpsertLabel: (l) => invoke('githubUpsertLabel', l),
  githubDeleteLabel: (n) => invoke('githubDeleteLabel', n),
  githubUpsertIssue: (req) => invoke('githubUpsertIssue', req),
  publish: (req) => invoke('publish', req),
  uploadImage: (abs) => invoke('uploadImage', abs),
  getAboutActivity: () => invoke('getAboutActivity'),
  getSettings: () => invoke('getSettings'),
  setSettings: (patch) => invoke('setSettings', patch),
  setGithubToken: (t) => invoke('setGithubToken', t),
  clearGithubToken: () => invoke('clearGithubToken'),
  startGithubDeviceFlow: () => invoke('startGithubDeviceFlow'),
  getGithubDeviceFlowStatus: () => invoke('getGithubDeviceFlowStatus'),
  cancelGithubDeviceFlow: () => invoke('cancelGithubDeviceFlow'),
  getGithubIdentity: () => invoke('getGithubIdentity'),
  listUserRepos: () => invoke('listUserRepos'),
  openExternal: (url) => invoke('openExternal', url)
}

contextBridge.exposeInMainWorld('api', api)

/**
 * host↔主进程插件通道：与 DesktopApi 同样的 IpcResult 解包；
 * 仅宿主自用，插件帧无 preload、拿不到本对象。
 */
async function pluginInvoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (res && typeof res === 'object' && 'ok' in res) {
    if (res.ok) return res.data
    throw new Error(res.error ?? '未知错误')
  }
  throw new Error('IPC 响应格式异常')
}

const pluginApi: PluginHostApi = {
  list: () => pluginInvoke<PluginListResult>('plugin:list'),
  createSession: (pluginId) => pluginInvoke<PluginSessionInfo>('plugin:createSession', pluginId),
  setEnabled: async (pluginId, enabled, approvedPermissions) => {
    await pluginInvoke<null>('plugin:setEnabled', pluginId, enabled, approvedPermissions)
  },
  reload: () => pluginInvoke<PluginListResult>('plugin:reload'),
  revealDir: async (pluginId) => {
    await pluginInvoke<null>('plugin:revealDir', pluginId)
  },
  invoke: (sessionId, method, args) => pluginInvoke<unknown>('plugin:invoke', sessionId, method, args),
  onDispatch: (cb) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: PluginDispatchPayload): void => cb(payload)
    ipcRenderer.on('plugin:dispatch', handler)
    return () => ipcRenderer.removeListener('plugin:dispatch', handler)
  },
  dispatchReply: async (requestId, result) => {
    await pluginInvoke<null>('plugin:dispatchReply', requestId, result)
  }
}

contextBridge.exposeInMainWorld('pluginApi', pluginApi)
