/**
 * 自绘品牌图标 —— W 字母标（2026-09 重绘）。
 * currentColor 主体 + primary 色点缀，随四主题自适应；不经 AppIcon（非 lucide 签名），直接渲染。
 * 几何参数与 build/icon.svg master（Dock 图标设计源）同源：W = 两个圆头 V（12→72），
 * 点缀双条（84 起）；改动任一处必须同步另一处。
 */
import * as React from 'react'

interface BrandIconProps {
  width?: number
  height?: number
  className?: string
  /** 传入时启用描边书写入场动效（global.css brand-logo 段），默认静态 */
  animated?: boolean
}

export const IconLogo: React.FC<BrandIconProps> = ({
  width = 42,
  height = 26,
  className,
  animated
}) => (
  <svg
    viewBox="0 0 120 60"
    width={width}
    height={height}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    role="img"
    aria-hidden="true"
    style={{ display: 'block' }}
    className={animated ? ['brand-logo--animated', className].filter(Boolean).join(' ') : className}
  >
    <title>wuh.site</title>
    <path
      className="brand-logo__stroke brand-logo__stroke--1"
      d="M12 16 L27 44 L42 16"
      pathLength={100}
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      className="brand-logo__stroke brand-logo__stroke--2"
      d="M42 16 L57 44 L72 16"
      pathLength={100}
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect className="brand-logo__bar brand-logo__bar--1" x="84" y="18" width="24" height="8" rx="4" fill="var(--primary-color)" />
    <rect className="brand-logo__bar brand-logo__bar--2" x="84" y="34" width="15" height="8" rx="4" fill="currentColor" opacity=".55" />
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
