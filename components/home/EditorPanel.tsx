'use client'

/**
 * 首页主编辑器面板（20260922，仿 Claude Code 输入台）：
 * 上方上下文行（项目菜单 + 文件筛选 + 简洁/全功能模式切换）→
 * 中央自动增高输入框（主编辑器，全功能态挂 Markdown 格式化工具栏）→
 * 下方动作行（文档状态 · 实时预览胶囊[简洁态] · 新建 · 保存）。
 * 文件相关交互全部收在上下两行，输入框本体保持稳定；
 * 写入走 workspaceStore（setContent/openDoc），保存复用 saveActive / writeFile 落盘链。
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type { EditorMode, MarkdownInsertAction } from '../../lib/store'
import {
  EDITOR_MODE_STORAGE_KEY,
  applyMarkdownInsert,
  parseEditorMode,
  workspaceStore,
  useWorkspaceStore
} from '../../lib/store'
import { Button } from '../ui/Button'
import { Dialog, uiConfirm } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { AppIcon } from '../ui/AppIcon'
import { IconSave } from '../icons'
import { useLocale } from '../../lib/i18n/context'
import { FilePicker, WorkspacePicker } from './ProjectSection'
import { FormatToolbar } from './FormatToolbar'
import { PreviewCapsule } from './PreviewCapsule'

const MIN_EDITOR_HEIGHT = 140

const Panel = styled.section`
  display: flex;
  flex-direction: column;
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
  padding: 10px 12px 0;
`

const Spacer = styled.span`
  flex: 1;
`

const ModeSwitch = styled.div`
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: 999px;
`

const ModeButton = styled.button<{ $active: boolean }>`
  height: 22px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  font-size: 11px;
  cursor: pointer;
  color: ${(props) => (props.$active ? 'var(--text-primary)' : 'var(--text-muted)')};
  background: ${(props) =>
    props.$active ? 'color-mix(in oklab, var(--primary-color) 18%, transparent)' : 'transparent'};
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;

  &:hover {
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 主编辑器：透明无边框 textarea，占满面板；自动增高，超限内部滚动 */
const EditorArea = styled.textarea`
  flex: 1;
  min-height: ${MIN_EDITOR_HEIGHT}px;
  max-height: 45vh;
  margin: 8px 12px 0;
  padding: 4px 2px 10px;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.7;

  &::placeholder {
    color: var(--text-muted);
  }
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 10px;
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

const DialogError = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--danger-color);
  word-break: break-all;
`

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function EditorPanel(): React.JSX.Element {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // 模式偏好：默认简洁态，挂载后读回持久化值（避免 SSR 期触 localStorage）
  const [mode, setMode] = useState<EditorMode>('simple')
  useEffect(() => {
    try {
      setMode(parseEditorMode(window.localStorage.getItem(EDITOR_MODE_STORAGE_KEY)))
    } catch {
      /* localStorage 不可用时保持默认 */
    }
  }, [])
  const switchMode = useCallback((next: EditorMode): void => {
    setMode(next)
    try {
      window.localStorage.setItem(EDITOR_MODE_STORAGE_KEY, next)
    } catch {
      /* 持久化失败不影响本会话 */
    }
  }, [])

  // 自动增高：内容变化（输入/打开文件）后按 scrollHeight 重算
  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    const max = Math.max(MIN_EDITOR_HEIGHT, Math.round(window.innerHeight * 0.45))
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_EDITOR_HEIGHT), max)}px`
  }, [doc.content])

  // 打开文档后把焦点与光标归还编辑器
  useEffect(() => {
    if (doc.activePath && taRef.current) {
      const el = taRef.current
      el.focus()
      const end = el.value.length
      el.setSelectionRange(end, end)
    }
  }, [doc.activePath])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    workspaceStore.setContent(e.target.value)
  }

  const applyInsert = useCallback(
    (action: MarkdownInsertAction): void => {
      const el = taRef.current
      if (!el) return
      const value = doc.content ?? ''
      const start = el.selectionStart ?? value.length
      const end = el.selectionEnd ?? start
      const r = applyMarkdownInsert(value, start, end, action)
      workspaceStore.setContent(r.content)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(r.selStart, r.selEnd)
      })
    },
    [doc.content]
  )

  // 新草稿命名落盘
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [savePath, setSavePath] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const openSaveAs = (): void => {
    setSaveError(null)
    setSaveAsOpen(true)
  }

  const confirmSaveAs = async (): Promise<void> => {
    let rel = savePath.trim().replace(/^\/+/, '').replace(/^\.\//, '')
    if (!rel) return
    if (!rel.toLowerCase().endsWith('.md')) rel += '.md'
    setSaving(true)
    setSaveError(null)
    try {
      const result = await window.api.writeFile(rel, doc.content ?? '')
      workspaceStore.openDoc(result.path, doc.content ?? '')
      setSaveAsOpen(false)
    } catch (err) {
      setSaveError(errText(err))
    } finally {
      setSaving(false)
    }
  }

  const canSave = doc.activePath ? doc.dirty : (doc.content ?? '').length > 0

  const save = useCallback((): void => {
    if (doc.activePath) {
      if (doc.dirty) void workspaceStore.saveActive()
    } else if ((doc.content ?? '').length > 0) {
      openSaveAs()
    }
  }, [doc.activePath, doc.dirty, doc.content])

  // Cmd/Ctrl+S 保存（编辑器内拦截）
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      save()
    }
  }

  const startNew = useCallback((): void => {
    if (doc.dirty && doc.content) {
      void uiConfirm({
        title: t('editor.closeConfirmTitle'),
        message: t('editor.closeConfirm'),
        okText: t('editor.closeConfirmTitle'),
        cancelText: t('common.cancel')
      }).then((ok) => {
        if (ok) workspaceStore.startDraft()
      })
    } else {
      workspaceStore.startDraft()
    }
  }, [doc.dirty, doc.content, t])

  return (
    <Panel>
      <ContextRow>
        <WorkspacePicker />
        <FilePicker />
        <Spacer />
        <ModeSwitch role="group" aria-label={t('editor.modeAria')}>
          <ModeButton
            type="button"
            $active={mode === 'simple'}
            aria-pressed={mode === 'simple'}
            onClick={() => switchMode('simple')}
          >
            {t('editor.modeSimple')}
          </ModeButton>
          <ModeButton
            type="button"
            $active={mode === 'full'}
            aria-pressed={mode === 'full'}
            onClick={() => switchMode('full')}
          >
            {t('editor.modeFull')}
          </ModeButton>
        </ModeSwitch>
      </ContextRow>

      {mode === 'full' && <FormatToolbar onInsert={applyInsert} />}

      <EditorArea
        ref={taRef}
        value={doc.content ?? ''}
        placeholder={t('editor.placeholder')}
        onChange={onChange}
        onKeyDown={onKeyDown}
        spellCheck={false}
        aria-label={t('editor.placeholder')}
      />

      <ActionRow>
        <DocChip title={doc.activePath ?? undefined}>
          <DocPath>{doc.activePath ?? t('editor.newDraft')}</DocPath>
          {doc.dirty && <DirtyDot title={t('editor.dirtyTitle')} />}
        </DocChip>
        <Spacer />
        {mode === 'simple' && <PreviewCapsule />}
        <Button size="sm" variant="ghost" onClick={startNew}>
          {t('editor.newBtn')}
        </Button>
        <Button size="sm" onClick={save} disabled={!canSave} aria-label={t('editor.saveAria')}>
          <AppIcon icon={IconSave} size="xs" decorative />
          {t('editor.save')}
        </Button>
      </ActionRow>

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
    </Panel>
  )
}
