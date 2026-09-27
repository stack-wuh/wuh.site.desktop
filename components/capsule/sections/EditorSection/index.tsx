'use client'

/**
 * 控制中心「编辑器模块区」（20260923-feature-capsule-control-center 重构）：
 * 原平铺按钮列升级为模块卡布局（设计稿 PART 2）——文档卡（路径/脏点/字数/
 * 阅读时长 + 保存组）、开关 tile（即时渲染/专注模式/大纲跟随，iOS 式开关，
 * 状态经 editor-state 总线单状态源）、查找替换 tile、格式+插入图标网格、
 * 排版设置/快捷键速查整行手风琴、导出双卡。一切编辑指令经 editor-commands
 * 发布，自身不触碰编辑器实例；排版偏好持久化 wd.editorTypography。
 * <EditorCommandHost/> 保持壳层 layout 单实例（不随胶囊开关），认领文档操作
 * 与专注模式命令（实现见 ./EditorCommandHost，经本入口具名导出保持
 * `capsule/sections/EditorSection` 旧导入路径可达）。
 * 拆分形态（20260926 mega + 20260927-refactor-editor-section-cleanup 收尾）：
 * 格式网格见 ./FormatGrid，排版/快捷键/导出见 ./PanelsExport，样式原子见 ./styles。
 */
import { useMemo, useState } from 'react'
import { AppIcon } from '../../../ui/AppIcon'
import {
  IconClose,
  IconFile,
  IconFilePlus,
  IconListTree,
  IconMaximize,
  IconPlus,
  IconSave,
  IconSearch,
  IconSparkles
} from '../../../icons'
import { useWorkspaceStore } from '../../../../lib/store'
import { publishEditorCommand } from '../../../../lib/editor-commands'
import { publishEditorLiveState, useEditorLiveState } from '../../../../lib/editor-state'
import { countWords, estimateReadingMinutes, parseOutline } from '../../../../lib/editor-info'
import { useLocale } from '../../../../lib/i18n/context'
import { FilePanelContent } from '../../../workspace/FilePicker'
import { WorkspacePanelContent } from '../../../workspace/WorkspacePicker'
import {
  ModuleCard,
  ModuleGrid,
  ModuleHead,
  ModuleIcon,
  ModuleMore,
  ModuleHeadTitle,
  ModulePanel,
  ModuleSub,
  SectionHint,
  SectionLabel,
  CenterSection,
  SubPanel,
  SwitchCard
} from '../../modules'
import { ActionMini, IconBtn, IconRow, OutlineEmpty, OutlineItem, OutlineList } from './styles'
import { FormatGrid, type SubPanelKind } from './FormatGrid'
import { PanelsExport } from './PanelsExport'

// 保持旧导入路径 `capsule/sections/EditorSection` 的 EditorCommandHost 具名导出可达（layout.tsx 消费）
export { EditorCommandHost } from './EditorCommandHost'

export function EditorSection(): React.JSX.Element {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const live = useEditorLiveState()
  const [panel, setPanel] = useState<SubPanelKind>('none')

  const content = doc.content ?? ''
  const outline = useMemo(() => parseOutline(content), [content])
  const words = useMemo(() => countWords(content), [content])
  const minutes = estimateReadingMinutes(words.words)

  const togglePanel = (kind: SubPanelKind): void => {
    setPanel((cur) => (cur === kind ? 'none' : kind))
  }

  const activeDoc = doc.activePath != null || doc.content != null

  return (
    <CenterSection aria-label={t('capsule.editorSection')}>
      <SectionLabel>
        {t('capsule.editorSection')}
        <SectionHint>EDITOR</SectionHint>
      </SectionLabel>

      {/* 文档卡：独占整行 */}
      <ModuleGrid>
        <ModulePanel
          $span2
          role="group"
          aria-label={doc.activePath ?? t('editor.newDraft')}
          title={doc.activePath ?? t('editor.newDraft')}
        >
          <ModuleHead>
            <ModuleIcon>
              <AppIcon icon={IconFile} size="xs" decorative />
            </ModuleIcon>
            <ModuleHeadTitle>{doc.activePath ?? t('editor.newDraft')}</ModuleHeadTitle>
              {doc.dirty && (
                <span title={t('editor.dirtyTitle')} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning-color)', flex: 'none' }} />
              )}
          </ModuleHead>
          <ModuleSub>
            {activeDoc
              ? `${t('editor.wordStat', { words: words.words, chars: words.chars })} · ${t('editor.readingTime', { minutes })}`
              : t('editor.newDraftHint')}
          </ModuleSub>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <ActionMini $accent onClick={() => publishEditorCommand({ kind: 'save' })}>
              <AppIcon icon={IconSave} size="xs" decorative />
              {t('editor.save')}
            </ActionMini>
            <ActionMini onClick={() => publishEditorCommand({ kind: 'saveAs' })}>
              <AppIcon icon={IconFilePlus} size="xs" decorative />
              {t('editor.saveAs')}
            </ActionMini>
            <ActionMini onClick={() => publishEditorCommand({ kind: 'newDraft' })}>
              <AppIcon icon={IconPlus} size="xs" decorative />
              {t('editor.newBtn')}
            </ActionMini>
            <ActionMini onClick={() => publishEditorCommand({ kind: 'closeDoc' })}>
              <AppIcon icon={IconClose} size="xs" decorative />
              {t('editor.close')}
            </ActionMini>
          </div>
        </ModulePanel>

        <SwitchCard
          icon={<AppIcon icon={IconSparkles} size="xs" decorative />}
          label={t('editor.renderLive')}
          hint={t('editor.switchSourceHint')}
          on={live.renderMode === 'render'}
          onToggle={() => publishEditorCommand({ kind: 'toggleRender' })}
        />
        <SwitchCard
          icon={<AppIcon icon={IconMaximize} size="xs" decorative />}
          label={t('editor.focus')}
          hint={t('editor.focusHint')}
          on={live.focusMode}
          onToggle={() => publishEditorCommand({ kind: 'toggleFocus' })}
        />
        <ModuleCard type="button" title={t('editor.findReplace')} onClick={() => publishEditorCommand({ kind: 'findReplace' })}>
          <ModuleHead>
            <ModuleIcon>
              <AppIcon icon={IconSearch} size="xs" decorative />
            </ModuleIcon>
            {t('editor.findReplace')}
            <ModuleMore>⌘F</ModuleMore>
          </ModuleHead>
        </ModuleCard>
        <SwitchCard
          icon={<AppIcon icon={IconListTree} size="xs" decorative />}
          label={t('editor.follow')}
          hint={t('editor.followHint')}
          on={live.outlineFollow}
          onToggle={() => publishEditorLiveState({ outlineFollow: !live.outlineFollow })}
        />
      </ModuleGrid>

      <FormatGrid panel={panel} onTogglePanel={togglePanel} />

      <PanelsExport panel={panel} onTogglePanel={togglePanel} />

      {panel === 'outline' && (
        <OutlineList role="list" aria-label={t('editor.outline')}>
          {outline.length === 0 ? (
            <OutlineEmpty>{t('editor.outlineEmpty')}</OutlineEmpty>
          ) : (
            outline.map((item, index) => (
              <OutlineItem
                key={`${item.line}-${item.text}`}
                type="button"
                $level={item.level}
                $active={live.outlineFollow && live.activeHeading === index}
                title={item.text}
                onClick={() => publishEditorCommand({ kind: 'scrollToHeading', index })}
              >
                {item.text}
              </OutlineItem>
            ))
          )}
        </OutlineList>
      )}

      {panel === 'workspace' && (
        <SubPanel $open>
          <WorkspacePanelContent />
        </SubPanel>
      )}

      {panel === 'file' && (
        <SubPanel $open>
          <FilePanelContent />
        </SubPanel>
      )}
    </CenterSection>
  )
}
