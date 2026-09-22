'use client'

/**
 * 全量版 Markdown 插入工具栏（20260922 首页编辑器面板）：
 * 插入逻辑为纯函数 applyMarkdownInsert（见 lib/store.ts，可独立测试），
 * 组件只负责图标按钮行——图标一律取自 components/icons 注册表。
 */
import styled from 'styled-components'
import type { MarkdownInsertAction } from '../../lib/store'
import { AppIcon } from '../ui/AppIcon'
import {
  IconBold,
  IconCode,
  IconHeading1,
  IconHeading2,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconQuote
} from '../icons'
import { useLocale } from '../../lib/i18n/context'

export type { MarkdownInsertAction } from '../../lib/store'

interface Props {
  /** 执行插入（EditorPanel 持有 textarea，负责套用结果与还原选区） */
  onInsert: (action: MarkdownInsertAction) => void
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  padding: 8px 10px 0;
`

const ToolButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: var(--border-radius-base);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color 120ms ease-out,
    color 120ms ease-out;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ACTIONS: Array<{ action: MarkdownInsertAction; key: string; icon: typeof IconBold }> = [
  { action: 'h1', key: 'editor.fmtH1', icon: IconHeading1 },
  { action: 'h2', key: 'editor.fmtH2', icon: IconHeading2 },
  { action: 'bold', key: 'editor.fmtBold', icon: IconBold },
  { action: 'italic', key: 'editor.fmtItalic', icon: IconItalic },
  { action: 'ul', key: 'editor.fmtUl', icon: IconList },
  { action: 'ol', key: 'editor.fmtOl', icon: IconListOrdered },
  { action: 'quote', key: 'editor.fmtQuote', icon: IconQuote },
  { action: 'code', key: 'editor.fmtCode', icon: IconCode },
  { action: 'link', key: 'editor.fmtLink', icon: IconLink }
]

export function FormatToolbar(props: Props): React.JSX.Element {
  const { t } = useLocale()
  return (
    <Bar role="toolbar" aria-label={t('editor.fmtAria')}>
      {ACTIONS.map(({ action, key, icon }) => (
        <ToolButton
          key={action}
          type="button"
          title={t(key)}
          aria-label={t(key)}
          onClick={() => props.onInsert(action)}
        >
          <AppIcon icon={icon} size="sm" />
        </ToolButton>
      ))}
    </Bar>
  )
}
