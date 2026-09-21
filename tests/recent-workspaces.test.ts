import { describe, expect, it, vi } from 'vitest'
import type { RecentWorkspace } from '@shared/types'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp userdata' } }))

import { upsertRecent } from '../src/main/recentWorkspaces'

const e = (path: string, name: string, openedAt: number): RecentWorkspace => ({ path, name, openedAt })

describe('upsertRecent', () => {
  it('新条目置顶，原列表顺延', () => {
    const r = upsertRecent([e('/a', 'a', 1)], { path: '/b', name: 'b' })
    expect(r[0]).toMatchObject({ path: '/b', name: 'b' })
    expect(r).toHaveLength(2)
  })

  it('同 path 去重并置顶（时间刷新）', () => {
    const r = upsertRecent([e('/a', 'a', 1), e('/b', 'b', 2)], { path: '/a', name: 'a2' })
    expect(r.map((x) => x.path)).toEqual(['/a', '/b'])
    expect(r[0]?.openedAt).toBeGreaterThan(1)
  })

  it('cap 8 条，最旧的（队尾）先被挤出', () => {
    // 列表约定为 MRU 序（越靠前越近使用）：seed 里 /p0 最新、/p7 最旧
    const seed = Array.from({ length: 8 }, (_, i) => e(`/p${i}`, `n${i}`, 100 - i))
    const r = upsertRecent(seed, { path: '/new', name: 'new' })
    expect(r).toHaveLength(8)
    expect(r.some((x) => x.path === '/p7')).toBe(false)
    expect(r[0]?.path).toBe('/new')
    expect(r.at(-1)?.path).toBe('/p6')
  })
})
