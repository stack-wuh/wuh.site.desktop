'use client'

/**
 * 书耳浮笺（20261017-feature-app-layout-workbench D3，原贴边上下文侧栏 20261015）：
 * 与当前文档相关的上下文工具浮在案面右缘——大纲（点击经命令通道 scrollToHeading
 * 跳转）、元数据（**只读**快照：editor.md 约束「结构化信息的展示与修改入口在
 * Frontmatter 插件视图，不得在编辑器内重建元数据表单」，此处仅展示 + 跳转入口）、
 * 图床（同入口跳转）+ 插件 area=context 页签（manifest 声明制，lib/panelTabs）。
 * 默认收起（D3 假定 f），编辑页顶栏「书耳」钮开合；展开时书口让位、收起回归
 * （让位链在编辑页 `{!paneOpen && <Spine />}`）。保挂载：显隐走滑出过渡。
 */
import { useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '../../ui/AppIcon'
import { IconFile, pluginIcon } from '../../icons'
import type { PluginIconName } from '@shared/plugin'
import { parseFrontmatter } from '@shared/frontmatter'
import { parseOutline } from '../../../lib/editor-info'
import { publishEditorCommand } from '../../../lib/editor-commands'
import { useWorkspaceStore } from '../../../lib/store'
import { panelTabsStore, visiblePanelTabs } from '../../../lib/panelTabs'
import { useEditorLiveState } from '../../../lib/editor-state'
import { useLocale } from '../../../lib/i18n/context'
import { PluginTabRowItem } from '../../capsule/CapsulePanel/PluginTabRows'
import { TabRows, TabSection } from '../../capsule/CapsulePanel/styles'
import {
  Body,
  EmptyText,
  HintText,
  MetaKey,
  MetaRow,
  MetaValue,
  OpenBtn,
  OutlineItem,
  OutlineTag,
  Pane,
  TabBtn,
  Tabs
} from './styles'

type ShellTab = 'outline' | 'meta' | 'image'

export function SidePane(props: { open?: boolean }): React.JSX.Element {
  const { t } = useLocale()
  const router = useRouter()
  const doc = useWorkspaceStore()
  const live = useEditorLiveState()
  useSyncExternalStore(panelTabsStore.subscribe, panelTabsStore.get, panelTabsStore.get)
  const [tab, setTab] = useState<ShellTab | string>('outline')
  const ctxTabs = visiblePanelTabs('context')

  const outline = useMemo(() => parseOutline(doc.content ?? ''), [doc.content])
  const meta = useMemo(() => parseFrontmatter(doc.content ?? '').data, [doc.content])
  const metaEntries = useMemo(
    () =>
      Object.entries(meta as Record<string, unknown>).filter(
        ([, v]) => typeof v === 'string' || typeof v === 'number'
      ),
    [meta]
  )

  // 页签失效回落：插件停用/移除后回落大纲（派生兜底）
  const effective = ctxTabs.some((tb) => tb.key === tab) ? tab : (tab as ShellTab)

  return (
    <Pane
      data-editor-sidepane=""
      data-open={props.open === true ? 'true' : 'false'}
      aria-label={t('editor.sideAria')}
      $open={props.open === true}
    >
      <Tabs role="tablist" aria-label={t('editor.sideAria')}>
        <TabBtn type="button" role="tab" aria-selected={effective === 'outline'} $active={effective === 'outline'} onClick={() => setTab('outline')}>
          {t('editor.outline')}
        </TabBtn>
        <TabBtn type="button" role="tab" aria-selected={effective === 'meta'} $active={effective === 'meta'} onClick={() => setTab('meta')}>
          {t('sidepane.meta')}
        </TabBtn>
        <TabBtn type="button" role="tab" aria-selected={effective === 'image'} $active={effective === 'image'} onClick={() => setTab('image')}>
          {t('sidepane.image')}
        </TabBtn>
        {ctxTabs.map((tb) => {
          const Icon = pluginIcon(tb.icon as PluginIconName)
          return (
            <TabBtn
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={effective === tb.key}
              $active={effective === tb.key}
              onClick={() => setTab(tb.key)}
            >
              <AppIcon icon={Icon} size="xs" decorative />
              {tb.title}
            </TabBtn>
          )
        })}
      </Tabs>
      <Body>
        {effective === 'outline' ? (
          <div role="tabpanel" aria-label={t('editor.outline')}>
            {outline.length === 0 ? (
              <EmptyText>{t('editor.outlineEmpty')}</EmptyText>
            ) : (
              outline.map((item, index) => (
                <OutlineItem
                  key={`${item.line}:${index}`}
                  type="button"
                  $level={item.level}
                  $active={index === live.activeHeading}
                  aria-current={index === live.activeHeading ? 'true' : undefined}
                  data-level={item.level}
                  title={item.text}
                  onClick={() => publishEditorCommand({ kind: 'scrollToHeading', index })}
                >
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
                </OutlineItem>
              ))
            )}
          </div>
        ) : effective === 'meta' ? (
          <div role="tabpanel" aria-label={t('sidepane.meta')}>
            {metaEntries.length === 0 ? (
              <EmptyText>{t('sidepane.metaEmpty')}</EmptyText>
            ) : (
              metaEntries.map(([key, value]) => (
                <MetaRow key={key}>
                  <MetaKey>{key}</MetaKey>
                  <MetaValue>{String(value)}</MetaValue>
                </MetaRow>
              ))
            )}
            <HintText>{t('sidepane.metaHint')}</HintText>
            <OpenBtn type="button" data-testid="sidepane-meta-open" onClick={() => router.push('/plugin/frontmatter/frontmatter')}>
              <AppIcon icon={IconFile} size="xs" decorative />
              {t('sidepane.openFrontmatter')}
            </OpenBtn>
          </div>
        ) : effective === 'image' ? (
          <div role="tabpanel" aria-label={t('sidepane.image')}>
            <HintText>{t('sidepane.imageHint')}</HintText>
            <OpenBtn type="button" data-testid="sidepane-image-open" onClick={() => router.push('/plugin/image-host/image-host')}>
              <AppIcon icon={IconFile} size="xs" decorative />
              {t('sidepane.openImageHost')}
            </OpenBtn>
          </div>
        ) : (
          ctxTabs
            .filter((tb) => tb.key === effective)
            .map((tb) => (
              <div key={tb.key} role="tabpanel" aria-label={tb.title}>
                {tb.sections.length === 0 ? (
                  <EmptyText>{t('capsule.tabEmpty')}</EmptyText>
                ) : (
                  tb.sections.map((sec, i) => (
                    <TabSection key={`${tb.key}:${i}`} aria-label={sec.title}>
                      {sec.title && <OutlineTag>{sec.title}</OutlineTag>}
                      <TabRows>
                        {sec.rows.map((row, j) => (
                          <PluginTabRowItem key={j} row={row} pluginId={tb.pluginId} onNavigate={() => undefined} />
                        ))}
                      </TabRows>
                    </TabSection>
                  ))
                )}
              </div>
            ))
        )}
      </Body>
    </Pane>
  )
}
