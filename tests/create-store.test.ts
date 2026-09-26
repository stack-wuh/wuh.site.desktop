import { describe, expect, it } from 'vitest'

import { createStore } from '../lib/createStore'

describe('createStore 微 store 公共件', () => {
  it('get 返回初始快照', () => {
    const store = createStore<{ n: number }>({ n: 0 })
    expect(store.get()).toEqual({ n: 0 })
  })

  it('commit 整值：换新引用并广播；退订后不再收到通知', () => {
    const store = createStore<{ n: number }>({ n: 0 })
    const seen: number[] = []
    const unsub = store.subscribe(() => seen.push(store.get().n))
    const next = { n: 1 }
    store.commit(next)
    expect(store.get()).toBe(next)
    expect(seen).toEqual([1])
    unsub()
    store.commit({ n: 2 })
    expect(seen).toEqual([1])
    expect(store.get().n).toBe(2)
  })

  it('commit 函数式：入参为当前快照，返回值成为新快照', () => {
    const store = createStore<{ items: number[] }>({ items: [1] })
    store.commit((cur) => ({ items: [...cur.items, 2] }))
    expect(store.get().items).toEqual([1, 2])
  })

  it('多监听器全部通知；同一引用 commit 也广播（不去重）', () => {
    const store = createStore<{ n: number }>({ n: 0 })
    let a = 0
    let b = 0
    store.subscribe(() => {
      a += 1
    })
    store.subscribe(() => {
      b += 1
    })
    store.commit(store.get())
    expect(a).toBe(1)
    expect(b).toBe(1)
  })

  it('监听器异常原样上抛（不隔离——feedback 总线的逐监听器隔离是未收敛特例）；快照仍先落定', () => {
    const store = createStore<{ n: number }>({ n: 0 })
    store.subscribe(() => {
      throw new Error('boom')
    })
    expect(() => store.commit({ n: 1 })).toThrow('boom')
    expect(store.get().n).toBe(1)
  })
})
