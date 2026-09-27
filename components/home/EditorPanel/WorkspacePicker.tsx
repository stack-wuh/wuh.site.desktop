'use client'

/**
 * 项目菜单触发按钮（拆分自 EditorPanel 单文件，20260927-refactor-midsize-component-split）：
 * popover 内嵌 WorkspacePanelContent。
 */
import { useEffect, useState } from 'react'
import type { WorkspaceInfo } from '@shared/types'
import { AppIcon } from '../../ui/AppIcon'
import { IconChevronDown, IconFolderOpen } from '../../icons'
import { PickerButton, PickerName, PickerPanel, PickerWrap, usePickerOpen } from '../../workspace/PickerShell'
import { WorkspacePanelContent } from '../../workspace/WorkspacePicker'
import { useLocale } from '../../../lib/i18n/context'

/** 项目菜单触发按钮：popover 内嵌 WorkspacePanelContent */
export function WorkspacePicker(): React.JSX.Element {
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
