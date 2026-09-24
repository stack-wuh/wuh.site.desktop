/**
 * 草稿仓（userData/drafts/<id>.md + index.json，主进程独占读写）：
 * 每条草稿一个 Markdown 正文文件，索引物化标题/摘要派生结果（列表页零正文读取）。
 * 目录可注入（tests 经 configureDraftsDir 指 tmp，不触碰 electron）；
 * upsert/sanitize 纯函数独立测试。渲染层只经 DesktopApi 的 drafts.* 四个通道访问。
 */
import { app } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import { deriveDraftExcerpt, deriveDraftTitle, type DraftMeta } from '@shared/drafts'

const MAX_DRAFTS = 100

/** id 即文件名片段：仅字母数字与连字符（防路径注入；生成 id 天然满足） */
const DRAFT_ID_RE = /^[a-z0-9][a-z0-9-]*$/i

/** 纯函数：meta 置顶、同 id 去重、超出 cap 挤掉最旧 */
export function upsertDraftMeta(list: DraftMeta[], entry: DraftMeta): DraftMeta[] {
  return [entry, ...list.filter((m) => m.id !== entry.id)].slice(0, MAX_DRAFTS)
}

/** 纯函数：index.json 容错归一——剔非法项、id 非法项，按 updatedAt 降序 */
export function sanitizeDraftIndex(raw: unknown): DraftMeta[] {
  if (!Array.isArray(raw)) return []
  const list = raw.filter(
    (m): m is DraftMeta =>
      !!m &&
      typeof m === 'object' &&
      typeof (m as DraftMeta).id === 'string' &&
      DRAFT_ID_RE.test((m as DraftMeta).id) &&
      typeof (m as DraftMeta).title === 'string' &&
      typeof (m as DraftMeta).excerpt === 'string' &&
      typeof (m as DraftMeta).updatedAt === 'number' &&
      Number.isFinite((m as DraftMeta).updatedAt) &&
      typeof (m as DraftMeta).chars === 'number' &&
      Number.isFinite((m as DraftMeta).chars)
  )
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}

let rootOverride: string | null = null

/** 测试注入草稿根目录；null 回落 userData/drafts */
export function configureDraftsDir(dir: string | null): void {
  rootOverride = dir
}

function draftsRoot(): string {
  return rootOverride ?? path.join(app.getPath('userData'), 'drafts')
}

function assertValidId(id: string): void {
  if (!DRAFT_ID_RE.test(id)) throw new Error(`非法草稿 id: ${id}`)
}

function bodyPath(id: string): string {
  return path.join(draftsRoot(), `${id}.md`)
}

function indexPath(): string {
  return path.join(draftsRoot(), 'index.json')
}

function newDraftId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 全部草稿元数据（updatedAt 降序）；索引缺失/损坏返回空 */
export async function listDrafts(): Promise<DraftMeta[]> {
  try {
    return sanitizeDraftIndex(JSON.parse(await fsp.readFile(indexPath(), 'utf-8')))
  } catch {
    return []
  }
}

/** 新建或更新草稿（id 缺省新建）：写正文、物化元数据、维护索引 */
export async function saveDraft(input: { id?: string | null; content: string }): Promise<DraftMeta> {
  const id = input.id ? input.id : newDraftId()
  assertValidId(id)
  const content = String(input.content ?? '')
  const meta: DraftMeta = {
    id,
    title: deriveDraftTitle(content),
    excerpt: deriveDraftExcerpt(content),
    updatedAt: Date.now(),
    chars: content.length
  }
  await fsp.mkdir(draftsRoot(), { recursive: true })
  await fsp.writeFile(bodyPath(id), content, 'utf-8')
  await fsp.writeFile(indexPath(), JSON.stringify(upsertDraftMeta(await listDrafts(), meta), null, 2), 'utf-8')
  return meta
}

/** 读取草稿全文；不存在返回 null */
export async function readDraft(id: string): Promise<string | null> {
  assertValidId(id)
  try {
    return await fsp.readFile(bodyPath(id), 'utf-8')
  } catch {
    return null
  }
}

/** 删除草稿（正文 + 索引项）；不存在时 no-op */
export async function removeDraft(id: string): Promise<void> {
  assertValidId(id)
  const list = await listDrafts()
  if (!list.some((m) => m.id === id)) return
  await fsp.rm(bodyPath(id), { force: true })
  await fsp.writeFile(indexPath(), JSON.stringify(list.filter((m) => m.id !== id), null, 2), 'utf-8')
}

implement('listDrafts', () => listDrafts())
implement('saveDraft', ([input]) => saveDraft(input))
implement('readDraft', ([id]) => readDraft(String(id)))
implement('removeDraft', ([id]) => removeDraft(String(id)))
