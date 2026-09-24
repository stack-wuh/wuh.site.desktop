'use client'

/**
 * 壳层胶囊（固定命名 Capsule）：壳层一等聚合入口，面板为任务中心（多插件并发
 * 任务集散地）。挂点：TitleBar（44px header）右侧 flex 子项，垂直居中——
 * 20260924-fix-capsule-header-chrome 起 自 main 容器右上迁入 header，左区保留
 * 通知预留位；层叠等价换算：TitleBar 不建层叠上下文，面板 z70 仍在根上下文
 * （>浮窗 z2、<Dialog 100），Esc/点外关（window 级监听 + target 归属守卫）不变。
 *
 * 外观（20260924 微进度环重设计，替代 20260923 状态环药丸）：
 * - 微进度环（SVG 14px）：环即聚合进度——空闲=空心轨道环；有任务=primary 进度
 *   弧（弧长=done/total）；有 in_progress 叠加旋转亮弧（**持续状态指示非过渡
 *   动效**，800ms/圈，reduced-motion 静态降级）；全完成=success 满环。
 * - ghost 态：header 上默认透明底无边框（安静的信令），hover/面板展开浮起
 *   药丸（chrome-raised 底 + border + elevation-card 阴影）。
 * - 标签：任务态整串 mono + 语义色（进行中=primary、全完成=success）；空态
 *   「就绪」/编辑器入口常规 sans 次级色；chevron 开合旋转 180°。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { taskAggregate, tasksStore } from '../../lib/tasks'
import { useWorkspaceStore } from '../../lib/store'
import { useLocale } from '../../lib/i18n/context'
import { AppIcon } from '../ui/AppIcon'
import { IconChevronDown } from '../icons'
import { CapsulePanel } from './CapsulePanel'

/** TitleBar 右侧挂点：flex 子项推右缘，相对定位锚定面板向下弹出 */
const Wrap = styled.span`
  position: relative;
  display: inline-flex;
  margin-left: auto;
`

const CapsuleButton = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 26px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 13px;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out,
    box-shadow 150ms ease-out;

  /* ghost 态：hover/展开浮起药丸 */
  ${({ $open }) =>
    $open
      ? css`
          background: var(--chrome-raised);
          border-color: var(--chrome-border);
          box-shadow: var(--elevation-card);
        `
      : ''}

  &:hover {
    background: var(--chrome-raised);
    border-color: var(--chrome-border);
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

/* 旋转亮弧组：仅在 in_progress 存在时叠加于进度弧之上（持续状态指示） */
const RotatingArc = styled.g<{ $spin: boolean }>`
  transform-origin: 12px 12px;

  ${({ $spin }) =>
    $spin
      ? css`
          animation: ${spin} 800ms linear infinite;
        `
      : ''}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.55;
  }
`

type RingMode = 'idle' | 'progressing' | 'active' | 'done'

const RING_RADIUS = 10
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/**
 * 微进度环：环即聚合进度（空闲空心轨道 / 进度弧 / 旋转亮弧 / success 满环）。
 * idle 无进度弧；progressing（仅 pending）静态弧；active 叠加旋转亮弧；
 * done 满环 success。
 */
function ProgressRing(props: { mode: RingMode; ratio: number }): React.JSX.Element {
  const { mode, ratio } = props
  const dash = mode === 'done' ? RING_CIRCUMFERENCE : RING_CIRCUMFERENCE * ratio
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r={RING_RADIUS}
        fill="none"
        stroke="var(--chrome-border)"
        strokeWidth="2.5"
        opacity={mode === 'idle' ? 1 : 0.5}
      />
      {mode !== 'idle' && (
        <circle
          cx="12"
          cy="12"
          r={RING_RADIUS}
          fill="none"
          stroke={mode === 'done' ? 'var(--success-color)' : 'var(--primary-color)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING_CIRCUMFERENCE - dash}`}
          transform="rotate(-90 12 12)"
        />
      )}
      {mode === 'active' && (
        <RotatingArc $spin>
          <circle
            cx="12"
            cy="12"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--primary-color)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
            strokeDasharray={`${RING_CIRCUMFERENCE * 0.16} ${RING_CIRCUMFERENCE * 0.84}`}
          />
        </RotatingArc>
      )}
    </svg>
  )
}

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
  // 微进度环语义：active（有 in_progress，旋转亮弧）→ done（全完成满环）
  // → progressing（仅 pending，静态弧）→ idle（空轨道环）
  const mode: RingMode =
    agg.total === 0
      ? 'idle'
      : agg.done === agg.total
        ? 'done'
        : agg.active > 0
          ? 'active'
          : 'progressing'
  const labelTone: 'idle' | 'active' | 'done' =
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
        $open={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ProgressRing mode={mode} ratio={agg.total > 0 ? agg.done / agg.total : 0} />
        <Label $tone={labelTone}>
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
