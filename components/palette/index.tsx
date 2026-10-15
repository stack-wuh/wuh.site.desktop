'use client'

/**
 * ⌘K 命令面板（20261015-feature-workbench-shell task-10）：全局动作入口——
 * 导航/文档动作/模式三组壳层命令内建（run 闭包持 router/命令通道/focus 总线），
 * 插件命令组来自 lib/commands 注册表（manifest commands 声明制，P5 接线执行）。
 * 交互：输入过滤（标题+关键词小写包含）、↑↓ 选择 + Enter 执行、Esc/点外关
 * （target 归属守卫，20260924-fix-capsule-self-close 先例）。z85。
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '../ui/AppIcon'
import { IconCommand, IconSearch } from '../icons'
import {
  getEditorLiveState,
  publishEditorLiveState
} from '../../lib/editor-state'
import { publishEditorCommand } from '../../lib/editor-commands'
import { paletteCommandsStore } from '../../lib/commands'
import { closePalette, paletteStore } from '../../lib/palette'
import { useLocale } from '../../lib/i18n/context'
import { Box, Empty, Group, InputRow, Item, ItemKbd, List, Overlay } from './styles'

type Query = string

export function Palette(): React.JSX.Element | null {
  const { t } = useLocale()
  const router = useRouter()
  const ui = useSyncExternalStore(paletteStore.subscribe, paletteStore.get, paletteStore.get)
  useSyncExternalStore(paletteCommandsStore.subscribe, paletteCommandsStore.get, paletteCommandsStore.get)
  const [query, setQuery] = useState<Query>('')
  const [hot, setHot] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const commands = useMemo(() => {
    const nav = [
      { id: 'shell:home', title: t('palette.home'), keywords: 'home', run: (): void => void router.push('/') },
      { id: 'shell:projects', title: t('palette.projects'), keywords: 'projects', run: (): void => void router.push('/projects') },
      { id: 'shell:drafts', title: t('palette.drafts'), keywords: 'drafts', run: (): void => void router.push('/drafts') },
      { id: 'shell:settings', title: t('menu.settings'), keywords: 'settings', run: (): void => void router.push('/settings') },
      { id: 'shell:account', title: t('menu.userAria'), keywords: 'account user', run: (): void => void router.push('/account') }
    ]
    const doc = [
      { id: 'shell:new', title: t('palette.newDoc'), keywords: 'new draft', run: (): void => { publishEditorCommand({ kind: 'newDraft' }); void router.push('/editor') } },
      // publishEditorCommand 返回 boolean 消费标记，命令 run 语义为 void
      { id: 'shell:save', title: t('palette.save'), keywords: 'save ⌘s', run: (): void => { publishEditorCommand({ kind: 'save' }) } }
    ]
    const mode = [
      {
        id: 'shell:focus',
        title: getEditorLiveState().focusMode ? t('palette.exitFocus') : t('palette.enterFocus'),
        keywords: 'focus',
        run: (): void => publishEditorLiveState({ focusMode: !getEditorLiveState().focusMode })
      }
    ]
    const plugin = paletteCommandsStore.get().commands
    return [
      { key: 'nav', label: t('palette.groupNav'), items: nav },
      { key: 'doc', label: t('palette.groupDoc'), items: doc },
      { key: 'plugin', label: t('palette.groupPlugin'), items: plugin },
      { key: 'mode', label: t('palette.groupMode'), items: mode }
    ]
    // focusMode 标题随状态翻转：组件在 open 态下重渲染时刷新（开合驱动）
  }, [t, router, ui.open])

  const q = query.trim().toLowerCase()
  const groups = useMemo(
    () =>
      commands
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => !q || `${item.title} ${item.keywords}`.toLowerCase().includes(q))
        }))
        .filter((g) => g.items.length > 0),
    [commands, q]
  )
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  useEffect(() => {
    setHot(0)
  }, [query])

  useEffect(() => {
    if (ui.open) {
      setQuery('')
      setHot(0)
      // 打开即聚焦（effect 在提交后同步执行，测试与键盘路径都依赖）
      inputRef.current?.focus()
    }
  }, [ui.open])

  useEffect(() => {
    if (!ui.open) return
    const onClick = (e: MouseEvent): void => {
      const el = rootRef.current
      if (el && e.target instanceof Node && el.contains(e.target)) return
      closePalette()
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [ui.open])

  if (!ui.open) return null

  const runItem = (run: () => void): void => {
    closePalette()
    run()
  }

  const onListKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHot((h) => Math.min(h + 1, Math.max(flat.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHot((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flat[hot]
      if (item) runItem(item.run)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closePalette()
    }
  }

  return (
    <Overlay ref={rootRef}>
      <Box data-testid="palette" role="dialog" aria-modal="true" aria-label={t('palette.aria')}>
        <InputRow>
          <AppIcon icon={IconCommand} size="sm" decorative />
          <input
            ref={inputRef}
            data-testid="palette-input"
            value={query}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.aria')}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onListKey}
          />
          <kbd>esc</kbd>
        </InputRow>
        <List data-testid="palette-list" onKeyDown={onListKey}>
          {flat.length === 0 ? (
            <Empty data-testid="palette-empty">{t('palette.empty')}</Empty>
          ) : (
            groups.map((g) => (
              <div key={g.key}>
                <Group>{g.label}</Group>
                {g.items.map((item) => {
                  const idx = flat.indexOf(item)
                  const isHot = idx === hot
                  return (
                    <Item
                      key={item.id}
                      type="button"
                      data-hot={isHot ? 'true' : undefined}
                      $hot={isHot}
                      onClick={() => runItem(item.run)}
                    >
                      <AppIcon icon={IconSearch} size="xs" decorative />
                      {item.title}
                    </Item>
                  )
                })}
              </div>
            ))
          )}
        </List>
        {/* 键盘提示 */}
        <span style={{ display: 'none' }}>
          <ItemKbd>↑↓</ItemKbd>
        </span>
      </Box>
    </Overlay>
  )
}
