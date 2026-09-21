'use client'

/**
 * 设置页粘性锚点导航：桌面为左列竖排（sticky），≤768px 折叠为顶部横向 chips。
 * scroll-spy 监听 containerRef 滚动，激活项 = 滚动位置以上最近的分区；
 * 点击滚动定位（reduced-motion 下瞬时跳转）。激活态 = primary 文字 + 左缘指示条。
 */
import { useEffect, useState } from 'react'
import styled from 'styled-components'

export interface SettingsNavItem {
  id: string
  label: string
}

interface Props {
  items: SettingsNavItem[]
  /** 滚动容器（设置页根元素）：滚动监听与定位基准 */
  containerRef: React.RefObject<HTMLElement | null>
}

const Nav = styled.nav`
  position: sticky;
  top: 8px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 2px;

  @media (max-width: 768px) {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 2px;
  }
`

const Item = styled.button<{ $active: boolean }>`
  position: relative;
  display: block;
  width: 100%;
  padding: 5px 10px 5px 12px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-family: var(--font-sans);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--transition-fast) ease,
    background-color var(--transition-fast) ease;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 2px;
    border-radius: 1px;
    background: var(--primary-color);
    opacity: 0;
    transition: opacity var(--transition-fast) ease;
  }

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary-color) 30%, transparent);
  }

  ${(props) =>
    props.$active &&
    `
    color: var(--primary-color);
    background: var(--chrome-hover);

    &::before {
      opacity: 1;
    }
  `}

  @media (max-width: 768px) {
    width: auto;
    flex-shrink: 0;
    padding: 4px 10px;

    &::before {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export function SettingsNav(props: Props): React.JSX.Element {
  const { items, containerRef } = props
  const [activeId, setActiveId] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const update = (): void => {
      const base = container.getBoundingClientRect().top
      let current = items[0]?.id ?? ''
      for (const item of items) {
        const el = document.getElementById(item.id)
        if (!el) continue
        if (el.getBoundingClientRect().top - base <= 64) current = item.id
      }
      setActiveId(current)
    }

    update()
    container.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [items, containerRef])

  const navigate = (id: string): void => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <Nav aria-label="设置分区导航">
      {items.map((item) => (
        <Item
          key={item.id}
          type="button"
          $active={activeId === item.id}
          aria-current={activeId === item.id ? 'true' : undefined}
          onClick={() => navigate(item.id)}
        >
          {item.label}
        </Item>
      ))}
    </Nav>
  )
}
