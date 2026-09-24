// 跨主进程/渲染进程共享的 IPC 契约。仅类型与纯函数，禁止引入 node/electron API。

import type { DraftMeta } from './drafts'
import type { TransferMode } from './docTransfer'

// ---------- Workspace ----------
export interface GithubRemote {
  owner: string
  repo: string
}

export interface WorkspaceInfo {
  root: string
  name: string
  isGitRepo: boolean
  branch: string | null
  ahead: number
  behind: number
  github: GithubRemote | null
}

export interface FileNode {
  name: string
  /** 相对工作区根目录，POSIX 分隔符 */
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

/** 最近打开的项目（userData/recent-workspaces.json，主进程独占读写） */
export interface RecentWorkspace {
  path: string
  name: string
  openedAt: number
}

// ---------- Files ----------
export interface FileContent {
  path: string
  content: string
}

export interface SaveResult {
  path: string
  savedAt: number
}

/** 文档迁移/复制结果（<stem>.assets 目录随迁、改名场景正文引用已由主进程改写） */
export interface TransferDocResult {
  /** 目标文档相对工作区根路径（POSIX） */
  path: string
  /** assets 目录是否随迁（源文档无图片目录时为 false） */
  assetsCarried: boolean
}

// ---------- Images ----------
export interface SavedImage {
  /** 图片相对工作区根的路径 */
  relPath: string
  /** 插入 Markdown 的相对引用，如 ./xxx.assets/img.png */
  markdownRef: string
}

// ---------- Git ----------
export type GitFileState =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'conflicted'

export interface GitFileStatus {
  path: string
  state: GitFileState
  staged: boolean
}

export interface GitStatusSummary {
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  files: GitFileStatus[]
}

export interface CommitSummary {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

export interface CommitFileChange {
  path: string
  state: string
}

export interface CommitDetail extends CommitSummary {
  files: CommitFileChange[]
}

// ---------- Revert ----------
export type RevertMode = 'file' | 'commit'

export interface RevertDecisionInput {
  mode: RevertMode
  /** file 模式：文件工作区有未提交改动 */
  fileDirty: boolean
  /** file 模式：该文件存在未 push 的提交 */
  fileHasUnpushedCommits: boolean
  /** file 模式：该文件存在已 push 的提交 */
  fileHasPushedCommits: boolean
  path?: string
  hash?: string
}

export type RevertPlan =
  | { action: 'checkoutFile'; path: string; from: 'HEAD' | 'upstream'; reason: string }
  | { action: 'revertCommit'; hash: string; reason: string }
  | { action: 'blocked'; reason: string }

// ---------- GitHub ----------
export interface IssueSummary {
  number: number
  title: string
  state: 'open' | 'closed'
  labels: string[]
  url: string
  comments: number
  createdAt: string
  updatedAt: string
}

export interface IssueComment {
  id: number
  user: string
  avatarUrl: string
  body: string
  createdAt: string
}

export interface LabelInfo {
  name: string
  color: string
  description: string | null
}

// ---------- Publish（publisher 适配器） ----------
export interface PublishRequest {
  publisherId: string
  /** 工作区相对路径，用于溯源 */
  filePath: string
  title: string
  labels: string[]
  /** 去掉 frontmatter 的 Markdown 正文 */
  body: string
  /** 可选尾部 metadata（blog 预设注入） */
  metadata?: Record<string, unknown>
  /** 提供则更新既有 issue */
  issueNumber?: number
}

export interface PublishResult {
  ok: boolean
  url?: string
  issueNumber?: number
  created?: boolean
  error?: string
}

// ---------- Upload ----------
export interface UploadResult {
  ok: boolean
  url?: string
  error?: string
}

// ---------- Structure ----------
export type StructureKind = 'blogPost' | 'topicPost' | 'assetDir' | 'other'

export interface StructureMatch {
  kind: StructureKind
  /** 年、月或专题名，用于分组展示 */
  group: string | null
}

// ---------- 站点综合活动（首页热力图） ----------
/** 与站点 server `GET /v2/about/activity`（经 /api/about/activity）的 UnifiedActivityHeatmap 契约同构 */
export const ABOUT_ACTIVITY_CATEGORIES = [
  'visits',
  'published',
  'updated',
  'comments',
  'guestbook',
  'projectUpdates',
  'githubContributions'
] as const

export type AboutActivityCategory = (typeof ABOUT_ACTIVITY_CATEGORIES)[number]
export type AboutActivityLevel = 0 | 1 | 2 | 3 | 4

export interface AboutActivityDay {
  /** YYYY-MM-DD，升序，无活动日期补零 */
  date: string
  total: number
  level: AboutActivityLevel
  counts: Record<AboutActivityCategory, number>
}

export interface AboutActivityHeatmap {
  startDate: string
  endDate: string
  timezone: string
  total: number
  days: AboutActivityDay[]
}

// ---------- 用户中心（GitHub OAuth Device Flow） ----------
export type TokenKind = 'oauth' | 'pat'

/** 授权流阶段：渲染层 2s 轮询直到离开 polling */
export type DeviceFlowPhase = 'idle' | 'polling' | 'success' | 'cancelled' | 'expired' | 'denied' | 'error'

export interface DeviceFlowState {
  phase: DeviceFlowPhase
  /** 非 polling 的补充说明（错误原因等） */
  message?: string
}

/** startGithubDeviceFlow 立即返回：展示 user_code，浏览器打开 verificationUri */
export interface DeviceFlowStart {
  userCode: string
  verificationUri: string
  /** 授权码有效期止点（epoch ms） */
  expiresAt: number
}

export interface GithubIdentity {
  login: string
  name: string | null
  avatarUrl: string
  /** OAuth token 的授权范围（X-OAuth-Scopes 响应头）；PAT 无法读取，为空数组 */
  scopes: string[]
  kind: TokenKind
  /** token 已失效（API 401），需重新授权或换 Token */
  stale: boolean
}

export interface RepoSummary {
  /** owner/repo */
  fullName: string
  private: boolean
  description: string | null
  defaultBranch: string
  updatedAt: string
}

// ---------- Settings ----------
export interface AppSettings {
  autoCommit: boolean
  autoCommitDelayMs: number
  uploadCommand: string | null
  gitUserName: string | null
  gitUserEmail: string | null
  /** 站点服务地址（首页热力图数据源）；null = 默认主域名 https://wuh.site */
  siteBaseUrl: string | null
  /** 默认站点仓库（owner/repo，用户中心选择）；null = 未选择 */
  siteRepo: string | null
}

export interface SettingsStatus {
  hasToken: boolean
  /** 当前凭证来源；null = 未配置 */
  tokenKind: TokenKind | null
  settings: AppSettings
}

/** 本机 git 全局身份；null = 该字段未在全局配置 */
export interface GitIdentityDefault {
  name: string | null
  email: string | null
}

// ---------- 通用 ----------
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** preload 暴露到 window.api 的完整面 */
export interface DesktopApi {
  ping(): Promise<string>
  /** 壳层 layout 挂载完成信号：主进程收到后撤下启动 splash 并显示主窗 */
  rendererReady(): Promise<void>
  openWorkspace(): Promise<WorkspaceInfo | null>
  /** clone 公开 https 仓库为新工作区（git@ 形态自动转 https）；用户取消返回 null */
  cloneWorkspace(url: string): Promise<WorkspaceInfo | null>
  /** 从最近项目列表按路径打开（目录不存在时抛错） */
  openWorkspaceByPath(path: string): Promise<WorkspaceInfo>
  listRecentWorkspaces(): Promise<RecentWorkspace[]>
  /** 草稿箱：全部草稿元数据（updatedAt 降序；索引缺失/损坏返回空） */
  listDrafts(): Promise<DraftMeta[]>
  /** 新建或更新草稿（id 缺省新建），返回落盘后的元数据 */
  saveDraft(input: { id?: string | null; content: string }): Promise<DraftMeta>
  /** 读取草稿全文；不存在返回 null */
  readDraft(id: string): Promise<string | null>
  /** 删除草稿；不存在时 no-op */
  removeDraft(id: string): Promise<void>
  /**
   * 系统通知降级（Alert 失焦时）：主进程按窗口状态裁决——聚焦且未最小化时 no-op，
   * 失焦/最小化才发 OS 通知（点击聚焦主窗）；fire-and-forget，不阻塞渲染层。
   */
  notifySystem(payload: { title?: string; text: string }): Promise<void>
  getWorkspace(): Promise<WorkspaceInfo | null>
  /** 列目录树：root 缺省=当前工作区；显式 root 校验目录存在后按根构树（不切换当前工作区） */
  readTree(root?: string): Promise<FileNode[]>
  readFile(relPath: string): Promise<FileContent>
  writeFile(relPath: string, content: string): Promise<SaveResult>
  /**
   * 迁移/复制工作区文档（move=改名+搬目录的统一语义）：主进程同步搬运同目录
   * `<stem>.assets/` 图片目录，改名场景（目录名含旧文件名）按需改写正文相对引用；
   * 目标已存在/非法路径抛错。
   */
  transferDoc(srcRel: string, destRel: string, mode: TransferMode): Promise<TransferDocResult>
  savePastedImage(docRelPath: string, originalName: string, base64: string): Promise<SavedImage>
  gitStatus(): Promise<GitStatusSummary>
  gitStage(paths: string[]): Promise<void>
  gitCommit(message: string, paths?: string[]): Promise<{ hash: string }>
  gitPush(): Promise<void>
  gitPull(): Promise<void>
  gitLog(opts: { path?: string; limit?: number }): Promise<CommitSummary[]>
  gitShow(commitHash: string, path?: string): Promise<string>
  /** 本机 git 全局身份（git config --global），作为账户页 Git 提交身份的默认值展示 */
  getGitIdentityDefault(): Promise<GitIdentityDefault>
  planRevert(input: RevertDecisionInput): Promise<RevertPlan>
  executeRevert(plan: RevertPlan): Promise<void>
  githubListIssues(): Promise<IssueSummary[]>
  githubGetIssueComments(issueNumber: number): Promise<IssueComment[]>
  githubAddIssueComment(issueNumber: number, body: string): Promise<IssueComment>
  githubListLabels(): Promise<LabelInfo[]>
  githubUpsertLabel(label: LabelInfo): Promise<void>
  githubDeleteLabel(name: string): Promise<void>
  /** 供插件 publisher 执行发布：创建或更新 Issue，metadata 尾注由主进程拼装 */
  githubUpsertIssue(req: PublishRequest): Promise<PublishResult>
  publish(req: PublishRequest): Promise<PublishResult>
  uploadImage(absPath: string): Promise<UploadResult>
  /** 首页热力图：拉取站点综合活动（5min 内存缓存，失败回退过期缓存） */
  getAboutActivity(): Promise<AboutActivityHeatmap>
  getSettings(): Promise<SettingsStatus>
  setSettings(patch: Partial<AppSettings>): Promise<SettingsStatus>
  setGithubToken(token: string): Promise<void>
  clearGithubToken(): Promise<void>
  /** 发起 Device Flow：换取 user_code 并自动打开系统浏览器授权页（重复调用取消前一流） */
  startGithubDeviceFlow(): Promise<DeviceFlowStart>
  /** 授权流当前阶段（渲染层 2s 轮询直到离开 polling） */
  getGithubDeviceFlowStatus(): Promise<DeviceFlowState>
  cancelGithubDeviceFlow(): Promise<void>
  /** 当前 GitHub 身份；token 401 时返回 stale 身份而非抛错 */
  getGithubIdentity(): Promise<GithubIdentity>
  /** token 可操作的仓库（owner/collaborator 视角，按更新时间倒序） */
  listUserRepos(): Promise<RepoSummary[]>
  /** 系统浏览器打开外部 https 链接（仅允许 http(s)） */
  openExternal(url: string): Promise<void>
}
