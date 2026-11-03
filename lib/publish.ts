/**
 * 发布编排纯逻辑（20261020-feature-publish-interaction）：预检、通道降级规则、
 * 请求构建与状态推导。全部为纯函数，不触碰 IPC/DOM——由 EditorCommandHost 消费，
 * 磁贴侧只读状态推导（publishStateOf）。
 */
import { parseFrontmatter, toPublishFields } from '../src/shared/frontmatter'
import type { PublishRequest } from '../src/shared/types'

export const BUILTIN_PUBLISHER_ID = 'github-issues'

export type PublishBlockReason = 'no-doc' | 'no-path' | 'no-title'

export interface PublishPreflightResult {
  ok: boolean
  reason?: PublishBlockReason
}

export interface PublishStateView {
  issueNumber: number | null
  title: string
}

/** frontmatter issue 号：正整数才认，非法视同未发布（CLI plan 侧会对非法号硬拒绝） */
export function parseIssueNumber(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null
  const n = Number(String(raw).trim())
  return Number.isInteger(n) && n > 0 ? n : null
}

export function publishStateOf(content: string | null): PublishStateView {
  if (content == null) return { issueNumber: null, title: '' }
  const { data } = parseFrontmatter(content)
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  return { issueNumber: parseIssueNumber(data.issue), title }
}

/** 发布预检：无文档 → 未保存草稿（无路径，CLI 读盘且不可溯源）→ 缺 title */
export function publishPreflight(state: {
  activePath: string | null
  content: string | null
}): PublishPreflightResult {
  if (state.content == null) return { ok: false, reason: 'no-doc' }
  if (!state.activePath) return { ok: false, reason: 'no-path' }
  if (!publishStateOf(state.content).title) return { ok: false, reason: 'no-title' }
  return { ok: true }
}

/** 内置通道请求：issue 号取 frontmatter 顶层语义，不进 metadata 尾注 */
export function buildBuiltinRequest(content: string, filePath: string): PublishRequest | null {
  const fields = toPublishFields(content)
  if (!fields.title) return null
  const issueNumber = publishStateOf(content).issueNumber ?? undefined
  const metadata = { ...fields.metadata }
  delete metadata.issue
  return {
    publisherId: BUILTIN_PUBLISHER_ID,
    filePath,
    title: fields.title,
    labels: fields.labels,
    body: fields.body,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    ...(issueNumber ? { issueNumber } : {})
  }
}

/** 降级规则：仅 CLI 不可用（available:false）降级内置；执行阶段错误原样上抛（防同一文档双建 Issue） */
export function shouldFallbackToBuiltin(result: { ok: boolean; available: boolean }): boolean {
  return !result.ok && result.available === false
}

/** 鉴权失败判定（401/bad credentials）：映射为「去用户中心重新授权」的可读提示 */
export function isPublishAuthError(code?: string | null, message?: string | null): boolean {
  if (code === 'GITHUB_API_ERROR' && /bad credentials/i.test(message ?? '')) return true
  return /bad credentials|requires authentication/i.test(message ?? '')
}

// ---------- 发布进行中信号（进程内单状态源：命令宿主写、磁贴读；兼发布互斥） ----------
let publishing = false
const publishingListeners = new Set<() => void>()

export const publishBusy = {
  get(): boolean {
    return publishing
  },
  subscribe(listener: () => void): () => void {
    publishingListeners.add(listener)
    return () => {
      publishingListeners.delete(listener)
    }
  },
  set(next: boolean): void {
    if (publishing === next) return
    publishing = next
    publishingListeners.forEach((listener) => listener())
  }
}

// ---------- 发布任务进度（20261103-feature-async-task-progress） ----------
// 发布链作为任务胶囊时间线的首个宿主消费者：四阶段 = 渲染层可见编排步——
// CLI plan/execute 在主进程单 IPC（publishViaCli）内不可细分，故不设独立阶段。
import type { TaskPatch } from './tasks'

export const PUBLISH_TASK_NS = 'host'
export const PUBLISH_TASK_ID = 'publish'

/** 渲染层可见编排阶段（i18n 键，顺序即进度方向） */
export const PUBLISH_STAGES = [
  'capsule.publishStageSave',
  'capsule.publishStagePublish',
  'capsule.publishStageWriteback',
  'capsule.publishStageSync'
] as const

/** 阶段补丁：单调推进 progress，detail = 「阶段名 n/总」（pod 标签与时间线同源） */
export function publishStagePatch(stageIndex: number, stageLabel: string): TaskPatch {
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= PUBLISH_STAGES.length) {
    throw new Error(`发布阶段下标越界: ${String(stageIndex)}`)
  }
  return {
    status: 'in_progress',
    progress: { current: stageIndex + 1, total: PUBLISH_STAGES.length },
    detail: `${stageLabel} ${stageIndex + 1}/${PUBLISH_STAGES.length}`
  }
}

export function publishTaskDonePatch(): TaskPatch {
  return { status: 'done' }
}

/** 失败降级 pending + 原因（既有任务语义：失败回 pending 供时间线呈现） */
export function publishTaskFailedPatch(reason: string): TaskPatch {
  return { status: 'pending', detail: reason }
}

// ---------- 下架（20261103-feature-doc-unpublish） ----------
// close 即下架：frontmatter issue 号为唯一身份，无号=未发布不可下架；下架成功后
// 号保留（重新上架=再发布 update），会话内已下架态经单状态源供磁贴呈现。
import { createStore } from './createStore'

export type UnpublishBlockReason = 'no-doc' | 'no-path' | 'not-published'

export interface UnpublishPreflightResult {
  ok: boolean
  reason?: UnpublishBlockReason
}

export function unpublishPreflight(state: { activePath: string | null; content: string | null }): UnpublishPreflightResult {
  if (state.content == null) return { ok: false, reason: 'no-doc' }
  if (state.activePath == null) return { ok: false, reason: 'no-path' }
  if (publishStateOf(state.content).issueNumber == null) return { ok: false, reason: 'not-published' }
  return { ok: true }
}

/** 会话内已下架文档（路径集合）：命令宿主写、磁贴读；发布成功时清除（身份复用） */
export const publishUnpublished = createStore<ReadonlySet<string>>(new Set<string>())

export function markUnpublished(path: string): void {
  const next = new Set(publishUnpublished.get())
  next.add(path)
  publishUnpublished.commit(next)
}

export function clearUnpublished(path: string): void {
  if (!publishUnpublished.get().has(path)) return
  const next = new Set(publishUnpublished.get())
  next.delete(path)
  publishUnpublished.commit(next)
}
