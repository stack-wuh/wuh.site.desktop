'use client'

/**
 * 排版/快捷键手风琴 + 导出双卡（拆分自 EditorSection/index，
 * 20260927-refactor-editor-section-cleanup）：排版步进（stepTypography）
 * 与导出状态（exportMsg/runExport）内聚本组件；面板开合由宿主持有并注入。
 */
import { useState } from 'react'
import { AppIcon } from '../../../ui/AppIcon'
import { IconCopy, IconExternalLink } from '../../../icons'
import { publishEditorLiveState, useEditorLiveState, type EditorTypography } from '../../../../lib/editor-state'
import { copyAsHtml, exportHtmlFile } from '../../../../lib/editor-export'
import { useLocale } from '../../../../lib/i18n/context'
import {
  KbdTable,
  ModuleCard,
  ModuleGrid,
  ModuleHead,
  ModuleIcon,
  ModuleRow,
  ModuleSub,
  RowChevron,
  Stepper,
  StepperLine,
  SubPanel
} from '../../modules'
import type { SubPanelKind } from './FormatGrid'

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

export function PanelsExport(props: {
  panel: SubPanelKind
  onTogglePanel: (kind: SubPanelKind) => void
}): React.JSX.Element {
  const { t } = useLocale()
  const live = useEditorLiveState()
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const { panel } = props
  const togglePanel = props.onTogglePanel

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
    <>
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
    </>
  )
}
