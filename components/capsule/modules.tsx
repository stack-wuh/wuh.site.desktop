'use client'

/**
 * 控制中心模块卡基础件（20260923-feature-capsule-control-center）：
 * iOS 控制中心语言 × 应用 token（设计稿 PART 2 ⑧⑨⑩）——双列 tile 为基本单位，
 * 文档卡独占整行；chrome-raised 底 + 12px 圆角，hover 描边 primary 42%，
 * active 缩放 0.98（iOS 按压感）；布尔模块用 iOS 式开关（on 态 success 色）；
 * 整行模块 + 手风琴子面板（220ms unfold，reduced-motion 全静态降级）。
 */
import type { ReactNode } from 'react'
import styled, { css } from 'styled-components'

export const ModuleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 4px 4px;
`

/**
 * 模块 surface 样式基：交互卡与内容卡共享（视觉与设计稿零偏离，仅交互态有别）。
 * 二分原因见 ModulePanel —— button 不可嵌套 button。
 */
const moduleSurface = css<{ $span2?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  position: relative;
  grid-column: ${(props) => (props.$span2 ? 'span 2' : 'auto')};
  padding: 9px 10px;
  background: var(--chrome-raised);
  border: 1px solid color-mix(in oklab, var(--chrome-border) 72%, transparent);
  border-radius: var(--border-radius-md);
  text-align: left;
  color: var(--text-primary);
  font-family: var(--font-sans);
`

/** 交互型模块卡（整体可点：开关 tile、跳转 tile、命令 tile） */
export const ModuleCard = styled.button<{ $span2?: boolean }>`
  ${moduleSurface}
  cursor: pointer;
  transition:
    background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    border-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  &:hover {
    background: var(--chrome-hover);
    border-color: color-mix(in oklab, var(--primary-color) 42%, var(--chrome-border));
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`

/**
 * 内容型模块容器（文档卡等）：div 语义，承载信息 + 卡内原生动作钮。
 * 与 ModuleCard 的 surface 一致但不整体可点——`<button>` 不可作为 `<button>`
 * 的祖先（非法 HTML + React hydration 报错），故内容卡必须是非交互容器。
 */
export const ModulePanel = styled.div<{ $span2?: boolean }>`
  ${moduleSurface}
`

export const ModuleHead = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-secondary);
`

/** 模块图标位：主题色淡底圆角方块 */
export const ModuleIcon = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: color-mix(in oklab, var(--primary-color) 13%, transparent);
  color: var(--primary-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
`

export const ModuleMore = styled.span`
  margin-left: auto;
  color: var(--text-muted);
  font-size: 10px;
`

export const ModuleBig = styled.span`
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  & > .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const ModuleSub = styled.span`
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** iOS 式开关（on 态取 success 色；状态由父级 ModuleCard $on 驱动） */
export const SwitchTrack = styled.span<{ $on: boolean }>`
  width: 32px;
  height: 19px;
  border-radius: 999px;
  background: ${(props) => (props.$on ? 'var(--success-color)' : 'var(--chrome-border)')};
  position: relative;
  flex: none;
  margin-left: auto;
  transition: background-color 200ms var(--motion-ease-out-soft, ease-out);

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transform: translateX(${(props) => (props.$on ? '13px' : '0')});
    transition: transform 200ms var(--motion-ease-out-soft, ease-out);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::after {
      transition: none;
    }
  }
`

/** 布尔开关模块卡（即时渲染/专注/大纲跟随）：整卡可点，开关态由外部单状态源驱动 */
export function SwitchCard(props: {
  icon: ReactNode
  label: string
  hint: string
  on: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <ModuleCard
      type="button"
      role="switch"
      aria-checked={props.on}
      aria-label={props.label}
      title={props.label}
      onClick={props.onToggle}
    >
      <ModuleHead>
        <ModuleIcon>{props.icon}</ModuleIcon>
        {props.label}
        <SwitchTrack $on={props.on} aria-hidden="true" />
      </ModuleHead>
      <ModuleSub>{props.hint}</ModuleSub>
    </ModuleCard>
  )
}

/** 整行可展开模块 + 手风琴子面板（排版/快捷键；220ms unfold）。
    纵向 margin 6px（20260925-feature-sidemenu-settings-consolidation）：此前 `0 4px`
    使上下堆叠的行在子面板收起时贴死无间距 */
export const ModuleRow = styled.button<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 8px);
  margin: 6px 4px;
  padding: 8px 10px;
  background: var(--chrome-raised);
  border: 1px solid color-mix(in oklab, var(--chrome-border) 72%, transparent);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: 11.5px;
  font-family: var(--font-sans);
  color: var(--text-secondary);
  text-align: left;
  transition: background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }
`

export const RowChevron = styled.span<{ $open: boolean }>`
  margin-left: auto;
  color: var(--text-muted);
  font-size: 10px;
  transform: rotate(${(props) => (props.$open ? '90deg' : '0deg')});
  transition: transform 200ms var(--motion-ease-out-soft, ease-out);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const SubPanel = styled.div<{ $open: boolean }>`
  display: ${(props) => (props.$open ? 'block' : 'none')};
  margin: 6px 4px 2px;
  padding: 10px 12px;
  background: var(--chrome-raised);
  border: 1px solid color-mix(in oklab, var(--chrome-border) 72%, transparent);
  border-radius: var(--border-radius-md);
`

/** 排版设置 stepper 行（字号/行距/行宽） */
export const StepperLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 11.5px;
  color: var(--text-secondary);

  & > .name {
    flex: 0 0 44px;
  }
`

export const Stepper = styled.span`
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--chrome-border);
  border-radius: 7px;
  overflow: hidden;

  & > button {
    width: 24px;
    height: 22px;
    border: none;
    background: var(--chrome-raised);
    color: var(--text-secondary);
    cursor: pointer;
    font-family: var(--font-mono);

    &:hover {
      background: var(--chrome-hover);
      color: var(--text-primary);
    }
  }

  & > .val {
    min-width: 52px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-primary);
    background: var(--background-color);
    align-self: stretch;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
`

/** 快捷键速查表 */
export const KbdTable = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 14px;
  font-size: 11.5px;

  & > kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--background-color);
    border: 1px solid var(--chrome-border);
    border-bottom-width: 2px;
    border-radius: 5px;
    padding: 1px 6px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  & > span {
    color: var(--text-secondary);
    align-self: center;
  }
`

/** 控制中心分区（任务/编辑器/插件） */
export const CenterSection = styled.section`
  padding: 6px 0 4px;

  & + & {
    border-top: 1px solid var(--chrome-border);
  }
`

export const SectionLabel = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
  padding: 2px 10px 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const SectionHint = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.3px;
  opacity: 0.7;
`
