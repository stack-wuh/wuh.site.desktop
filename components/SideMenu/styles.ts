'use client'

/**
 * 侧栏菜单样式原子（拆分自 SideMenu 单文件，20260926-refactor-mega-component-split）：
 * nav 骨架、条目（激活指示条/自绘 tooltip/徽标位）、子树容器与旋钮、底部用户区。
 * 结构约束原样保留：nav 不设 overflow:hidden（tooltip 与快捷面板需溢出显示）、
 * 布局切换瞬时（禁 width 过渡）、reduced-motion 降级。
 */
import styled, { keyframes } from 'styled-components'

export const Nav = styled.nav<{ $expanded: boolean }>`
  width: ${(props) => (props.$expanded ? '220px' : '48px')};
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  background: var(--background-color);
  border-right: 1px solid var(--chrome-border);
  /* 不设 overflow:hidden：tooltip 与用户快捷面板需溢出 rail 显示 */
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

export const Group = styled.div<{ $expanded: boolean; $tail?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 6px;
  align-items: stretch;

  ${(props) =>
    !props.$expanded &&
    `
    align-items: center;
    gap: 4px;
    padding: 0;
  `}

  /* tail 组吸附底部：设置入口 + 用户占位区 */
  ${(props) =>
    props.$tail &&
    `
    margin-top: auto;
  `}
`

export const Item = styled.button<{ $expanded: boolean; $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-base);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--transition-fast) ease,
    background var(--transition-fast) ease;

  ${(props) =>
    props.$expanded &&
    `
    width: auto;
    height: 36px;
    justify-content: flex-start;
    gap: 10px;
    padding: 0 10px;
  `}

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  ${(props) =>
    props.$active &&
    `
    color: var(--primary-color);
    background: color-mix(in oklab, var(--primary-color) 12%, transparent);

    /* 左缘激活指示条（贴 rail 左缘） */
    &::before {
      background: var(--primary-color);
    }
  `}

  /* 指示条槽位（默认透明） */
  &::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    border-radius: 1px;
    background: transparent;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  /* 自绘 tooltip：仅收起态（展开态已有文字标签），hover/键盘聚焦可见 */
  ${(props) =>
    !props.$expanded &&
    `
    &::after {
      content: attr(data-tip);
      position: absolute;
      left: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
      padding: 4px 10px;
      border-radius: var(--border-radius-sm);
      background: var(--chrome-raised);
      border: 1px solid var(--chrome-border);
      color: var(--text-primary);
      font-size: 12px;
      font-family: var(--font-sans);
      white-space: nowrap;
      box-shadow: var(--elevation-soft);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-fast) ease;
      z-index: 60;
    }

    &:hover::after,
    &:focus-visible::after {
      opacity: 1;
    }
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::after {
      transition: none;
    }
  }
`

const labelIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

/** 条目子树容器：仅展开态渲染在条目行下方；高度封顶自滚动，避免撑破 nav（nav 不设 overflow） */
export const TreeWrap = styled.div`
  margin: 0 2px 4px;
  max-height: min(52vh, 560px);
  overflow-y: auto;
  overscroll-behavior: contain;
`

/** 子树展开旋钮：span 仿按钮（Item 本体是 button，避免 button 嵌套），点击不冒泡到条目导航。
 * data-ghost 变体（设置行收起旋钮专用）：默认透明，hover/focus 才显形——降噪「怪字符」观感 */
export const TreeKnob = styled.span<{ $open: boolean }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    background var(--transition-fast) ease,
    color var(--transition-fast) ease;
  transform: rotate(${(props) => (props.$open ? 90 : 0)}deg);

  &[data-ghost='true'] {
    color: transparent;
  }

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  &:hover[data-ghost='true'],
  &[data-ghost='true']:focus-visible {
    color: var(--text-muted);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const Label = styled.span`
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 13px;
  font-family: var(--font-sans);
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 展开态文字仅 opacity 淡入（布局切换本身瞬时，遵守禁 width 过渡约束） */
  animation: ${labelIn} 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const Badge = styled.span<{ $dot: boolean; $expanded: boolean }>`
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--primary-color);
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  font-weight: 700;
  text-align: center;

  ${(props) =>
    props.$expanded
      ? `
    position: static;
    flex-shrink: 0;
  `
      : `
    position: absolute;
    top: 4px;
    right: 3px;
  `}

  ${(props) =>
    props.$dot &&
    `
    width: 8px;
    min-width: 8px;
    padding: 0;
    ${props.$expanded ? '' : 'top: 6px; right: 5px;'}
  `}
`

/* 快捷面板锚点（设置项 hover 面板挂点）：右侧弹出（nav 不得 overflow:hidden，否则被裁剪）。
 * 收起态图标居中；展开态条目通栏拉伸（flex-direction 切换让 Item 占满行宽，与导航行同栅格），
 * 修复 consolidation 引入的「展开态设置行被 justify-content:center 整团居中」回归 */
export const PopAnchor = styled.div<{ $expanded: boolean }>`
  position: relative;
  display: flex;
  width: 100%;

  ${(props) =>
    props.$expanded
      ? `
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
  `
      : `
    align-items: center;
    justify-content: center;
  `}
`

export const User = styled.button<{ $expanded: boolean; $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${(props) => (props.$expanded ? 'flex-start' : 'center')};
  gap: 10px;
  width: 100%;
  height: 42px;
  padding: ${(props) => (props.$expanded ? '0 10px' : '0 4px')};
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: background var(--transition-fast) ease;

  &:hover,
  &:focus-visible {
    background: var(--chrome-hover);
    outline: none;
  }

  ${(props) =>
    props.$active &&
    `
    background: color-mix(in oklab, var(--primary-color) 12%, transparent);
    color: var(--primary-color);
  `}
`

export const UserWrap = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
  padding-top: 6px;
  border-top: 1px solid var(--chrome-border);
`

/* 悬停快捷面板：底部入口右侧弹出（nav 不得 overflow:hidden，否则被裁剪） */
export const UserPop = styled.div`
  position: absolute;
  bottom: 0;
  left: calc(100% + 8px);
  z-index: 70;
  min-width: 200px;
  padding: 6px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
`

export const PopGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;

  & + & {
    border-top: 1px solid var(--chrome-border);
  }
`

export const PopItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  padding: 5px 10px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  text-align: left;

  &:hover:not(:disabled) {
    background: var(--chrome-hover);
  }

  &:disabled {
    color: var(--text-muted);
    cursor: default;
  }

  & > svg,
  & > span.icon {
    color: var(--primary-color);
  }
`

export const UserMeta = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  animation: ${labelIn} 200ms ease-out;

  & > strong {
    font-size: 12px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** GitHub 头像不再入壳层：远程图片（avatars.githubusercontent.com）网络不可靠时常破损，
 * 图标恒为品牌标，头像显示待 Settings「用户设置」本地接管；此处仅保留用户名文本投影。 */

export const UserVersion = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

/* 二级 popover：锚定触发行右侧（锚点相对定位，nav 不设 overflow:hidden 不裁剪） */
export const SubAnchor = styled.div`
  position: relative;
`

export const SubPop = styled.div`
  position: absolute;
  top: 0;
  left: calc(100% + 8px);
  z-index: 80;
  min-width: 128px;
  padding: 6px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
`
