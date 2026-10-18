'use client'

/**
 * 目次浮笺（20261017-feature-app-layout-workbench D3，原贴边上下文面板 20261015）：
 * absolute slip-card 浮在案面左缘，默认收起——呼出入口 = rail 项目钮 / ⌘B /
 * 头部收起旋钮。承载原 SideMenu【项目】子树（ProjectsTree 迁入，fill 模式撑满）。
 * 头部 = 当前工作区名（getWorkspace 投影，随 workspaceStore.root 切换重拉）
 * +「当前」徽标。保挂载：显隐走滑出过渡（opacity/visibility），树缓存不丢。
 * 壳层一等面板不开放插件挂载（workbench brief 决策 8 护栏）。
 */
import { useEffect, useState } from 'react'
import { AppIcon } from '../ui/AppIcon'
import { IconChevronLeft } from '../icons'
import { useLocale } from '../../lib/i18n/context'
import { useWorkspaceStore } from '../../lib/store'
import { ProjectsTree } from '../menu/ProjectsTree'
import { Body, CollapseBtn, CurrentBadge, Head, Panel, ProjectName } from './styles'

export function ContextPanel(props: {
  /** 浮笺开合（滑出过渡；保挂载，aria-hidden 同步收起态） */
  open?: boolean
  onCollapse: () => void
}): React.JSX.Element {
  const { t } = useLocale()
  const wsRoot = useWorkspaceStore().root
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void window.api?.getWorkspace?.()
      ?.then((info) => {
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
    <Panel
      data-chrome="ctx"
      data-context-panel=""
      data-open={props.open === true ? 'true' : 'false'}
      aria-label={t('workbench.contextAria')}
      $open={props.open === true}
    >
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
