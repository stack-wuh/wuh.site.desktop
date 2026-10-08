'use client'

/**
 * 编辑区工具条（20260924-feature-editor-toolbar）：命令通道的又一个纯发布方——
 * 词表复用既有 EditorCommand（format×9 与胶囊 EditorSection 同一动作表、insert×3），
 * 不接触编辑器实例。挂载于首页编辑面板上下文行之下与 /editor 页顶栏之下
 * （knowledge/editor.md 命令通道段：UI 与编辑器解耦的唯一桥梁）。
 * 图片钮（20261008-feature-image-upload-choice）升级为共享 MenuPopover 下拉：
 * 粘贴剪贴板图 / 选择本地图片上传 / 切换光标行图片链接形态——可用性取自
 * editor-state 实时总线（content+cursorLine）经 imageSwitchAvailable 纯逻辑判定。
 */
import styled from 'styled-components'
import { useWorkspaceStore, type MarkdownInsertAction } from '../../lib/store'
import type { InsertSnippetName } from '../../lib/editor-commands'
import { publishEditorCommand } from '../../lib/editor-commands'
import { useEditorLiveState } from '../../lib/editor-state'
import { imageSwitchAvailable } from '../../lib/editor-image-mapping'
import { useLocale } from '../../lib/i18n/context'
import { AppIcon, type IconComponent } from '../ui/AppIcon'
import { MenuPopover } from '../ui/MenuPopover'
import {
  IconBold,
  IconCode,
  IconHeading1,
  IconHeading2,
  IconImage,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconMinus,
  IconQuote,
  IconTable
} from '../icons'

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

const INSERT_ITEMS: { snippet: InsertSnippetName; icon: IconComponent; labelKey: string }[] = [
  { snippet: 'table', icon: IconTable, labelKey: 'editor.fmtTable' },
  { snippet: 'codeBlock', icon: IconCode, labelKey: 'editor.fmtCodeBlock' },
  { snippet: 'hr', icon: IconMinus, labelKey: 'editor.fmtHr' }
]

const ToolbarRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1px;
  padding: 2px 10px 5px;
`

const ToolButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 5px;
  border: none;
  border-radius: var(--border-radius-sm, 5px);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--primary-color) 55%, transparent);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Divider = styled.span`
  flex: none;
  width: 1px;
  height: 14px;
  background: var(--chrome-border);
  margin: 0 4px;
`

export function EditorToolbar(): React.JSX.Element {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const live = useEditorLiveState()
  const switchAvailable = imageSwitchAvailable(doc.content ?? '', live.cursorLine)

  return (
    <ToolbarRow role="toolbar" aria-label={t('editor.fmtAria')}>
      {FORMAT_ITEMS.map(({ action, icon, labelKey }) => (
        <ToolButton
          key={action}
          type="button"
          title={t(labelKey)}
          aria-label={t(labelKey)}
          onClick={() => publishEditorCommand({ kind: 'format', action })}
        >
          <AppIcon icon={icon} size="xs" decorative />
        </ToolButton>
      ))}
      <Divider />
      {INSERT_ITEMS.map(({ snippet, icon, labelKey }) => (
        <ToolButton
          key={snippet}
          type="button"
          title={t(labelKey)}
          aria-label={t(labelKey)}
          onClick={() => publishEditorCommand({ kind: 'insert', snippet })}
        >
          <AppIcon icon={icon} size="xs" decorative />
        </ToolButton>
      ))}
      <Divider />
      <MenuPopover
        ariaLabel={t('editor.imageMenu')}
        icon={<AppIcon icon={IconImage} size="xs" decorative />}
        options={[
          {
            id: 'clipboard',
            label: t('editor.fmtImage'),
            onSelect: () => publishEditorCommand({ kind: 'insertClipboardImage' })
          },
          {
            id: 'local',
            label: t('editor.imagePickLocal'),
            onSelect: () => publishEditorCommand({ kind: 'insertImageFromFile' })
          },
          {
            id: 'switch',
            label: t('editor.imageSwitch'),
            disabled: !switchAvailable,
            onSelect: () => publishEditorCommand({ kind: 'switchImageLinkForm' })
          }
        ]}
      />
    </ToolbarRow>
  )
}
