'use client'

import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { getMonthPositions, type HeatmapViewData } from './heatmapData'

/**
 * 综合活动热力图（自持组件，结构与站点 @wuh.site/components/heatmap 同构）：
 * 月份标题与 53 周列同网格轨道；格色 = level（warm 色阶走主题 token）；
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

const Root = styled.div`
  --heatmap-gap: clamp(1px, 0.35vw, 3px);
  --heatmap-columns: 28px repeat(53, minmax(0, 1fr));

  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
`

const Months = styled.div`
  display: grid;
  grid-template-columns: var(--heatmap-columns);
  gap: var(--heatmap-gap);
  min-width: 0;
  height: 16px;
  margin-bottom: 2px;
`

const Month = styled.span`
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
`

const Grid = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--heatmap-gap);
  padding-block: 4px;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: var(--heatmap-columns);
  align-items: center;
  gap: var(--heatmap-gap);
  min-width: 0;
`

const DayLabel = styled.span`
  font-size: 10px;
  color: var(--text-muted);
  text-align: right;
  line-height: 1;
`

const Cells = styled.div`
  display: grid;
  grid-column: 2 / -1;
  grid-template-columns: repeat(53, minmax(0, 1fr));
  gap: var(--heatmap-gap);
  min-width: 0;
`

const cellLevel = `
  &[data-level='0'] {
    background: color-mix(in oklab, var(--text-muted) 14%, transparent);
  }

  &[data-level='1'] {
    background: color-mix(in oklab, var(--accent-color) 30%, var(--background-color));
  }

  &[data-level='2'] {
    background: color-mix(in oklab, var(--accent-color) 55%, var(--background-color));
  }

  &[data-level='3'] {
    background: color-mix(in oklab, var(--accent-color) 75%, var(--background-color));
  }
`

const Cell = styled.span`
  width: 100%;
  min-width: 0;
  aspect-ratio: 1;
  border-radius: clamp(1px, 0.2vw, 2px);
  background: var(--accent-color);
  ${cellLevel}

  &.is-empty {
    background: transparent;
  }

  &.is-skeleton {
    background: color-mix(in oklab, var(--text-muted) 12%, transparent);
  }
`

/* Tooltip 载体：撑满格子，tooltip 绝对定位于其上 */
const CellHit = styled.span`
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;

  &:focus-visible {
    outline: 1px solid var(--accent-color);
    outline-offset: 1px;
    border-radius: 2px;
  }
`

const Tooltip = styled.span<{ $visible: boolean; $vertical: 'up' | 'down'; $horizontal: 'left' | 'center' | 'right' }>`
  position: absolute;
  box-sizing: border-box;
  width: clamp(190px, 22vw, 240px);
  max-width: calc(100vw - 32px);
  background: var(--text-primary);
  color: var(--background-color);
  padding: 12px;
  border-radius: 4px;
  white-space: normal;
  pointer-events: none;
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  z-index: 10;
  transition: opacity 0.15s ease-out;

  ${(props) => (props.$vertical === 'down' ? 'top: calc(100% + 6px);' : 'bottom: calc(100% + 6px);')}
  ${(props) =>
    props.$horizontal === 'left'
      ? 'left: 0;'
      : props.$horizontal === 'right'
        ? 'right: 0;'
        : 'left: 50%; transform: translateX(-50%);'}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const TooltipDate = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
`

const TooltipTotal = styled.span`
  display: block;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
`

const TooltipDetails = styled.span`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in oklab, currentColor 22%, transparent);
`

const TooltipRow = styled.span`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  font-size: 12px;
  line-height: 1.5;
`

const TooltipLabel = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`

const TooltipValue = styled.span`
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const LegendBox = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted);
  padding-left: 32px;
`

const LegendCell = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: var(--accent-color);
  ${cellLevel}
`

const Status = styled.div<{ $error?: boolean }>`
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: ${(props) => (props.$error ? 'var(--danger-color)' : 'var(--text-muted)')};
`

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
    <CellHit
      tabIndex={0}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onClick={() => setVisible((current) => !current)}
      aria-label={label}
    >
      <Tooltip
        $visible={visible}
        $vertical={props.vertical}
        $horizontal={props.horizontal}
        role="presentation"
      >
        <TooltipDate>{dateLabel}</TooltipDate>
        <TooltipTotal>{totalLabel}</TooltipTotal>
        {details.length > 0 && (
          <TooltipDetails>
            {details.map(([key, value]) => (
              <TooltipRow key={key}>
                <TooltipLabel>{ACTIVITY_LABELS[key] ?? key}</TooltipLabel>
                <TooltipValue>{value}</TooltipValue>
              </TooltipRow>
            ))}
          </TooltipDetails>
        )}
      </Tooltip>
    </CellHit>
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
      <Root>
        <Months />
        <Grid>
          {DAY_LABELS.map((label, row) => (
            <Row key={row}>
              <DayLabel>{label}</DayLabel>
              <Cells>
                {Array.from({ length: 53 }, (_, col) => (
                  <Cell className="is-skeleton" key={col} />
                ))}
              </Cells>
            </Row>
          ))}
        </Grid>
        <Legend />
      </Root>
    )
  }

  if (error) {
    return (
      <Root>
        <Status $error role="alert">
          {error}
        </Status>
      </Root>
    )
  }

  if (!data) {
    return (
      <Root>
        <Status>{emptyLabel}</Status>
      </Root>
    )
  }

  return (
    <Root>
      <Months>
        {monthPositions.map((m) => (
          <Month key={`${m.label}-${m.column}`} style={{ gridColumn: m.column }}>
            {m.label}
          </Month>
        ))}
      </Months>
      <Grid>
        {DAY_LABELS.map((label, rowIndex) => (
          <Row key={rowIndex}>
            <DayLabel>{label}</DayLabel>
            <Cells>
              {data.weeks.map((week, colIndex) => {
                const day = week.days[rowIndex]
                if (!day) {
                  return <Cell className="is-empty" key={colIndex} />
                }
                return (
                  <Cell data-level={day.level} key={colIndex}>
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
                  </Cell>
                )
              })}
            </Cells>
          </Row>
        ))}
      </Grid>
      <Legend />
    </Root>
  )
}

function Legend(): React.JSX.Element {
  return (
    <LegendBox>
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <LegendCell data-level={level} key={level} />
      ))}
      <span>More</span>
    </LegendBox>
  )
}
