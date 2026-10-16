'use client'

/**
 * 统一编辑页（20260924-feature-projects-editor-page）：窄栏居中的 Typora 式沉浸写面。
 * 复用 MarkdownEditor（CM6 即时渲染即预览，不放预览分栏）；与首页编辑器面板互斥挂载、
 * 共用 workspaceStore 单状态源（content 双通道/命令通道契约不变，见 knowledge/editor.md）。
 * 极简顶栏：返回 · 面包屑（完整相对路径 + 脏点）· 保存——文档操作经
 * publishEditorCommand 与胶囊同源；面包屑可交互（20260924-feature-breadcrumb-doc-ops）：
 * 点文件名原地改名（renameDoc）、点目录段唤起目标文件夹选择（transferDoc，宿主承载
 * 迁移/复制 Dialog）；草稿态有内容时面包屑可点、发布 saveAs 走原生保存面板落盘
 * （20260925-feature-draft-crumb-save，空内容纯文本）；撤销/重做/查找走 CM6 原生快捷键与胶囊入口。
 * 20261014-feature-editor-paper-rebuild（素笺手记）：编辑面唯一挂载收敛本页（首页编辑面板退役）；
 * 顶栏收敛三件制（返回/面包屑/保存，「新建」退居胶囊）并 hover 显影（常态 0.28、
 * hover/focus-within 1，focusMode 0.05 让位）；常驻工具条退役（格式化走笔帘/呼墨/胶囊）。
 * 冷启动（content==null）自动 startDraft 进入新草稿会话（先写后存）。
 */
import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { Button } from '../../../components/ui/Button'
import { AppIcon } from '../../../components/ui/AppIcon'
import { IconChevronLeft, IconListTree, IconSave } from '../../../components/icons'
import { SidePane } from '../../../components/editor/SidePane'
import { MarkdownEditor } from '../../../components/editor/MarkdownEditor'
import { Spine } from '../../../components/editor/Spine'
import { useWorkspaceStore, workspaceStore } from '../../../lib/store'
import { publishEditorCommand } from '../../../lib/editor-commands'
import { toast } from '../../../lib/feedback'
import { publishEditorLiveState, useEditorLiveState } from '../../../lib/editor-state'
import { useLocale } from '../../../lib/i18n/context'

const PageShell = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  background: var(--background-color);
  transition: background-color 0.3s ease;
`

const TopBar = styled.header<{ $dim: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 32px;
  opacity: ${(props) => (props.$dim ? 0.05 : 0.28)};
  pointer-events: ${(props) => (props.$dim ? 'none' : 'auto')};
  background: linear-gradient(
    to bottom,
    color-mix(in oklab, var(--background-color) 92%, transparent),
    transparent
  );
  transition:
    opacity var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
    background-color 0.3s ease;

  &:hover,
  &:focus-within {
    opacity: ${(props) => (props.$dim ? 0.05 : 1)};
  }

  @media (max-width: 768px) {
    padding: 6px 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: background-color 0.3s ease;
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
  max-width: 180px;
`

/** 可点击面包屑段（目录段=迁移/复制入口；文件名段=原地改名入口） */
const CrumbButton = styled.button`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
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
  /* 素笺画芯：顶部呼吸让位悬浮顶栏（视觉稿 D2），底距保持编辑器密排 */
  padding: clamp(72px, 10vh, 120px) 16px 24px;
`

const EditorBody = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
`

/* 空文档「落笔」印（素笺手记）：纸心朱印 + 三语引导；pointer-events 让键入直达 CM */
const Blank = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 5;
`

const BlankInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-base, 12px);
`

const Seal = styled.div`
  width: 76px;
  height: 76px;
  border-radius: var(--border-radius-md, 12px);
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary-400, var(--primary-color)), var(--primary-color));
  color: #fffdfb;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.1em;
  writing-mode: vertical-rl;
  transform: rotate(-2deg);
  box-shadow: 0 6px 18px color-mix(in oklab, var(--primary-color) 30%, transparent);
`

const BlankHint = styled.p`
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
`

/* 右缘上下文侧栏行（task-9）：编辑列 + 侧栏横排 */
const BodyRow = styled.div`
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
  // 右缘上下文侧栏开合（task-9）：默认展开，顶栏按钮开合（专注模式由壳层整层隐藏）
  const [paneOpen, setPaneOpen] = useState(true)

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

  /** 保存 busy（20260927-fix-shell-ux-defects）：保存是命令通道异步宿主执行，
   * 以 dirty 翻转（saveActive 成功 markSaved）为完成信号 + 超时兜底；草稿态
   * 走 saveAs 原生面板（需用户交互），不进入 busy 语义 */
  const [saving, setSaving] = useState(false)
  const onSave = (): void => {
    if (saving) return
    if (doc.activePath && doc.dirty) setSaving(true)
    publishEditorCommand({ kind: 'save' })
  }

  useEffect(() => {
    if (!saving) return
    if (!doc.dirty) {
      setSaving(false)
      void toast({ text: t('editor.saved'), kind: 'success' })
      return
    }
    const timer = window.setTimeout(() => setSaving(false), 4000)
    return () => window.clearTimeout(timer)
  }, [saving, doc.dirty, t])

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
          <AppIcon icon={IconChevronLeft} size="sm" decorative />
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
          ) : canSave ? (
            // 草稿态（activePath null）有内容：点击发布既有 saveAs → 宿主走原生保存面板落盘
            // （20260925-feature-draft-crumb-save），落盘后面包屑自动变完整路径交互态
            <CrumbButton title={t('editor.crumbDraftTitle')} onClick={() => publishEditorCommand({ kind: 'saveAs' })}>
              {t('editor.newDraft')}
            </CrumbButton>
          ) : (
            <Crumb>{t('editor.newDraft')}</Crumb>
          )}
          {doc.dirty && <DirtyDot title={t('editor.dirtyTitle')} />}
        </Breadcrumb>
        <TopSpacer />
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('editor.sideAria')}
          aria-pressed={paneOpen}
          onClick={() => setPaneOpen((v) => !v)}
        >
          <AppIcon icon={IconListTree} size="xs" decorative />
          {t('editor.sideAria')}
        </Button>
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
          disabled={!canSave || saving}
          onClick={onSave}
        >
          <AppIcon icon={IconSave} size="xs" decorative />
          {t('editor.save')}
        </Button>
      </TopBar>

      <BodyRow>
        <Column>
          <EditorBody>
            <MarkdownEditor />
            {!doc.content && (
              <Blank aria-hidden="true" data-testid="editor-blank-seal">
                <BlankInner>
                  <Seal>落笔</Seal>
                  <BlankHint>{t('editor.blankHint')}</BlankHint>
                </BlankInner>
              </Blank>
            )}
          </EditorBody>
        </Column>
        {paneOpen && <SidePane />}
      </BodyRow>
      {!paneOpen && <Spine />}
    </PageShell>
  )
}

/** App Router 页面出口（右栏普通页面，菜单外路由 key=editor） */
export default function Page(): React.JSX.Element {
  return <EditorPage />
}
