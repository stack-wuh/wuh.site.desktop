'use client'

/**
 * 插件帧宿主视图样式（拆分自 PluginFrameHost 单文件，20260926-refactor-mega-component-split）：
 * 视图槽位容器与加载失败文案。
 */
import styled from 'styled-components'

export const ViewSlot = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
`

export const ViewError = styled.p`
  color: var(--danger-color);
  font-size: 12px;
  margin: 6px 0;
  word-break: break-all;
`
