'use client'

/**
 * 统一编辑页（20260924-feature-projects-editor-page）：窄栏居中的 Typora 式沉浸写面。
 * 复用 MarkdownEditor（CM6 即时渲染即预览，不放预览分栏）；与首页编辑器面板互斥挂载、
 * 共用 workspaceStore 单状态源（content 双通道/命令通道契约不变，见 knowledge/editor.md）。
 * 极简顶栏：返回 · 面包屑（完整相对路径 + 脏点）· 新建 · 保存——文档操作经
 * publishEditorCommand 与胶囊/首页面板同源；面包屑可交互（20260924-feature-breadcrumb-doc-ops）：
 * 点文件名原地改名（renameDoc）、点目录段唤起目标文件夹选择（transferDoc，宿主承载
 * 迁移/复制 Dialog）；撤销/重做/查找走 CM6 原生快捷键与胶囊入口。
 * 冷启动（content==null）自动 startDraft 进入新草稿会话（先写后存）；focusMode 经
 * editor-state 总线联动淡出顶栏，Esc 退出（与首页同语义）。
 */
import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { Button } from '../../../components/ui/Button'
import { AppIcon } from '../../../components/ui/AppIcon'
import { IconArrowLeft, IconSave } from '../../../components/icons'
import { MarkdownEditor } from '../../../components/editor/MarkdownEditor'
import { useWorkspaceStore, workspaceStore } from '../../../lib/store'
import { publishEditorCommand } from '../../../lib/editor-commands'
import { publishEditorLiveState, useEditorLiveState } from '../../../lib/editor-state'
import { useLocale } from '../../../lib/i18n/context'

const PageShell = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--background-color);
  transition: background-color 0.3s ease;
`

const TopBar = styled.header<{ $dim: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 6px 14px;
  border-bottom: 1px solid var(--chrome-border);
  opacity: ${(props) => (props.$dim ? 0.05 : 1)};
  pointer-events: ${(props) => (props.$dim ? 'none' : 'auto')};
  transition:
    opacity var(--motion-dur-reveal, 600ms) var(--motion-ease-out-soft, ease-out),
    background-color 0.3s ease,
    border-color 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }
`

const Breadcrumb = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const Crumb = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 可点击面包屑段（目录段=迁移/复制入口；文件名段=原地改名入口） */
const CrumbButton = styled.button`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 4px;
  margin: -1px -4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;

  &:hover {
    color: var(--text-primary);
    background: var(--chrome-hover);
  }

  &:focus-visible {
    outline: 1px solid var(--primary-color);
  }
`

const CrumbSep = styled.span`
  flex: none;
  color: var(--chrome-border);
`

const DirtyDot = styled.span`
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning-color);
`

/** 文件名原地改名输入框（Enter/失焦提交、Esc 取消） */
const RenameInput = styled.input`
  min-width: 0;
  width: 180px;
  padding: 1px 4px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--background-color);
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  outline: none;
`

const TopSpacer = styled.span`
  flex: 1;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 16px 24px;
`

const EditorBody = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`

export function EditorPage(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const router = useRouter()
  const live = useEditorLiveState()
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // 冷启动/关闭后回到可写态：无文档（content==null）即进入新草稿会话（先写后存）
  useEffect(() => {
    if (doc.content == null) workspaceStore.startDraft()
  }, [doc.content])

  // 面包屑项目名：挂载时拉一次（工作区切换后经项目页流转重进本页，无需订阅）
  useEffect(() => {
    let alive = true
    void window.api
      .getWorkspace()
      .then((ws) => {
        if (alive) setWorkspaceName(ws?.name ?? null)
      })
      .catch(() => {
        if (alive) setWorkspaceName(null)
      })
    return () => {
      alive = false
    }
  }, [])

  // focusMode 与首页同语义：Esc 退出
  useEffect(() => {
    if (!live.focusMode) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') publishEditorLiveState({ focusMode: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [live.focusMode])

  const pathSegments = doc.activePath ? doc.activePath.split('/') : []
  const dirSegments = pathSegments.slice(0, -1)
  const fileName = pathSegments.length > 0 ? (pathSegments[pathSegments.length - 1] ?? null) : null
  const canSave = doc.activePath ? doc.dirty : (doc.content ?? '').length > 0

  const startRename = (): void => {
    setRenameValue(fileName ?? '')
    setRenaming(true)
  }

  const commitRename = (): void => {
    if (!renaming) return
    setRenaming(false)
    const next = renameValue.trim()
    if (!next || !doc.activePath || next === fileName) return
    publishEditorCommand({ kind: 'renameDoc', newName: next })
  }

  const cancelRename = (): void => {
    setRenaming(false)
  }

  const back = (): void => {
    // 常规从项目页/草稿箱进入（有历史）回落来路；冷启动直达时回首页
    if (window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <PageShell aria-label={t('editor.pageAria')}>
      <TopBar $dim={live.focusMode}>
        <Button size="sm" variant="ghost" aria-label={t('editor.back')} title={t('editor.back')} onClick={back}>
          <AppIcon icon={IconArrowLeft} size="xs" decorative />
          {t('editor.back')}
        </Button>
        <Breadcrumb>
          <Crumb>{workspaceName ?? t('editor.noProject')}</Crumb>
          {dirSegments.map((dir, index) => (
            <Fragment key={dirSegments.slice(0, index + 1).join('/')}>
              <CrumbSep>/</CrumbSep>
              <CrumbButton
                title={t('editor.crumbDirTitle')}
                onClick={() => publishEditorCommand({ kind: 'transferDoc' })}
              >
                {dir}
              </CrumbButton>
            </Fragment>
          ))}
          <CrumbSep>/</CrumbSep>
          {doc.activePath && fileName ? (
            renaming ? (
              <RenameInput
                value={renameValue}
                aria-label={t('editor.renameAria')}
                spellCheck={false}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  else if (e.key === 'Escape') cancelRename()
                }}
              />
            ) : (
              <CrumbButton title={t('editor.crumbRenameTitle')} onClick={startRename}>
                {fileName}
              </CrumbButton>
            )
          ) : (
            <Crumb>{t('editor.newDraft')}</Crumb>
          )}
          {doc.dirty && <DirtyDot title={t('editor.dirtyTitle')} />}
        </Breadcrumb>
        <TopSpacer />
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('editor.newBtn')}
          onClick={() => publishEditorCommand({ kind: 'newDraft' })}
        >
          {t('editor.newBtn')}
        </Button>
        <Button
          size="sm"
          aria-label={t('editor.saveAria')}
          disabled={!canSave}
          onClick={() => publishEditorCommand({ kind: 'save' })}
        >
          <AppIcon icon={IconSave} size="xs" decorative />
          {t('editor.save')}
        </Button>
      </TopBar>

      <Column>
        <EditorBody>
          <MarkdownEditor />
        </EditorBody>
      </Column>
    </PageShell>
  )
}

/** App Router 页面出口（右栏普通页面，菜单外路由 key=editor） */
export default function Page(): React.JSX.Element {
  return <EditorPage />
}
