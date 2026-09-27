'use client'

/**
 * 任务中心面板壳（拆分自 CapsulePanel 单文件，20260926-refactor-mega-component-split）：
 * 面板骨架 + 双 tab 切换 + 任务筛选/时间线编排 + 模块 tab tiles；时间线行见
 * ./TaskTimeline，插件 tab 行见 ./PluginTabRows，面板级样式原子见 ./styles。
 * 对外契约不变：`components/capsule/CapsulePanel` 具名导出 CapsulePanel。
 */
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { AppIcon } from '../../ui/AppIcon'
import { pluginIcon } from '../../icons'
import type { PluginIconName } from '@shared/plugin'
import {
  taskAggregate,
  tasksStore,
  visibleTasks,
  removeTask
} from '../../../lib/tasks'
import {
  capsuleStore,
  visibleCapsuleModules,
  visibleCapsuleTabs,
  type CapsuleModuleState
} from '../../../lib/capsule'
import { useLocale } from '../../../lib/i18n/context'
import { EditorSection } from '../sections/EditorSection'
import { CenterSection, ModuleBig, ModuleCard, ModuleGrid, ModuleHead, ModuleIcon, ModulePanel, ModuleSub, SectionHint, SectionLabel } from '../modules'
import {
  Pop,
  PopHead,
  PopCount,
  HeadBar,
  HeadBarFill,
  TabRow,
  Tab,
  TabSection,
  TabRows,
  FilterRow,
  FilterChip,
  PluginPill,
  Timeline,
  DoneHead,
  DoneLabel,
  ClearBtn,
  EmptyState,
  EmptyTitle,
  EmptyHint,
  PluginNote,
  ToneDot
} from './styles'
import { TaskRow } from './TaskTimeline'
import { PluginTabRowItem } from './PluginTabRows'

type TaskTab = 'tasks' | 'modules'
type StatusFilter = 'all' | 'active' | 'done'
/** 插件 tab 的选中值 = lib/capsule 注册表 key（`plugin:<pid>:<tid>`）；tabs 消失时回落 tasks */
type PanelTab = TaskTab | string

/** 插件贡献模块 tile：宿主按模板白名单渲染，数据全部来自单向上报快照 */
function CapsuleModuleTile(props: { mod: CapsuleModuleState; onNavigate: () => void }): React.JSX.Element {
  const { mod } = props
  const router = useRouter()
  const { t } = useLocale()
  const IconComp = pluginIcon(mod.icon as PluginIconName)
  const inner = (
    <>
      <ModuleHead>
        <ModuleIcon>
          <AppIcon icon={IconComp} size="xs" decorative />
        </ModuleIcon>
        {mod.title}
      </ModuleHead>
      {mod.template === 'count' ? (
        <ModuleBig>
          {mod.value ?? 0}
          {mod.label && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{mod.label}</span>}
        </ModuleBig>
      ) : (
        <ModuleBig style={{ fontSize: 12.5 }}>
          {mod.tone && mod.tone !== 'default' && <ToneDot $tone={mod.tone} />}
          <span className="truncate">{mod.text ?? '—'}</span>
        </ModuleBig>
      )}
      {mod.detail && <ModuleSub>{mod.detail}</ModuleSub>}
    </>
  )
  if (mod.viewId) {
    return (
      <ModuleCard
        $span2
        type="button"
        className="plugin-tile"
        title={t('capsule.openPluginView')}
        onClick={() => {
          router.push(`/plugin/${mod.pluginId}/${mod.viewId}`)
          props.onNavigate()
        }}
      >
        {inner}
        <span style={{ position: 'absolute', right: 10, top: 9, fontSize: 10, color: 'var(--text-muted)' }}>›</span>
      </ModuleCard>
    )
  }
  return (
    <ModulePanel $span2 className="plugin-tile" role="group" aria-label={mod.title}>
      {inner}
    </ModulePanel>
  )
}

export function CapsulePanel(props: { onClose: () => void }): React.JSX.Element {
  const { t } = useLocale()
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  useSyncExternalStore(capsuleStore.subscribe, capsuleStore.get, capsuleStore.get)
  const [tab, setTab] = useState<PanelTab>('tasks')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [pluginFilter, setPluginFilter] = useState<string | null>(null)
  const tasks = visibleTasks()
  const agg = taskAggregate()
  const modules = visibleCapsuleModules()
  const pluginTabs = visibleCapsuleTabs()
  // 插件 tab key = 注册表 key；被移除/停用时回落 tasks（派生兜底，无需 effect）
  const activePlugin = tab.startsWith('plugin:') ? pluginTabs.find((t) => t.key === tab) : undefined
  const effectiveTab: 'tasks' | 'modules' | string = activePlugin ? tab : tab === 'modules' ? 'modules' : 'tasks'
  const now = Date.now()

  const sourceIds = [...new Set(tasks.map((task) => task.pluginId))].sort()
  const filtered = tasks
    .filter((task) => (pluginFilter ? task.pluginId === pluginFilter : true))
    .filter((task) =>
      filter === 'all' ? true : filter === 'done' ? task.status === 'done' : task.status !== 'done'
    )
  const running = filtered
    .filter((task) => task.status === 'in_progress')
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const pending = filtered
    .filter((task) => task.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
  const doneList = filtered
    .filter((task) => task.status === 'done')
    .sort((a, b) => (b.doneAt ?? b.updatedAt) - (a.doneAt ?? a.updatedAt))

  // 清空已完成 = 壳层唯一允许的写操作：remove 隐藏条目，不改任务状态
  const clearDone = (): void => {
    for (const task of tasks) {
      if (task.status === 'done') removeTask(task.pluginId, task.id)
    }
  }

  return (
    <Pop role="dialog" aria-label={t('capsule.title')} data-testid="capsule-panel" onClick={(e) => e.stopPropagation()}>
      <PopHead>
        <strong>{t('capsule.title')}</strong>
        <PopCount>
          {agg.done}/{agg.total}
        </PopCount>
      </PopHead>
      <HeadBar
        role="progressbar"
        aria-label={t('capsule.tasks', { done: agg.done, total: agg.total })}
        aria-valuemin={0}
        aria-valuemax={agg.total}
        aria-valuenow={agg.done}
      >
        <HeadBarFill $pct={agg.total > 0 ? (agg.done / agg.total) * 100 : 0} $allDone={agg.total > 0 && agg.done === agg.total} />
      </HeadBar>

      <TabRow role="tablist" aria-label={t('capsule.title')}>
        <Tab
          type="button"
          role="tab"
          id="capsule-tab-tasks"
          aria-selected={effectiveTab === 'tasks'}
          aria-controls="capsule-tabpanel-tasks"
          $active={effectiveTab === 'tasks'}
          onClick={() => setTab('tasks')}
        >
          {t('capsule.tabTasks')}
        </Tab>
        <Tab
          type="button"
          role="tab"
          id="capsule-tab-modules"
          aria-selected={effectiveTab === 'modules'}
          aria-controls="capsule-tabpanel-modules"
          $active={effectiveTab === 'modules'}
          onClick={() => setTab('modules')}
        >
          {t('capsule.tabModules')}
        </Tab>
        {pluginTabs.map((pt) => {
          const Icon = pluginIcon(pt.icon as PluginIconName)
          return (
            <Tab
              key={pt.key}
              type="button"
              role="tab"
              id={`capsule-tab-${pt.key}`}
              aria-selected={effectiveTab === pt.key}
              aria-controls={`capsule-tabpanel-${pt.key}`}
              $active={effectiveTab === pt.key}
              onClick={() => setTab(pt.key)}
            >
              <AppIcon icon={Icon} size="xs" decorative />
              {pt.title}
            </Tab>
          )
        })}
      </TabRow>

      {effectiveTab === 'tasks' ? (
        <div id="capsule-tabpanel-tasks" role="tabpanel" aria-labelledby="capsule-tab-tasks">
          <FilterRow>
            <FilterChip type="button" aria-pressed={filter === 'all'} $on={filter === 'all'} onClick={() => setFilter('all')}>
              {t('capsule.filterAll')}
            </FilterChip>
            <FilterChip
              type="button"
              aria-pressed={filter === 'active'}
              $on={filter === 'active'}
              onClick={() => setFilter('active')}
            >
              {t('capsule.filterActive')}
            </FilterChip>
            <FilterChip type="button" aria-pressed={filter === 'done'} $on={filter === 'done'} onClick={() => setFilter('done')}>
              {t('capsule.filterDone')}
            </FilterChip>
            {sourceIds.length >= 2 &&
              sourceIds.map((id) => (
                <PluginPill
                  key={id}
                  type="button"
                  aria-pressed={pluginFilter === id}
                  $on={pluginFilter === id}
                  onClick={() => setPluginFilter((cur) => (cur === id ? null : id))}
                >
                  {id}
                </PluginPill>
              ))}
          </FilterRow>

          {agg.total === 0 ? (
            <EmptyState data-testid="capsule-empty">
              <EmptyTitle>{t('capsule.emptyTitle')}</EmptyTitle>
              <EmptyHint>{t('capsule.emptyHint')}</EmptyHint>
            </EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState data-testid="capsule-nomatch">
              <EmptyTitle>{t('capsule.noMatch')}</EmptyTitle>
            </EmptyState>
          ) : (
            <Timeline data-testid="capsule-timeline">
              {running.map((task) => (
                <TaskRow key={task.key} task={task} now={now} onClose={props.onClose} />
              ))}
              {pending.map((task) => (
                <TaskRow key={task.key} task={task} now={now} onClose={props.onClose} />
              ))}
              {doneList.length > 0 && (
                <DoneHead>
                  <DoneLabel>
                    {t('capsule.recentDone')} · {doneList.length}
                  </DoneLabel>
                  <ClearBtn type="button" data-testid="capsule-clear-done" onClick={clearDone}>
                    {t('capsule.clearDone')}
                  </ClearBtn>
                </DoneHead>
              )}
              {doneList.map((task) => (
                <TaskRow key={task.key} task={task} now={now} onClose={props.onClose} />
              ))}
            </Timeline>
          )}
        </div>
      ) : effectiveTab === 'modules' ? (
        <div id="capsule-tabpanel-modules" role="tabpanel" aria-labelledby="capsule-tab-modules">
          <EditorSection />
          <CenterSection aria-label={t('capsule.pluginsSection')}>
            <SectionLabel>
              {t('capsule.pluginsSection')}
              <SectionHint>CAPSULE</SectionHint>
            </SectionLabel>
            {modules.length === 0 ? (
              <PluginNote>{t('capsule.noPlugins')}</PluginNote>
            ) : (
              <ModuleGrid>
                {modules.map((mod) => (
                  <CapsuleModuleTile key={mod.key} mod={mod} onNavigate={props.onClose} />
                ))}
              </ModuleGrid>
            )}
            <PluginNote>{t('capsule.pluginNote')}</PluginNote>
          </CenterSection>
        </div>
      ) : (
        activePlugin && (
          <div
            id={`capsule-tabpanel-${activePlugin.key}`}
            role="tabpanel"
            aria-labelledby={`capsule-tab-${activePlugin.key}`}
          >
            {activePlugin.sections.length === 0 ? (
              <EmptyState data-testid="capsule-tab-empty">
                <EmptyTitle>{t('capsule.tabEmpty')}</EmptyTitle>
              </EmptyState>
            ) : (
              activePlugin.sections.map((sec, i) => (
                <TabSection key={`${activePlugin.key}:${i}`} aria-label={sec.title}>
                  {sec.title && (
                    <SectionLabel>
                      {sec.title}
                      <SectionHint>{activePlugin.title.toUpperCase()}</SectionHint>
                    </SectionLabel>
                  )}
                  <TabRows>
                    {sec.rows.map((row, j) => (
                      <PluginTabRowItem key={j} row={row} pluginId={activePlugin.pluginId} onNavigate={props.onClose} />
                    ))}
                  </TabRows>
                </TabSection>
              ))
            )}
          </div>
        )
      )}
    </Pop>
  )
}
