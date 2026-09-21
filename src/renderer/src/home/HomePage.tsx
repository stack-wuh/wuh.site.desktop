import { Button } from '../components/ui/Button'
import { Heatmap } from './Heatmap'
import { buildHeatmapViewData } from './heatmapData'
import { useAboutActivity } from './useAboutActivity'

/**
 * 首页（两栏布局起为右栏默认页面，项目门面）：
 * 不再是全屏视图——无返回按钮/Esc/焦点归还语义，左栏 SideMenu 常驻可见，
 * 页面互斥切换由 App 的 rightRoute 裁决。
 */

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
    <div className="home-page">
      <div className="home-body">
        <header className="home-hero">
          <h2 className="home-title">{greeting()}</h2>
          <p className="home-sub">
            {data ? `最近 365 天 · 共 ${data.total} 次输出 · 数据来自 wuh.site` : '输出节奏总览'}
          </p>
        </header>

        <section className="home-card" aria-label="综合活动热力图">
          <h3 className="home-card-title">综合活动热力图</h3>
          <Heatmap
            data={view}
            loading={loading}
            error={error}
            activityLabel="活动"
            emptyLabel="暂无活动数据"
            errorLabel="活动数据加载失败，请检查网络或站点服务设置"
          />
          {error && (
            <div className="home-retry">
              <Button size="sm" onClick={retry}>
                重试
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
