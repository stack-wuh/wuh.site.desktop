'use client'

/**
 * 共享轻量下拉菜单（20261008-feature-image-upload-choice）：编辑工具条与壳层胶囊
 * 图片入口的动作菜单件——触发钮 ghost 图标态（与两处既有按钮同构），点任意项后收起。
 * 契约（interaction.md / 壳层规范）：Escape 关闭且一次按键只关一层（capture + stopPropagation）；
 * 点外关一律 target 归属守卫（根 ref contains 豁免，不依赖事件冒泡时序）；焦点打开时移入
 * 首个可用项、关闭时归还触发钮；颜色只写语义 token，动效仅颜色类且响应 reduced-motion。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'

export interface MenuPopoverOption {
  id: string
  label: string
  disabled?: boolean
  onSelect: () => void
}

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
`

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: var(--border-radius-sm, 5px);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    border-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &[aria-expanded='true'] {
    background: var(--chrome-hover);
    border-color: color-mix(in oklab, var(--primary-color) 42%, var(--chrome-border));
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 120;
  min-width: 168px;
  padding: 4px;
  background: var(--chrome-raised);
  border: 1px solid color-mix(in oklab, var(--chrome-border) 72%, transparent);
  border-radius: var(--border-radius-md);
  box-shadow: 0 8px 24px color-mix(in oklab, var(--text-primary) 14%, transparent);
`

const Item = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border: none;
  border-radius: var(--border-radius-sm, 5px);
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 12px;
  cursor: pointer;
  transition: background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  &:hover:not(:disabled) {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export function MenuPopover(props: {
  ariaLabel: string
  icon: ReactNode
  options: MenuPopoverOption[]
}): React.JSX.Element {
  const { ariaLabel, icon, options } = props
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())
  const wasOpen = useRef(false)

  // 开合期监听只在 open 时挂（避免常驻 window 监听的时序坑，见壳层点外关契约）
  useEffect(() => {
    if (!open) return
    const onDown = (event: Event): void => {
      const root = wrapRef.current
      if (root && !root.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  // 焦点管理：打开移入首个可用项；关闭归还触发钮（仅当焦点不在触发钮上）
  useEffect(() => {
    if (open) {
      const first = options.find((o) => !o.disabled)
      if (first) itemRefs.current.get(first.id)?.focus()
    } else if (wasOpen.current && document.activeElement !== triggerRef.current) {
      triggerRef.current?.focus()
    }
    wasOpen.current = open
  }, [open, options])

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        title={ariaLabel}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
      </Trigger>
      {open && (
        <Panel role="menu" aria-label={ariaLabel}>
          {options.map((option) => (
            <Item
              key={option.id}
              type="button"
              role="menuitem"
              disabled={option.disabled === true}
              ref={(el) => {
                if (el) itemRefs.current.set(option.id, el)
                else itemRefs.current.delete(option.id)
              }}
              onClick={() => {
                option.onSelect()
                setOpen(false)
              }}
            >
              {option.label}
            </Item>
          ))}
        </Panel>
      )}
    </Wrap>
  )
}
