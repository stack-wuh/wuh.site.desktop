import styled from 'styled-components'

/**
 * Rail 样式（20261017-feature-app-layout-workbench D1 书脊化）：48px 布面深墨竖条——
 * 双向 1px 织纹 + --spine-ink 墨底（亮=normal-900 墨、暗=更深的背景墨，跟随主题
 * 不倒置——20261018 走查裁决）+ 右缘 1px 朱砂装订线（渐隐渐显）；激活指示条/
 * 徽标位/tooltip/点外关/Esc 分层沿袭。Popover 锚定插件条目右侧；Nav 禁
 * overflow:hidden（会裁剪 popover 与 tooltip，shell-chrome-design 卡约束）。
 */

export const Nav = styled.nav`
  position: relative;
  width: 48px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 12px;
  /* 书脊布面：横织纹（透白 3%）+ 纵织纹（压黑 4.5%）+ spine-ink 墨底渐变 */
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.045) 0 1px, transparent 1px 3px),
    linear-gradient(to right, color-mix(in oklab, var(--spine-ink) 94%, #000), var(--spine-ink));
  transition: background-color 0.3s ease;

  /* 朱砂装订线：右缘 1px 渐隐渐显（视觉稿 .spine-strip::after） */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in oklab, var(--primary-400) 85%, transparent) 12%,
      color-mix(in oklab, var(--primary-500) 85%, transparent) 85%,
      transparent
    );
  }
`

export const RailBtn = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: color-mix(in oklab, var(--spine-paper) 62%, transparent);
  cursor: pointer;
  transition: all var(--motion-dur-quick) var(--motion-ease-out-soft);

  &:hover {
    background: color-mix(in oklab, var(--spine-paper) 10%, transparent);
    color: var(--spine-paper);
  }

  /* 按印手感（视觉稿 .sitem:active） */
  &:active {
    transform: scale(0.93);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  /* 左缘激活指示条（SideMenu 能力沿袭；激活态朱色，视觉稿 .sitem.on::before） */
  &::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 9px;
    bottom: 9px;
    width: 2px;
    border-radius: 2px;
    background: transparent;
  }

  ${({ $active }) =>
    $active
      ? `
    color: color-mix(in oklab, var(--primary-300) 90%, #fff);
    background: color-mix(in oklab, var(--primary-500) 26%, transparent);
    &::before {
      background: var(--primary-400);
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
  gap: 4px;
`

export const Badge = styled.span`
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 13px;
  height: 13px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--primary-500);
  color: var(--background-color);
  font-size: 8.5px;
  font-weight: 600;
  line-height: 13px;
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
