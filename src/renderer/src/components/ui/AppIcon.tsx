/**
 * 图标渲染出口（对齐站点 icon-system）：lucide 线框、currentColor。
 * 图标一律从 components/icons 注册表取 Icon*，业务代码不直接 import lucide-react。
 *
 * 场景规格：chrome/面板 16px（md）· 工具栏 14px（sm）· 正文内联 12px（xs）· 强调 20/24（lg/xl）。
 * 描边：≤14px 用 2 保证小尺寸清晰，>14px 用 1.75 —— 24 网格下笔画更细腻，避免发闷。
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
