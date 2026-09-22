'use client'

/**
 * 首页主编辑器面板（20260922-fix-editor-panel-controls 操作行恢复）：
 * 上方上下文行（项目菜单 + 文件筛选）→ 中央 Vditor IR 编辑区（主题桥接见
 * components/editor/MarkdownEditor）→ 下方动作行（文档状态 · 新建 · 保存）。
 * 文件相关交互全部收在上下两行（原始需求第三条）；新建/保存经 editor-commands
 * 命令通道发布，与胶囊全局入口同源——命令宿主常驻壳层 layout（单实例），
 * 冷启动态（无文档无任务）面板入口也全程可用。首页布局：问候 → 散点图 → 本面板。
 */
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import type { WorkspaceInfo } from '@shared/types'
import { useWorkspaceStore } from '../../lib/store'
import { publishEditorCommand } from '../../lib/editor-commands'
import { Button } from '../ui/Button'
import { AppIcon } from '../ui/AppIcon'
import { IconChevronDown, IconFile, IconFolderOpen, IconSave } from '../icons'
import {
  PickerButton,
  PickerName,
  PickerPanel,
  PickerWrap,
  usePickerOpen
} from '../workspace/PickerShell'
import { FilePanelContent } from '../workspace/FilePicker'
import { WorkspacePanelContent } from '../workspace/WorkspacePicker'
import { MarkdownEditor } from '../editor/MarkdownEditor'
import { useLocale } from '../../lib/i18n/context'

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  /* 上内缩 10px：编辑区与面板边框留出呼吸间距（主题修复后编辑区透明底，
     无白框外溢问题；不设 overflow:hidden——会裁掉向下展开的项目/文件 popover） */
  padding: 10px 4px 0;
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

const ContextRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 8px;
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 8px;
`

const Spacer = styled.span`
  flex: 1;
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

/** 项目菜单触发按钮：popover 内嵌 WorkspacePanelContent */
function WorkspacePicker(): React.JSX.Element {
  const { t } = useLocale()
  const [open, toggle, wrapRef] = usePickerOpen()
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)

  useEffect(() => {
    void window.api
      .getWorkspace()
      .then(setWorkspace)
      .catch(() => setWorkspace(null))
  }, [open])

  return (
    <PickerWrap ref={wrapRef}>
      <PickerButton
        type="button"
        aria-label={t('project.section')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        title={workspace?.root ?? t('project.section')}
      >
        <AppIcon icon={IconFolderOpen} size="xs" decorative />
        <PickerName>{workspace ? workspace.name : t('project.section')}</PickerName>
        <AppIcon icon={IconChevronDown} size="xs" decorative />
      </PickerButton>
      {open && (
        <PickerPanel role="dialog" aria-label={t('project.section')}>
          <WorkspacePanelContent />
        </PickerPanel>
      )}
    </PickerWrap>
  )
}

/** 文件筛选触发按钮：popover 内嵌 FilePanelContent */
function FilePicker(): React.JSX.Element {
  const { t } = useLocale()
  const [open, toggle, wrapRef] = usePickerOpen()

  return (
    <PickerWrap ref={wrapRef}>
      <PickerButton
        type="button"
        aria-label={t('project.pickFileAria')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <AppIcon icon={IconFile} size="xs" decorative />
        <PickerName>{t('project.pickFile')}</PickerName>
        <AppIcon icon={IconChevronDown} size="xs" decorative />
      </PickerButton>
      {open && (
        <PickerPanel role="dialog" aria-label={t('project.pickFileAria')}>
          <FilePanelContent />
        </PickerPanel>
      )}
    </PickerWrap>
  )
}

export function EditorPanel(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t } = useLocale()

  const canSave = doc.activePath ? doc.dirty : (doc.content ?? '').length > 0

  return (
    <Panel>
      <ContextRow>
        <WorkspacePicker />
        <FilePicker />
      </ContextRow>

      <MarkdownEditor />

      <ActionRow>
        <DocChip title={doc.activePath ?? undefined}>
          <DocPath>{doc.activePath ?? t('editor.newDraft')}</DocPath>
          {doc.dirty && <DirtyDot title={t('editor.dirtyTitle')} />}
        </DocChip>
        <Spacer />
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('editor.newBtn')}
          onClick={() => publishEditorCommand({ kind: 'newDraft' })}
        >
          {t('editor.newBtn')}
        </Button>
        <Button
          size="sm"
          aria-label={t('editor.saveAria')}
          disabled={!canSave}
          onClick={() => publishEditorCommand({ kind: 'save' })}
        >
          <AppIcon icon={IconSave} size="xs" decorative />
          {t('editor.save')}
        </Button>
      </ActionRow>
    </Panel>
  )
}
