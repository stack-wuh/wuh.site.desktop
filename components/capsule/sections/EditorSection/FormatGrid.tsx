'use client'

/**
 * 格式+插入图标网格（拆分自 EditorSection/index，20260927-refactor-editor-section-cleanup）：
 * 九个格式化按钮 + 插图/表格/代码块/分割线 + 撤销重做 + 大纲/项目/文件三个面板开关；
 * 格式化/插入经 editor-commands 发布，面板开关由宿主回调切换。
 */
import { AppIcon } from '../../../ui/AppIcon'
import {
  IconBold,
  IconCode,
  IconFile,
  IconFolderOpen,
  IconHeading1,
  IconHeading2,
  IconImage,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconListTree,
  IconMinus,
  IconQuote,
  IconRedo,
  IconTable,
  IconUndo
} from '../../../icons'
import type { IconComponent } from '../../../ui/AppIcon'
import type { MarkdownInsertAction } from '../../../../lib/store'
import { publishEditorCommand } from '../../../../lib/editor-commands'
import { useLocale } from '../../../../lib/i18n/context'
import { IconBtn, IconRow } from './styles'

export type SubPanelKind = 'none' | 'outline' | 'workspace' | 'file' | 'typeset' | 'kbd'

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

export function FormatGrid(props: {
  panel: SubPanelKind
  onTogglePanel: (kind: SubPanelKind) => void
}): React.JSX.Element {
  const { t } = useLocale()
  const { panel } = props
  const togglePanel = props.onTogglePanel
  return (
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
  )
}
