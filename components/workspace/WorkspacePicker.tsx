'use client'

/**
 * 工作区选择面板内容（20260922 由首页 ProjectSection 拆迁，胶囊化改造；
 * 20260924-feature-editor-simplify-draft-box 起撤除 Clone 表单——「先写后存」
 * 主线下项目选择不再是写前门槛，只留「打开本地目录 + 最近列表」，
 * cloneWorkspace IPC 全链保留、UI 暂不暴露）。成功即切换当前工作区
 * （applyWorkspaceSwitch 生效链）。以「面板内容」形态嵌入胶囊编辑器分区，
 * 挂载即刷新工作区与最近列表。
 */
import { useCallback, useEffect, useState } from 'react'
import type { RecentWorkspace, WorkspaceInfo } from '@shared/types'
import { Button } from '../ui/Button'
import { applyWorkspaceSwitch } from '../plugins/PluginFrameHost'
import { useLocale } from '../../lib/i18n/context'
import { ErrorText, Muted, PanelLabel, PanelTitle, Row, RowList, RowPath, errText } from './PickerShell'

export function WorkspacePanelContent(): React.JSX.Element {
  const { t } = useLocale()
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [recent, setRecent] = useState<RecentWorkspace[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
