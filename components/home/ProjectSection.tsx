'use client'

/**
 * 首页「项目」区块（20260921 新建博客项目入口）：
 * 打开本地目录（现成 openWorkspace）/ clone 公开 https 仓库（git@ 自动转 https）/
 * 最近项目列表（点开即重开）。成功即切换当前工作区（applyWorkspaceSwitch 生效链）。
 */
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import type { RecentWorkspace, WorkspaceInfo } from '@shared/types'
import { parseGitCloneUrl } from '@shared/workspace'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Empty } from '../ui/Empty'
import { applyWorkspaceSwitch } from '../plugins/PluginFrameHost'
import { useLocale } from '../../lib/i18n/context'

const Section = styled.section`
  padding: 16px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  transition: background-color 0.3s ease;
`

const SectionTitle = styled.h3`
  font-size: 13px;
  margin: 0 0 12px;
  color: var(--text-primary);
`

const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-wrap: wrap;
`

const CloneForm = styled.div`
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 260px;
`

const UrlInput = styled(Input)`
  flex: 1;
  min-width: 0;
`

const Hint = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  word-break: break-all;
`

const ErrorText = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--danger-color);
  word-break: break-all;
`

const RecentList = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RecentRow = styled.li`
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

const RecentPath = styled.span`
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function ProjectSection(): React.JSX.Element {
  const { t } = useLocale()
  const [url, setUrl] = useState('')
  const [cloning, setCloning] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<RecentWorkspace[]>([])
  const parsed = parseGitCloneUrl(url)

  const refreshRecent = useCallback((): void => {
    void window.api
      .listRecentWorkspaces()
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [])

  useEffect(refreshRecent, [refreshRecent])

  const switched = (info: WorkspaceInfo | null): void => {
    if (info) applyWorkspaceSwitch(info)
    refreshRecent()
  }

  const openLocal = async (): Promise<void> => {
    if (opening || cloning) return
    setError(null)
    setOpening(true)
    try {
      switched(await window.api.openWorkspace())
    } catch (err) {
      setError(errText(err))
    } finally {
      setOpening(false)
    }
  }

  const clone = async (): Promise<void> => {
    if (!parsed || cloning || opening) return
    setError(null)
    setCloning(true)
    try {
      switched(await window.api.cloneWorkspace(parsed.httpsUrl))
    } catch (err) {
      setError(errText(err))
    } finally {
      setCloning(false)
    }
  }

  const openRecent = async (path: string): Promise<void> => {
    if (opening || cloning) return
    setError(null)
    setOpening(true)
    try {
      switched(await window.api.openWorkspaceByPath(path))
    } catch (err) {
      setError(errText(err))
      refreshRecent()
    } finally {
      setOpening(false)
    }
  }

  return (
    <Section aria-label={t('project.section')}>
      <SectionTitle>{t('project.section')}</SectionTitle>
      <Actions>
        <Button onClick={() => void openLocal()} disabled={opening || cloning}>
          {opening ? t('project.opening') : t('project.openLocal')}
        </Button>
        <CloneForm>
          <UrlInput
            type="url"
            placeholder={t('project.cloneUrlPlaceholder')}
            value={url}
            aria-label={t('project.cloneUrlAria')}
            onChange={(e) => setUrl(e.target.value)}
            disabled={cloning || opening}
          />
          <Button onClick={() => void clone()} disabled={!parsed || cloning || opening}>
            {cloning ? t('project.opening') : 'Clone'}
          </Button>
        </CloneForm>
      </Actions>
      {parsed && !cloning && <Hint>{t('project.cloneHintTo', { repo: parsed.repoName })}</Hint>}
      {cloning && <Hint>{t('project.cloneHintDoing', { repo: parsed?.ownerRepo ?? '' })}</Hint>}
      {error && <ErrorText role="alert">{error}</ErrorText>}

      <SectionTitle style={{ marginTop: 16 }}>{t('project.recentTitle')}</SectionTitle>
      {recent.length === 0 ? (
        <Empty title={t('project.recentEmptyTitle')} hint={t('project.recentEmptyHint')} />
      ) : (
        <RecentList>
          {recent.map((r) => (
            <RecentRow
              key={r.path}
              onClick={() => void openRecent(r.path)}
              title={t('project.recentRowTitle', { path: r.path })}
            >
              <span>{r.name}</span>
              <RecentPath>{r.path}</RecentPath>
            </RecentRow>
          ))}
        </RecentList>
      )}
    </Section>
  )
}
