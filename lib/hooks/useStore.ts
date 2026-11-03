import { useSyncExternalStore } from 'react'

/**
 * createStore 消费端样板收敛（20261103-refactor-shared-hooks-sweep）：
 * useSyncExternalStore(store.subscribe, store.get, store.get) 三参样板 ×20 处
 * 收敛为单参调用。SSR 快照以 get 兼任第三参（各模块既有约定不变）。
 */
export function useStore<S>(store: { get(): S; subscribe(listener: () => void): () => void }): S {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
