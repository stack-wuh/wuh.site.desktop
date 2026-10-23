'use client'

/**
 * 控制中心面板级样式原子（20261017-feature-app-layout-workbench D4 重构，原任务中心
 * 面板壳 20260926 拆分）：胶囊展开态 = 470px 浮笺卡——磁贴网格 4×2 + 功能分区
 * （任务/GIT/排版/编辑器/插件）。挂点契约不变（贴 chip 下缘向下弹出、z70、
 * data-capsule-panel 判定）。视觉稿 .cc 无损移植；行级样式内聚各自子单元文件。
 */
import styled from 'styled-components'
import type { CapsuleModuleState } from '@/lib/capsule'

export const Pop = styled.div`
  /* 贴 chip（TitleBar 右侧，垂直居中）下缘向下弹出：panel 顶约落在 TitleBar
     底缘；挂点契约见 components/capsule/Capsule.tsx 头注释 */
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 70;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  width: 470px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  background: var(--background-color);
  border: 1px solid color-mix(in oklab, var(--chrome-border) 60%, transparent);
  border-radius: 16px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 24px 60px rgba(0, 0, 0, 0.18);
  overflow-x: hidden;

  /* 折角：浮笺右上小三角（视觉稿 .cc::before） */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 18px;
    height: 18px;
    z-index: 2;
    background: linear-gradient(
      225deg,
      color-mix(in oklab, var(--background-color) 96%, #000) 0 50%,
      color-mix(in oklab, var(--chrome-border) 70%, var(--background-color)) 50% 100%
    );
    border-left: 1px solid var(--chrome-border);
    border-bottom: 1px solid var(--chrome-border);
    border-radius: 0 0 0 5px;
  }
`

export const PopHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border-bottom: 1px solid color-mix(in oklab, var(--chrome-border) 45%, transparent);

  & > strong {
    font-size: 10.5px;
    font-weight: 400;
    letter-spacing: 0.16em;
    color: var(--text-muted);
  }
`

export const PopCount = styled.span`
  margin-left: auto;
  font-size: 11px;
  font-family: var(--font-mono);
  letter-spacing: 0;
  color: var(--text-secondary);
`

/* 磁贴网格：4×2（视觉稿 .cc .tiles）；磁贴 = 方印图标 + 标签，激活态朱底方印
   + 右上状态点 + 1.5px 朱边，禁圆形 */
export const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px 14px;
`

export const Tile = styled.button<{ $on?: boolean; $wide?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px 8px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--motion-dur-quick) var(--motion-ease-out-soft);

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  ${({ $on }) =>
    $on
      ? `
    border-width: 1.5px;
    border-color: color-mix(in oklab, var(--primary-500) 55%, transparent);
    background: color-mix(in oklab, var(--primary-500) 7%, transparent);
    color: var(--primary-500);

    &::after {
      content: '';
      position: absolute;
      top: 5px;
      right: 5px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--primary-500);
    }
  `
      : ''}

  /* 通栏磁贴（发布，20261020）：整行横排，图标 + 标签 + 状态 + 目标 */
  ${({ $wide }) =>
    $wide
      ? `
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    padding: 10px 12px;
    text-align: left;

    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
  `
      : ''}
`

/* 通栏磁贴状态文本（右推、mono）与目标标签（GITHUB） */
export const TileMeta = styled.span`
  margin-left: auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-secondary);
`

export const TileTag = styled.span`
  flex: none;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-muted);
`

export const TileIcon = styled.span`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1.5px solid color-mix(in oklab, var(--text-muted) 55%, transparent);
  color: var(--text-secondary);

  /* 激活态：朱底方印（方印禁圆形，D4 裁决） */
  button[aria-pressed='true'] & {
    background: var(--primary-500);
    border-color: var(--primary-500);
    color: #fffdfb;
  }
`

/* 功能分区滚动区（视觉稿 .cc .sections）：磁贴之下全部分区纵向滚动；
   Pop 弹性列内 flex:1 收口，头部与磁贴恒定不动 */
export const Sections = styled.div`
  flex: 1;
  min-height: 0;
  border-top: 1px solid color-mix(in oklab, var(--chrome-border) 45%, transparent);
  overflow-y: auto;
`

export const Sect = styled.section`
  padding: 10px 16px 12px;

  & + & {
    border-top: 1px solid color-mix(in oklab, var(--chrome-border) 30%, transparent);
  }
`

export const SectHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 7px;
  font-size: 10.5px;
  letter-spacing: 0.16em;
  color: var(--text-muted);
`

export const MonoMeta = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0;
  color: var(--text-secondary);
`

/* GIT / 排版行（视觉稿 .gitrow）：mono 数据 + grow + 动作小钮 */
export const GitRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
`

export const GitMono = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
`

export const GitGrow = styled.span`
  flex: 1;
`

export const GBtn = styled.button`
  border: 1px solid var(--chrome-border);
  border-radius: 8px;
  background: transparent;
  font-size: 11.5px;
  font-family: var(--font-sans);
  padding: 3px 10px;
  cursor: pointer;
  color: var(--text-secondary);

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  &:hover:not(:disabled) {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

/* 提交信息行内输入（GIT 分区展开态） */
export const GitMsgInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 3px 8px;
  font-size: 11.5px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--background-color);
  border: 1px solid var(--chrome-border);
  border-radius: 8px;
  outline: none;

  &:focus {
    border-color: var(--primary-color);
  }
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

/* 插件页签 sections/rows 渲染容器（书耳页签与控制中心追加分区共用；
   20260925-feature-capsule-plugin-tab 引入）——行 = tone 色点/白名单图标 +
   文本 + detail；含 viewId 的行整行可点跳来源插件视图（button 不嵌套：面板
   本体是 div，安全） */
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

/* 停靠按钮行（task-5 双形态）：面板底缘动作行 */
export const PopFoot = styled.div`
  flex: none;
  border-top: 1px solid var(--chrome-border);
  padding: 8px 10px;

  button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    justify-content: center;
    font-size: 12px;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--chrome-border);
    border-radius: var(--border-radius-sm);
    padding: 6px 11px;
    cursor: pointer;
    transition:
      color 150ms ease-out,
      border-color 150ms ease-out,
      background-color 150ms ease-out;
  }

  button:hover {
    color: var(--primary-color);
    border-color: var(--primary-color);
    background: color-mix(in oklab, var(--primary-color) 8%, transparent);
  }

  button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`
