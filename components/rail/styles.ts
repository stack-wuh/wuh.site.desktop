import styled from 'styled-components'

/**
 * Rail 样式（20261015-feature-workbench-shell）：恒 48px 图标列。
 * 沿袭 SideMenu 能力：左缘 2px 激活指示条、徽标位、data-tip 自绘 tooltip、
 * 点外关/Esc 分层。Popover 锚定插件条目右侧；Nav 禁 overflow:hidden
 *（会裁剪 popover 与 tooltip，shell-chrome-design 卡约束）。
 */

export const Nav = styled.nav`
  position: relative;
  width: 48px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
  background: var(--chrome-panel);
  border-right: 1px solid var(--chrome-border);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

export const RailBtn = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
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
    outline-offset: -2px;
  }

  /* 左缘激活指示条（SideMenu 能力沿袭） */
  &::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    border-radius: 2px;
    background: transparent;
  }

  ${({ $active }) =>
    $active
      ? `
    color: var(--primary-color);
    background: color-mix(in oklab, var(--primary-color) 12%, transparent);
    &::before {
      background: var(--primary-color);
    }
  `
      : ''}

  /* data-tip 自绘 tooltip：hover 与 :focus-visible 可见（SideMenu 同款） */
  &::after {
    content: attr(data-tip);
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    white-space: nowrap;
    pointer-events: none;
    background: var(--chrome-raised);
    color: var(--text-primary);
    font-size: 12px;
    line-height: 1.4;
    padding: 3px 9px;
    border: 1px solid var(--chrome-border);
    border-radius: var(--border-radius-sm);
    box-shadow: var(--elevation-card);
    opacity: 0;
    transition: opacity 150ms ease-out 120ms;
    z-index: 60;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after {
      transition: none;
    }
  }
`

export const BottomGroup = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`

export const Badge = styled.span`
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--primary-color);
  color: var(--background-color);
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
  text-align: center;
  font-family: var(--font-mono);
`

/** 插件条目包装：relative 锚定 popover 向右弹出 */
export const PluginsWrap = styled.span`
  position: relative;
  display: inline-flex;
`

/** 插件 popover：贴条目右侧；z62 = tooltip(60) 之上、胶囊面板(70) 之下的独立带 */
export const PopCard = styled.div`
  position: absolute;
  left: calc(100% + 8px);
  top: 0;
  min-width: 200px;
  max-height: min(52vh, 480px);
  overflow-y: auto;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: 10px;
  box-shadow: var(--elevation-card);
  padding: 4px;
  z-index: 62;
`
