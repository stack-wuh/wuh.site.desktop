// 跨主进程/渲染进程共享的 IPC 契约。仅类型与纯函数，禁止引入 node/electron API。

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

// ---------- Files ----------
export interface FileContent {
  path: string
  content: string
}

export interface SaveResult {
  path: string
  savedAt: number
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

// ---------- Settings ----------
export interface AppSettings {
  autoCommit: boolean
  autoCommitDelayMs: number
  uploadCommand: string | null
  gitUserName: string | null
  gitUserEmail: string | null
}

export interface SettingsStatus {
  hasToken: boolean
  settings: AppSettings
}

// ---------- 通用 ----------
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** preload 暴露到 window.api 的完整面 */
export interface DesktopApi {
  ping(): Promise<string>
  openWorkspace(): Promise<WorkspaceInfo | null>
  getWorkspace(): Promise<WorkspaceInfo | null>
  readTree(): Promise<FileNode[]>
  readFile(relPath: string): Promise<FileContent>
  writeFile(relPath: string, content: string): Promise<SaveResult>
  savePastedImage(docRelPath: string, originalName: string, base64: string): Promise<SavedImage>
  gitStatus(): Promise<GitStatusSummary>
  gitStage(paths: string[]): Promise<void>
  gitCommit(message: string, paths?: string[]): Promise<{ hash: string }>
  gitPush(): Promise<void>
  gitPull(): Promise<void>
  gitLog(opts: { path?: string; limit?: number }): Promise<CommitSummary[]>
  gitShow(commitHash: string, path?: string): Promise<string>
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
  getSettings(): Promise<SettingsStatus>
  setSettings(patch: Partial<AppSettings>): Promise<SettingsStatus>
  setGithubToken(token: string): Promise<void>
  clearGithubToken(): Promise<void>
}
