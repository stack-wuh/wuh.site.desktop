'use client'

/**
 * 草稿箱页（20260924-feature-editor-simplify-draft-box）：自动暂存草稿的列表管理。
 * 行内「继续编辑」读取全文经 workspaceStore.openDraft 载入首页编辑器并跳回首页
 * （编辑中草稿高亮，续写即在同一草稿上增量暂存）；删除走 uiConfirm 确认。
 * 列表数据经 draftsStore（壳层 layout 挂载 installDraftAutosave 时首拉并随暂存刷新），
 * 本页挂载时再拉一次保证新鲜。
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled, { keyframes } from 'styled-components'
import type { DraftMeta } from '@shared/drafts'
import { refreshDrafts, useDrafts } from '../../../lib/drafts'
import { useWorkspaceStore, workspaceStore } from '../../../lib/store'
import { uiConfirm } from '../../../components/ui/Dialog'
import { AppIcon } from '../../../components/ui/AppIcon'
import { IconInbox, IconTrash } from '../../../components/icons'
import { useLocale } from '../../../lib/i18n/context'

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

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Row = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 10px 12px;
  background: var(--chrome-panel);
  border: 1px solid ${(props) => (props.$active ? 'color-mix(in oklab, var(--primary-color) 45%, var(--chrome-border))' : 'var(--chrome-border)')};
  border-radius: var(--border-radius-md);
  transition:
    background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    border-color 0.3s ease;

  &:hover {
    background: var(--chrome-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const RowMain = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding: 2px 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-sans);
  color: var(--text-primary);
`

const RowTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
`

const RowTitleText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const EditingMark = styled.span`
  flex: none;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary-color) 14%, transparent);
  color: var(--primary-color);
  font-size: 10.5px;
  font-weight: 600;
`

const RowExcerpt = styled.span`
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`

const RowMeta = styled.span`
  display: inline-flex;
  gap: 10px;
  font-size: 10.5px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const RowDelete = styled.button`
  flex: none;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;

  &:hover {
    background: color-mix(in oklab, var(--danger-color) 12%, transparent);
    color: var(--danger-color);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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

/** App Router 页面出口（右栏普通页面，返回语义走 router） */
export default function Page(): React.JSX.Element {
  return <DraftsPage />
}
