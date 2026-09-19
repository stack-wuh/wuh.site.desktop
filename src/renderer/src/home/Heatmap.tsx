import { useMemo, useState } from 'react'
import { getMonthPositions, type HeatmapViewData } from './heatmapData'
import './heatmap.css'

/**
 * 综合活动热力图（自持组件，结构与站点 @wuh.site/components/heatmap 同构）：
 * 月份标题与 53 周列同网格轨道；格色 = level（warm 色阶走主题 token，见 heatmap.css）；
 * hover/点击出「日期 + 总量 + 分类明细」Tooltip；加载骨架屏与真实数据同轨道不跳变。
 */

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const

const ACTIVITY_LABELS: Record<string, string> = {
  visits: '浏览',
  published: '发布',
  updated: '更新',
  comments: '评论',
  guestbook: '留言',
  projectUpdates: '项目更新',
  githubContributions: 'GitHub 贡献'
}

interface TooltipCellProps {
  date: string
  count: number
  breakdown?: Record<string, number>
  activityLabel: string
  vertical: 'up' | 'down'
  horizontal: 'left' | 'center' | 'right'
}

function TooltipCell(props: TooltipCellProps): React.JSX.Element {
  const [visible, setVisible] = useState(false)
  const d = new Date(`${props.date}T00:00:00`)
  const dateLabel = `${d.getMonth() + 1} 月 ${d.getDate()} 日`
  const details = props.breakdown
    ? Object.entries(props.breakdown).filter(([, value]) => value > 0)
    : []
  const totalLabel = props.breakdown ? `总量 ${props.count}` : `${props.count} 条${props.activityLabel}`
  const accessibleDetails = details
    .map(([key, value]) => `${ACTIVITY_LABELS[key] ?? key}: ${value}`)
    .join(' · ')
  const label = [dateLabel, totalLabel, accessibleDetails].filter(Boolean).join(' · ')

  return (
    <span
      className="heatmap-cell-hit"
      tabIndex={0}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onClick={() => setVisible((current) => !current)}
      aria-label={label}
    >
      <span
        className={`heatmap-tooltip${visible ? ' is-visible' : ''}`}
        data-vertical={props.vertical}
        data-horizontal={props.horizontal}
        role="presentation"
      >
        <span className="heatmap-tooltip-date">{dateLabel}</span>
        <span className="heatmap-tooltip-total">{totalLabel}</span>
        {details.length > 0 && (
          <span className="heatmap-tooltip-details">
            {details.map(([key, value]) => (
              <span className="heatmap-tooltip-row" key={key}>
                <span className="heatmap-tooltip-label">{ACTIVITY_LABELS[key] ?? key}</span>
                <span className="heatmap-tooltip-value">{value}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  )
}

export interface HeatmapProps {
  data: HeatmapViewData | null
  loading?: boolean
  error?: string | null
  activityLabel?: string
  emptyLabel?: string
  errorLabel?: string
}

export function Heatmap({
  data,
  loading = false,
  error = null,
  activityLabel = '活动',
  emptyLabel = '暂无活动数据',
  errorLabel = '加载失败'
}: HeatmapProps): React.JSX.Element {
  const monthPositions = useMemo(
    () => (data ? getMonthPositions(data.weeks) : []),
    [data]
  )

  if (loading) {
    return (
      <div className="heatmap">
        <div className="heatmap-months" />
        <div className="heatmap-grid">
          {DAY_LABELS.map((label, row) => (
            <div className="heatmap-row" key={row}>
              <span className="heatmap-day-label">{label}</span>
              <div className="heatmap-cells">
                {Array.from({ length: 53 }, (_, col) => (
                  <span className="heatmap-cell heatmap-skeleton" key={col} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Legend />
      </div>
    )
  }

  if (error) {
    return (
      <div className="heatmap">
        <div className="heatmap-status heatmap-error" role="alert">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="heatmap">
        <div className="heatmap-status">{emptyLabel}</div>
      </div>
    )
  }

  return (
    <div className="heatmap">
      <div className="heatmap-months">
        {monthPositions.map((m) => (
          <span className="heatmap-month" key={`${m.label}-${m.column}`} style={{ gridColumn: m.column }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="heatmap-grid">
        {DAY_LABELS.map((label, rowIndex) => (
          <div className="heatmap-row" key={rowIndex}>
            <span className="heatmap-day-label">{label}</span>
            <div className="heatmap-cells">
              {data.weeks.map((week, colIndex) => {
                const day = week.days[rowIndex]
                if (!day) {
                  return <span className="heatmap-cell is-empty" key={colIndex} />
                }
                return (
                  <span className="heatmap-cell" data-level={day.level} key={colIndex}>
                    <TooltipCell
                      date={day.date}
                      count={day.count}
                      breakdown={day.breakdown}
                      activityLabel={activityLabel}
                      vertical={rowIndex === 0 ? 'down' : 'up'}
                      horizontal={
                        colIndex < 4 ? 'left' : colIndex >= data.weeks.length - 4 ? 'right' : 'center'
                      }
                    />
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <Legend />
    </div>
  )
}

function Legend(): React.JSX.Element {
  return (
    <div className="heatmap-legend">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span className="heatmap-legend-cell" data-level={level} key={level} />
      ))}
      <span>More</span>
    </div>
  )
}
