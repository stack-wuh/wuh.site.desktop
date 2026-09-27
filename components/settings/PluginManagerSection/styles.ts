'use client'

/**
 * 设置页插件区块样式原子（拆分自 PluginManagerSection 单文件，
 * 20260927-refactor-midsize-component-split）：插件卡（图标/标题/权限 pill/
 * 动作区）、skeleton 加载态与 manifest 校验问题列表。
 */
import styled, { keyframes } from 'styled-components'

export const List = styled.ul`
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const Card = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  background: var(--background-color);
`

export const IconTile = styled.div`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-sm);
  background: var(--chrome-hover);
  color: var(--primary-color);
  font-size: 13px;
`

export const CardMain = styled.div`
  flex: 1;
  min-width: 0;
`

export const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  & > strong {
    color: var(--text-primary);
    font-size: 13px;
  }
`

export const Pill = styled.span<{ $accent?: boolean }>`
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 11px;
  border: 1px solid var(--chrome-border);
  color: var(--text-muted);
  white-space: nowrap;

  ${(props) =>
    props.$accent &&
    `
    color: var(--primary-color);
    border-color: var(--primary-color);
  `}
`

export const PermRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
`

export const SourceText = styled.span`
  font-size: 11px;
  color: var(--text-muted);
`

export const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const shimmer = keyframes`
  from { opacity: 1; }
  to { opacity: 0.55; }
`

export const SkeletonWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
`

export const SkeletonCard = styled.div`
  height: 56px;
  border-radius: var(--border-radius-sm);
  background: var(--chrome-hover);
  animation: ${shimmer} 1.2s ease-in-out infinite alternate;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const Problems = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  & p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`
