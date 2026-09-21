/**
 * GitHub 品牌图标 —— lucide 1.x 已移除品牌图标，按站点 icon-system 规范
 * 以自定义 SVG 实现，风格与 lucide outline 一致（stroke=currentColor,
 * strokeWidth=2, round cap/join），path 取自 packages/components/icons/fallbacks/github.tsx。
 */
interface Props {
  size?: number | string
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
  'aria-hidden'?: boolean
  'aria-label'?: string
  role?: string
}

export function GithubIcon(props: Props): React.JSX.Element {
  const { size = 24, strokeWidth = 2, ...rest } = props
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}
