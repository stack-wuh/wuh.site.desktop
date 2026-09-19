import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../store'
import { Button } from '../components/ui/Button'
import { AppIcon } from '../components/ui/AppIcon'
import { IconChevronLeft, IconFile, IconFolderOpen } from '../components/icons'
import { Heatmap } from './Heatmap'
import { buildHeatmapViewData } from './heatmapData'
import { useAboutActivity } from './useAboutActivity'

/**
 * 首页（第三个全屏视图，renderer-shell-routing 约定）：
 * 盖住 ActivityBar/侧栏/主区，保留标题栏；显式返回入口 + Esc（App 层处理）+
 * 焦点管理（mount 时移入容器、关闭由 App 归还触发元素）。
 */

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function HomePage(props: {
  onBack: () => void
  onOpenWorkspace: () => void
}): React.JSX.Element {
  const pageRef = useRef<HTMLDivElement>(null)
  const { activePath } = useWorkspaceStore()
  const { data, loading, error, retry } = useAboutActivity()

  // 打开时焦点移入页面容器（与 SettingsPage 同 interaction.md 约定）
  useEffect(() => {
    pageRef.current?.focus()
  }, [])

  const view = buildHeatmapViewData(data)
  const activeName = activePath?.split('/').pop()

  return (
    <div className="home-page" ref={pageRef} tabIndex={-1}>
      <div className="home-topbar">
        <Button variant="ghost" onClick={props.onBack} aria-label="返回编辑器">
          <AppIcon icon={IconChevronLeft} size="sm" />
          返回
        </Button>
      </div>
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

        <div className="home-actions">
          <Button variant="primary" onClick={props.onOpenWorkspace}>
            <AppIcon icon={IconFolderOpen} size="sm" />
            打开文件夹
          </Button>
          {activePath && activeName && (
            <Button onClick={props.onBack}>
              <AppIcon icon={IconFile} size="sm" />
              继续编辑 {activeName}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
