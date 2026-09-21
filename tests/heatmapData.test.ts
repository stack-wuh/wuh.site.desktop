import { describe, expect, it } from 'vitest'
import {
  buildHeatmapViewData,
  getMonthPositions,
  MONTH_LABELS
} from '../components/home/heatmapData'
import type { AboutActivityDay, AboutActivityHeatmap } from '@shared/types'

// 2026-09-17 是周四（getDay=4）；2026-10-04 是周日（一周首日，跨月定位锚点）
function days(count: number, start = '2026-09-17'): AboutActivityDay[] {
  const out: AboutActivityDay[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const pad = (n: number): string => String(n).padStart(2, '0')
  for (let i = 0; i < count; i++) {
    const date = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`
    out.push({
      date,
      total: i + 1,
      level: (i % 5) as AboutActivityDay['level'],
      counts: {
        visits: i + 1,
        published: 0,
        updated: 0,
        comments: 0,
        guestbook: 0,
        projectUpdates: 0,
        githubContributions: 0
      }
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function heatmap(dayCount: number, endDate = '2026-10-03'): AboutActivityHeatmap {
  return {
    startDate: days(dayCount)[0]?.date ?? '2026-09-17',
    endDate,
    timezone: 'Asia/Shanghai',
    total: dayCount,
    days: days(dayCount)
  }
}

describe('buildHeatmapViewData', () => {
  it('空数据返回 null（空态由组件渲染）', () => {
    expect(buildHeatmapViewData(null)).toBeNull()
    expect(buildHeatmapViewData(undefined)).toBeNull()
    expect(buildHeatmapViewData({ ...heatmap(0), days: [] })).toBeNull()
  })

  it('首日按星期补位：周四开始 → 前导 4 个空位', () => {
    const view = buildHeatmapViewData(heatmap(3))!
    expect(view).not.toBeNull()
    expect(view.weeks).toHaveLength(1)
    const week = view.weeks[0]!
    expect(week.days).toHaveLength(7)
    expect(week.days.slice(0, 4)).toEqual([null, null, null, null])
    expect(week.days[4]).toMatchObject({ date: '2026-09-17', count: 1, level: 0 })
    expect(week.days[6]).toMatchObject({ date: '2026-09-19', count: 3, level: 2 })
  })

  it('count=total、breakdown=counts，与站点 buildActivityHeatmapData 同语义', () => {
    const view = buildHeatmapViewData(heatmap(1))!
    const cell = view.weeks[0]!.days[4]!
    expect(cell.breakdown).toEqual({
      visits: 1,
      published: 0,
      updated: 0,
      comments: 0,
      guestbook: 0,
      projectUpdates: 0,
      githubContributions: 0
    })
  })

  it('按 7 天切周：17 天从周四开始 → 3 整周（4 空位 + 17 格）', () => {
    const view = buildHeatmapViewData(heatmap(17))!
    expect(view.weeks).toHaveLength(3)
    expect(view.weeks[0]!.days.filter(Boolean)).toHaveLength(3)
    expect(view.weeks[1]!.days.filter(Boolean)).toHaveLength(7)
    expect(view.weeks[2]!.days.filter(Boolean)).toHaveLength(7)
    expect(view.weeks[2]!.days[0]).toMatchObject({ date: '2026-09-27' })
    expect(view.total).toBe(17)
    expect(view.year).toBe(2026)
  })

  it('year 取自 endDate', () => {
    const view = buildHeatmapViewData(heatmap(3, '2027-01-02'))!
    expect(view.year).toBe(2027)
  })
})

describe('getMonthPositions', () => {
  it('首格月份定位在第 2 列（第 1 列为星期标签）', () => {
    const view = buildHeatmapViewData(heatmap(17))!
    const positions = getMonthPositions(view.weeks)
    expect(positions).toHaveLength(1)
    expect(positions[0]).toEqual({ label: MONTH_LABELS[8], column: 2 }) // Sep
  })

  it('跨月时新月份定位在对应周列（weekIndex+2）', () => {
    // 18 天：Sep17..Oct4，第 4 周（index 3）首日 2026-10-04 落在十月
    const view = buildHeatmapViewData(heatmap(18))!
    const positions = getMonthPositions(view.weeks)
    expect(view.weeks).toHaveLength(4)
    expect(positions).toHaveLength(2)
    expect(positions[1]).toEqual({ label: MONTH_LABELS[9], column: 5 }) // Oct
  })

  it('空周不产生定位', () => {
    expect(getMonthPositions([])).toEqual([])
  })
})
