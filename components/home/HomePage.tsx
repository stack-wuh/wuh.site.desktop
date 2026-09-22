'use client'

import { Button } from '../ui/Button'
import styled, { keyframes } from 'styled-components'
import { Heatmap } from './Heatmap'
import { buildHeatmapViewData } from './heatmapData'
import { useAboutActivity } from './useAboutActivity'
import { EditorPanel } from './EditorPanel'
import { useLocale } from '../../lib/i18n/context'
import { useGithubIdentity } from '../../lib/identity'

/**
 * 首页（两栏布局起为右栏默认页面；2026-09-22 升级为写作工作台）：
 * 问候语 → 综合活动热力图（节奏总览）→ 主编辑器面板（20260922 首页编辑器面板：
 * 项目/文件筛选收进面板上下文行，热力图由底部上移至问候语之下）。
 * 无返回按钮/Esc/焦点归还语义，左栏 SideMenu 常驻可见，
 * 页面互斥切换由 App Router 路由段裁决。
 */

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 20px 32px 40px;
  background: var(--background-color);
  outline: none;
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  &:focus {
    outline: none;
  }

  @media (max-width: 768px) {
    padding: 16px 16px 32px;
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
  // 已授权时问候带名（昵称优先，login 兜底）；未授权/失效回落纯问候
  const authed = identity != null && !identity.stale
  const displayName = authed && identity ? identity.name || identity.login : null

  const view = buildHeatmapViewData(data)

  return (
    <Page className="home-page">
      <Body>
        <header>
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
        </header>

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

        <EditorPanel />
      </Body>
    </Page>
  )
}
