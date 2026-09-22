'use client'

/**
 * 胶囊编辑器分区（20260922 胶囊化演进的核心件）：
 * - <EditorSection/>：TaskPopover 内的「编辑器」分区——文档状态行（路径/脏点/字数）、
 *   格式化命令组、插入组、文档操作组、大纲/工作区/文件可展开子面板。
 *   一切编辑指令经 editor-commands 发布，自身不触碰编辑器实例。
 * - <EditorCommandHost/>：常驻命令宿主（挂在 TaskCapsule，胶囊可见即在线），
 *   认领文档操作类命令（save/saveAs/newDraft/closeDoc）——直接走 workspaceStore
 *   链路，SaveAs 对话框也由它承载；格式化/插入类命令不在此消费（编辑器认领）。
 */
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { AppIcon } from '../ui/AppIcon'
import { Button } from '../ui/Button'
import { Dialog, uiConfirm } from '../ui/Dialog'
import { Input } from '../ui/Input'
import {
  IconBold,
  IconClose,
  IconCode,
  IconFile,
  IconFilePlus,
  IconFolderOpen,
  IconHeading1,
  IconHeading2,
  IconImage,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconListTree,
  IconMinus,
  IconPlus,
  IconQuote,
  IconSave,
  IconTable
} from '../icons'
import type { IconComponent } from '../ui/AppIcon'
import { workspaceStore, useWorkspaceStore, type MarkdownInsertAction } from '../../lib/store'
import { publishEditorCommand, subscribeEditorCommands } from '../../lib/editor-commands'
import { countWords, parseOutline } from '../../lib/editor-info'
import { useLocale } from '../../lib/i18n/context'
import { FilePanelContent } from '../workspace/FilePicker'
import { WorkspacePanelContent } from '../workspace/WorkspacePicker'

const Section = styled.section`
  padding: 6px 0 4px;

  & + & {
    border-top: 1px solid var(--chrome-border);
  }
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 10px 6px;
`

const SectionTitle = styled.span`
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
`

const DocRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 6px;
`

const DocChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 55%;
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

const WordStat = styled.span`
  margin-left: auto;
  flex: none;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const IconRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px 4px;
  flex-wrap: wrap;
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;

  &:hover {
    background: var(--chrome-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  &[aria-expanded='true'] {
    background: color-mix(in oklab, var(--primary-color) 16%, transparent);
    color: var(--text-primary);
  }
`

const OutlineList = styled.ul`
  list-style: none;
  margin: 0 10px 6px;
  padding: 0;
  max-height: 132px;
  overflow: auto;
  border-top: 1px solid var(--chrome-border);
`

const OutlineItem = styled.li<{ $level: number }>`
  padding: 4px 6px;
  padding-left: ${(props) => 6 + (props.$level - 1) * 12}px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
    background: color-mix(in oklab, var(--primary-color) 8%, transparent);
  }
`

const OutlineEmpty = styled.li`
  padding: 6px;
  font-size: 12px;
  color: var(--text-muted);
`

const SubPanel = styled.div`
  margin: 2px 10px 6px;
  padding: 8px;
  max-height: 240px;
  overflow: auto;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
`

const DialogError = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--danger-color);
  word-break: break-all;
`

type SubPanelKind = 'none' | 'outline' | 'workspace' | 'file'

const FORMAT_ITEMS: { action: MarkdownInsertAction; icon: IconComponent; labelKey: string }[] = [
  { action: 'h1', icon: IconHeading1, labelKey: 'editor.fmtH1' },
  { action: 'h2', icon: IconHeading2, labelKey: 'editor.fmtH2' },
  { action: 'bold', icon: IconBold, labelKey: 'editor.fmtBold' },
  { action: 'italic', icon: IconItalic, labelKey: 'editor.fmtItalic' },
  { action: 'ul', icon: IconList, labelKey: 'editor.fmtUl' },
  { action: 'ol', icon: IconListOrdered, labelKey: 'editor.fmtOl' },
  { action: 'quote', icon: IconQuote, labelKey: 'editor.fmtQuote' },
  { action: 'code', icon: IconCode, labelKey: 'editor.fmtCode' },
  { action: 'link', icon: IconLink, labelKey: 'editor.fmtLink' }
]

export function EditorSection(): React.JSX.Element {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const [panel, setPanel] = useState<SubPanelKind>('none')

  const content = doc.content ?? ''
  const outline = useMemo(() => parseOutline(content), [content])
  const words = useMemo(() => countWords(content), [content])

  const togglePanel = (kind: SubPanelKind): void => {
    setPanel((cur) => (cur === kind ? 'none' : kind))
  }

  const activeDoc = doc.activePath != null || doc.content != null

  return (
    <Section aria-label={t('capsule.editorSection')}>
      <SectionHead>
        <SectionTitle>{t('capsule.editorSection')}</SectionTitle>
      </SectionHead>

      <DocRow>
        <DocChip title={doc.activePath ?? undefined}>
          <DocPath>{doc.activePath ?? t('editor.newDraft')}</DocPath>
          {doc.dirty && <DirtyDot title={t('editor.dirtyTitle')} />}
        </DocChip>
        {activeDoc && (
          <WordStat>{t('editor.wordStat', { words: words.words, chars: words.chars })}</WordStat>
        )}
      </DocRow>

      <IconRow role="group" aria-label={t('editor.fmtAria')}>
        {FORMAT_ITEMS.map(({ action, icon, labelKey }) => (
          <IconBtn
            key={action}
            type="button"
            title={t(labelKey)}
            aria-label={t(labelKey)}
            onClick={() => publishEditorCommand({ kind: 'format', action })}
          >
            <AppIcon icon={icon} size="xs" decorative />
          </IconBtn>
        ))}
      </IconRow>

      <IconRow role="group" aria-label={t('editor.insertGroup')}>
        <IconBtn
          type="button"
          title={t('editor.fmtImage')}
          aria-label={t('editor.fmtImage')}
          onClick={() => publishEditorCommand({ kind: 'insertClipboardImage' })}
        >
          <AppIcon icon={IconImage} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.fmtTable')}
          aria-label={t('editor.fmtTable')}
          onClick={() => publishEditorCommand({ kind: 'insert', snippet: 'table' })}
        >
          <AppIcon icon={IconTable} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.fmtCodeBlock')}
          aria-label={t('editor.fmtCodeBlock')}
          onClick={() => publishEditorCommand({ kind: 'insert', snippet: 'codeBlock' })}
        >
          <AppIcon icon={IconCode} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.fmtHr')}
          aria-label={t('editor.fmtHr')}
          onClick={() => publishEditorCommand({ kind: 'insert', snippet: 'hr' })}
        >
          <AppIcon icon={IconMinus} size="xs" decorative />
        </IconBtn>
      </IconRow>

      <IconRow>
        <IconBtn
          type="button"
          title={t('editor.save')}
          aria-label={t('editor.saveAria')}
          onClick={() => publishEditorCommand({ kind: 'save' })}
        >
          <AppIcon icon={IconSave} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.saveAs')}
          aria-label={t('editor.saveAs')}
          onClick={() => publishEditorCommand({ kind: 'saveAs' })}
        >
          <AppIcon icon={IconFilePlus} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.newBtn')}
          aria-label={t('editor.newBtn')}
          onClick={() => publishEditorCommand({ kind: 'newDraft' })}
        >
          <AppIcon icon={IconPlus} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.closeDoc')}
          aria-label={t('editor.closeDoc')}
          onClick={() => publishEditorCommand({ kind: 'closeDoc' })}
        >
          <AppIcon icon={IconClose} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('editor.outline')}
          aria-label={t('editor.outline')}
          aria-expanded={panel === 'outline'}
          onClick={() => togglePanel('outline')}
        >
          <AppIcon icon={IconListTree} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('project.section')}
          aria-label={t('project.section')}
          aria-expanded={panel === 'workspace'}
          onClick={() => togglePanel('workspace')}
        >
          <AppIcon icon={IconFolderOpen} size="xs" decorative />
        </IconBtn>
        <IconBtn
          type="button"
          title={t('project.pickFile')}
          aria-label={t('project.pickFileAria')}
          aria-expanded={panel === 'file'}
          onClick={() => togglePanel('file')}
        >
          <AppIcon icon={IconFile} size="xs" decorative />
        </IconBtn>
      </IconRow>

      {panel === 'outline' && (
        <OutlineList aria-label={t('editor.outline')}>
          {outline.length === 0 ? (
            <OutlineEmpty>{t('editor.outlineEmpty')}</OutlineEmpty>
          ) : (
            outline.map((item, index) => (
              <OutlineItem
                key={`${item.line}-${item.text}`}
                $level={item.level}
                title={item.text}
                onClick={() => publishEditorCommand({ kind: 'scrollToHeading', index })}
              >
                {item.text}
              </OutlineItem>
            ))
          )}
        </OutlineList>
      )}

      {panel === 'workspace' && (
        <SubPanel>
          <WorkspacePanelContent />
        </SubPanel>
      )}

      {panel === 'file' && (
        <SubPanel>
          <FilePanelContent />
        </SubPanel>
      )}
    </Section>
  )
}

export function EditorCommandHost(): React.JSX.Element {
  const { t } = useLocale()
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [savePath, setSavePath] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const openSaveAs = (): void => {
    setSaveError(null)
    setSavePath('')
    setSaveAsOpen(true)
  }

  // 常驻订阅：文档操作类命令只认领自己的一类，其余放行给编辑器实例
  useEffect(() => {
    return subscribeEditorCommands((cmd) => {
      const cur = workspaceStore.get()
      switch (cmd.kind) {
        case 'save': {
          if (cur.activePath) {
            if (cur.dirty) void workspaceStore.saveActive()
          } else if (cur.content) {
            openSaveAs()
          }
          return true
        }
        case 'saveAs': {
          if (cur.content != null) openSaveAs()
          return true
        }
        case 'newDraft': {
          const start = (): void => workspaceStore.startDraft()
          if (cur.dirty && cur.content) {
            void uiConfirm({
              title: t('editor.closeConfirmTitle'),
              message: t('editor.closeConfirm'),
              okText: t('editor.closeConfirmTitle'),
              cancelText: t('common.cancel')
            }).then((ok) => {
              if (ok) start()
            })
          } else {
            start()
          }
          return true
        }
        case 'closeDoc': {
          if (!cur.activePath && cur.content == null) return true
          const close = (): void => workspaceStore.closeDoc()
          if (cur.dirty && cur.content) {
            void uiConfirm({
              title: t('editor.closeConfirmTitle'),
              message: t('editor.closeConfirm'),
              okText: t('editor.closeConfirmTitle'),
              cancelText: t('common.cancel')
            }).then((ok) => {
              if (ok) close()
            })
          } else {
            close()
          }
          return true
        }
        default:
          return false
      }
    })
  }, [t])

  const confirmSaveAs = async (): Promise<void> => {
    let rel = savePath.trim().replace(/^\/+/, '').replace(/^\.\//, '')
    if (!rel) return
    if (!rel.toLowerCase().endsWith('.md')) rel += '.md'
    setSaving(true)
    setSaveError(null)
    try {
      const content = workspaceStore.get().content ?? ''
      const result = await window.api.writeFile(rel, content)
      workspaceStore.openDoc(result.path, content)
      setSaveAsOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={saveAsOpen}
      title={t('editor.saveAsTitle')}
      onClose={() => setSaveAsOpen(false)}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={() => setSaveAsOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => void confirmSaveAs()}
            disabled={saving || savePath.trim().length === 0}
          >
            {t('editor.save')}
          </Button>
        </>
      }
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t('editor.fileNameLabel')}
        </span>
        <Input
          type="text"
          placeholder={t('editor.fileNamePlaceholder')}
          value={savePath}
          onChange={(e) => setSavePath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && savePath.trim()) void confirmSaveAs()
          }}
          autoFocus
        />
      </label>
      {saveError && <DialogError role="alert">{saveError}</DialogError>}
    </Dialog>
  )
}
