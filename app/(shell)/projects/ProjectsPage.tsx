'use client'

/**
 * 项目页视图主体（20260927-refactor-midsize-component-split 自 page.tsx 迁入；
 * page.tsx 保留为 App Router 薄路由入口）：项目维度分组浏览。
 * 当前工作区组置顶（徽标「当前」）+ 最近项目组（buildProjectGroups 按 root 去重）；
 * 挂载即并行拉取各组 .md 清单（readTree(root)，失效目录组自动展开呈「无法访问」态）；
 * 组可展开/收起（默认仅当前组，initialExpandedGroups/toggleExpandedGroup），收起组不渲染列表；
 * 组内行点击经脏确认（uiConfirm）→ 按需切工作区（openWorkspaceByPath，登记最近）→
 * readFile → openDoc → 跳统一编辑页 /editor。顶部筛选复用 filterMarkdownFiles，
 * 「打开目录」走 openWorkspace 后整页重拉。
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Chevron,
  Count,
  CurrentBadge,
  Empty,
  ErrorText,
  FileRow,
  FileName,
  FilePath,
  Group,
  GroupBody,
  GroupEmpty,
  GroupHeader,
  GroupList,
  GroupName,
  GroupPath,
  Head,
  HeadSpacer,
  Inner,
  PageShell,
  SearchInput,
  Unreachable
} from './styles'

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
