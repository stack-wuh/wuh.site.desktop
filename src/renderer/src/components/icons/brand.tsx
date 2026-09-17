/**
 * 自绘品牌图标 —— 与 x.wuh.site packages/components/icons/{logo,ornament}.tsx 同源移植。
 * currentColor 主体 + primary 色点缀，随四主题自适应；不经 AppIcon（非 lucide 签名），直接渲染。
 */
import * as React from 'react'

interface BrandIconProps {
  width?: number
  height?: number
  className?: string
}

export const IconLogo: React.FC<BrandIconProps> = ({ width = 42, height = 26, className }) => (
  <svg
    viewBox="0 0 120 60"
    width={width}
    height={height}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    role="img"
    aria-hidden="true"
    style={{ display: 'block' }}
    className={className}
  >
    <title>wuh.site</title>
    <path
      d="M14 16 L24 44 L34 16 L44 44 L54 16"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="66" y="18" width="34" height="8" rx="4" fill="var(--primary-color)" />
    <rect x="66" y="34" width="20" height="8" rx="4" fill="currentColor" opacity=".55" />
  </svg>
)

IconLogo.displayName = 'IconLogo'

export const IconDiamond: React.FC<BrandIconProps> = ({ width = 10, height = 10, className }) => (
  <svg
    viewBox="0 0 12 12"
    width={width}
    height={height}
    aria-hidden="true"
    className={className}
    style={{ display: 'block', flexShrink: 0 }}
  >
    <polygon points="6,0 12,6 6,12 0,6" fill="currentColor" opacity="0.35" />
  </svg>
)

IconDiamond.displayName = 'IconDiamond'
