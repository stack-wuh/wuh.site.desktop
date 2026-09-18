/**
 * 自绘 chrome 图标集 —— wuh.site 桌面端专属图标语言。
 *
 * 规格：16px 网格 viewBox（0 0 16 16）、round 帽/圆角连接、线框 stroke=currentColor、
 * 母题沿用站点 ornament 的菱形（tag/sparkles）。AppIcon 传入的 strokeWidth 是
 * lucide 24 网格口径，这里按 16/24 等比换算，保证与旧描边视觉厚度一致。
 */
import * as React from 'react'

export interface ChromeIconProps {
  size?: number | string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
  'aria-hidden'?: boolean
  'aria-label'?: string
  role?: string
}

function makeChromeIcon(
  displayName: string,
  render: (sw: number) => React.ReactNode
): React.FC<ChromeIconProps> {
  const Icon: React.FC<ChromeIconProps> = (props) => {
    const {
      size = 16,
      strokeWidth = 2,
      className,
      style,
      'aria-hidden': ariaHidden,
      'aria-label': ariaLabel,
      role
    } = props
    const sw = (typeof strokeWidth === 'number' ? strokeWidth : 2) * (16 / 24)
    return (
      <svg
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ display: 'block', flexShrink: 0, ...style }}
        aria-hidden={ariaHidden}
        aria-label={ariaLabel}
        role={role}
      >
        {render(sw)}
      </svg>
    )
  }
  Icon.displayName = displayName
  return Icon
}

/** 文档页（圆角 + 折角） */
export const IconFile = makeChromeIcon(
  'IconFile',
  () => (
    <>
      <path d="M9.5 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5l-3.5-3.5z" />
      <path d="M9.5 1.5V5H13" />
    </>
  )
)

/** 文件夹（闭合） */
export const IconFolder = makeChromeIcon('IconFolder', () => (
  <path d="M1.5 4.5A1.5 1.5 0 0 1 3 3h2.9l1.5 2h5.6A1.5 1.5 0 0 1 14.5 6.5v6a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5v-8z" />
))

/** 文件夹（展开：背板 + 前板） */
export const IconFolderOpen = makeChromeIcon(
  'IconFolderOpen',
  () => (
    <>
      <path d="M1.5 5.5v-1A1.5 1.5 0 0 1 3 3h2.9l1.5 2h5.6A1.5 1.5 0 0 1 14.5 6.5V8" />
      <path d="M1.5 13.5h10.2a1 1 0 0 0 .95-.68L14.5 8H4.3a1 1 0 0 0-.95.68L1.5 13.5z" />
    </>
  )
)

/** 设置 = 滑杆组（三行、旋钮错位） */
export const IconSettings = makeChromeIcon(
  'IconSettings',
  () => (
    <>
      <path d="M2.5 4h1.8M7.7 4h5.8" />
      <circle cx="6" cy="4" r="1.7" />
      <path d="M2.5 8h5.8M11.7 8h1.8" />
      <circle cx="10" cy="8" r="1.7" />
      <path d="M2.5 12h1.8M7.7 12h5.8" />
      <circle cx="6" cy="12" r="1.7" />
    </>
  )
)

/** 保存 = 落盘托盘 */
export const IconSave = makeChromeIcon(
  'IconSave',
  () => (
    <>
      <path d="M8 2v6.5" />
      <path d="M5.5 6 8 8.5 10.5 6" />
      <path d="M2.5 10.5v2A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </>
  )
)

export const IconCheck = makeChromeIcon('IconCheck', () => (
  <path d="M3 8.5l3.5 3.5 6.5-7" />
))

export const IconChevronDown = makeChromeIcon('IconChevronDown', () => (
  <path d="M4 6.5l4 4 4-4" />
))

export const IconChevronRight = makeChromeIcon('IconChevronRight', () => (
  <path d="M6.5 4l4 4-4 4" />
))

export const IconChevronLeft = makeChromeIcon('IconChevronLeft', () => (
  <path d="M9.5 4l-4 4 4 4" />
))

export const IconClose = makeChromeIcon('IconClose', () => (
  <path d="M4 4l8 8M12 4l-8 8" />
))

/** 外观 = 主题对比圆（右半填充） */
export const IconPalette = makeChromeIcon(
  'IconPalette',
  () => (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none" />
    </>
  )
)

/** 侧栏折叠 */
export const IconPanelCollapse = makeChromeIcon(
  'IconPanelCollapse',
  () => (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M6 3v10" />
      <path d="M5 6.5 3.5 8 5 9.5" />
    </>
  )
)

/** git 分支 */
export const IconGitBranch = makeChromeIcon(
  'IconGitBranch',
  () => (
    <>
      <circle cx="4" cy="3.5" r="1.7" />
      <circle cx="4" cy="12.5" r="1.7" />
      <circle cx="11.5" cy="6.5" r="1.7" />
      <path d="M4 5.2v5.6" />
      <path d="M11.5 8.2v.3a3.5 3.5 0 0 1-3.5 3.5H5.7" />
    </>
  )
)

/** 预览/眼睛 */
export const IconEye = makeChromeIcon(
  'IconEye',
  () => (
    <>
      <path d="M1.5 8C3 5 5.3 3.5 8 3.5S13 5 14.5 8C13 11 10.7 12.5 8 12.5S3 11 1.5 8z" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </>
  )
)

/** 消息气泡 */
export const IconMessage = makeChromeIcon('IconMessage', () => (
  <path d="M3 2.5h10A1.5 1.5 0 0 1 14.5 4v5a1.5 1.5 0 0 1-1.5 1.5H8.6L5 13.2v-2.7H3A1.5 1.5 0 0 1 1.5 9V4A1.5 1.5 0 0 1 3 2.5z" />
))

/** 标签 = 菱形（站点 ornament 母题） */
export const IconTag = makeChromeIcon(
  'IconTag',
  () => (
    <>
      <path d="M8 2 14 8 8 14 2 8z" />
      <circle cx="8" cy="5.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  )
)

/** 闪耀 = 双菱形星（站点 ornament 母题） */
export const IconSparkles = makeChromeIcon(
  'IconSparkles',
  () => (
    <>
      <path d="M6 2l1.1 2.9L10 6 7.1 7.1 6 10 4.9 7.1 2 6l2.9-1.1z" />
      <path d="M12 9.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  )
)

/** 打开的书 */
export const IconBook = makeChromeIcon(
  'IconBook',
  () => (
    <>
      <path d="M8 3.6C6.9 2.7 5.1 2.3 2.5 2.3v10.4c2.6 0 4.4.4 5.5 1.3 1.1-.9 2.9-1.3 5.5-1.3V2.3c-2.6 0-4.4.4-5.5 1.3z" />
      <path d="M8 3.6v10.4" />
    </>
  )
)
