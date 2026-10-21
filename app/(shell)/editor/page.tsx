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
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { Button } from '../../../components/ui/Button'
import { AppIcon } from '../../../components/ui/AppIcon'
import { IconChevronLeft, IconListTree, IconSave } from '../../../components/icons'
import { SidePane } from '../../../components/editor/SidePane'
import { MarkdownEditor } from '../../../components/editor/MarkdownEditor'
import { Spine } from '../../../components/editor/Spine'
import { paperSurface } from '../../../components/ui/Sheet'
import { parseFrontmatter } from '@shared/frontmatter'
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
  /* 案面透出（D2）：编辑页纸面即素笺本体——壳不再铺底，纸浮在案上 */
  background: transparent;
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

  /* 动作钮恒整排：禁 flex 挤压（面包屑负责让位） */
  & > button {
    flex: none;
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
  /* 画芯列宽（760）下的让位契约：面包屑是唯一可压缩项——按钮恒整排、
     不许被长路径挤成竖排（20261017 走查修复） */
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
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
  flex: none;
  width: 8px;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 760px;
  margin: 6px auto 14px;
  position: relative;
  /* 顶栏承载（D6）：悬浮顶栏 absolute 于画芯列内——按钮恒落在纸上，
     不被右缘书耳浮笺盖住（20261017 走查修复：全宽顶栏曾被 z30 浮笺压住按钮） */
  ${paperSurface}
  padding: clamp(72px, 10vh, 120px) 16px 24px;

  /* 已发布骑缝（20261021-style-published-seal，视觉稿 design-mockups/20261021-published-trace）：
     纸页叠口本身染朱——页缘被「盖过」；态驱动走 data 属性（styled 动态类有翻转失灵先例） */
  &[data-published='true']::before {
    top: 16px;
    bottom: 16px;
    width: 7px;
    background: color-mix(in oklab, var(--primary-500) 34%, var(--background-color));
    border-color: color-mix(in oklab, var(--primary-500) 58%, transparent);
    box-shadow:
      5px 0 0 -3px color-mix(in oklab, var(--primary-500) 28%, var(--background-color)),
      5px 0 0 -2px color-mix(in oklab, var(--primary-500) 60%, transparent);
  }

  /* 发布瞬间：朱色从叠口中段向两端晕开一次（仅同文档首次发布） */
  &[data-stamped='true']::before {
    animation: stack-ink 220ms var(--motion-ease-out-soft);
  }

  @keyframes stack-ink {
    from {
      clip-path: inset(50% 0 50% 0);
      opacity: 0.4;
    }
    to {
      clip-path: inset(0 0 0 0);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
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
  // 刊印（20261021-style-published-seal）：frontmatter issue 存在即显形（纯显示、零字节改写）
  const publishedIssue = useMemo(() => {
    const raw = parseFrontmatter(doc.content ?? '').data.issue
    const n = Number(String(raw ?? '').trim())
    return Number.isInteger(n) && n > 0 ? n : null
  }, [doc.content])
  // 落色动效只在「同一文档 issue 由无到有」的瞬间演一次；切换文档/加载已发布文档不重演
  const prevPublishRef = useRef<{ path: string | null; issue: number | null }>({ path: null, issue: null })
  const [stackStamp, setStackStamp] = useState(false)
  useEffect(() => {
    const prev = prevPublishRef.current
    const becamePublished = prev.path === doc.activePath && prev.issue == null && publishedIssue != null
    prevPublishRef.current = { path: doc.activePath, issue: publishedIssue }
    if (!becamePublished) return
    setStackStamp(true)
    const timer = setTimeout(() => setStackStamp(false), 260)
    return () => clearTimeout(timer)
  }, [doc.activePath, publishedIssue])
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  // 书耳浮笺开合（D3 假定 f）：默认收起，顶栏「书耳」钮开合；展开时书口让位、
  // 收起回归（让位链见 BodyRow 后的 Spine 条件挂载）；专注模式由壳层整层隐藏
  const [paneOpen, setPaneOpen] = useState(false)

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
      <BodyRow>
        <Column
          data-published={publishedIssue != null ? 'true' : 'false'}
          data-stamped={stackStamp ? 'true' : 'false'}
        >
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
      {/* 书耳浮笺：保挂载（滑出过渡），开合经 open prop */}
      <SidePane open={paneOpen} />
      </BodyRow>
      {!paneOpen && <Spine />}
    </PageShell>
  )
}

/** App Router 页面出口（右栏普通页面，菜单外路由 key=editor） */
export default function Page(): React.JSX.Element {
  return <EditorPage />
}
