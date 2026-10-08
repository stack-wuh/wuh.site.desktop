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
 * 组内文件列表虚拟化（20261007 交互优化，沿用 renderer-virtual-list 卡）：共享 VirtualList
 * 固定行高窗口渲染，组体高度封顶 VISIBLE_ROWS 行，不再随文件数展开全量列表。
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
import { Empty } from '../../../components/ui/Empty'
import { Input } from '../../../components/ui/Input'
import { PageTopbar } from '../../../components/ui/PageTopbar'
import { VirtualList } from '../../../components/ui/VirtualList'
import { IconChevronDown, IconFolderOpen } from '../../../components/icons'
import { useLocale } from '../../../lib/i18n/context'
import { errText } from '../../../components/workspace/PickerShell'
import {
  Chevron,
  Count,
  CurrentBadge,
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
  Inner,
  PageShell,
  ScrollArea,
  SearchInput,
  Spacer,
  Unreachable
} from './styles'

/** 固定行高：与 styles.ts FileRow 的 height 严格一致（VirtualList itemHeight） */
const ROW_HEIGHT = 40

/** 组体窗口封顶行数：展开后最多呈现该数量的文件行，其余进虚拟化滚动（滚动条全局隐藏） */
const VISIBLE_ROWS = 10

/** 高度封顶经 style prop 内联传递：styled(VirtualList) 会折叠组件泛型（renderer-virtual-list 卡） */
const FILE_LIST_STYLE: React.CSSProperties = {
  maxHeight: ROW_HEIGHT * VISIBLE_ROWS,
  overflowY: 'auto'
}

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
      <PageTopbar
        title={t('projects.title')}
        actions={
          <>
            {hasGroups && <Count>{t('projects.count', { n: groups.length })}</Count>}
            <Button size="sm" onClick={() => void openLocal()} disabled={busy}>
              {busy ? t('project.opening') : t('project.openLocal')}
            </Button>
          </>
        }
      />

      <ScrollArea>
      <Inner>
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
          <Empty
            icon={<AppIcon icon={IconFolderOpen} size="lg" decorative />}
            title={t('projects.emptyTitle')}
            hint={t('projects.emptyHint')}
          />
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
                    <Spacer />
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
                      {!failed && visible.length > 0 && (
                        <VirtualList
                          style={FILE_LIST_STYLE}
                          items={visible}
                          itemHeight={ROW_HEIGHT}
                          itemKey={(p) => p}
                          renderItem={(p) => (
                            <FileRow
                              type="button"
                              aria-label={t('projects.openFileAria', { path: p })}
                              title={p}
                              onClick={() => void openFile(g, p)}
                            >
                              <FileName>{p.split('/').pop()}</FileName>
                              <FilePath>{p}</FilePath>
                            </FileRow>
                          )}
                        />
                      )}
                    </GroupBody>
                  )}
                </Group>
              )
            })}
          </GroupList>
        )}

        {error && <ErrorText role="alert">{error}</ErrorText>}
      </Inner>
      </ScrollArea>
    </PageShell>
  )
}
