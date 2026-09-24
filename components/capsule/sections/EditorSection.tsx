'use client'

/**
 * 控制中心「编辑器模块区」（20260923-feature-capsule-control-center 重构）：
 * 原平铺按钮列升级为模块卡布局（设计稿 PART 2）——文档卡（路径/脏点/字数/
 * 阅读时长 + 保存组）、开关 tile（即时渲染/专注模式/大纲跟随，iOS 式开关，
 * 状态经 editor-state 总线单状态源）、查找替换 tile、格式+插入图标网格、
 * 排版设置/快捷键速查整行手风琴、导出双卡。一切编辑指令经 editor-commands
 * 发布，自身不触碰编辑器实例；排版偏好持久化 wd.editorTypography。
 * <EditorCommandHost/> 保持壳层 layout 单实例（不随胶囊开关），认领文档操作
 * 与专注模式命令。
 */
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { AppIcon } from '../../ui/AppIcon'
import { Button } from '../../ui/Button'
import { Dialog, uiConfirm } from '../../ui/Dialog'
import { Input } from '../../ui/Input'
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
} from '../../icons'
import type { IconComponent } from '../../ui/AppIcon'
import { workspaceStore, useWorkspaceStore, type MarkdownInsertAction } from '../../../lib/store'
import { consumeDraft } from '../../../lib/drafts'
import { toast } from '../../../lib/feedback'
import { publishEditorCommand, subscribeEditorCommands } from '../../../lib/editor-commands'
import { getEditorLiveState, publishEditorLiveState, useEditorLiveState, type EditorTypography } from '../../../lib/editor-state'
import { countWords, estimateReadingMinutes, parseOutline } from '../../../lib/editor-info'
import { copyAsHtml, exportHtmlFile } from '../../../lib/editor-export'
import {
  assetsDirNameFor
} from '@shared/imagePlan'
import {
  buildRenamePath,
  collectDirOptions,
  rewriteAssetsRefs,
  transferDestFor,
  validateDocName,
  type DirOption
} from '@shared/docTransfer'
import { useLocale } from '../../../lib/i18n/context'
import { FilePanelContent } from '../../workspace/FilePicker'
import { WorkspacePanelContent } from '../../workspace/WorkspacePicker'
import { errText } from '../../workspace/PickerShell'
import {
  KbdTable,
  ModuleCard,
  ModuleGrid,
  ModuleHead,
  ModuleIcon,
  ModuleMore,
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
} from '../modules'

const DocChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const DocPath = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DirtyDot = styled.span`
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning-color);
`

const IconRow = styled.div`
  display: flex;
  align-items: center;
  /* 横密纵疏：图标间 2px，换行两排之间 6px（20260924-fix-capsule-header-chrome
     ——gap 横纵共用以致换行工具条贴死） */
  column-gap: 2px;
  row-gap: 6px;
  padding: 6px 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  &[aria-expanded='true'] {
    background: color-mix(in oklab, var(--primary-color) 16%, transparent);
    color: var(--text-primary);
  }
`

const OutlineList = styled.ul`
  list-style: none;
  margin: 2px 10px 6px;
  padding: 0;
  max-height: 132px;
  overflow: auto;
  border-top: 1px solid var(--chrome-border);
`

const OutlineItem = styled.li<{ $level: number; $active?: boolean }>`
  padding: 4px 6px;
  padding-left: ${(props) => 6 + (props.$level - 1) * 12}px;
  font-size: 12px;
  color: ${(props) => (props.$active ? 'var(--primary-color)' : 'var(--text-secondary)')};
  font-weight: ${(props) => (props.$active ? '700' : '400')};
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
    background: color-mix(in oklab, var(--primary-color) 8%, transparent);
  }
`

const OutlineEmpty = styled.li`
  padding: 6px;
  font-size: 12px;
  color: var(--text-muted);
`

const DialogError = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--danger-color);
  word-break: break-all;
`

/** 迁移/复制 Dialog（20260924-feature-breadcrumb-doc-ops） */
const TransferMeta = styled.p`
  margin: 0 0 10px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  word-break: break-all;
`

const TransferLabel = styled.div`
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-secondary);
`

const DirList = styled.div`
  max-height: 240px;
  overflow: auto;
  border: 1px solid var(--chrome-border);
  border-radius: 8px;
  background: color-mix(in oklab, var(--background-color) 40%, var(--chrome-raised));
`

const DirRow = styled.button<{ $active: boolean; $depth: number }>`
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 6px 10px;
  padding-left: ${(props) => 10 + props.$depth * 16}px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
  }

  ${(props) =>
    props.$active &&
    `
    background: color-mix(in oklab, var(--primary-color) 16%, transparent);
    color: var(--primary-color);
  `}
`

const DirEmpty = styled.p`
  margin: 0;
  padding: 12px 10px;
  font-size: 12px;
  color: var(--text-muted);
`

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
            <span className="truncate" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {doc.activePath ?? t('editor.newDraft')}
            </span>
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
          hint="⌘/ 切换纯源码"
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

/** 文档卡内迷你动作钮 */
const ActionMini = styled.button<{ $accent?: boolean }>`
  flex: 1;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: color-mix(in oklab, var(--background-color) 45%, var(--chrome-raised));
  border: 1px solid color-mix(in oklab, var(--chrome-border) 70%, transparent);
  border-radius: 7px;
  color: ${(props) => (props.$accent ? 'var(--primary-color)' : 'var(--text-secondary)')};
  font-size: 10.5px;
  font-family: var(--font-sans);
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }
`

export function EditorCommandHost(): React.JSX.Element {
  const { t } = useLocale()
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [savePath, setSavePath] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // 迁移/复制 Dialog（20260924-feature-breadcrumb-doc-ops）：transferSrc 为打开时的文档路径快照
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferSrc, setTransferSrc] = useState('')
  const [dirOptions, setDirOptions] = useState<DirOption[] | null>(null)
  const [transferDir, setTransferDir] = useState('')
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)

  const openSaveAs = (): void => {
    setSaveError(null)
    setSavePath('')
    setSaveAsOpen(true)
  }

  const openTransfer = (): void => {
    setTransferSrc(workspaceStore.get().activePath ?? '')
    setTransferDir('')
    setTransferError(null)
    setDirOptions(null)
    setTransferOpen(true)
    window.api
      .readTree()
      .then((tree) => setDirOptions(collectDirOptions(tree, t('editor.transferRoot'))))
      .catch((err: unknown) => {
        setDirOptions([])
        setTransferError(errText(err))
      })
  }

  /** 改名（面包屑原地输入提交）：校验 → 迁移式改名 → store 同步（脏缓冲跟随、引用按需改写） */
  const executeRename = (rawName: string): void => {
    const cur = workspaceStore.get()
    const src = cur.activePath
    if (!src) return
    if (validateDocName(rawName.trim())) {
      toast({ text: t('editor.renameInvalid'), kind: 'error' })
      return
    }
    const destRel = buildRenamePath(src, rawName)
    if (destRel === src) return
    const wasDirty = cur.dirty
    const prevContent = cur.content ?? ''
    void (async (): Promise<void> => {
      try {
        const result = await window.api.transferDoc(src, destRel, 'move')
        const disk = await window.api.readFile(result.path)
        workspaceStore.openDoc(result.path, disk.content)
        if (wasDirty) {
          const oldAssets = assetsDirNameFor(src)
          const newAssets = assetsDirNameFor(result.path)
          workspaceStore.setContent(
            oldAssets === newAssets ? prevContent : rewriteAssetsRefs(prevContent, oldAssets, newAssets)
          )
        }
        toast({
          text: t('editor.renameDone', { name: result.path.split('/').pop() ?? result.path }),
          kind: 'success'
        })
      } catch (err) {
        toast({ text: errText(err), kind: 'error' })
      }
    })()
  }

  /** 迁移/复制（文件夹选择 Dialog 双动作）：move 缓冲跟随保持 dirty；copy 停留原文 */
  const executeTransfer = (dir: string, mode: 'move' | 'copy'): void => {
    const cur = workspaceStore.get()
    const src = cur.activePath
    if (!src) return
    const destRel = transferDestFor(src, dir)
    const wasDirty = cur.dirty
    const prevContent = cur.content ?? ''
    setTransferBusy(true)
    setTransferError(null)
    void (async (): Promise<void> => {
      try {
        // 复制「所见即所存」：脏缓冲先落盘，副本与用户所见一致
        if (mode === 'copy' && wasDirty) await workspaceStore.saveActive()
        const result = await window.api.transferDoc(src, destRel, mode)
        if (mode === 'move') {
          const disk = await window.api.readFile(result.path)
          workspaceStore.openDoc(result.path, disk.content)
          if (wasDirty) {
            const oldAssets = assetsDirNameFor(src)
            const newAssets = assetsDirNameFor(result.path)
            workspaceStore.setContent(
              oldAssets === newAssets ? prevContent : rewriteAssetsRefs(prevContent, oldAssets, newAssets)
            )
          }
          toast({ text: t('editor.transferMoveDone', { path: result.path }), kind: 'success' })
        } else {
          toast({ text: t('editor.transferCopyDone', { path: result.path }), kind: 'success' })
        }
        setTransferOpen(false)
      } catch (err) {
        setTransferError(errText(err))
      } finally {
        setTransferBusy(false)
      }
    })()
  }

  // 常驻订阅：文档操作与专注模式命令只认领自己的一类，其余放行给编辑器实例
  useEffect(() => {
    return subscribeEditorCommands((cmd) => {
      const cur = workspaceStore.get()
      switch (cmd.kind) {
        case 'save': {
          if (cur.activePath) {
            if (cur.dirty) void workspaceStore.saveActive()
          } else if (cur.content) {
            openSaveAs()
          }
          return true
        }
        case 'saveAs': {
          if (cur.content != null) openSaveAs()
          return true
        }
        case 'newDraft': {
          const start = (): void => workspaceStore.startDraft()
          if (cur.dirty && cur.content) {
            void uiConfirm({
              title: t('editor.closeConfirmTitle'),
              message: t('editor.closeConfirm'),
              okText: t('editor.closeConfirmTitle'),
              cancelText: t('common.cancel')
            }).then((ok) => {
              if (ok) start()
            })
          } else {
            start()
          }
          return true
        }
        case 'closeDoc': {
          if (!cur.activePath && cur.content == null) return true
          const close = (): void => workspaceStore.closeDoc()
          if (cur.dirty && cur.content) {
            void uiConfirm({
              title: t('editor.closeConfirmTitle'),
              message: t('editor.closeConfirm'),
              okText: t('editor.closeConfirmTitle'),
              cancelText: t('common.cancel')
            }).then((ok) => {
              if (ok) close()
            })
          } else {
            close()
          }
          return true
        }
        case 'renameDoc': {
          // 草稿态（无 activePath）无可改名文件，认领但 no-op
          if (cur.activePath) executeRename(cmd.newName)
          return true
        }
        case 'transferDoc': {
          if (cur.activePath) openTransfer()
          return true
        }
        case 'toggleFocus': {
          publishEditorLiveState({ focusMode: !getEditorLiveState().focusMode })
          return true
        }
        default:
          return false
      }
    })
  }, [t])

  const confirmSaveAs = async (): Promise<void> => {
    let rel = savePath.trim().replace(/^\/+/, '').replace(/^\.\//, '')
    if (!rel) return
    if (!rel.toLowerCase().endsWith('.md')) rel += '.md'
    setSaving(true)
    setSaveError(null)
    try {
      const content = workspaceStore.get().content ?? ''
      const draftId = workspaceStore.get().activeDraftId
      const result = await window.api.writeFile(rel, content)
      workspaceStore.openDoc(result.path, content)
      // 草稿已落为工作区文件：消费草稿箱对应条目（失败可见但不阻断保存结果）
      if (draftId) void consumeDraft(draftId).catch((err: unknown) => console.warn('草稿消费失败', err))
      setSaveAsOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog
      open={saveAsOpen}
      title={t('editor.saveAsTitle')}
      onClose={() => setSaveAsOpen(false)}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={() => setSaveAsOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => void confirmSaveAs()}
            disabled={saving || savePath.trim().length === 0}
          >
            {t('editor.save')}
          </Button>
        </>
      }
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t('editor.fileNameLabel')}
        </span>
        <Input
          type="text"
          placeholder={t('editor.fileNamePlaceholder')}
          value={savePath}
          onChange={(e) => setSavePath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && savePath.trim()) void confirmSaveAs()
          }}
          autoFocus
        />
      </label>
      {saveError && <DialogError role="alert">{saveError}</DialogError>}
    </Dialog>

    <Dialog
      open={transferOpen}
      title={t('editor.transferTitle')}
      onClose={() => setTransferOpen(false)}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={() => setTransferOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={() => executeTransfer(transferDir, 'move')} disabled={transferBusy}>
            {t('editor.transferMove')}
          </Button>
          <Button size="sm" onClick={() => executeTransfer(transferDir, 'copy')} disabled={transferBusy}>
            {t('editor.transferCopy')}
          </Button>
        </>
      }
    >
      <TransferMeta>{t('editor.transferCurrent', { path: transferSrc })}</TransferMeta>
      <TransferLabel>{t('editor.transferTargetLabel')}</TransferLabel>
      <DirList role="listbox" aria-label={t('editor.transferTargetLabel')}>
        {dirOptions === null && <DirEmpty>{t('editor.transferLoading')}</DirEmpty>}
        {dirOptions?.map((opt) => (
          <DirRow
            key={opt.path || '__root__'}
            type="button"
            role="option"
            aria-selected={transferDir === opt.path}
            $active={transferDir === opt.path}
            $depth={opt.depth}
            title={opt.path}
            onClick={() => setTransferDir(opt.path)}
          >
            {opt.name}
          </DirRow>
        ))}
      </DirList>
      {transferError && <DialogError role="alert">{transferError}</DialogError>}
    </Dialog>
    </>
  )
}
