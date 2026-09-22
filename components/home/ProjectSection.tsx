'use client'

/**
 * 首页编辑器面板的上下文行入口（20260922 由独立「项目」卡片改造收进面板上方）：
 * - WorkspacePicker：项目菜单 popover（打开本地目录 / clone https 仓库 / 最近项目），成功即切换工作区
 * - FilePicker：文件筛选 popover（readTree 收集 .md + 关键字过滤），选中经 store.openDoc 载入编辑器
 * 打开本地目录（现成 openWorkspace）/ clone（git@ 自动转 https）逻辑沿用原 ProjectSection。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type { FileNode, RecentWorkspace, WorkspaceInfo } from '@shared/types'
import { parseGitCloneUrl } from '@shared/workspace'
import { collectMarkdownFiles, filterMarkdownFiles, workspaceStore } from '../../lib/store'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { AppIcon } from '../ui/AppIcon'
import { uiConfirm } from '../ui/Dialog'
import { IconChevronDown, IconFile, IconFolderOpen } from '../icons'
import { applyWorkspaceSwitch } from '../plugins/PluginFrameHost'
import { useLocale } from '../../lib/i18n/context'

// ---------- 共享 popover 骨架（Esc / 外点关闭，面板内点击不关闭） ----------

const PickerWrap = styled.span`
  position: relative;
  display: inline-flex;
`

const PickerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  max-width: 220px;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;

  &:hover {
    background: var(--chrome-hover);
    border-color: var(--primary-color);
  }

  &[aria-expanded='true'] {
    border-color: var(--primary-color);
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

const PickerName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PickerPanel = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 300px;
  max-width: 380px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  box-shadow: 0 8px 28px color-mix(in oklab, var(--text-primary) 14%, transparent);
`

const PanelLabel = styled.h4`
  margin: 0;
  font-size: 12px;
  color: var(--text-primary);
`

const PanelTitle = styled.div`
  font-size: 11px;
  color: var(--text-muted);
`

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  word-break: break-all;
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--danger-color);
  word-break: break-all;
`

const Muted = styled.span`
  font-size: 12px;
  color: var(--text-muted);
`

const RowList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow: auto;
`

const Row = styled.li`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);

  &:hover {
    background: color-mix(in oklab, var(--primary-color) 8%, transparent);
  }
`

const RowPath = styled.span`
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** popover 通用开合行为：Esc / 面板外 mousedown 关闭 */
function usePickerOpen(): [boolean, () => void, React.RefObject<HTMLSpanElement | null>] {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])
  return [open, toggle, ref]
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// ---------- 项目菜单（打开本地 / clone / 最近） ----------

export function WorkspacePicker(): React.JSX.Element {
  const { t } = useLocale()
  const [open, toggle, wrapRef] = usePickerOpen()
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [recent, setRecent] = useState<RecentWorkspace[]>([])
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const parsed = parseGitCloneUrl(url)

  const refresh = useCallback((): void => {
    void window.api.getWorkspace().then(setWorkspace).catch(() => setWorkspace(null))
    void window.api
      .listRecentWorkspaces()
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [])

  useEffect(refresh, [refresh])
  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const switched = (info: WorkspaceInfo | null): void => {
    if (info) applyWorkspaceSwitch(info)
    refresh()
  }

  const openLocal = async (): Promise<void> => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      switched(await window.api.openWorkspace())
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  const clone = async (): Promise<void> => {
    if (!parsed || busy) return
    setError(null)
    setBusy(true)
    try {
      switched(await window.api.cloneWorkspace(parsed.httpsUrl))
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  const openRecent = async (path: string): Promise<void> => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      switched(await window.api.openWorkspaceByPath(path))
    } catch (err) {
      setError(errText(err))
      refresh()
    } finally {
      setBusy(false)
    }
  }

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
          <PanelLabel>{t('project.section')}</PanelLabel>
          <Button size="sm" onClick={() => void openLocal()} disabled={busy}>
            {busy ? t('project.opening') : t('project.openLocal')}
          </Button>
          <PanelTitle>{t('project.cloneUrlAria')}</PanelTitle>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              type="url"
              style={{ flex: 1, minWidth: 0 }}
              placeholder={t('project.cloneUrlPlaceholder')}
              value={url}
              aria-label={t('project.cloneUrlAria')}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
            <Button size="sm" onClick={() => void clone()} disabled={!parsed || busy}>
              Clone
            </Button>
          </div>
          {parsed && !busy && <Hint>{t('project.cloneHintTo', { repo: parsed.repoName })}</Hint>}
          {busy && parsed && <Hint>{t('project.cloneHintDoing', { repo: parsed.ownerRepo })}</Hint>}
          {error && <ErrorText role="alert">{error}</ErrorText>}

          <PanelTitle>{t('project.recentTitle')}</PanelTitle>
          {recent.length === 0 ? (
            <Muted>{t('project.recentEmptyHint')}</Muted>
          ) : (
            <RowList>
              {recent.map((r) => (
                <Row
                  key={r.path}
                  onClick={() => void openRecent(r.path)}
                  title={t('project.recentRowTitle', { path: r.path })}
                >
                  <span>{r.name}</span>
                  <RowPath>{r.path}</RowPath>
                </Row>
              ))}
            </RowList>
          )}
        </PickerPanel>
      )}
    </PickerWrap>
  )
}

// ---------- 文件筛选（readTree → .md → 搜索 → openDoc） ----------

export function FilePicker(): React.JSX.Element {
  const { t } = useLocale()
  const [open, toggle, wrapRef] = usePickerOpen()
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    window.api
      .readTree()
      .then((tree: FileNode[]) => setFiles(collectMarkdownFiles(tree)))
      .catch((err: unknown) => setError(errText(err)))
      .finally(() => setLoading(false))
  }, [open])

  const visible = files ? filterMarkdownFiles(files, query) : []

  const openFile = (path: string): void => {
    const proceed = (): void => {
      void window.api
        .readFile(path)
        .then((fc) => {
          workspaceStore.openDoc(fc.path, fc.content)
          toggle()
        })
        .catch((err: unknown) => setError(errText(err)))
    }
    // 脏文档先确认丢弃，避免打开新文件静默覆盖未保存更改
    const cur = workspaceStore.get()
    if (cur.dirty && cur.content) {
      void uiConfirm({
        title: t('editor.closeConfirmTitle'),
        message: t('editor.openConfirm'),
        okText: t('editor.closeConfirmTitle'),
        cancelText: t('common.cancel')
      }).then((ok) => {
        if (ok) proceed()
      })
      return
    }
    proceed()
  }

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
          <Input
            type="text"
            placeholder={t('project.fileSearch')}
            value={query}
            aria-label={t('project.fileSearch')}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {error && <ErrorText role="alert">{error}</ErrorText>}
          {loading && <Muted>{t('project.opening')}</Muted>}
          {!loading && files && visible.length === 0 && <Muted>{t('project.fileEmpty')}</Muted>}
          {!loading && visible.length > 0 && (
            <RowList>
              {visible.map((path) => (
                <Row key={path} onClick={() => openFile(path)} title={path}>
                  <span>{path.split('/').pop()}</span>
                  <RowPath>{path}</RowPath>
                </Row>
              ))}
            </RowList>
          )}
        </PickerPanel>
      )}
    </PickerWrap>
  )
}
