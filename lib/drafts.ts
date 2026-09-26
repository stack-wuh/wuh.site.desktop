/**
 * 草稿箱注册表（host 侧纯逻辑，可独立测试）——列表快照 + 自动暂存/消费编排。
 * 数据面全部经 window.api 的 drafts.* 通道；会话归属（activeDraftId）收敛在
 * workspaceStore，本模块只消费：
 * - installDraftAutosave：新草稿会话（activePath==null）的 doc.changed → ~800ms
 *   防抖暂存，落盘成功经 adoptDraft 回填归属（首存采纳新 id，重存更新同 id）
 * - consumeDraft：另存为成功后删除对应草稿并刷新列表
 */
import { useSyncExternalStore } from 'react'
import type { DraftMeta } from '@shared/drafts'
import type { DesktopApi } from '../src/shared/types'
import { documentEvents, workspaceStore } from './store'
import { createStore } from './createStore'

const AUTOSAVE_DELAY = 800

function api(): DesktopApi {
  return (globalThis as unknown as { window: { api: DesktopApi } }).window.api
}

let apiWarned = false

/**
 * 防御取用：window.api 缺少 drafts.* 方法时返回 null 并一次性告警。
 * 场景：electron-vite dev 的 main/preload 只在启动时构建、渲染层热更新——
 * 跨进程新增 IPC 后未重启 dev 的实例会调用旧 preload 上不存在的方法，
 * 同步 TypeError 逃逸在 promise 链之外且无任何可见错误（20260924 实测）。
 */
function draftsApi(): DesktopApi | null {
  const apiObj = api() as Partial<DesktopApi> | undefined
  if (!apiObj || typeof apiObj.listDrafts !== 'function' || typeof apiObj.saveDraft !== 'function') {
    if (!apiWarned) {
      apiWarned = true
      console.warn(
        '草稿箱不可用：window.api 缺少 drafts.* 方法——main/preload 落后于渲染层（electron-vite dev 只在启动时构建），请重启 dev'
      )
    }
    return null
  }
  return apiObj as DesktopApi
}

// ---------- 列表快照（草稿箱页/侧栏徽标共用） ----------

interface DraftsSnapshot {
  /** 首次拉取是否完成（完成前徽标/列表不显示数字） */
  loaded: boolean
  drafts: DraftMeta[]
}

const store = createStore<DraftsSnapshot>({ loaded: false, drafts: [] })

export const draftsStore = {
  get: store.get,
  subscribe: store.subscribe
}

export function useDrafts(): DraftsSnapshot {
  // 第三参沿用同一快照：模块级纯内存状态，服务端预渲染与客户端取值一致
  return useSyncExternalStore(draftsStore.subscribe, draftsStore.get, draftsStore.get)
}

/** 拉取草稿列表（失败保留旧快照并标记已加载，不阻塞 UI；失败有 warn 可见） */
export async function refreshDrafts(): Promise<void> {
  const apiObj = draftsApi()
  if (!apiObj) {
    store.commit((cur) => ({ loaded: true, drafts: cur.drafts }))
    return
  }
  try {
    const drafts = await apiObj.listDrafts()
    store.commit({ loaded: true, drafts })
  } catch (err) {
    console.warn('拉取草稿列表失败，保留旧快照', err)
    store.commit((cur) => ({ loaded: true, drafts: cur.drafts }))
  }
}

// ---------- 自动暂存（新草稿会话 → 草稿箱） ----------

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** 防抖暂存当前新草稿会话；仅在归属场景（无路径、非空内容）落盘 */
export function scheduleDraftPersist(): void {
  const ws = workspaceStore.get()
  if (ws.activePath != null) return
  if ((ws.content ?? '').trim() === '') return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    const cur = workspaceStore.get()
    if (cur.activePath != null || (cur.content ?? '').trim() === '') return
    const apiObj = draftsApi()
    if (!apiObj) return
    const sessionDraftId = cur.activeDraftId
    void apiObj
      .saveDraft({ id: sessionDraftId, content: cur.content ?? '' })
      .then((meta) => {
        // 会话仍在原草稿会话（未被打开文档/新建打断）时回填归属
        const now = workspaceStore.get()
        if (now.activePath == null && now.activeDraftId === sessionDraftId) {
          workspaceStore.adoptDraft(meta.id)
        }
        return refreshDrafts()
      })
      .catch((err: unknown) => console.warn('草稿暂存失败', err))
  }, AUTOSAVE_DELAY)
}

// ---------- 生命周期联动 ----------

/** 另存为成功后消费草稿：删除、清匹配归属、刷新列表（失败向上抛，调用方兜底 warn） */
export async function consumeDraft(id: string): Promise<void> {
  const apiObj = draftsApi()
  if (!apiObj) throw new Error('草稿箱不可用：window.api 缺少 drafts.* 方法')
  await apiObj.removeDraft(id)
  if (workspaceStore.get().activeDraftId === id) workspaceStore.adoptDraft(null)
  await refreshDrafts()
}

let installed = false

/** 挂载 doc.changed 联动（幂等，返回卸载函数）：无路径会话的变更触发防抖暂存 */
export function installDraftAutosave(): () => void {
  if (installed) return () => undefined
  installed = true
  const unsubscribe = documentEvents.subscribe((name, payload) => {
    if (name !== 'doc.changed') return
    if (payload.path == null && workspaceStore.get().dirty) scheduleDraftPersist()
  })
  void refreshDrafts()
  return () => {
    installed = false
    unsubscribe()
  }
}

export function resetDraftsForTests(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  store.commit({ loaded: false, drafts: [] })
  installed = false
  apiWarned = false
}
