'use client'

/**
 * 壳层胶囊控制中心面板（20260923-feature-capsule-control-center 三区重构）：
 * 任务区（现状行式保留 + 状态环图例）→ 编辑器模块区（EditorSection 模块卡）→
 * 插件模块区（capsule 贡献点 tiles：声明制槽位 + 单向上报数据，宿主按
 * count/status 白名单模板渲染，插件帧不触 DOM）。贴胶囊**向下**弹出，
 * Esc/点外关由胶囊侧统一处理，面板内点击不冒泡。
 */
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import styled, { keyframes } from 'styled-components'
import { AppIcon } from '../ui/AppIcon'
import { IconCheck } from '../icons'
import { pluginIcon } from '../icons'
import type { PluginIconName } from '@shared/plugin'
import { taskAggregate, tasksStore, visibleTasks, type TaskState, type TaskStatus } from '../../lib/tasks'
import { capsuleStore, visibleCapsuleModules, type CapsuleModuleState } from '../../lib/capsule'
import { useLocale } from '../../lib/i18n/context'
import { EditorSection } from './sections/EditorSection'
import { CenterSection, ModuleBig, ModuleCard, ModuleGrid, ModuleHead, ModuleIcon, ModulePanel, ModuleSub, SectionHint, SectionLabel } from './modules'

const Pop = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 70;
  pointer-events: auto;
  min-width: 300px;
  max-width: 380px;
  max-height: 480px;
  overflow-y: auto;
  padding: 6px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
`

const PopHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--chrome-border);

  & > strong {
    font-size: 13px;
    color: var(--text-primary);
  }
`

const PopCount = styled.span`
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const PopGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
`

const RowBase = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 10px;
  border-radius: var(--border-radius-sm);
  text-align: left;
`

const Row = styled(RowBase)`
  color: var(--text-primary);
`

const RowButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 10px;
  background: transparent;
  border: none;
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: background-color 200ms ease-out;

  &:hover {
    background: var(--chrome-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const RowBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
`

const RowTitle = styled.span`
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowDetail = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RowHint = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--primary-color);
  flex-shrink: 0;
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

/* pending 空心点 / in_progress 环形动效 / done 对勾（reduced-motion 一律静态） */
const StatusMark = styled.span<{ $status: TaskStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;

  ${({ $status }) => ($status === 'done' ? 'color: var(--success-color);' : '')}

  ${({ $status }) =>
    $status === 'pending'
      ? `
    &::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1.5px solid var(--text-muted);
      box-sizing: border-box;
    }
  `
      : ''
  }

  ${({ $status }) =>
    $status === 'in_progress'
      ? `
    &::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1.5px solid var(--chrome-border);
      border-top-color: var(--primary-color);
      box-sizing: border-box;
      animation: ${spin} 800ms linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      &::before {
        animation: none;
        border-color: var(--primary-color);
        opacity: 0.55;
      }
    }
  `
      : ''
  }
`

const Legend = styled.div`
  display: flex;
  gap: 14px;
  padding: 4px 10px 2px;
  flex-wrap: wrap;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
`

const LegendDot = styled.span<{ $kind: 'idle' | 'active' | 'done' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  ${({ $kind }) =>
    $kind === 'idle'
      ? 'border: 1.5px solid var(--text-muted);'
      : ''}
  ${({ $kind }) =>
    $kind === 'active'
      ? `
    width: 10px;
    height: 10px;
    border: 2px solid var(--chrome-border);
    border-top-color: var(--primary-color);
  `
      : ''}
  ${({ $kind }) => ($kind === 'done' ? 'border: none; background: var(--success-color);' : '')}
`

const PluginNote = styled.div`
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 10px 2px;
  font-family: var(--font-mono);
`

const ToneDot = styled.span<{ $tone: NonNullable<CapsuleModuleState['tone']> }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  ${({ $tone }) =>
    $tone === 'primary'
      ? 'background: var(--primary-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'success'
      ? 'background: var(--success-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'warning'
      ? 'background: var(--warning-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'default'
      ? 'background: var(--text-muted);'
      : ''}
`

function TaskRow(props: { task: TaskState; onNavigate: () => void }): React.JSX.Element {
  const { task, onNavigate } = props
  const router = useRouter()
  const inner = (
    <>
      <StatusMark $status={task.status} aria-hidden="true">
        {task.status === 'done' && <AppIcon icon={IconCheck} size="xs" />}
      </StatusMark>
      <RowBody>
        <RowTitle>{task.title}</RowTitle>
        {task.detail && <RowDetail>{task.detail}</RowDetail>}
        {task.progress && (
          <RowDetail>
            {task.progress.current}/{task.progress.total}
          </RowDetail>
        )}
      </RowBody>
      {task.viewId && <RowHint>查看 ›</RowHint>}
    </>
  )
  if (task.viewId) {
    return (
      <RowButton
        type="button"
        data-testid="task-row-link"
        onClick={() => {
          router.push(`/plugin/${task.pluginId}/${task.viewId}`)
          onNavigate()
        }}
      >
        {inner}
      </RowButton>
    )
  }
  return <Row>{inner}</Row>
}

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
  const tasks = visibleTasks()
  const agg = taskAggregate()
  const modules = visibleCapsuleModules()

  const groups: { pluginId: string; tasks: TaskState[] }[] = []
  for (const task of tasks) {
    const last = groups[groups.length - 1]
    if (last && last.pluginId === task.pluginId) last.tasks.push(task)
    else groups.push({ pluginId: task.pluginId, tasks: [task] })
  }

  return (
    <Pop role="dialog" aria-label={t('capsule.title')} data-testid="capsule-panel" onClick={(e) => e.stopPropagation()}>
      <PopHead>
        <strong>{t('capsule.title')}</strong>
        <PopCount>
          {agg.done}/{agg.total}
        </PopCount>
      </PopHead>

      {/* 任务区：插件分组行式（现状保留） */}
      <CenterSection aria-label={t('capsule.tasksSection')}>
        <SectionLabel>
          {t('capsule.tasksSection')}
          <SectionHint>TASKS</SectionHint>
        </SectionLabel>
        {groups.map((g) => (
          <PopGroup key={g.pluginId} role="group" aria-label={g.pluginId}>
            <RowDetail style={{ padding: '0 10px' }}>{g.pluginId}</RowDetail>
            {g.tasks.map((task) => (
              <TaskRow key={task.key} task={task} onNavigate={props.onClose} />
            ))}
          </PopGroup>
        ))}
        {agg.total === 0 && (
          <PopGroup role="group" aria-label={t('common.empty')}>
            <RowDetail style={{ padding: '0 10px' }}>{t('capsule.noTasks')}</RowDetail>
          </PopGroup>
        )}
        <Legend aria-hidden="true">
          <LegendItem><LegendDot $kind="idle" />{t('capsule.legendIdle')}</LegendItem>
          <LegendItem><LegendDot $kind="active" />{t('capsule.legendActive')}</LegendItem>
          <LegendItem><LegendDot $kind="done" />{t('capsule.legendDone')}</LegendItem>
        </Legend>
      </CenterSection>

      {/* 编辑器模块区 */}
      <EditorSection />

      {/* 插件模块区：capsule 贡献点聚合 */}
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
    </Pop>
  )
}
