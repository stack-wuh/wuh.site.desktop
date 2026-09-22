'use client'

import { Button } from '../ui/Button'
import styled, { keyframes } from 'styled-components'
import { Heatmap } from './Heatmap'
import { buildHeatmapViewData } from './heatmapData'
import { useAboutActivity } from './useAboutActivity'
import { ProjectSection } from './ProjectSection'
import { useLocale } from '../../lib/i18n/context'

/**
 * 首页（两栏布局起为右栏默认页面；2026-09-21 定位升级为「新建博客」项目入口）：
 * 上方项目区块（打开本地目录 / clone / 最近项目），下方综合活动热力图保持不变。
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

  const view = buildHeatmapViewData(data)

  return (
    <Page className="home-page">
      <Body>
        <header>
          <Title>{t(greetingKey(new Date().getHours()))}</Title>
          <Sub>
            {data
              ? t('home.activitySummary', { count: data.total })
              : t('home.activityFallback')}
          </Sub>
        </header>

        <ProjectSection />

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
      </Body>
    </Page>
  )
}
