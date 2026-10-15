'use client'

/**
 * 笔帘（素笺手记 20261014-feature-editor-paper-rebuild）：选区上方浮出的格式工具帘。
 * 动作 = 既有 format 词表（粗/斜/删/行内码/链接）+「转为笺条」（format link——
 * 选区为独立 URL 时包裹成整行链接，渲染态即成笺条）；「转为笺条」在选区不是
 * http(s) URL 时置灰（禁用态颜色变化而非隐藏，interaction 规范）。
 * 显隐与定位由 MarkdownEditor 装配（选区稳定 300ms 浮现、Esc/选区消失即收，
 * 焦点恒留编辑器）；按钮 mousedown 阻断默认行为保住编辑器选区。
 */
import { AppIcon } from '../../ui/AppIcon'
import { IconBold, IconCode, IconFile, IconItalic, IconLink, IconStrikethrough } from '../../icons'
import { useLocale } from '../../../lib/i18n/context'
import type { MarkdownInsertAction } from '../../../lib/store'
import { Bar, BarButton, Sep } from './styles'

export interface SelectionToolbarProps {
  /** 相对编辑器挂载容器的坐标（px；x 为选区中点，组件自平移居中） */
  x: number
  y: number
  /** 选区是否为可转笺条的 http(s) URL */
  canCard: boolean
  onAction: (action: MarkdownInsertAction) => void
}

export function SelectionToolbar({ x, y, canCard, onAction }: SelectionToolbarProps): React.JSX.Element {
  const { t } = useLocale()

  const press = (action: MarkdownInsertAction): void => {
    onAction(action)
  }

  return (
    <Bar
      style={{ left: Math.max(28, x), top: y }}
      role="toolbar"
      aria-label={t('editor.tbAria')}
      data-testid="selection-toolbar"
    >
      <BarButton
        type="button"
        aria-label={t('editor.tbBold')}
        title={t('editor.tbBold')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press('bold')}
      >
        <AppIcon icon={IconBold} size="sm" decorative />
      </BarButton>
      <BarButton
        type="button"
        aria-label={t('editor.tbItalic')}
        title={t('editor.tbItalic')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press('italic')}
      >
        <AppIcon icon={IconItalic} size="sm" decorative />
      </BarButton>
      <BarButton
        type="button"
        aria-label={t('editor.tbDel')}
        title={t('editor.tbDel')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press('del')}
      >
        <AppIcon icon={IconStrikethrough} size="sm" decorative />
      </BarButton>
      <BarButton
        type="button"
        aria-label={t('editor.tbCode')}
        title={t('editor.tbCode')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press('code')}
      >
        <AppIcon icon={IconCode} size="sm" decorative />
      </BarButton>
      <BarButton
        type="button"
        aria-label={t('editor.tbLink')}
        title={t('editor.tbLink')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press('link')}
      >
        <AppIcon icon={IconLink} size="sm" decorative />
      </BarButton>
      <Sep />
      <BarButton
        type="button"
        aria-label={t('editor.cardAction')}
        title={t('editor.cardAction')}
        disabled={!canCard}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => press('link')}
        data-testid="tb-card"
      >
        <AppIcon icon={IconFile} size="sm" decorative />
      </BarButton>
    </Bar>
  )
}
