'use client'

/**
 * 底部 Dock（20261015-feature-workbench-shell task-6）：壳层一等停靠区，
 * 收起态细条（dockbar）↔ 展开态面板（dock-panel）互斥。
 * - 任务中心页签：胶囊「停靠」后为任务中心本体（chip 兼开关）；未停靠时
 *   dockbar 点任务中心 = 直接近入停靠态
 * - 插件页签：manifest views.area='dock' 声明制（lib/panelTabs 注册，首次
 *   上报前不出按钮），sections/rows 结构化渲染复用胶囊插件 tab 行渲染器
 * 显隐条件：展开态 = open；收起条 = docked 或存在可见插件页签（空态不占高）。
 * z 带 25（浮窗 58 之下）；Esc/点外关不收（常驻面板，收起走头部钮）。
 */
import { useSyncExternalStore } from 'react'
import { AppIcon } from '../ui/AppIcon'
import { IconChevronDown, pluginIcon } from '../icons'
import type { PluginIconName } from '@shared/plugin'
import { taskAggregate, tasksStore } from '../../lib/tasks'
import { dockStore, dockTaskCenter, setDockOpen, setDockTab, undockTaskCenter } from '../../lib/dock'
import { panelTabsStore, visiblePanelTabs, type PanelTabState } from '../../lib/panelTabs'
import { useLocale } from '../../lib/i18n/context'
import { PluginTabRowItem } from '../capsule/CapsulePanel/PluginTabRows'
import { EmptyState, EmptyTitle, TabRows, TabSection } from '../capsule/CapsulePanel/styles'
import { SectionLabel } from '../capsule/modules'
import { TaskCenterBody } from '../capsule/CapsulePanel/TaskCenterBody'
import { Bar, Body, Head, HeadEnd, Hint, IconBtn, Panel, TabBtn, TabCount, UndockBtn } from './styles'

function DockTabs(props: {
  effective: string
  onTasks: () => void
  onTab: (key: string) => void
}): React.JSX.Element {
  const { t } = useLocale()
  const pluginTabs = visiblePanelTabs('dock')
  const agg = taskAggregate()
  return (
    <>
      <TabBtn
        type="button"
        data-testid="dock-tab-tasks"
        role="tab"
        aria-selected={props.effective === 'tasks'}
        $active={props.effective === 'tasks'}
        onClick={props.onTasks}
      >
        {t('capsule.title')}
        {agg.total > 0 && (
          <TabCount>
            {agg.done}/{agg.total}
          </TabCount>
        )}
      </TabBtn>
      {pluginTabs.map((tb) => {
        const Icon = pluginIcon(tb.icon as PluginIconName)
        return (
          <TabBtn
            key={tb.key}
            type="button"
            data-testid={`dock-tab-${tb.key}`}
            role="tab"
            aria-selected={props.effective === tb.key}
            $active={props.effective === tb.key}
            onClick={() => props.onTab(tb.key)}
          >
            <AppIcon icon={Icon} size="xs" decorative />
            {tb.title}
          </TabBtn>
        )
      })}
    </>
  )
}

/** Dock 展开态当前页签：注册表页签被移除/停用时回落任务中心（派生兜底） */
function effectiveTab(tab: string, pluginTabs: PanelTabState[]): string {
  if (tab === 'tasks') return 'tasks'
  return pluginTabs.some((tb) => tb.key === tab) ? tab : 'tasks'
}

export function Dock(): React.JSX.Element | null {
  const { t } = useLocale()
  const dock = useSyncExternalStore(dockStore.subscribe, dockStore.get, dockStore.get)
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  useSyncExternalStore(panelTabsStore.subscribe, panelTabsStore.get, panelTabsStore.get)
  const pluginTabs = visiblePanelTabs('dock')
  const eff = effectiveTab(dock.tab, pluginTabs)
  // 展开态：停靠态的任务中心 或 插件页签激活（未停靠时 tasks 页签归属胶囊下拉）
  const panelVisible = dock.open && (dock.docked || eff !== 'tasks')
  // 收起条：停靠态 或 存在可见插件页签（空态不渲染，不占高）
  const barVisible = !dock.open && (dock.docked || pluginTabs.length > 0)
  if (!panelVisible && !barVisible) return null

  if (barVisible) {
    return (
      <Bar data-chrome="dock" data-testid="dockbar" role="toolbar" aria-label={t('capsule.title')}>
        <DockTabs
          effective=""
          onTasks={dockTaskCenter}
          onTab={(key) => setDockTab(key)}
        />
        <Hint>{t('dock.hint')}</Hint>
      </Bar>
    )
  }

  const effective = eff
  const activeTab = pluginTabs.find((tb) => tb.key === effective)

  return (
    <Panel data-chrome="dock" data-testid="dock-panel" aria-label={t('capsule.title')}>
      <Head>
        <DockTabs effective={effective} onTasks={() => setDockTab('tasks')} onTab={(key) => setDockTab(key)} />
        <HeadEnd>
          {dock.docked && (
            <UndockBtn type="button" data-testid="dock-undock" onClick={undockTaskCenter}>
              {t('dock.undock')}
            </UndockBtn>
          )}
          <IconBtn
            type="button"
            data-testid="dock-collapse"
            aria-label={t('dock.collapse')}
            onClick={() => setDockOpen(false)}
          >
            <AppIcon icon={IconChevronDown} size="xs" decorative />
          </IconBtn>
        </HeadEnd>
      </Head>
      <Body>
        {effective === 'tasks' ? (
          <div data-testid="dock-tasks" role="tabpanel" aria-label={t('capsule.title')}>
            {/* Dock 常驻：行内跳转不收 Dock（onClose 空实现） */}
            <TaskCenterBody onClose={() => undefined} />
          </div>
        ) : (
          activeTab && (
            <div data-testid={`dock-tabpanel-${activeTab.key}`} role="tabpanel" aria-label={activeTab.title}>
              {activeTab.sections.length === 0 ? (
                <EmptyState data-testid="dock-tab-empty">
                  <EmptyTitle>{t('capsule.tabEmpty')}</EmptyTitle>
                </EmptyState>
              ) : (
                activeTab.sections.map((sec, i) => (
                  <TabSection key={`${activeTab.key}:${i}`} aria-label={sec.title}>
                    {sec.title && <SectionLabel>{sec.title}</SectionLabel>}
                    <TabRows>
                      {sec.rows.map((row, j) => (
                        <PluginTabRowItem key={j} row={row} pluginId={activeTab.pluginId} onNavigate={() => undefined} />
                      ))}
                    </TabRows>
                  </TabSection>
                ))
              )}
            </div>
          )
        )}
      </Body>
    </Panel>
  )
}
