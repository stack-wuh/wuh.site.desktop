import type { AboutActivityHeatmap } from '@shared/types'

/**
 * 站点综合活动数据 → 热力图视图数据。
 * 与站点 About 页 buildActivityHeatmapData 同语义：首日按星期补 null 位、按 7 天切周、
 * count=total、breakdown=counts、year 取自 endDate。
 */

export interface HeatmapCell {
  date: string
  count: number
  level: number
  breakdown: Record<string, number>
}

export interface HeatmapWeek {
  days: Array<HeatmapCell | null>
}

export interface HeatmapViewData {
  year: number
  total: number
  weeks: HeatmapWeek[]
}

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const

export function buildHeatmapViewData(
  data: AboutActivityHeatmap | null | undefined
): HeatmapViewData | null {
  if (!data || data.days.length === 0) return null

  const firstDate = new Date(`${data.days[0].date}T00:00:00`)
  const leadingEmptyDays = firstDate.getDay()
  const padded: Array<HeatmapCell | null> = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...data.days.map((day) => ({
      date: day.date,
      count: day.total,
      level: day.level,
      breakdown: day.counts
    }))
  ]

  return {
    year: Number(data.endDate.slice(0, 4)),
    total: data.total,
    weeks: Array.from({ length: Math.ceil(padded.length / 7) }, (_, index) => ({
      days: padded.slice(index * 7, index * 7 + 7)
    }))
  }
}

/** 月份标签定位：column 为网格列号（第 1 列是星期标签，故 weekIndex+2） */
export interface MonthPosition {
  label: string
  column: number
}

export function getMonthPositions(weeks: HeatmapWeek[]): MonthPosition[] {
  const positions: MonthPosition[] = []
  let lastMonth = -1

  weeks.forEach((week, weekIndex) => {
    const firstDay = week.days.find((day) => day !== null)
    if (!firstDay) return
    const month = new Date(`${firstDay.date}T00:00:00`).getMonth()
    if (month !== lastMonth) {
      positions.push({ label: MONTH_LABELS[month], column: weekIndex + 2 })
      lastMonth = month
    }
  })
  return positions
}
