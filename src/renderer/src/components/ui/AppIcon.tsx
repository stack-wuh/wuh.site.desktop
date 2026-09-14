/**
 * 图标规范（对齐站点 icon-system）：lucide 线框、strokeWidth=2、currentColor。
 * 业务代码只用 <AppIcon icon={Xxx} />，不散落裸 SVG / emoji。
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
  /** 无障碍：有文字伴随的装饰性图标传 true（默认），独立表意图标传 false 并给 label */
  decorative?: boolean
  label?: string
}

export function AppIcon(props: Props): React.JSX.Element {
  const { icon: Icon, size = 'md', decorative = true, label, className } = props
  const px = typeof size === 'number' ? size : ICON_SIZES[size]
  return (
    <Icon
      size={px}
      strokeWidth={2}
      className={className}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : 'img'}
      style={{ flexShrink: 0 }}
    />
  )
}
