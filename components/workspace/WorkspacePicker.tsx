'use client'

/**
 * 工作区选择面板内容（20260922 由首页 ProjectSection 拆迁，胶囊化改造）：
 * 打开本地目录（openWorkspace）/ clone 公开 https 仓库（git@ 自动转 https）/
 * 最近项目列表。成功即切换当前工作区（applyWorkspaceSwitch 生效链）。
 * 以「面板内容」形态嵌入胶囊编辑器分区，挂载即刷新工作区与最近列表。
 */
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import type { RecentWorkspace, WorkspaceInfo } from '@shared/types'
import { parseGitCloneUrl } from '@shared/workspace'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { applyWorkspaceSwitch } from '../plugins/PluginFrameHost'
import { useLocale } from '../../lib/i18n/context'
import { ErrorText, Hint, Muted, PanelLabel, PanelTitle, Row, RowList, RowPath, errText } from './PickerShell'

const Form = styled.div`
  display: flex;
  gap: 8px;
`

const StretchInput = styled(Input)`
  flex: 1;
  min-width: 0;
`

export function WorkspacePanelContent(): React.JSX.Element {
  const { t } = useLocale()
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
    <div
      role="group"
      aria-label={t('project.section')}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <PanelLabel>{workspace ? workspace.name : t('project.section')}</PanelLabel>
      <Button size="sm" onClick={() => void openLocal()} disabled={busy}>
        {busy ? t('project.opening') : t('project.openLocal')}
      </Button>
      <PanelTitle>{t('project.cloneUrlAria')}</PanelTitle>
      <Form>
        <StretchInput
          type="url"
          placeholder={t('project.cloneUrlPlaceholder')}
          value={url}
          aria-label={t('project.cloneUrlAria')}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <Button size="sm" onClick={() => void clone()} disabled={!parsed || busy}>
          Clone
        </Button>
      </Form>
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
    </div>
  )
}
