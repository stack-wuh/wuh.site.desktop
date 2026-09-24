import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { configureDraftsDir, listDrafts, readDraft, removeDraft, saveDraft } from '../src/main/drafts'

/**
 * 主进程草稿仓 fs 联动（20260924-feature-editor-simplify-draft-box）：
 * userData/drafts/<id>.md + index.json。目录经 configureDraftsDir 注入 tmp，
 * 不触碰 electron app.getPath。纯逻辑边界见 tests/drafts.test.ts。
 */

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'wuh-drafts-'))
  configureDraftsDir(dir)
})

afterEach(async () => {
  configureDraftsDir(null)
  await rm(dir, { recursive: true, force: true })
})

afterAll(() => {
  configureDraftsDir(null)
})

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 3))

describe('saveDraft / listDrafts（落盘与索引）', () => {
  it('新建：生成 id、物化元数据、写正文与 index', async () => {
    const saved = await saveDraft({ content: '# 标题\n\n正文内容' })
    expect(saved.id).toMatch(/^[a-z0-9-]+$/i)
    expect(saved.title).toBe('标题')
    expect(saved.chars).toBe('# 标题\n\n正文内容'.length)
    const list = await listDrafts()
    expect(list).toEqual([saved])
    await expect(readDraft(saved.id)).resolves.toBe('# 标题\n\n正文内容')
  })

  it('更新同 id：内容与时间刷新，列表仍是一条且置顶', async () => {
    const first = await saveDraft({ content: 'v1' })
    await tick()
    const second = await saveDraft({ id: first.id, content: 'v2 更长' })
    expect(second.id).toBe(first.id)
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt)
    const list = await listDrafts()
    expect(list).toHaveLength(1)
    expect(list[0].chars).toBe('v2 更长'.length)
    await expect(readDraft(first.id)).resolves.toBe('v2 更长')
  })

  it('多条草稿按 updatedAt 降序', async () => {
    const a = await saveDraft({ content: 'A' })
    await tick()
    const b = await saveDraft({ content: 'B' })
    const list = await listDrafts()
    expect(list.map((m) => m.id)).toEqual([b.id, a.id])
  })
})

describe('readDraft / removeDraft（读取与删除）', () => {
  it('读取不存在的草稿返回 null', async () => {
    await expect(readDraft('nope')).resolves.toBeNull()
  })

  it('id 含路径分隔符或越界片段直接抛错（文件名注入防护）', async () => {
    await expect(readDraft('../evil')).rejects.toThrow()
    await expect(readDraft('a/b')).rejects.toThrow()
    await expect(readDraft('.\\x')).rejects.toThrow()
  })

  it('删除：正文与索引同时消失；重复删除 no-op', async () => {
    const saved = await saveDraft({ content: 'bye' })
    await removeDraft(saved.id)
    await expect(readDraft(saved.id)).resolves.toBeNull()
    expect(await listDrafts()).toEqual([])
    await expect(removeDraft(saved.id)).resolves.toBeUndefined()
  })
})

describe('容错（index 损坏）', () => {
  it('index.json 损坏时 listDrafts 返回空而不抛', async () => {
    await writeFile(path.join(dir, 'index.json'), '{not json', 'utf-8')
    expect(await listDrafts()).toEqual([])
  })

  it('损坏后再次 saveDraft 重建干净索引', async () => {
    await writeFile(path.join(dir, 'index.json'), 'garbage', 'utf-8')
    const saved = await saveDraft({ content: 'rebuild' })
    expect(await listDrafts()).toEqual([saved])
  })
})
