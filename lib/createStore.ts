/**
 * 微 store 公共件（20260925-refactor-lib-create-store 收敛）——lib/ 各注册表
 * 曾逐字重复的「模块级 state + Set<listeners> + emit + { get, subscribe }」
 * 三件套收敛于此。
 *
 * 契约（与被收敛的各处手写实现逐字同语义）：
 * - 快照不可变约定：就地变更后必须 commit 产出新引用再广播（useSyncExternalStore
 *   依赖新引用）；commit 支持整值或函数式（入参为当前快照）；
 * - 状态先落定、后同步广播，通知不去重（同引用 commit 也广播）；
 * - 监听器异常不隔离、原样上抛（feedback 总线的逐监听器 try/catch 是特例，未收敛）；
 * - server 快照由消费方自传（各 use* 均以 get 兼任第三参，见各模块）。
 */
export interface MicroStore<S> {
  /** 当前快照（useSyncExternalStore 的 getSnapshot） */
  get(): S
  /** 订阅广播；返回退订函数 */
  subscribe(listener: () => void): () => void
}

export function createStore<S>(
  initial: S
): MicroStore<S> & {
  /** 就地变更后统一走这里产出新快照并广播；函数式入参接收当前快照 */
  commit(next: S | ((current: S) => S)): void
} {
  let state: S = initial
  const listeners = new Set<() => void>()
  const emit = (): void => {
    listeners.forEach((l) => l())
  }
  return {
    get: (): S => state,
    subscribe(l: () => void): () => void {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    commit(next): void {
      state = typeof next === 'function' ? (next as (current: S) => S)(state) : next
      emit()
    }
  }
}
