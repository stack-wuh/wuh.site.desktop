'use client'

/**
 * 实时预览胶囊（20260922 首页编辑器面板 · 简化版动作行）：
 * 简洁模式且有内容时出现，提醒用户可实时预览当前 Markdown——
 * 点击经 floats 注册表 toggle 唤起 preview-markdown 浮窗（与右栏页面共存）。
 * 预览插件未启用或无内容时不渲染。
 */
import { useMemo, useSyncExternalStore } from 'react'
import styled, { keyframes } from 'styled-components'
import { hostGeneration, listFloatViews, usePluginsReady } from '../plugins/PluginFrameHost'
import { toggleFloat } from '../../lib/floats'
import { useWorkspaceStore } from '../../lib/store'
import { AppIcon } from '../ui/AppIcon'
import { IconEye } from '../icons'
import { useLocale } from '../../lib/i18n/context'

const PREVIEW_PLUGIN_ID = 'preview-markdown'
const PREVIEW_VIEW_ID = 'preview'

const CapsuleIn = keyframes`
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
`

const Capsule = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  background: color-mix(in oklab, var(--primary-color) 12%, var(--chrome-raised));
  border: 1px solid color-mix(in oklab, var(--primary-color) 45%, var(--chrome-border));
  border-radius: 12px;
  color: var(--primary-color);
  font-size: 11px;
  cursor: pointer;
  animation: ${CapsuleIn} 200ms ease-out;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;

  &:hover {
    background: color-mix(in oklab, var(--primary-color) 20%, var(--chrome-raised));
    border-color: var(--primary-color);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`

export function PreviewCapsule(): React.JSX.Element | null {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const pluginsReady = usePluginsReady()
  // 插件启停/重载时 +1，驱动预览视图声明重新解析（须进 useMemo 依赖）
  const generation = useSyncExternalStore(hostGeneration.subscribe, hostGeneration.get, hostGeneration.get)

  const previewDecl = useMemo(() => {
    if (!pluginsReady) return null
    const hit = listFloatViews().find(
      ({ pluginId, view }) => pluginId === PREVIEW_PLUGIN_ID && view.id === PREVIEW_VIEW_ID
    )
    return hit ?? null
  }, [pluginsReady, generation])

  if (!previewDecl || !doc.content) return null

  return (
    <Capsule
      type="button"
      data-testid="preview-capsule"
      title={t('editor.preview')}
      onClick={() =>
        toggleFloat(
          {
            pluginId: previewDecl.pluginId,
            viewId: previewDecl.view.id,
            title: previewDecl.view.title,
            icon: previewDecl.view.icon,
            entry: previewDecl.view.entry
          },
          { width: window.innerWidth, height: window.innerHeight }
        )
      }
    >
      <AppIcon icon={IconEye} size="xs" decorative />
      <span>{t('editor.preview')}</span>
    </Capsule>
  )
}
