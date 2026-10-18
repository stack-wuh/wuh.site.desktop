'use client'

import styled, { css } from 'styled-components'

/**
 * 素笺纸面配方（D2 无损移植自视觉稿 .paper-float）：radius 6 + 双投影 + 顶部内
 * 高光 + 右缘纸页叠口两层。Sheet（路由页画芯载体）与 /editor 素笺本体（编辑页
 * Column）共用同一配方——纸只有一种。
 */
export const paperSurface = css`
  background: var(--background-color);
  border: 1px solid color-mix(in oklab, var(--chrome-border) 60%, transparent);
  border-radius: 6px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.07),
    0 24px 60px rgba(0, 0, 0, 0.13),
    inset 0 1px 0 color-mix(in oklab, var(--normal-100) 60%, transparent);

  /* 纸页叠口：右缘两层纸口——一叠纸的侧脸 */
  &::before {
    content: '';
    position: absolute;
    top: 12px;
    bottom: 12px;
    right: -7px;
    width: 6px;
    background: color-mix(in oklab, var(--background-color) 92%, var(--chrome-border));
    border: 1px solid color-mix(in oklab, var(--chrome-border) 75%, transparent);
    border-left: none;
    border-radius: 0 4px 4px 0;
    box-shadow:
      5px 0 0 -3px color-mix(in oklab, var(--background-color) 92%, var(--chrome-border)),
      5px 0 0 -2px color-mix(in oklab, var(--chrome-border) 55%, transparent);
  }
`

/**
 * 浮笺画芯载体（20261017-feature-app-layout-workbench D2）：浮在案面上的素笺。
 * 壳层 layout 对非 /editor 路由页统一包进本载体（编辑页纸面即素笺本体，不套）；
 * 页面内部两档栅格与页头吸顶范式不变，本件只管「纸浮在案上」的层级。
 */
export const Sheet = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  margin: 6px 16px 14px;
  ${paperSurface}
`
