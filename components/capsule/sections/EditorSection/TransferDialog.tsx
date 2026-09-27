'use client'

/**
 * 迁移/复制目标文件夹选择 Dialog（拆分自 EditorSection 单文件，
 * 20260926-refactor-mega-component-split）：纯展示组件——打开时的文档路径快照、
 * 目录树选项与双动作（迁移/复制）回调全部由宿主 EditorCommandHost 注入。
 * （20260924-feature-breadcrumb-doc-ops）
 */
import styled from 'styled-components'
import { Button } from '../../../ui/Button'
import { Dialog } from '../../../ui/Dialog'
import type { DirOption } from '@shared/docTransfer'
import { useLocale } from '../../../../lib/i18n/context'

const DialogError = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--danger-color);
  word-break: break-all;
`

/** 迁移/复制 Dialog（20260924-feature-breadcrumb-doc-ops） */
const TransferMeta = styled.p`
  margin: 0 0 10px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  word-break: break-all;
`

const TransferLabel = styled.div`
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-secondary);
`

const DirList = styled.div`
  max-height: 240px;
  overflow: auto;
  border: 1px solid var(--chrome-border);
  border-radius: 8px;
  background: color-mix(in oklab, var(--background-color) 40%, var(--chrome-raised));
`

const DirRow = styled.button<{ $active: boolean; $depth: number }>`
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 6px 10px;
  padding-left: ${(props) => 10 + props.$depth * 16}px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
  }

  ${(props) =>
    props.$active &&
    `
    background: color-mix(in oklab, var(--primary-color) 16%, transparent);
    color: var(--primary-color);
  `}
`

const DirEmpty = styled.p`
  margin: 0;
  padding: 12px 10px;
  font-size: 12px;
  color: var(--text-muted);
`

export function TransferDialog(props: {
  open: boolean
  src: string
  dir: string
  options: DirOption[] | null
  busy: boolean
  error: string | null
  onClose: () => void
  onDirChange: (dir: string) => void
  onTransfer: (dir: string, mode: 'move' | 'copy') => void
}): React.JSX.Element {
  const { t } = useLocale()
  return (
    <Dialog
      open={props.open}
      title={t('editor.transferTitle')}
      onClose={props.onClose}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={() => props.onTransfer(props.dir, 'move')} disabled={props.busy}>
            {t('editor.transferMove')}
          </Button>
          <Button size="sm" onClick={() => props.onTransfer(props.dir, 'copy')} disabled={props.busy}>
            {t('editor.transferCopy')}
          </Button>
        </>
      }
    >
      <TransferMeta>{t('editor.transferCurrent', { path: props.src })}</TransferMeta>
      <TransferLabel>{t('editor.transferTargetLabel')}</TransferLabel>
      <DirList role="listbox" aria-label={t('editor.transferTargetLabel')}>
        {props.options === null && <DirEmpty>{t('editor.transferLoading')}</DirEmpty>}
        {props.options?.map((opt) => (
          <DirRow
            key={opt.path || '__root__'}
            type="button"
            role="option"
            aria-selected={props.dir === opt.path}
            $active={props.dir === opt.path}
            $depth={opt.depth}
            title={opt.path}
            onClick={() => props.onDirChange(opt.path)}
          >
            {opt.name}
          </DirRow>
        ))}
      </DirList>
      {props.error && <DialogError role="alert">{props.error}</DialogError>}
    </Dialog>
  )
}
