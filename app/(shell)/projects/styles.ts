'use client'

/**
 * 项目页样式原子（20260927-refactor-midsize-component-split 自 page.tsx 迁入；
 * 20260927-feature-sticky-header-drafts-projects 起页头吸顶：根容器无 overflow，
 * Head 固定在滚动流之外，内容区包进独立滚动容器——对齐 PageTopbar 范式）：
 * 页壳、组卡（头部/徽标/路径/旋钮/文件行/空态/不可达）、搜索框与整页空态。
 */
import styled, { keyframes } from 'styled-components'
import { Input } from '../../../components/ui/Input'

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

export const PageShell = styled.section`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--background-color);
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** 内容滚动容器：页头（Head）在其之外固定，不随滚动 */
export const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 32px 48px;

  @media (max-width: 768px) {
    padding: 0 16px 40px;
  }
`

export const Inner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
`

export const Count = styled.span`
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

/** 组头弹性占位：把尾缘 chevron 推到行右 */
export const Spacer = styled.span`
  flex: 1;
`

export const SearchInput = styled(Input)`
  width: 100%;
`

export const GroupList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const Group = styled.li`
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: border-color 0.3s ease;
`

export const GroupHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  color: var(--text-primary);

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export const GroupName = styled.span`
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CurrentBadge = styled.span`
  flex: none;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 10px;
  font-weight: 600;
`

export const GroupPath = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const Chevron = styled.span<{ $open: boolean }>`
  flex: none;
  display: inline-flex;
  color: var(--text-muted);
  transition: transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);
  transform: rotate(${(props) => (props.$open ? 0 : -90)}deg);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const GroupBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 8px 10px;
`

export const FileRow = styled.button`
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  color: var(--text-primary);

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export const FileName = styled.span`
  flex: none;
  font-size: 13px;
  font-weight: 500;
`

export const FilePath = styled.span`
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const Unreachable = styled.p`
  margin: 4px 4px 2px;
  font-size: 12px;
  color: var(--warning-color);
`

export const GroupEmpty = styled.p`
  margin: 4px 4px 2px;
  font-size: 12px;
  color: var(--text-muted);
`

export const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--danger-color);
`
