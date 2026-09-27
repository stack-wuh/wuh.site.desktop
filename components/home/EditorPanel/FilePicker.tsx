'use client'

/**
 * 文件筛选触发按钮（拆分自 EditorPanel 单文件，20260927-refactor-midsize-component-split）：
 * popover 内嵌 FilePanelContent。
 */
import { useState } from 'react'
import { AppIcon } from '../../ui/AppIcon'
import { IconChevronDown, IconFile } from '../../icons'
import { PickerButton, PickerName, PickerPanel, PickerWrap, usePickerOpen } from '../../workspace/PickerShell'
import { FilePanelContent } from '../../workspace/FilePicker'
import { useLocale } from '../../../lib/i18n/context'

/** 文件筛选触发按钮：popover 内嵌 FilePanelContent */
export function FilePicker(): React.JSX.Element {
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
