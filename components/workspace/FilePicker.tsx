'use client'

/**
 * 文件选择面板内容（20260922 由首页 ProjectSection 拆迁，胶囊化改造）：
 * readTree 收集 .md（DFS）+ 关键字过滤，选中经 store.openDoc 载入编辑器；
 * 脏文档先 uiConfirm 确认丢弃，避免静默覆盖未保存更改。
 * 以「面板内容」形态嵌入胶囊编辑器分区，挂载即加载文件树。
 */
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import type { FileNode } from '@shared/types'
import { collectMarkdownFiles, filterMarkdownFiles, workspaceStore } from '../../lib/store'
import { Input } from '../ui/Input'
import { uiConfirm } from '../ui/Dialog'
import { useLocale } from '../../lib/i18n/context'
import { ErrorText, Muted, Row, RowList, RowPath, errText } from './PickerShell'

const SearchInput = styled(Input)`
  width: 100%;
`

export function FilePanelContent(): React.JSX.Element {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    window.api
      .readTree()
      .then((tree: FileNode[]) => {
        if (alive) setFiles(collectMarkdownFiles(tree))
      })
      .catch((err: unknown) => {
        if (alive) setError(errText(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const visible = files ? filterMarkdownFiles(files, query) : []

  const openFile = (path: string): void => {
    const proceed = (): void => {
      void window.api
        .readFile(path)
        .then((fc) => {
          workspaceStore.openDoc(fc.path, fc.content)
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
    <div
      role="group"
      aria-label={t('project.pickFileAria')}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <SearchInput
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
    </div>
  )
}
