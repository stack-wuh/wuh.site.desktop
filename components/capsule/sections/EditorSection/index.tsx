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
 * `capsule/sections/EditorSection` 旧导入路径可达——20260926-refactor-mega-component-split）。
 */
import { useMemo, useState } from 'react'
import { AppIcon } from '../../../ui/AppIcon'
import {
  IconBold,
  IconClose,
  IconCode,
  IconCopy,
  IconExternalLink,
  IconFile,
  IconFilePlus,
  IconFolderOpen,
  IconHeading1,
  IconHeading2,
  IconImage,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconListTree,
  IconMaximize,
  IconMinus,
  IconPlus,
  IconQuote,
  IconRedo,
  IconSave,
  IconSearch,
  IconSparkles,
  IconTable,
  IconUndo
} from '../../../icons'
import type { IconComponent } from '../../../ui/AppIcon'
import { useWorkspaceStore, type MarkdownInsertAction } from '../../../../lib/store'
import { publishEditorCommand } from '../../../../lib/editor-commands'
import { publishEditorLiveState, useEditorLiveState, type EditorTypography } from '../../../../lib/editor-state'
import { countWords, estimateReadingMinutes, parseOutline } from '../../../../lib/editor-info'
import { copyAsHtml, exportHtmlFile } from '../../../../lib/editor-export'
import { useLocale } from '../../../../lib/i18n/context'
import { FilePanelContent } from '../../../workspace/FilePicker'
import { WorkspacePanelContent } from '../../../workspace/WorkspacePicker'
import {
  KbdTable,
  ModuleCard,
  ModuleGrid,
  ModuleHead,
  ModuleIcon,
  ModuleMore,
  ModuleHeadTitle,
  ModulePanel,
  ModuleRow,
  ModuleSub,
  RowChevron,
  SectionHint,
  SectionLabel,
  CenterSection,
  Stepper,
  StepperLine,
  SubPanel,
  SwitchCard
} from '../../modules'
import { ActionMini, IconBtn, IconRow, OutlineEmpty, OutlineItem, OutlineList } from './styles'

// 保持旧导入路径 `capsule/sections/EditorSection` 的 EditorCommandHost 具名导出可达（layout.tsx 消费）
export { EditorCommandHost } from './EditorCommandHost'

type SubPanelKind = 'none' | 'outline' | 'workspace' | 'file' | 'typeset' | 'kbd'

const FORMAT_ITEMS: { action: MarkdownInsertAction; icon: IconComponent; labelKey: string }[] = [
  { action: 'h1', icon: IconHeading1, labelKey: 'editor.fmtH1' },
  { action: 'h2', icon: IconHeading2, labelKey: 'editor.fmtH2' },
  { action: 'bold', icon: IconBold, labelKey: 'editor.fmtBold' },
  { action: 'italic', icon: IconItalic, labelKey: 'editor.fmtItalic' },
  { action: 'ul', icon: IconList, labelKey: 'editor.fmtUl' },
  { action: 'ol', icon: IconListOrdered, labelKey: 'editor.fmtOl' },
  { action: 'quote', icon: IconQuote, labelKey: 'editor.fmtQuote' },
  { action: 'code', icon: IconCode, labelKey: 'editor.fmtCode' },
  { action: 'link', icon: IconLink, labelKey: 'editor.fmtLink' }
]

/** 排版步进定义：字号 ±1（12-18）、行距 ±0.1（1.5-2.2）、行宽循环（满幅→宽→中→窄） */
const MEASURE_STEPS: ('full' | 960 | 820 | 700)[] = ['full', 960, 820, 700]

function stepTypography(cur: EditorTypography, field: 'fontSize' | 'lineHeight' | 'measure', dir: 1 | -1): EditorTypography {
  if (field === 'fontSize') {
    return { ...cur, fontSize: Math.min(18, Math.max(12, cur.fontSize + dir)) }
  }
  if (field === 'lineHeight') {
    return { ...cur, lineHeight: Math.min(2.2, Math.max(1.5, Math.round((cur.lineHeight + dir * 0.1) * 10) / 10)) }
  }
  const idx = MEASURE_STEPS.indexOf(cur.measure as (typeof MEASURE_STEPS)[number])
  const next = Math.min(MEASURE_STEPS.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + dir))
  return { ...cur, measure: MEASURE_STEPS[next] }
}

export function EditorSection(): React.JSX.Element {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const live = useEditorLiveState()
  const [panel, setPanel] = useState<SubPanelKind>('none')
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const content = doc.content ?? ''
  const outline = useMemo(() => parseOutline(content), [content])
  const words = useMemo(() => countWords(content), [content])
  const minutes = estimateReadingMinutes(words.words)

  const togglePanel = (kind: SubPanelKind): void => {
    setPanel((cur) => (cur === kind ? 'none' : kind))
  }

  const activeDoc = doc.activePath != null || doc.content != null

  const runExport = (kind: 'copy' | 'file'): void => {
    setExportMsg(null)
    const done = kind === 'copy' ? t('editor.exportCopyDone') : t('editor.exportFileDone')
    void (kind === 'copy' ? copyAsHtml() : exportHtmlFile())
      .then((rel) => {
        setExportMsg(kind === 'file' && typeof rel === 'string' ? `${t('editor.exportFileDone')} ${rel}` : done)
        setTimeout(() => setExportMsg(null), 2600)
      })
      .catch((err: unknown) => {
        setExportMsg(err instanceof Error ? err.message : String(err))
        setTimeout(() => setExportMsg(null), 3200)
      })
  }

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
              <span title={t('editor.dirtyTitle')} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--warning-color)', flex: 'none' }} />
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

      <IconRow role="group" aria-label={t('editor.fmtAria')}>
        {FORMAT_ITEMS.map(({ action, icon, labelKey }) => (
          <IconBtn
            key={action}
            type="button"
            title={t(labelKey)}
            aria-label={t(labelKey)}
            onClick={() => publishEditorCommand({ kind: 'format', action })}
          >
            <AppIcon icon={icon} size="xs" decorative />
          </IconBtn>
        ))}
        <span style={{ width: 1, height: 16, background: 'var(--chrome-border)', margin: '0 3px' }} />
        <IconBtn
          type="button"
          title={t('editor.fmtImage')}
          aria-label={t('editor.fmtImage')}
          onClick={() => publishEditorCommand({ kind: 'insertClipboardImage' })}
        >
          <AppIcon icon={IconImage} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.fmtTable')}
          aria-label={t('editor.fmtTable')}
          onClick={() => publishEditorCommand({ kind: 'insert', snippet: 'table' })}
        >
          <AppIcon icon={IconTable} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.fmtCodeBlock')}
          aria-label={t('editor.fmtCodeBlock')}
          onClick={() => publishEditorCommand({ kind: 'insert', snippet: 'codeBlock' })}
        >
          <AppIcon icon={IconCode} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.fmtHr')}
          aria-label={t('editor.fmtHr')}
          onClick={() => publishEditorCommand({ kind: 'insert', snippet: 'hr' })}
        >
          <AppIcon icon={IconMinus} size="xs" decorative />
        </IconBtn>
        <span style={{ width: 1, height: 16, background: 'var(--chrome-border)', margin: '0 3px' }} />
        <IconBtn title={t('editor.undo')} aria-label={t('editor.undo')} onClick={() => publishEditorCommand({ kind: 'undo' })}>
          <AppIcon icon={IconUndo} size="xs" decorative />
        </IconBtn>
        <IconBtn title={t('editor.redo')} aria-label={t('editor.redo')} onClick={() => publishEditorCommand({ kind: 'redo' })}>
          <AppIcon icon={IconRedo} size="xs" decorative />
        </IconBtn>
        <span style={{ width: 1, height: 16, background: 'var(--chrome-border)', margin: '0 3px' }} />
        <IconBtn
          type="button"
          title={t('editor.outline')}
          aria-label={t('editor.outline')}
          aria-expanded={panel === 'outline'}
          onClick={() => togglePanel('outline')}
        >
          <AppIcon icon={IconListTree} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('project.section')}
          aria-label={t('project.section')}
          aria-expanded={panel === 'workspace'}
          onClick={() => togglePanel('workspace')}
        >
          <AppIcon icon={IconFolderOpen} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('project.pickFile')}
          aria-label={t('project.pickFileAria')}
          aria-expanded={panel === 'file'}
          onClick={() => togglePanel('file')}
        >
          <AppIcon icon={IconFile} size="xs" decorative />
        </IconBtn>
      </IconRow>

      <ModuleRow $open={panel === 'typeset'} onClick={() => togglePanel('typeset')} aria-expanded={panel === 'typeset'}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-color)' }}>Aa</span>
        {t('editor.typeset')}
        <RowChevron $open={panel === 'typeset'}>›</RowChevron>
      </ModuleRow>
      <SubPanel $open={panel === 'typeset'}>
        <StepperLine>
          <span className="name">{t('editor.typesetFontSize')}</span>
          <Stepper>
            <button type="button" onClick={() => publishEditorLiveState({ typography: stepTypography(live.typography, 'fontSize', -1) })}>−</button>
            <span className="val">{live.typography.fontSize} px</span>
            <button type="button" onClick={() => publishEditorLiveState({ typography: stepTypography(live.typography, 'fontSize', 1) })}>＋</button>
          </Stepper>
        </StepperLine>
        <StepperLine>
          <span className="name">{t('editor.typesetLineHeight')}</span>
          <Stepper>
            <button type="button" onClick={() => publishEditorLiveState({ typography: stepTypography(live.typography, 'lineHeight', -1) })}>−</button>
            <span className="val">{live.typography.lineHeight.toFixed(1)}</span>
            <button type="button" onClick={() => publishEditorLiveState({ typography: stepTypography(live.typography, 'lineHeight', 1) })}>＋</button>
          </Stepper>
        </StepperLine>
        <StepperLine>
          <span className="name">{t('editor.typesetMeasure')}</span>
          <Stepper>
            <button type="button" onClick={() => publishEditorLiveState({ typography: stepTypography(live.typography, 'measure', -1) })}>−</button>
            <span className="val">{live.typography.measure === 'full' ? t('editor.measureFull') : `${live.typography.measure}px`}</span>
            <button type="button" onClick={() => publishEditorLiveState({ typography: stepTypography(live.typography, 'measure', 1) })}>＋</button>
          </Stepper>
        </StepperLine>
      </SubPanel>

      <ModuleRow $open={panel === 'kbd'} onClick={() => togglePanel('kbd')} aria-expanded={panel === 'kbd'}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-color)' }}>⌘</span>
        {t('editor.kbd')}
        <RowChevron $open={panel === 'kbd'}>›</RowChevron>
      </ModuleRow>
      <SubPanel $open={panel === 'kbd'}>
        <KbdTable>
          <kbd>⌘B</kbd><span>{t('editor.fmtBold')}</span>
          <kbd>⌘I</kbd><span>{t('editor.fmtItalic')}</span>
          <kbd>⌘F</kbd><span>{t('editor.findReplace')}</span>
          <kbd>⌘/</kbd><span>{t('editor.toggleRender')}</span>
          <kbd>⌘S</kbd><span>{t('editor.save')}</span>
          <kbd>⌘Z</kbd><span>{t('editor.undo')}</span>
          <kbd>⌘⇧F</kbd><span>{t('editor.focus')}</span>
          <kbd>Esc</kbd><span>{t('editor.escExit')}</span>
        </KbdTable>
      </SubPanel>

      <ModuleGrid>
        <ModuleCard type="button" title={t('editor.exportCopy')} onClick={() => runExport('copy')}>
          <ModuleHead>
            <ModuleIcon>
              <AppIcon icon={IconCopy} size="xs" decorative />
            </ModuleIcon>
            {t('editor.exportCopy')}
          </ModuleHead>
          <ModuleSub>{exportMsg ?? t('editor.exportCopyHint')}</ModuleSub>
        </ModuleCard>
        <ModuleCard type="button" title={t('editor.exportFile')} onClick={() => runExport('file')}>
          <ModuleHead>
            <ModuleIcon>
              <AppIcon icon={IconExternalLink} size="xs" decorative />
            </ModuleIcon>
            {t('editor.exportFile')}
          </ModuleHead>
          <ModuleSub>.html</ModuleSub>
        </ModuleCard>
      </ModuleGrid>

      {panel === 'outline' && (
        <OutlineList aria-label={t('editor.outline')}>
          {outline.length === 0 ? (
            <OutlineEmpty>{t('editor.outlineEmpty')}</OutlineEmpty>
          ) : (
            outline.map((item, index) => (
              <OutlineItem
                key={`${item.line}-${item.text}`}
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
