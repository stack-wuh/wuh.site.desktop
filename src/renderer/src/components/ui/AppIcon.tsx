/**
 * 图标渲染出口（对齐站点 icon-system）：currentColor、单一规格出口。
 * 字形来自自绘 chrome 图标集（components/icons/chrome.tsx）与品牌图标（brand.tsx）；
 * 业务代码不直接 import 任何图标实现，一律取 components/icons 注册表的 Icon*。
 *
 * 场景规格：chrome/面板 16px（md）· 工具栏 14px（sm）· 正文内联 12px（xs）· 强调 20/24（lg/xl）。
 * 描边口径沿用 lucide 24 网格习惯：≤14px 传 2、>14px 传 1.75（chrome 集内部按 16/24 等比换算）。
 */
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24
} as const

export type IconSize = keyof typeof ICON_SIZES

/** 接受 lucide 图标及同签名自定义品牌图标（如 GithubIcon） */
export type IconComponent = React.ComponentType<{
  size?: number | string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
  'aria-hidden'?: boolean
  'aria-label'?: string
  role?: string
}>

interface Props {
  icon: IconComponent
  size?: IconSize | number
  className?: string
  /** 覆盖场景描边规格（一般不需要） */
  strokeWidth?: number
  /** 无障碍：有文字伴随的装饰性图标传 true（默认），独立表意图标传 false 并给 label */
  decorative?: boolean
  label?: string
}

export function AppIcon(props: Props): React.JSX.Element {
  const { icon: Icon, size = 'md', decorative = true, label, className, strokeWidth } = props
  const px = typeof size === 'number' ? size : ICON_SIZES[size]
  const stroke = strokeWidth ?? (px > 14 ? 1.75 : 2)
  return (
    <Icon
      size={px}
      strokeWidth={stroke}
      className={className}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : 'img'}
      style={{ flexShrink: 0 }}
    />
  )
}
