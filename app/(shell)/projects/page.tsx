'use client'

/**
 * 项目页（20260924-feature-projects-editor-page）：项目维度分组浏览。
 * 当前工作区组置顶（徽标「当前」）+ 最近项目组（buildProjectGroups 按 root 去重）；
 * 挂载即并行拉取各组 .md 清单（readTree(root)，失效目录组自动展开呈「无法访问」态）；
 * 组可展开/收起（默认仅当前组，initialExpandedGroups/toggleExpandedGroup），收起组不渲染列表；
 * 组内行点击经脏确认（uiConfirm）→ 按需切工作区（openWorkspaceByPath，登记最近）→
 * readFile → openDoc → 跳统一编辑页 /editor。顶部筛选复用 filterMarkdownFiles，
 * 「打开目录」走 openWorkspace 后整页重拉。
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled, { keyframes } from 'styled-components'
import type { FileNode, RecentWorkspace } from '@shared/types'
import {
  buildProjectGroups,
  initialExpandedGroups,
  toggleExpandedGroup,
  type ProjectGroup
} from '../../../lib/projects'
import { collectMarkdownFiles, filterMarkdownFiles } from '../../../lib/store'
import { openProjectFile } from '../../../lib/projectOpen'
import { AppIcon } from '../../../components/ui/AppIcon'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { IconChevronDown, IconFolderOpen } from '../../../components/icons'
import { useLocale } from '../../../lib/i18n/context'
import { errText } from '../../../components/workspace/PickerShell'

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const PageShell = styled.section`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 20px 32px 48px;
  background: var(--background-color);
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  @media (max-width: 768px) {
    padding: 16px 16px 40px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Inner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 860px;
  margin: 0 auto;
`

const Head = styled.header`
  display: flex;
  align-items: baseline;
  gap: 10px;

  & > h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-sans);
  }
`

const Count = styled.span`
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const HeadSpacer = styled.span`
  flex: 1;
`

const SearchInput = styled(Input)`
  width: 100%;
`

const GroupList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Group = styled.li`
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: border-color 0.3s ease;
`

const GroupHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  color: var(--text-primary);

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

const GroupName = styled.span`
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CurrentBadge = styled.span`
  flex: none;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 10.5px;
  font-weight: 600;
`

const GroupPath = styled.span`
  font-size: 10.5px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Chevron = styled.span<{ $open: boolean }>`
  flex: none;
  display: inline-flex;
  color: var(--text-muted);
  transition: transform var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);
  transform: rotate(${(props) => (props.$open ? 0 : -90)}deg);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const GroupBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 8px 10px;
`

const FileRow = styled.button`
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  color: var(--text-primary);

  &:hover {
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

const FileName = styled.span`
  flex: none;
  font-size: 13px;
  font-weight: 500;
`

const FilePath = styled.span`
  font-size: 10.5px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Unreachable = styled.p`
  margin: 4px 4px 2px;
  font-size: 12px;
  color: var(--warning-color);
`

const GroupEmpty = styled.p`
  margin: 4px 4px 2px;
  font-size: 12px;
  color: var(--text-muted);
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 56px 0;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--danger-color);
`

export function ProjectsPage(): React.JSX.Element {
  const { t } = useLocale()
  const router = useRouter()
  const [groups, setGroups] = useState<ProjectGroup[] | null>(null)
  const [files, setFiles] = useState<Record<string, string[]>>({})
  const [failedGroups, setFailedGroups] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (alive: () => boolean): Promise<void> => {
    const [ws, recent] = await Promise.all([
      window.api.getWorkspace().catch(() => null),
      window.api.listRecentWorkspaces().catch((): RecentWorkspace[] => [])
    ])
    if (!alive()) return
    const next = buildProjectGroups(ws, recent)
    setGroups(next)
    setExpanded(initialExpandedGroups(next))
    setFiles({})
    setFailedGroups(new Set())
    for (const g of next) {
      void window.api
        .readTree(g.root)
        .then((tree: FileNode[]) => {
          if (alive()) setFiles((prev) => ({ ...prev, [g.root]: collectMarkdownFiles(tree) }))
        })
        .catch(() => {
          if (!alive()) return
          // 失效目录：标记并自动展开，让「无法访问」直接可见
          setFailedGroups((prev) => new Set(prev).add(g.root))
          setExpanded((prev) => new Set(prev).add(g.root))
        })
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const alive = (): boolean => mounted
    void load(alive)
    return () => {
      mounted = false
    }
  }, [load])

  const openLocal = async (): Promise<void> => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const info = await window.api.openWorkspace()
      if (info) await load((): boolean => true)
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  const openFile = async (group: ProjectGroup, relPath: string): Promise<void> => {
    if (busy) return
    setError(null)
    // 脏确认/切工作区/读取/openDoc 收口在共享 openProjectFile（菜单树同流），此处只管错误展示与跳转
    const res = await openProjectFile(group, relPath, t)
    if (res.outcome === 'opened') router.push('/editor')
    else if (res.outcome === 'error') setError(errText(res.error))
  }

  const hasGroups = groups != null && groups.length > 0

  return (
    <PageShell aria-label={t('projects.title')}>
      <Inner>
        <Head>
          <h1>{t('projects.title')}</h1>
          {hasGroups && <Count>{t('projects.count', { n: groups.length })}</Count>}
          <HeadSpacer />
          <Button size="sm" onClick={() => void openLocal()} disabled={busy}>
            {busy ? t('project.opening') : t('project.openLocal')}
          </Button>
        </Head>

        {hasGroups && (
          <SearchInput
            type="text"
            placeholder={t('project.fileSearch')}
            value={query}
            aria-label={t('project.fileSearch')}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        {groups != null && groups.length === 0 && (
          <Empty>
            <AppIcon icon={IconFolderOpen} size="lg" decorative />
            <span>{t('projects.noProjects')}</span>
          </Empty>
        )}

        {hasGroups && (
          <GroupList>
            {groups.map((g) => {
              const open = expanded.has(g.root)
              const failed = failedGroups.has(g.root)
              const visible = files[g.root] ? filterMarkdownFiles(files[g.root], query) : []
              return (
                <Group key={g.root}>
                  <GroupHeader
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpanded((prev) => toggleExpandedGroup(prev, g.root))}
                  >
                    <AppIcon icon={IconFolderOpen} size="sm" decorative />
                    <GroupName>{g.name}</GroupName>
                    {g.current && <CurrentBadge>{t('projects.currentBadge')}</CurrentBadge>}
                    {!g.current && <GroupPath>{g.root}</GroupPath>}
                    <HeadSpacer />
                    <Chevron $open={open}>
                      <AppIcon icon={IconChevronDown} size="xs" decorative />
                    </Chevron>
                  </GroupHeader>
                  {open && (
                    <GroupBody>
                      {failed && (
                        <Unreachable>
                          {t('projects.unreachable')} · {g.root}
                        </Unreachable>
                      )}
                      {!failed && files[g.root] && visible.length === 0 && (
                        <GroupEmpty>{t('projects.groupEmpty')}</GroupEmpty>
                      )}
                      {visible.map((p) => (
                        <FileRow
                          key={p}
                          type="button"
                          aria-label={t('projects.openFileAria', { path: p })}
                          title={p}
                          onClick={() => void openFile(g, p)}
                        >
                          <FileName>{p.split('/').pop()}</FileName>
                          <FilePath>{p}</FilePath>
                        </FileRow>
                      ))}
                    </GroupBody>
                  )}
                </Group>
              )
            })}
          </GroupList>
        )}

        {error && <ErrorText role="alert">{error}</ErrorText>}
      </Inner>
    </PageShell>
  )
}

/** App Router 页面出口（右栏普通页面） */
export default function Page(): React.JSX.Element {
  return <ProjectsPage />
}
