'use client'

/**
 * 任务中心面板级样式原子（拆分自 CapsulePanel 单文件，20260926-refactor-mega-component-split）：
 * 面板容器/头部/tab 行/筛选 chips/时间线容器/空态等跨子单元共享的 styled 原子；
 * 行级样式内聚在各自子单元文件（TaskTimeline/PluginTabRows）。
 */
import styled from 'styled-components'
import type { CapsuleModuleState } from '../../../lib/capsule'

export const Pop = styled.div`
  /* 贴 chip（TitleBar 右侧，垂直居中）下缘向下弹出：panel 顶约落在 TitleBar
     底缘；挂点契约见 components/capsule/Capsule.tsx 头注释 */
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 70;
  pointer-events: auto;
  width: 420px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 6px 6px 8px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: var(--elevation-card);
`

export const PopHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px 7px;

  & > strong {
    font-size: 13px;
    color: var(--text-primary);
  }
`

export const PopCount = styled.span`
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

/* 头部聚合进度条：done/total，全完成转 success */
export const HeadBar = styled.div`
  height: 3px;
  margin: 0 10px 2px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--chrome-border) 45%, transparent);
  overflow: hidden;
`

/* 头部聚合进度条填充：scaleX 而非 width 过渡（项目约束「布局切换瞬时、禁 width 过渡」，
   transform 不触发布局） */
export const HeadBarFill = styled.div<{ $pct: number; $allDone: boolean }>`
  height: 100%;
  width: 100%;
  border-radius: 999px;
  background: ${({ $allDone }) => ($allDone ? 'var(--success-color)' : 'var(--primary-color)')};
  transform: scaleX(${({ $pct }) => $pct / 100});
  transform-origin: left center;
  transition: transform 300ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const TabRow = styled.div`
  display: flex;
  gap: 2px;
  padding: 0 8px;
  border-bottom: 1px solid var(--chrome-border);
`

export const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px 7px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--primary-color)' : 'transparent')};
  margin-bottom: -1px;
  color: ${({ $active }) => ($active ? 'var(--text-primary)' : 'var(--text-muted)')};
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: color 150ms ease-out;
  /* 溢出防护：tab 多/标题长（ja）时截断而非撑出横向滚动 */
  min-width: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
    border-radius: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 插件 tab 内容：通用 sections/rows 渲染器（20260925-feature-capsule-plugin-tab）——
   分区间 border-top 分隔，行 = tone 色点/白名单图标 + 文本 + detail；含 viewId 的
   行整行可点跳来源插件视图（button 不嵌套：面板本体是 div，安全） */
export const TabSection = styled.section`
  padding: 6px 0 4px;

  & + & {
    border-top: 1px solid var(--chrome-border);
  }
`

export const TabRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 6px 4px;
`

export const FilterRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px 6px;
`

export const FilterChip = styled.button<{ $on: boolean }>`
  padding: 2px 10px;
  background: ${({ $on }) =>
    $on ? 'color-mix(in oklab, var(--primary-color) 14%, transparent)' : 'transparent'};
  border: 1px solid ${({ $on }) =>
    $on ? 'color-mix(in oklab, var(--primary-color) 42%, var(--chrome-border))' : 'var(--chrome-border)'};
  border-radius: 999px;
  color: ${({ $on }) => ($on ? 'var(--primary-color)' : 'var(--text-secondary)')};
  font-size: 11px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background-color 150ms ease-out, border-color 150ms ease-out;

  &:hover {
    border-color: color-mix(in oklab, var(--primary-color) 42%, var(--chrome-border));
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const PluginPill = styled(FilterChip)`
  font-family: var(--font-mono);
  font-size: 10px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* 时间线：左缘脊线（签名元素）——每行 Rail 画贯穿线，相邻行连成事件流 */
export const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  padding: 2px 4px 4px;
`

export const DoneHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 2px;
`

export const DoneLabel = styled.span`
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--text-muted);
`

export const ClearBtn = styled.button`
  margin-left: auto;
  padding: 1px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--primary-color);
  font-size: 10.5px;
  font-family: var(--font-sans);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }
`

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 30px 16px 26px;
  text-align: center;
`

export const EmptyTitle = styled.span`
  font-size: 12.5px;
  color: var(--text-secondary);
`

export const EmptyHint = styled.span`
  font-size: 11px;
  color: var(--text-muted);
`

export const PluginNote = styled.div`
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 10px 2px;
  font-family: var(--font-mono);
`

export const ToneDot = styled.span<{ $tone: NonNullable<CapsuleModuleState['tone']> }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  ${({ $tone }) =>
    $tone === 'primary'
      ? 'background: var(--primary-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'success'
      ? 'background: var(--success-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'warning'
      ? 'background: var(--warning-color);'
      : ''}
  ${({ $tone }) =>
    $tone === 'default'
      ? 'background: var(--text-muted);'
      : ''}
`
