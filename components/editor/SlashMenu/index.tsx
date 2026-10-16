'use client'

/**
 * 呼墨（素笺手记 20261014-feature-editor-paper-rebuild）：行首 `/` 唤出的插入工具匣。
 * 条目 = 既有命令词表的动作集（insert 片段 / format 引用 / insertImageFromFile）
 * + insertCard（链接笺条）；键入即筛选（label/desc/别名），↑↓ 换高亮、Enter 落墨、
 * Esc 收匣——焦点恒留编辑器（虚拟高亮），本组件纯展示 + 指针选择。
 * 落墨与查询行消费（cmConsumeSlashLine，纯函数）由 MarkdownEditor 装配。
 */
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { AppIcon } from '../../ui/AppIcon'
import {
  IconCode,
  IconImage,
  IconLink,
  IconMinus,
  IconQuote,
  IconTable
} from '../../icons'
import { useLocale } from '../../../lib/i18n/context'
import { Empty, EscChip, Head, Item, ItemDesc, ItemIcon, ItemLabel, ItemText, Panel, Sep } from './styles'

export type SlashKind = 'hr' | 'table' | 'card' | 'image' | 'codeBlock' | 'quote'

interface SlashCatalogItem {
  kind: SlashKind
  labelKey: string
  descKey: string
  /** 筛选别名（ascii，随 label/desc 一起参与 includes 匹配） */
  alias: string
  icon: typeof IconMinus
}

export const SLASH_CATALOG: SlashCatalogItem[] = [
  { kind: 'hr', labelKey: 'editor.slashHr', descKey: 'editor.slashHrDesc', alias: 'hr divider', icon: IconMinus },
  { kind: 'table', labelKey: 'editor.slashTable', descKey: 'editor.slashTableDesc', alias: 'table', icon: IconTable },
  { kind: 'card', labelKey: 'editor.slashCard', descKey: 'editor.slashCardDesc', alias: 'card link', icon: IconLink },
  { kind: 'image', labelKey: 'editor.slashImage', descKey: 'editor.slashImageDesc', alias: 'image picture', icon: IconImage },
  { kind: 'codeBlock', labelKey: 'editor.slashCode', descKey: 'editor.slashCodeDesc', alias: 'code fence', icon: IconCode },
  { kind: 'quote', labelKey: 'editor.slashQuote', descKey: 'editor.slashQuoteDesc', alias: 'quote blockquote', icon: IconQuote }
]

export interface SlashMenuHandle {
  /** 高亮移动（键盘 ↑↓；循环） */
  move(delta: number): void
  /** 落墨当前高亮项（Enter） */
  choose(): void
}

export interface SlashMenuProps {
  /** 相对编辑器挂载容器的坐标（px） */
  x: number
  y: number
  filter: string
  onPick: (kind: SlashKind) => void
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { x, y, filter, onPick },
  ref
) {
  const { t } = useLocale()
  const [hi, setHi] = useState(0)
  const hiRef = useRef(0)
  const setHiSafe = (n: number): void => {
    hiRef.current = n
    setHi(n)
  }

  const items = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return SLASH_CATALOG
    return SLASH_CATALOG.filter((item) => {
      const label = t(item.labelKey).toLowerCase()
      const desc = t(item.descKey).toLowerCase()
      return label.includes(q) || desc.includes(q) || item.alias.includes(q)
    })
    // t 随语言切换变化即重算（筛选口径跟随语言）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, t])

  useImperativeHandle(ref, () => ({
    move(delta: number): void {
      if (items.length === 0) return
      setHiSafe((hiRef.current + delta + items.length) % items.length)
    },
    choose(): void {
      const item = items[hiRef.current]
      if (item) onPick(item.kind)
    }
  }))

  // 条目集变化（键入筛选）时收敛高亮到界内
  if (hi >= items.length && hiRef.current !== 0) setHiSafe(items.length > 0 ? items.length - 1 : 0)

  return (
    <Panel style={{ left: Math.max(0, x), top: y }} role="listbox" aria-label={t('editor.slashTitle')} data-testid="slash-menu">
      <Head>
        <span>{t('editor.slashTitle')}</span>
        <EscChip>esc</EscChip>
      </Head>
      {items.length === 0 ? (
        <Empty>{t('editor.slashEmpty')}</Empty>
      ) : (
        items.map((item, i) => (
          <Item
            key={item.kind}
            role="option"
            aria-selected={i === hi}
            data-testid={`slash-item-${item.kind}`}
            onClick={() => onPick(item.kind)}
            onMouseEnter={() => setHiSafe(i)}
          >
            <ItemIcon>
              <AppIcon icon={item.icon} size="sm" decorative />
            </ItemIcon>
            <ItemText>
              <ItemLabel>{t(item.labelKey)}</ItemLabel>
              <ItemDesc>{t(item.descKey)}</ItemDesc>
            </ItemText>
          </Item>
        ))
      )}
      {items.length > 0 && <Sep />}
    </Panel>
  )
})
