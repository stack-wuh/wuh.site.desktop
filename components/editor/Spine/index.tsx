'use client'

/**
 * 书口刻度（素笺手记 20261014-feature-editor-paper-rebuild）：/editor 右缘大纲柱——
 * 旧书页缘的索引墨口。点集 = parseOutline 密度自适应（spineTicks cap 24，纯逻辑在
 * lib/editor-info 与胶囊大纲同源）；当前章由 editor-state 总线 activeHeading 驱动，
 * 距离档位（spineDistance）定墨色层次；点击发布既有 scrollToHeading 命令（复用跳章链，
 * 零字节改写，INV-1）；底端字数/读时复用胶囊同源 i18n 键（editor.wordStat/readingTime）。
 * 纯显示层：不接触编辑器实例、不写 workspaceStore；无大纲（未出标题）整柱隐藏。
 */
import { useMemo, useState } from 'react'
import { useWorkspaceStore } from '@/lib/store'
import { publishEditorCommand } from '@/lib/editor-commands'
import {
  countWords,
  estimateReadingMinutes,
  parseOutline,
  spineDistance,
  spineTicks
} from '@/lib/editor-info'
import { useEditorLiveState } from '@/lib/editor-state'
import { useLocale } from '@/lib/i18n/context'
import { Meta, Rail, Tick, TickLabel, TickPoint, Wrap } from './styles'

export function Spine(): React.JSX.Element | null {
  const doc = useWorkspaceStore()
  const live = useEditorLiveState()
  const { t } = useLocale()
  const [bloomIndex, setBloomIndex] = useState<number | null>(null)

  const outline = useMemo(() => parseOutline(doc.content ?? ''), [doc.content])
  const ticks = useMemo(() => spineTicks(outline), [outline])
  const words = useMemo(() => countWords(doc.content ?? ''), [doc.content])

  if (ticks.length === 0) return null

  const last = ticks.length - 1
  const minutes = estimateReadingMinutes(words.words)

  return (
    <Wrap aria-label={t('editor.outline')} data-testid="editor-spine">
      <Rail>
        {ticks.map((tick, i) => {
          const dist = spineDistance(live.activeHeading, tick.index)
          const top = last === 0 ? 0 : (i / last) * 100
          return (
            <Tick
              key={tick.index}
              $top={top}
              aria-label={tick.text}
              aria-current={dist === 0 ? 'true' : undefined}
              title={tick.text}
              onClick={() => {
                setBloomIndex(tick.index)
                publishEditorCommand({ kind: 'scrollToHeading', index: tick.index })
              }}
            >
              <TickLabel>{tick.text}</TickLabel>
              <TickPoint
                $dist={dist}
                $minor={tick.level > 2}
                $bloom={bloomIndex === tick.index}
                onAnimationEnd={() => setBloomIndex((prev) => (prev === tick.index ? null : prev))}
              />
            </Tick>
          )
        })}
      </Rail>
      <Meta aria-hidden="true">
        <span>{t('editor.wordStat', { words: words.words, chars: words.chars })}</span>
        <span>{t('editor.readingTime', { minutes })}</span>
      </Meta>
    </Wrap>
  )
}
