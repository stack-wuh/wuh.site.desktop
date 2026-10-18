'use client'

/**
 * 控制中心面板（20261017-feature-app-layout-workbench D4 重构，原任务中心面板壳
 * 20260926 拆分）：胶囊展开态 = 470px 浮笺卡——磁贴网格 4×2（即时渲染/大纲跟随/
 * 专注/图床/主题/外观/语言/查找替换，见 ./ControlSections）+ 功能分区（任务时间线
 * / GIT / 排版 / 编辑器 / 插件模块 / 插件 tab 追加分区）。挂点契约不变：贴 chip
 * 下缘向下弹出、z70、data-capsule-panel 稳定判定；Esc/点外关归 Capsule.tsx。
 * 一切编辑指令经 editor-commands/editor-state 总线发布，本面板不触碰编辑器实例；
 * 插件 capsule 贡献契约不变（modules tiles + tabs 渲染为追加分区）。
 * 对外契约不变：`components/capsule/CapsulePanel` 具名导出 CapsulePanel。
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '../../ui/AppIcon'
import { pluginIcon } from '../../icons'
import type { PluginIconName } from '@shared/plugin'
import { taskAggregate, tasksStore } from '../../../lib/tasks'
import { capsuleStore, visibleCapsuleModules, visibleCapsuleTabs, type CapsuleModuleState } from '../../../lib/capsule'
import { useLocale } from '../../../lib/i18n/context'
import { EditorSection } from '../sections/EditorSection'
import { SectionLabel } from '../modules'
import { ModuleBig, ModuleCard, ModuleGrid, ModuleHead, ModuleIcon, ModulePanel, ModuleSub } from '../modules'
import { GitSection, TilesGrid, TypesetSection } from './ControlSections'
import { Pop, PopHead, PopCount, Sections, Sect, SectHead, MonoMeta, TabRows, PluginNote, ToneDot } from './styles'
import { PluginTabRowItem } from './PluginTabRows'
import { TaskCenterBody } from './TaskCenterBody'

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
  const agg = taskAggregate()
  const modules = visibleCapsuleModules()
  const pluginTabs = visibleCapsuleTabs()
  // 头部右侧 mono：工作区 · 分支（面板随开合挂载，每次打开拉取一次）
  const [headMeta, setHeadMeta] = useState<{ ws: string | null; branch: string | null }>({ ws: null, branch: null })

  useEffect(() => {
    let alive = true
    void window.api
      ?.getWorkspace()
      ?.then((ws) => {
        if (alive) setHeadMeta((m) => ({ ...m, ws: ws?.name ?? null }))
      })
      .catch(() => {})
    void window.api
      ?.gitStatus()
      ?.then((g) => {
        if (alive) setHeadMeta((m) => ({ ...m, branch: g.branch }))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <Pop
      role="dialog"
      aria-label={t('capsule.ccTitle')}
      data-testid="capsule-panel"
      /* 稳定 data 属性：浮窗层 Esc 让位判定（对齐 data-dialog-overlay 先例） */
      data-capsule-panel="true"
      onClick={(e) => e.stopPropagation()}
    >
      <PopHead>
        <strong>{t('capsule.ccTitle')}</strong>
        <PopCount>
          {headMeta.ws ?? '—'}
          {headMeta.branch ? ` · ${headMeta.branch}` : ''}
        </PopCount>
      </PopHead>

      <TilesGrid />

      <Sections>
        <Sect aria-label={t('capsule.sectTasks')}>
          <SectHead>
            {t('capsule.sectTasks')}
            <MonoMeta>
              {agg.done}/{agg.total}
            </MonoMeta>
          </SectHead>
          <TaskCenterBody onClose={props.onClose} />
        </Sect>

        <GitSection />

        <TypesetSection />

        <EditorSection />

        <Sect aria-label={t('capsule.pluginsSection')}>
          <SectHead>
            {t('capsule.pluginsSection')}
            <MonoMeta>CAPSULE</MonoMeta>
          </SectHead>
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
        </Sect>

        {/* 插件 capsule tabs → 追加分区（D4 假定 a：声明制贡献契约不变，仅渲染形态） */}
        {pluginTabs.map((pt) => (
          <Sect key={pt.key} aria-label={pt.title}>
            <SectHead>
              {pt.title}
              <MonoMeta>{pt.pluginId}</MonoMeta>
            </SectHead>
            {pt.sections.length === 0 ? (
              <PluginNote>{t('capsule.tabEmpty')}</PluginNote>
            ) : (
              pt.sections.map((sec, i) => (
                <div key={`${pt.key}:${i}`} aria-label={sec.title}>
                  {sec.title && <SectionLabel>{sec.title}</SectionLabel>}
                  <TabRows>
                    {sec.rows.map((row, j) => (
                      <PluginTabRowItem key={j} row={row} pluginId={pt.pluginId} onNavigate={props.onClose} />
                    ))}
                  </TabRows>
                </div>
              ))
            )}
          </Sect>
        ))}
      </Sections>
    </Pop>
  )
}
