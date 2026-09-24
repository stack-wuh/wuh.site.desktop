import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deriveDraftExcerpt, deriveDraftTitle } from '@shared/drafts'
import { sanitizeDraftIndex, upsertDraftMeta } from '../src/main/drafts'
import type { DraftMeta } from '@shared/drafts'

/**
 * 草稿纯逻辑（20260924-feature-editor-simplify-draft-box）：
 * 标题/摘要派生（shared，写盘时物化进 meta）、index 维护纯函数（main）、
 * 渲染层注册表联动（lib/drafts + workspaceStore 草稿归属字段）。
 * fs 联动见 tests/drafts-main.test.ts。
 */

describe('deriveDraftTitle（草稿标题派生）', () => {
  it('空内容与纯空白返回空串（展示层回落 i18n 无标题文案）', () => {
    expect(deriveDraftTitle('')).toBe('')
    expect(deriveDraftTitle('  \n\t ')).toBe('')
  })

  it('ATX 标题优先：取首个标题文本并剥离标记', () => {
    expect(deriveDraftTitle('# 标题\n\n正文第一段')).toBe('标题')
    expect(deriveDraftTitle('##   带闭合 ##\nbody')).toBe('带闭合')
  })

  it('无标题时取首个非空行', () => {
    expect(deriveDraftTitle('第一行\n第二行')).toBe('第一行')
    expect(deriveDraftTitle('\n\n  缩进行  \nx')).toBe('缩进行')
  })

  it('无空格的 # 行不算标题（与 parseOutline 规则一致）', () => {
    expect(deriveDraftTitle('###深度无空格\nx')).toBe('###深度无空格')
  })

  it('超长行截断到 40 字符加省略号', () => {
    const long = '字'.repeat(60)
    expect(deriveDraftTitle(long)).toBe('字'.repeat(40) + '…')
  })
})

describe('deriveDraftExcerpt（草稿摘要派生）', () => {
  it('取标题行之后的首个非空行并 trim', () => {
    expect(deriveDraftExcerpt('# T\n\n正文')).toBe('正文')
    expect(deriveDraftExcerpt('# T\n\n\n\n  缩进正文  ')).toBe('缩进正文')
  })

  it('标题来自首行时摘要取下一非空行', () => {
    expect(deriveDraftExcerpt('首行即标题\n第二行')).toBe('第二行')
  })

  it('单行内容与空内容没有摘要', () => {
    expect(deriveDraftExcerpt('# 只有标题')).toBe('')
    expect(deriveDraftExcerpt('')).toBe('')
    expect(deriveDraftExcerpt('  \n ')).toBe('')
  })

  it('超长摘要截断到 80 字符加省略号', () => {
    const long = '词'.repeat(100)
    expect(deriveDraftExcerpt(`# T\n${long}`)).toBe('词'.repeat(80) + '…')
  })
})

function meta(id: string, updatedAt: number): DraftMeta {
  return { id, title: `t-${id}`, excerpt: '', updatedAt, chars: 1 }
}

describe('upsertDraftMeta（index 置顶维护）', () => {
  it('新草稿置顶；同 id 更新原地去重置顶', () => {
    let list = [meta('a', 1), meta('b', 2)]
    list = upsertDraftMeta(list, meta('c', 3))
    expect(list.map((m) => m.id)).toEqual(['c', 'a', 'b'])
    list = upsertDraftMeta(list, meta('a', 9))
    expect(list.map((m) => m.id)).toEqual(['a', 'c', 'b'])
  })

  it('超出 cap 100 挤掉最旧', () => {
    let list: DraftMeta[] = []
    for (let i = 0; i < 100; i++) list = upsertDraftMeta(list, meta(`d${i}`, i))
    expect(list).toHaveLength(100)
    list = upsertDraftMeta(list, meta('new', 1000))
    expect(list).toHaveLength(100)
    expect(list.some((m) => m.id === 'd0')).toBe(false)
    expect(list[0].id).toBe('new')
  })
})

describe('sanitizeDraftIndex（index.json 容错归一）', () => {
  it('非法 JSON 结构（非数组/垃圾项）过滤为干净列表', () => {
    expect(sanitizeDraftIndex('not an array')).toEqual([])
    expect(
      sanitizeDraftIndex([
        { id: 'ok', title: 'T', excerpt: 'e', updatedAt: 5, chars: 3 },
        null,
        { id: 42 },
        { id: 'no-time', title: 'T', excerpt: '', updatedAt: 'x', chars: 1 }
      ])
    ).toEqual([{ id: 'ok', title: 'T', excerpt: 'e', updatedAt: 5, chars: 3 }])
  })

  it('按 updatedAt 降序稳定排序', () => {
    const sorted = sanitizeDraftIndex([
      { id: 'old', title: 'a', excerpt: '', updatedAt: 1, chars: 1 },
      { id: 'new', title: 'b', excerpt: '', updatedAt: 9, chars: 1 },
      { id: 'mid', title: 'c', excerpt: '', updatedAt: 5, chars: 1 }
    ])
    expect(sorted.map((m) => m.id)).toEqual(['new', 'mid', 'old'])
  })

  it('id 含路径分隔符的条目视为非法剔除（防手改 index 注入文件名）', () => {
    expect(
      sanitizeDraftIndex([
        { id: '../evil', title: 'a', excerpt: '', updatedAt: 1, chars: 1 },
        { id: 'ok-id', title: 'b', excerpt: '', updatedAt: 2, chars: 1 }
      ]).map((m) => m.id)
    ).toEqual(['ok-id'])
  })
})

// ---------- 渲染层注册表联动（lib/drafts + workspaceStore） ----------

import {
  consumeDraft,
  draftsStore,
  installDraftAutosave,
  refreshDrafts,
  resetDraftsForTests,
  scheduleDraftPersist
} from '../lib/drafts'
import { workspaceStore } from '../lib/store'
import type { DesktopApi } from '../src/shared/types'

/** window.api 桩（node 环境直挂 globalThis，与 lib/store 的取用约定一致） */
function installApiMock(patch: Partial<DesktopApi>): DesktopApi {
  const api = {
    listDrafts: vi.fn(async () => []),
    saveDraft: vi.fn(async (input: { id?: string | null; content: string }) => ({
      id: input.id ?? 'mock-1',
      title: deriveDraftTitle(input.content),
      excerpt: deriveDraftExcerpt(input.content),
      updatedAt: Date.now(),
      chars: input.content.length
    })),
    readDraft: vi.fn(async () => null),
    removeDraft: vi.fn(async () => undefined),
    ...patch
  } as DesktopApi
  ;(globalThis as unknown as { window: unknown }).window = { api }
  return api
}

function workspaceStoreApi(): DesktopApi {
  return (globalThis as unknown as { window: { api: DesktopApi } }).window.api
}

beforeEach(() => {
  vi.useFakeTimers()
  resetDraftsForTests()
  workspaceStore.switchWorkspace(null)
  installApiMock({})
})

afterEach(() => {
  vi.useRealTimers()
  delete (globalThis as unknown as { window?: unknown }).window
})

describe('workspaceStore 草稿归属（activeDraftId 生命周期）', () => {
  it('openDraft：无路径会话载入草稿内容且 clean，归属草稿 id', () => {
    workspaceStore.openDraft('# 已有草稿', 'd1')
    const ws = workspaceStore.get()
    expect(ws.activePath).toBeNull()
    expect(ws.content).toBe('# 已有草稿')
    expect(ws.dirty).toBe(false)
    expect(ws.activeDraftId).toBe('d1')
  })

  it('startDraft / closeDoc / openDoc / switchWorkspace 均清除归属', () => {
    workspaceStore.openDraft('x', 'd1')
    workspaceStore.startDraft()
    expect(workspaceStore.get().activeDraftId).toBeNull()
    workspaceStore.openDraft('x', 'd1')
    workspaceStore.closeDoc()
    expect(workspaceStore.get().activeDraftId).toBeNull()
    workspaceStore.openDraft('x', 'd1')
    workspaceStore.openDoc('a.md', 'doc')
    expect(workspaceStore.get().activeDraftId).toBeNull()
    workspaceStore.openDraft('x', 'd1')
    workspaceStore.switchWorkspace('/tmp')
    expect(workspaceStore.get().activeDraftId).toBeNull()
  })
})

describe('scheduleDraftPersist（新草稿会话自动暂存）', () => {
  it('非空新草稿会话：防抖 ~800ms 后落草稿并采纳 id', async () => {
    workspaceStore.setContent('# 标题')
    workspaceStore.setContent('# 标题\n正文')
    scheduleDraftPersist()
    expect(vi.mocked(workspaceStoreApi().saveDraft)).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(800)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledTimes(1)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledWith({ id: null, content: '# 标题\n正文' })
    expect(workspaceStore.get().activeDraftId).toBe('mock-1')
  })

  it('窗口内重复触发只落一次盘（防抖重置）', async () => {
    workspaceStore.setContent('a')
    scheduleDraftPersist()
    await vi.advanceTimersByTimeAsync(500)
    workspaceStore.setContent('ab')
    scheduleDraftPersist()
    await vi.advanceTimersByTimeAsync(500)
    expect(workspaceStoreApi().saveDraft).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledTimes(1)
    expect(vi.mocked(workspaceStoreApi().saveDraft).mock.calls[0][0].content).toBe('ab')
  })

  it('已归属草稿的会话更新同 id；非草稿会话（有路径/空内容）不触发', async () => {
    workspaceStore.openDraft('旧内容', 'd9')
    workspaceStore.setContent('旧内容 v2')
    scheduleDraftPersist()
    await vi.advanceTimersByTimeAsync(800)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledWith({ id: 'd9', content: '旧内容 v2' })

    workspaceStore.openDoc('a.md', 'doc 内容')
    workspaceStore.setContent('doc 内容 v2')
    scheduleDraftPersist()
    await vi.advanceTimersByTimeAsync(800)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledTimes(1)

    workspaceStore.startDraft()
    scheduleDraftPersist()
    await vi.advanceTimersByTimeAsync(800)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledTimes(1)
  })
})

describe('consumeDraft（另存为后消费）与 refreshDrafts', () => {
  it('消费：删草稿、清匹配的归属、刷新列表', async () => {
    installApiMock({ listDrafts: vi.fn(async () => []) })
    await refreshDrafts()
    expect(draftsStore.get().drafts).toEqual([])
    await consumeDraft('d1')
    expect(workspaceStoreApi().removeDraft).toHaveBeenCalledWith('d1')
    await vi.advanceTimersByTimeAsync(0)
    expect(draftsStore.get().drafts).toEqual([])
  })

  it('消费未匹配归属时不清别的 id；removeDraft 抛错向上传播', async () => {
    workspaceStore.openDraft('x', 'keep')
    installApiMock({ removeDraft: vi.fn(async () => Promise.reject(new Error('boom'))) })
    await expect(consumeDraft('d1')).rejects.toThrow('boom')
    expect(workspaceStore.get().activeDraftId).toBe('keep')
  })
})

describe('installDraftAutosave（doc.changed 事件联动）', () => {
  it('新草稿会话输入经 doc.changed 自动暂存；打开文档后不触发', async () => {
    const uninstall = installDraftAutosave()
    // 生产事件链：setContent → 300ms emitChangedDebounced → 订阅触发 → 800ms 防抖落盘
    workspaceStore.setContent('hello draft')
    await vi.advanceTimersByTimeAsync(299)
    expect(workspaceStoreApi().saveDraft).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(801)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledTimes(1)
    expect(workspaceStore.get().activeDraftId).toBe('mock-1')

    workspaceStore.openDoc('a.md', 'doc')
    workspaceStore.setContent('doc v2')
    await vi.advanceTimersByTimeAsync(1200)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledTimes(1)
    uninstall()
  })

  it('重复 install 幂等（单实例订阅）', async () => {
    const u1 = installDraftAutosave()
    const u2 = installDraftAutosave()
    workspaceStore.setContent('x')
    await vi.advanceTimersByTimeAsync(1200)
    expect(workspaceStoreApi().saveDraft).toHaveBeenCalledTimes(1)
    u1()
    u2()
  })
})

describe('版本错位防御（window.api 缺 drafts 方法时可见化降级）', () => {
  it('api 缺方法：暂存定时器不抛错、warn 一次性且含重启指引', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    ;(globalThis as unknown as { window: unknown }).window = { api: {} }
    workspaceStore.setContent('hello')
    expect(() => scheduleDraftPersist()).not.toThrow()
    await vi.advanceTimersByTimeAsync(850)
    const msgs = warn.mock.calls.map((c) => c.map((a) => String(a)).join(' '))
    expect(msgs.some((m) => m.includes('drafts'))).toBe(true)
    expect(msgs.find((m) => m.includes('重启'))).toBeTruthy()
    warn.mockRestore()
  })

  it('api 完全缺失：refreshDrafts 降级为 loaded 空列表且不抛', async () => {
    ;(globalThis as unknown as { window: unknown }).window = {}
    await expect(refreshDrafts()).resolves.toBeUndefined()
    expect(draftsStore.get().loaded).toBe(true)
    expect(draftsStore.get().drafts).toEqual([])
  })

  it('listDrafts 拒绝：warn 且保留旧快照（降级语义不变）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    installApiMock({
      listDrafts: vi.fn(async () => [{ id: 'keep', title: 'T', excerpt: '', updatedAt: 1, chars: 1 }]),
      removeDraft: vi.fn(async () => undefined),
      readDraft: vi.fn(async () => null)
    })
    await refreshDrafts()
    expect(draftsStore.get().drafts).toHaveLength(1)
    // 换成拒绝的 api 再拉：保留旧快照
    installApiMock({ listDrafts: vi.fn(async () => Promise.reject(new Error('boom'))) })
    await refreshDrafts()
    expect(draftsStore.get().drafts).toHaveLength(1)
    expect(draftsStore.get().loaded).toBe(true)
    expect(warn.mock.calls.some((c) => String(c[0]).includes('草稿列表'))).toBe(true)
    warn.mockRestore()
  })
})
