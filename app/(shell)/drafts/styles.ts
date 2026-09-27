'use client'

/**
 * 草稿箱页样式原子（20260927-refactor-midsize-component-split 自 page.tsx 迁入；
 * 20260927-feature-sticky-header-drafts-projects 起页头吸顶：根容器无 overflow，
 * Head 固定在滚动流之外，内容区包进独立滚动容器——对齐 PageTopbar 范式）：
 * 页壳、页头、草稿行（标题/编辑中徽标/摘要/元信息/删除钮）与空态。
 */
import styled, { keyframes } from 'styled-components'

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

export const PageShell = styled.section`
  flex: 1;
  min-width: 0;
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

export const Head = styled.header`
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 20px 32px 10px;

  @media (max-width: 768px) {
    padding: 16px 16px 8px;
  }

  & > h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-sans);
  }
`

export const Inner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
`

export const Count = styled.span`
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

export const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const Row = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 10px 12px;
  background: var(--chrome-panel);
  border: 1px solid ${(props) => (props.$active ? 'color-mix(in oklab, var(--primary-color) 45%, var(--chrome-border))' : 'var(--chrome-border)')};
  border-radius: var(--border-radius-md);
  transition:
    background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    border-color 0.3s ease;

  &:hover {
    background: var(--chrome-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const RowMain = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding: 2px 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-sans);
  color: var(--text-primary);
`

export const RowTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
`

export const RowTitleText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const EditingMark = styled.span`
  flex: none;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 10.5px;
  font-weight: 600;
`

export const RowExcerpt = styled.span`
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`

export const RowMeta = styled.span`
  display: inline-flex;
  gap: 10px;
  font-size: 10.5px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

export const RowDelete = styled.button`
  flex: none;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;

  &:hover {
    background: color-mix(in oklab, var(--danger-color) 12%, transparent);
    color: var(--danger-color);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

export const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 0;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
`

export const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--danger-color);
`
