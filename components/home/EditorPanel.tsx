'use client'

/**
 * 首页主编辑器面板（20260922 胶囊化精简版）：
 * Vditor IR 纯编辑区（components/editor/MarkdownEditor）+ 底部文档状态行。
 * 格式化/插入/保存/新建/大纲/工作区与文件选择入口全部收进壳层全局胶囊
 * （components/tasks/EditorSection），面板保持 Claude Code 输入台式的极简形态。
 * 首页布局不变：问候语 → 散点图卡片 → 本面板（卡片式紧凑尺寸，编辑区自动增高）；
 * 写入走 workspaceStore（MarkdownEditor 内直写），Cmd/Ctrl+S 保存由编辑器拦截。
 */
import styled from 'styled-components'
import { useWorkspaceStore } from '../../lib/store'
import { MarkdownEditor } from '../editor/MarkdownEditor'
import { useLocale } from '../../lib/i18n/context'

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  /* 上内缩 10px（旧 ContextRow 呼应）+ overflow 裁剪：编辑区背景/圆角/阴影
     不得溢出面板上缘遮挡上方卡片间距（20260922-fix-vditor-theme-bridge） */
  padding: 10px 4px 0;
  overflow: hidden;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-lg, var(--border-radius-md));
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  &:focus-within {
    border-color: color-mix(in oklab, var(--primary-color) 55%, var(--chrome-border));
  }
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 8px;
`

const DocChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 46%;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const DocPath = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DirtyDot = styled.span`
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning-color);
`

export function EditorPanel(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t } = useLocale()

  return (
    <Panel>
      <MarkdownEditor />
      <StatusRow>
        <DocChip title={doc.activePath ?? undefined}>
          <DocPath>{doc.activePath ?? t('editor.newDraft')}</DocPath>
          {doc.dirty && <DirtyDot title={t('editor.dirtyTitle')} />}
        </DocChip>
      </StatusRow>
    </Panel>
  )
}
