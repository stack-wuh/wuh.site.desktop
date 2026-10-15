'use client'

/**
 * 上下文面板（20261015-feature-workbench-shell task-3）：工作台左缘一等面板，
 * 承载原 SideMenu【项目】子树（ProjectsTree 迁入，fill 模式撑满）。
 * 头部 = 当前工作区名（getWorkspace 投影，随 workspaceStore.root 切换重拉）
 * +「当前」徽标 + 收起旋钮（⌘B 与旋钮双入口，状态在壳层 layout）。
 * 壳层一等面板不开放插件挂载（brief 决策 8 护栏）。
 */
import { useEffect, useState } from 'react'
import { AppIcon } from '../ui/AppIcon'
import { IconChevronLeft } from '../icons'
import { useLocale } from '../../lib/i18n/context'
import { useWorkspaceStore } from '../../lib/store'
import { ProjectsTree } from '../menu/ProjectsTree'
import { Body, CollapseBtn, CurrentBadge, Head, Panel, ProjectName } from './styles'

export function ContextPanel(props: {
  /** ⌘B 隐藏：hidden 属性保挂载（树缓存/展开态不丢），显示层兜底见 styles */
  hidden?: boolean
  onCollapse: () => void
}): React.JSX.Element {
  const { t } = useLocale()
  const wsRoot = useWorkspaceStore().root
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void window.api
      .getWorkspace()
      .then((info) => {
        if (alive) setName(info?.name ?? null)
      })
      .catch(() => {
        if (alive) setName(null)
      })
    return () => {
      alive = false
    }
  }, [wsRoot])

  return (
    <Panel data-chrome="ctx" data-context-panel="" aria-label={t('workbench.contextAria')} hidden={props.hidden === true}>
      <Head>
        <ProjectName title={name ?? undefined}>{name ?? 'wuh-site'}</ProjectName>
        {name != null && <CurrentBadge>{t('projects.currentBadge')}</CurrentBadge>}
        <CollapseBtn
          type="button"
          aria-label={t('workbench.contextCollapse')}
          onClick={props.onCollapse}
        >
          <AppIcon icon={IconChevronLeft} size="xs" decorative />
        </CollapseBtn>
      </Head>
      <Body>
        <ProjectsTree fill />
      </Body>
    </Panel>
  )
}
