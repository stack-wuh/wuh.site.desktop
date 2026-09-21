'use client'

import styled from 'styled-components'

/** 跨页面共享的轻量文本/行动作原语（原 hint-text/error-text/ok-text/row-actions） */

export const HintText = styled.p`
  color: var(--text-muted);
  font-size: 12px;
  margin: 6px 0;
`

export const ErrorText = styled.p`
  color: var(--danger-color);
  font-size: 12px;
  margin: 6px 0;
  word-break: break-all;
`

export const OkText = styled.p`
  color: var(--success-color);
  font-size: 12px;
  margin: 6px 0;
  word-break: break-all;
`

export const RowActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
  align-items: center;

  & > input {
    flex: 1;
    min-width: 0;
  }
`
