'use client'

/**
 * 壳层胶囊（固定命名 Capsule）：壳层一等聚合入口，面板为任务中心（多插件并发
 * 任务集散地，20260924-feature-task-center-event-bus）。chip 保持 20260923
 * 「状态信号舱」解剖不变：
 * [状态环] + [标签·语义色计数] + [chevron 开合指示]，高度 26px 对齐
 * 编辑器胶囊命中区标准。
 * - 状态环（左缘，编码任务聚合态）：空闲/部分完成=静默空心点；有 in_progress=
 *   primary 旋转环（**持续状态指示非过渡动效**，800ms/圈，reduced-motion 静态
 *   降级）；全部完成=success 实心点。
 * - 标签：任务态整串 mono + 语义色（进行中=primary、全完成=success）；空态
 *   「就绪」/编辑器入口常规 sans 次级色——醒目度来自语义色而非加重底色。
 * - chevron：IconChevronDown 开合旋转 180°（150ms，reduced-motion 关闭）。
 * - hover 抬升：elevation-card 阴影 + border primary。
 *
 * 挂点契约不变（20260922-feature-shell-capsule）：MainArea 右上常驻，宿主
 * `pointer-events: none` + chip/面板 `auto`；宿主不设 z-index（不建层叠上下文
 * ——chip 靠 DOM 顺序压页面内容、低于浮窗 z2，面板 z70 浮于浮窗、低于 Dialog
 * 100），面板贴 chip 向下弹出，Esc/点外关。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { taskAggregate, tasksStore } from '../../lib/tasks'
import { useWorkspaceStore } from '../../lib/store'
import { useLocale } from '../../lib/i18n/context'
import { AppIcon } from '../ui/AppIcon'
import { IconChevronDown } from '../icons'
import { CapsulePanel } from './CapsulePanel'

const Wrap = styled.span`
  /* MainArea 右上挂点：绝对定位 + pointer-events 穿透；不设 z-index（保持
     层叠上下文开放，让面板 z-index 70 直接参与 MainArea 层叠，见头注释） */
  position: absolute;
  top: 10px;
  right: 12px;
  display: inline-flex;
  pointer-events: none;
`

const CapsuleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 26px;
  padding: 0 12px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: 13px;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  pointer-events: auto;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out,
    box-shadow 150ms ease-out;

  &:hover {
    background: var(--chrome-hover);
    border-color: var(--primary-color);
    box-shadow: var(--elevation-card);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

/* 状态环（左缘）：编码任务聚合态。
   idle（空闲/部分完成）= 静默空心点；active（有 in_progress）= primary 旋转环；
   done（全部完成）= success 实心点。 */
const StatusRing = styled.span<{ $mode: 'idle' | 'active' | 'done' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;

  ${({ $mode }) =>
    $mode === 'idle'
      ? css`
          &::before {
            content: '';
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1.5px solid var(--text-muted);
            box-sizing: border-box;
          }
        `
      : ''}

  ${({ $mode }) =>
    $mode === 'active'
      ? css`
          &::before {
            content: '';
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid var(--chrome-border);
            border-top-color: var(--primary-color);
            box-sizing: border-box;
            animation: ${spin} 800ms linear infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            &::before {
              animation: none;
              border-color: var(--primary-color);
              opacity: 0.55;
            }
          }
        `
      : ''}

  ${({ $mode }) =>
    $mode === 'done'
      ? css`
          &::before {
            content: '';
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--success-color);
          }
        `
      : ''}
`

/* 标签：任务态整串 mono + 语义色（进行中=primary、全完成=success）；
   空态（就绪/编辑器入口）常规 sans 次级色。 */
const Label = styled.span<{ $tone: 'idle' | 'active' | 'done' }>`
  color: ${({ $tone }) =>
    $tone === 'active'
      ? 'var(--primary-color)'
      : $tone === 'done'
        ? 'var(--success-color)'
        : 'inherit'};
  font-family: ${({ $tone }) => ($tone === 'idle' ? 'inherit' : 'var(--font-mono)')};
  font-size: ${({ $tone }) => ($tone === 'idle' ? 'inherit' : '11.5px')};
  letter-spacing: ${({ $tone }) => ($tone === 'idle' ? 'inherit' : '0.3px')};
  white-space: nowrap;
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
  transform: rotate(${(props) => (props.$open ? '180deg' : '0deg')});
  transition: transform 150ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export function Capsule(): React.JSX.Element {
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get)
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  /** 胶囊根（chip + 面板）引用：点外关时豁免胶囊内部点击 */
  const wrapRef = useRef<HTMLSpanElement | null>(null)
  const agg = taskAggregate()
  // 常驻胶囊：空态显示「就绪」；有任务显聚合进度，无任务有文档显编辑器入口
  const hasDoc = doc.activePath != null || doc.content != null
  // 状态环/标签语义：active 优先 → 全部完成 → 空闲（部分完成归 idle 静默点）
  const mode: 'idle' | 'active' | 'done' =
    agg.active > 0 ? 'active' : agg.total > 0 && agg.done === agg.total ? 'done' : 'idle'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    // 点外关：target 在胶囊内（chip 或面板）一律忽略——不能用传播时序判断，
    // React 18 离散事件会同步刷 passive effects，打开面板的那次点击仍会
    // 冒泡到 window（20260924-fix-capsule-self-close）
    const onClick = (e: MouseEvent): void => {
      const el = wrapRef.current
      if (el && e.target instanceof Node && el.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
    }
  }, [open])

  return (
    <Wrap ref={wrapRef}>
      <CapsuleButton
        type="button"
        data-testid="capsule"
        aria-label={t('capsule.title')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <StatusRing $mode={mode} aria-hidden="true" />
        <Label $tone={mode}>
          {agg.total > 0
            ? t('capsule.tasks', { done: agg.done, total: agg.total })
            : hasDoc
              ? t('capsule.editorSection')
              : t('capsule.ready')}
        </Label>
        <Chevron $open={open} aria-hidden="true">
          <AppIcon icon={IconChevronDown} size="xs" decorative />
        </Chevron>
      </CapsuleButton>
      {open && <CapsulePanel onClose={() => setOpen(false)} />}
    </Wrap>
  )
}
