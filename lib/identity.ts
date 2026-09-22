/**
 * 全局 GitHub 身份 store（host 侧纯逻辑，可独立测试）——与 tasks/statusItems/floats
 * 同构的快照注册表。
 *
 * 动机：身份（头像/昵称/login）原本只存在于用户中心页面本地 state，左栏用户入口、
 * 快捷面板与首页问候拿不到。收敛为单一数据源后四处联动：壳层挂载拉取一次
 * （refreshIdentity），用户中心授权动作后的 reloadIdentity 写穿（syncIdentity），
 * 授权/断开即时反映到侧栏与首页。
 *
 * 回退语义：快照为 undefined（尚未拉取）或 null（已确认无身份/拉取失败/stale 由
 * 消费方判断）时，消费方一律回落品牌标 + 应用名 + 纯问候的默认展示。
 */

import { useSyncExternalStore } from 'react'

import type { GithubIdentity, SettingsStatus } from '@shared/types'

/** 身份拉取所需的最小 API 面（生产 = window.api，测试可注入） */
export interface IdentityApi {
  getSettings(): Promise<SettingsStatus>
  getGithubIdentity(): Promise<GithubIdentity>
}

let state: GithubIdentity | null | undefined
const listeners = new Set<() => void>()

let apiOverride: IdentityApi | null = null

function api(): IdentityApi {
  if (apiOverride) return apiOverride
  const injected = (globalThis as { window?: { api?: IdentityApi } }).window?.api
  if (!injected) throw new Error('window.api 不可用（identity store 依赖宿主注入）')
  return injected
}

function emit(): void {
  listeners.forEach((l) => l())
}

export const identityStore = {
  /** undefined = 尚未拉取；null = 已确认无身份；GithubIdentity = 已授权 */
  get: (): GithubIdentity | null | undefined => state,
  subscribe(l: () => void): () => void {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
}

/** 拉取并落快照：未配置 token 或拉取异常一律落 null（壳层展示回落默认态） */
export async function refreshIdentity(): Promise<void> {
  try {
    const status = await api().getSettings()
    state = status.hasToken ? await api().getGithubIdentity() : null
  } catch {
    state = null
  }
  emit()
}

/** 写穿入口：调用方（用户中心）已持有最新身份时直接落快照，不重复走 IPC */
export function syncIdentity(next: GithubIdentity | null): void {
  state = next
  emit()
}

export function resetIdentityForTests(): void {
  state = undefined
  apiOverride = null
  emit()
}

export function setIdentityApiForTests(injected: IdentityApi): void {
  apiOverride = injected
}

/** 消费全局身份快照（server 快照恒为 undefined → 构建期回落品牌标，无水合分叉） */
export function useGithubIdentity(): GithubIdentity | null | undefined {
  return useSyncExternalStore(identityStore.subscribe, identityStore.get, identityStore.get)
}
