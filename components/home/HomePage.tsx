'use client'

import { Button } from '../ui/Button'
import styled, { keyframes } from 'styled-components'
import { Heatmap } from './Heatmap'
import { buildHeatmapViewData } from './heatmapData'
import { useAboutActivity } from './useAboutActivity'

/**
 * 首页（两栏布局起为右栏默认页面，项目门面）：
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

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function HomePage(): React.JSX.Element {
  const { data, loading, error, retry } = useAboutActivity()

  const view = buildHeatmapViewData(data)

  return (
    <Page className="home-page">
      <Body>
        <header>
          <Title>{greeting()}</Title>
          <Sub>
            {data ? `最近 365 天 · 共 ${data.total} 次输出 · 数据来自 wuh.site` : '输出节奏总览'}
          </Sub>
        </header>

        <Card aria-label="综合活动热力图">
          <CardTitle>综合活动热力图</CardTitle>
          <Heatmap
            data={view}
            loading={loading}
            error={error}
            activityLabel="活动"
            emptyLabel="暂无活动数据"
            errorLabel="活动数据加载失败，请检查网络或站点服务设置"
          />
          {error && (
            <Retry>
              <Button size="sm" onClick={retry}>
                重试
              </Button>
            </Retry>
          )}
        </Card>
      </Body>
    </Page>
  )
}
