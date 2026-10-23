'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/Button'
import styled, { keyframes } from 'styled-components'
import { Heatmap } from './Heatmap'
import { buildHeatmapViewData } from './heatmapData'
import { useAboutActivity } from './useAboutActivity'
import { useLocale } from '@/lib/i18n/context'
import { useGithubIdentity } from '@/lib/identity'
import { publishEditorLiveState, useEditorLiveState } from '@/lib/editor-state'
import { useWorkspaceStore } from '@/lib/store'
import { refreshDrafts, useDrafts } from '@/lib/drafts'
import { countWords } from '@/lib/editor-info'
import { tasksStore, visibleTasks } from '@/lib/tasks'

/**
 * 首页（20261015-feature-workbench-shell task-11 任务流化）：问候语 → 综合活动
 * 热力图（首屏视觉锚点，用户裁决保留置顶）→ 任务导向卡组——继续写作（活跃文档
 * 一等入口）、草稿箱/项目计数卡、插件动态（tasks 聚合）。信息架构从「按功能分区」
 * 转向「按任务流组织」；EditorPanel 已退役（编辑器中央单挂载于 /editor）。
 * 专注模式淡出语义保留（editor-state 总线同源，Esc 退出）。
 */

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 20px 32px 48px;
  background: var(--background-color);
  outline: none;
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  &:focus {
    outline: none;
  }

  @media (max-width: 768px) {
    padding: 16px 16px 40px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Body = styled.div`
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 22px;
  color: var(--text-primary);
`

const Sub = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
`

const Card = styled.section`
  padding: 16px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  transition: background-color 0.3s ease;
`

const CardTitle = styled.h3`
  font-size: 13px;
  margin: 0 0 12px;
  color: var(--text-primary);
`

const Retry = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 8px;
`

/* 任务流卡组（task-11） */
const CardRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const FlowCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 150ms ease-out,
    background-color 150ms ease-out;

  &:hover {
    border-color: var(--primary-color);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

const FlowCardTitle = styled.span`
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
`

const FlowNum = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--primary-color);
`

const FlowRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const FlowDoc = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-primary);
`

const FlowMeta = styled.p`
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--text-muted);
`

const DynRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 12px;
  color: var(--text-secondary);
`

const DynSource = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  border: 1px solid var(--chrome-border);
  border-radius: 999px;
  padding: 0 7px;
`

const DynNum = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
`

/** 专注模式淡出壳：布局占位保留（不卸载），仅视觉退场 */
const Dimmable = styled.div<{ $dim: boolean }>`
  opacity: ${(props) => (props.$dim ? 0.05 : 1)};
  pointer-events: ${(props) => (props.$dim ? 'none' : 'auto')};
  transition: opacity var(--motion-dur-reveal, 600ms) var(--motion-ease-out-soft, ease-out);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

function greetingKey(h: number): string {
  if (h < 5) return 'home.greetNight'
  if (h < 11) return 'home.greetMorning'
  if (h < 13) return 'home.greetNoon'
  if (h < 18) return 'home.greetAfternoon'
  return 'home.greetEvening'
}

export function HomePage(): React.JSX.Element {
  const { data, loading, error, retry } = useAboutActivity()
  const { t } = useLocale()
  const identity = useGithubIdentity()
  // 专注模式：与胶囊开关同源（editor-state 总线），Esc 退出
  const live = useEditorLiveState()
  // 任务流卡组数据（task-11）
  const router = useRouter()
  const doc = useWorkspaceStore()
  const drafts = useDrafts()
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  const [recentCount, setRecentCount] = useState(0)

  const hasDoc = doc.activePath != null || doc.content != null
  const words = countWords(doc.content ?? '')
  const pluginRows = useMemo(() => {
    const bySource = new Map<string, { running: number; total: number }>()
    for (const task of visibleTasks()) {
      const row = bySource.get(task.pluginId) ?? { running: 0, total: 0 }
      row.total += 1
      if (task.status === 'in_progress') row.running += 1
      bySource.set(task.pluginId, row)
    }
    return [...bySource.entries()].sort((a, b) => b[1].running - a[1].running || a[0].localeCompare(b[0]))
  }, [/* tasks 快照经 store 订阅驱动重渲染 */])

  // 草稿数首拉（幂等；失败保留旧快照）
  useEffect(() => {
    void refreshDrafts()
  }, [])

  useEffect(() => {
    let alive = true
    void window.api
      .listRecentWorkspaces()
      .then((list) => {
        if (alive) setRecentCount(Array.isArray(list) ? list.length : 0)
      })
      .catch(() => {
        if (alive) setRecentCount(0)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!live.focusMode) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') publishEditorLiveState({ focusMode: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [live.focusMode])

  // 已授权时问候带名（昵称优先，login 兜底）；未授权/失效回落纯问候
  const authed = identity != null && !identity.stale
  const displayName = authed && identity ? identity.name || identity.login : null

  const view = buildHeatmapViewData(data)

  return (
    <Page className="home-page">
      <Body>
        <Dimmable $dim={live.focusMode} as="header">
          <Title>
            {displayName
              ? t('home.greetNamed', { greeting: t(greetingKey(new Date().getHours())), name: displayName })
              : t(greetingKey(new Date().getHours()))}
          </Title>
          <Sub>
            {data
              ? t('home.activitySummary', { count: data.total })
              : t('home.activityFallback')}
          </Sub>
        </Dimmable>

        <Dimmable $dim={live.focusMode}>
          <Card aria-label={t('home.heatmapTitle')}>
            <CardTitle>{t('home.heatmapTitle')}</CardTitle>
            <Heatmap
              data={view}
              loading={loading}
              error={error}
              activityLabel={t('home.activityLabel')}
              emptyLabel={t('home.activityEmpty')}
              errorLabel={t('home.activityError')}
            />
            {error && (
              <Retry>
                <Button size="sm" onClick={retry}>
                  {t('common.retry')}
                </Button>
              </Retry>
            )}
          </Card>
        </Dimmable>

        {/* 任务流卡组（task-11）：按任务流组织的信息架构 */}
        <Dimmable $dim={live.focusMode}>
          {hasDoc && (
            <Card data-testid="home-continue-card" style={{ marginBottom: 12 }}>
              <CardTitle>{t('home.flowContinue')}</CardTitle>
              <FlowRow>
                <FlowDoc>{doc.activePath ?? t('editor.newDraft')}</FlowDoc>
                <Button size="sm" data-testid="home-continue-open" onClick={() => void router.push('/editor')}>
                  {t('home.flowOpen')}
                </Button>
              </FlowRow>
              <FlowMeta>
                {t('focus.words', { n: words.words })} · {doc.dirty ? t('focus.unsaved') : t('common.saved')}
              </FlowMeta>
            </Card>
          )}
          <CardRow style={{ marginBottom: 12 }}>
            <FlowCard type="button" data-testid="home-drafts-card" onClick={() => void router.push('/drafts')}>
              <FlowCardTitle>{t('menu.drafts')}</FlowCardTitle>
              <FlowNum>{drafts.loaded ? drafts.drafts.length : '…'}</FlowNum>
            </FlowCard>
            <FlowCard type="button" data-testid="home-recent-card" onClick={() => void router.push('/projects')}>
              <FlowCardTitle>{t('menu.projects')}</FlowCardTitle>
              <FlowNum>{recentCount}</FlowNum>
            </FlowCard>
          </CardRow>
          <Card data-testid="home-plugins-card">
            <CardTitle>{t('home.flowPlugins')}</CardTitle>
            {pluginRows.length === 0 ? (
              <FlowMeta>{t('home.flowNoTasks')}</FlowMeta>
            ) : (
              pluginRows.map(([pluginId, row]) => (
                <DynRow key={pluginId}>
                  <DynSource>{pluginId}</DynSource>
                  <span>
                    {row.running > 0 ? t('home.flowRunning', { n: row.running }) : t('home.flowIdle')}
                  </span>
                  <DynNum>
                    {row.total} {t('home.flowTotalUnit')}
                  </DynNum>
                </DynRow>
              ))
            )}
          </Card>
        </Dimmable>
      </Body>
    </Page>
  )
}
