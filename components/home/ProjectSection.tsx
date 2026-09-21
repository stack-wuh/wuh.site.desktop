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
    <Section aria-label="项目">
      <SectionTitle>项目</SectionTitle>
      <Actions>
        <Button onClick={() => void openLocal()} disabled={opening || cloning}>
          {opening ? '打开中…' : '打开本地目录'}
        </Button>
        <CloneForm>
          <UrlInput
            type="url"
            placeholder="https://github.com/owner/repo.git（git@ 亦可）"
            value={url}
            aria-label="远程仓库地址"
            onChange={(e) => setUrl(e.target.value)}
            disabled={cloning || opening}
          />
          <Button onClick={() => void clone()} disabled={!parsed || cloning || opening}>
            {cloning ? 'Clone 中…' : 'Clone'}
          </Button>
        </CloneForm>
      </Actions>
      {parsed && !cloning && <Hint>将 clone 到目录「{parsed.repoName}」（位置在选择框确认）</Hint>}
      {cloning && <Hint>正在 clone {parsed?.ownerRepo ?? ''}，完成后自动打开…</Hint>}
      {error && <ErrorText role="alert">{error}</ErrorText>}

      <SectionTitle style={{ marginTop: 16 }}>最近项目</SectionTitle>
      {recent.length === 0 ? (
        <Empty title="暂无最近项目" hint="打开本地目录或 clone 一个仓库后出现在这里" />
      ) : (
        <RecentList>
          {recent.map((r) => (
            <RecentRow
              key={r.path}
              onClick={() => void openRecent(r.path)}
              title={`打开 ${r.path}`}
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
