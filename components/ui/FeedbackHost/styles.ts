'use client'

/**
 * 反馈宿主共享样式原子与语义映射（拆分自 FeedbackHost 单文件，
 * 20260927-refactor-midsize-component-split）：KIND 图标注册表与语义色映射
 * 为三个 Host 共用；各 Host 的专属 styled 内聚在各自文件。
 */
import type { IconComponent } from '../AppIcon'
import { IconCircleAlert, IconCircleCheck, IconInfo, IconTriangleAlert } from '../../icons'
import type { FeedbackKind } from '../../../lib/feedback'

export const KIND_ICON: Record<FeedbackKind, IconComponent> = {
  info: IconInfo,
  success: IconCircleCheck,
  warning: IconTriangleAlert,
  error: IconCircleAlert
}

/** 语义色 token 映射（明暗随主题自动跟随） */
export const KIND_COLOR: Record<FeedbackKind, string> = {
  info: 'var(--primary-color)',
  success: 'var(--success-color)',
  warning: 'var(--warning-color)',
  error: 'var(--danger-color)'
}
