'use client'

/**
 * 草稿箱页视图主体（20260927-refactor-midsize-component-split 自 page.tsx 迁入；
 * page.tsx 保留为 App Router 薄路由入口）：自动暂存草稿的列表管理。
 * 行内「继续编辑」读取全文经 workspaceStore.openDraft 载入首页编辑器并跳回首页
 * （编辑中草稿高亮，续写即在同一草稿上增量暂存）；删除走 uiConfirm 确认。
 * 列表数据经 draftsStore（壳层 layout 挂载 installDraftAutosave 时首拉并随暂存刷新），
 * 本页挂载时再拉一次保证新鲜。
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DraftMeta } from '@shared/drafts'
import { refreshDrafts, useDrafts } from '../../../lib/drafts'
import { useWorkspaceStore, workspaceStore } from '../../../lib/store'
import { uiConfirm } from '../../../components/ui/Dialog'
import { AppIcon } from '../../../components/ui/AppIcon'
import { IconInbox, IconTrash } from '../../../components/icons'
import { useLocale } from '../../../lib/i18n/context'
import {
  Count,
  Empty,
  ErrorText,
  Head,
  Inner,
  List,
  PageShell,
  Row,
  RowDelete,
  RowExcerpt,
  RowMain,
  RowMeta,
  RowTitle,
  RowTitleText,
  EditingMark
} from './styles'

function formatTime(ts: number, locale: string): string {
  const tag = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US'
  return new Date(ts).toLocaleString(tag, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function DraftsPage(): React.JSX.Element {
  const { t, locale } = useLocale()
  const router = useRouter()
  const { loaded, drafts } = useDrafts()
  const activeDraftId = useWorkspaceStore().activeDraftId
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void refreshDrafts()
  }, [])

  const open = async (meta: DraftMeta): Promise<void> => {
    setError(null)
    try {
      const content = await window.api.readDraft(meta.id)
      if (content == null) {
        setError(t('drafts.readFailed'))
        return
      }
      workspaceStore.openDraft(content, meta.id)
      router.push('/editor')
    } catch {
      setError(t('drafts.readFailed'))
    }
  }

  const remove = async (meta: DraftMeta): Promise<void> => {
    const display = meta.title || t('drafts.untitled')
    const ok = await uiConfirm({
      title: t('drafts.deleteConfirmTitle'),
      message: t('drafts.deleteConfirm', { title: display }),
      okText: t('common.ok'),
      cancelText: t('common.cancel')
    })
    if (!ok) return
    await window.api.removeDraft(meta.id)
    await refreshDrafts()
  }

  return (
    <PageShell aria-label={t('drafts.title')}>
      <Inner>
        <Head>
          <h1>{t('drafts.title')}</h1>
          {loaded && drafts.length > 0 && <Count>{t('drafts.count', { n: drafts.length })}</Count>}
        </Head>

        {loaded && drafts.length === 0 ? (
          <Empty>
            <AppIcon icon={IconInbox} size="lg" decorative />
            <span>{t('drafts.empty')}</span>
          </Empty>
        ) : (
          <List>
            {drafts.map((meta) => {
              const active = meta.id === activeDraftId
              return (
                <Row key={meta.id} $active={active}>
                  <RowMain
                    type="button"
                    onClick={() => void open(meta)}
                    aria-label={`${t('drafts.open')}: ${meta.title || t('drafts.untitled')}`}
                  >
                    <RowTitle>
                      <RowTitleText>{meta.title || t('drafts.untitled')}</RowTitleText>
                      {active && <EditingMark>{t('drafts.editing')}</EditingMark>}
                    </RowTitle>
                    {meta.excerpt && <RowExcerpt>{meta.excerpt}</RowExcerpt>}
                    <RowMeta>
                      <span>{t('drafts.updatedAt', { time: formatTime(meta.updatedAt, locale) })}</span>
                      <span>{t('drafts.chars', { n: meta.chars })}</span>
                    </RowMeta>
                  </RowMain>
                  <RowDelete
                    type="button"
                    aria-label={`${t('drafts.delete')}: ${meta.title || t('drafts.untitled')}`}
                    title={t('drafts.delete')}
                    onClick={() => void remove(meta)}
                  >
                    <AppIcon icon={IconTrash} size="sm" />
                  </RowDelete>
                </Row>
              )
            })}
          </List>
        )}

        {error && <ErrorText role="alert">{error}</ErrorText>}
      </Inner>
    </PageShell>
  )
}
