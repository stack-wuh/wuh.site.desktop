'use client'

/**
 * 左栏「插件」树（20260925-feature-sidemenu-settings-consolidation）：树根 = SideMenu
 * 【插件】条目行本身，本组件渲染其子树。行 = 插件 main 视图导航（点击直达
 * /plugin/<id>/<view>，当前路由行高亮）+ 插件浮窗开关（aria-pressed，开合态由
 * floats 注册表驱动，toggle 经壳层注入的 onToggle 携带 main 容器几何）。
 * 数据全部由壳层 layout 传入（mainViews/floatViews 已按 hostGeneration 刷新）；
 * 双列表皆空显示「无启用插件」空态行——条目常驻，呼应「后续注册的插件都归此组」。
 */
import { useRouter, usePathname } from 'next/navigation'
import styled from 'styled-components'
import type { PluginIconName } from '@shared/plugin'
import { pluginPanelKey } from '../../lib/routes'
import { AppIcon } from '../ui/AppIcon'
import { IconCheck, pluginIcon } from '../icons'
import { useLocale } from '../../lib/i18n/context'

export interface PluginTreeViewRef {
  pluginId: string
  view: { id: string; title: string; icon: PluginIconName }
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 4px 4px;
  font-family: var(--font-sans);
`

const NodeRow = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 4px 6px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-primary);

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  ${(props) =>
    props.$active &&
    `
    color: var(--primary-color);
    background: color-mix(in oklab, var(--primary-color) 12%, transparent);
  `}
`

const NodeLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PressedMark = styled.span`
  flex: none;
  display: inline-flex;
  color: var(--primary-color);
`

const EmptyRow = styled.p`
  margin: 2px 0;
  padding: 3px 6px;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-muted);
`

export function PluginTree(props: {
  mainViews: PluginTreeViewRef[]
  floatViews: PluginTreeViewRef[]
  /** 浮窗开合快照（floats 注册表 key 已带 plugin: 前缀，与 pluginPanelKey 一致） */
  openKeys: Set<string>
  /** 浮窗 toggle（壳层 handleToggleFloat：注册表裁决 + main 容器几何视口） */
  onToggle: (key: string) => void
}): React.JSX.Element {
  const { t } = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  if (props.mainViews.length === 0 && props.floatViews.length === 0) {
    return (
      <Wrap>
        <EmptyRow>{t('menu.pluginsEmpty')}</EmptyRow>
      </Wrap>
    )
  }
  return (
    <Wrap>
      {props.mainViews.map(({ pluginId, view }) => {
        const key = pluginPanelKey(pluginId, view.id)
        const active = pathname === `/plugin/${pluginId}/${view.id}`
        const Icon = pluginIcon(view.icon)
        return (
          <NodeRow
            key={key}
            type="button"
            $active={active}
            aria-current={active ? 'page' : undefined}
            onClick={() => router.push(`/plugin/${pluginId}/${view.id}`)}
          >
            <AppIcon icon={Icon} size="xs" decorative />
            <NodeLabel>{view.title}</NodeLabel>
          </NodeRow>
        )
      })}
      {props.floatViews.map(({ pluginId, view }) => {
        const key = pluginPanelKey(pluginId, view.id)
        const open = props.openKeys.has(key)
        const Icon = pluginIcon(view.icon)
        return (
          <NodeRow
            key={key}
            type="button"
            $active={open}
            aria-pressed={open}
            onClick={() => props.onToggle(key)}
          >
            <AppIcon icon={Icon} size="xs" decorative />
            <NodeLabel>{view.title}</NodeLabel>
            {open && (
              <PressedMark>
                <AppIcon icon={IconCheck} size="xs" decorative />
              </PressedMark>
            )}
          </NodeRow>
        )
      })}
    </Wrap>
  )
}
