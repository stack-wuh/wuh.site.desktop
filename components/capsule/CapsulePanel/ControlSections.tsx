'use client'

/**
 * 控制中心功能子单元（20261017-feature-app-layout-workbench D4）：
 * 磁贴行（4×2 八磁贴）+ GIT 分区（分支·未提交 + 行内提交输入 + 推送，走既有
 * gitStatus/gitCommit/gitPush IPC）+ 排版分区（字号步进，editor-state 总线
 * 单状态源，持久化 wd.editorTypography）。一切编辑指令经词表/总线发布，
 * 本文件不触碰编辑器实例；颜色只写语义 token。
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AppIcon } from '../../ui/AppIcon'
import {
  IconImage,
  IconLanguages,
  IconListTree,
  IconMaximize,
  IconPalette,
  IconSearch,
  IconSend,
  IconSparkles,
  IconSunMoon
} from '../../icons'
import type { UploadMode } from '@shared/types'
import { publishEditorCommand } from '../../../lib/editor-commands'
import { publishEditorLiveState, useEditorLiveState } from '../../../lib/editor-state'
import { publishBusy, publishPreflight, publishStateOf } from '../../../lib/publish'
import { useWorkspaceStore } from '../../../lib/store'
import { useLocale } from '../../../lib/i18n/context'
import type { Locale } from '../../../lib/i18n/locales'
import { useTheme, type SchemeSetting } from '../../theme/ThemeProvider'
import { toast } from '../../../lib/feedback'
import { GitGrow, GitMono, GitMsgInput, GBtn, GitRow, Sect, SectHead, Tile, TileIcon, TileMeta, TileTag, Tiles } from './styles'

/** 磁贴：方印图标 + 标签；on 传值即带激活态（朱底方印 + 状态点 + 朱边 + aria-pressed） */
function TileB(props: { label: string; children: ReactNode; on?: boolean; title?: string; onClick: () => void }): React.JSX.Element {
  return (
    <Tile
      type="button"
      $on={props.on}
      aria-pressed={props.on === undefined ? undefined : props.on}
      title={props.title}
      onClick={props.onClick}
    >
      <TileIcon>{props.children}</TileIcon>
      {props.label}
    </Tile>
  )
}

/** 磁贴网格 4×2（视觉稿 .cc .tiles 八磁贴，编辑指令一律经词表/总线） */
export function TilesGrid(): React.JSX.Element {
  const { t, locale, setLocale } = useLocale()
  const { family, scheme, setFamily, setScheme } = useTheme()
  const live = useEditorLiveState()
  const [uploadMode, setUploadMode] = useState<UploadMode | null>(null)

  useEffect(() => {
    let alive = true
    void window.api
      ?.getSettings()
      ?.then((s) => {
        if (alive) setUploadMode(s.settings.uploadMode)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const toggleUpload = (): void => {
    if (!uploadMode) return
    const next: UploadMode = uploadMode === 'oss' ? 'command' : 'oss'
    setUploadMode(next)
    void window.api
      ?.setSettings({ uploadMode: next })
      ?.then((s) => setUploadMode(s.settings.uploadMode))
      .catch(() => {})
  }

  const schemeOrder: SchemeSetting[] = ['system', 'light', 'dark']
  const localeOrder: Locale[] = ['zh', 'en', 'ja']

  return (
    <Tiles role="group" aria-label={t('capsule.ccTiles')}>
      <TileB
        label={t('capsule.tileRender')}
        on={live.renderMode === 'render'}
        onClick={() => publishEditorCommand({ kind: 'toggleRender' })}
      >
        <AppIcon icon={IconSparkles} size="xs" decorative />
      </TileB>
      <TileB
        label={t('capsule.tileFollow')}
        on={live.outlineFollow}
        onClick={() => publishEditorLiveState({ outlineFollow: !live.outlineFollow })}
      >
        <AppIcon icon={IconListTree} size="xs" decorative />
      </TileB>
      <TileB
        label={t('capsule.tileFocus')}
        on={live.focusMode}
        onClick={() => publishEditorCommand({ kind: 'toggleFocus' })}
      >
        <AppIcon icon={IconMaximize} size="xs" decorative />
      </TileB>
      <TileB
        label={`${t('capsule.tileImage')}·${uploadMode === 'oss' ? 'oss' : t('settings.uploadMode_command')}`}
        on={uploadMode === 'oss'}
        title={t('settings.uploadMode')}
        onClick={toggleUpload}
      >
        <AppIcon icon={IconImage} size="xs" decorative />
      </TileB>
      <TileB
        label={`${t('capsule.tileTheme')}·${family === 'wine' ? t('pop.themeWine') : t('pop.themePlain')}`}
        onClick={() => setFamily(family === 'wine' ? 'plain' : 'wine')}
      >
        <AppIcon icon={IconPalette} size="xs" decorative />
      </TileB>
      <TileB
        label={`${t('capsule.tileLook')}·${scheme === 'system' ? t('capsule.lookSystem') : scheme === 'light' ? t('capsule.lookLight') : t('capsule.lookDark')}`}
        onClick={() => setScheme(schemeOrder[(schemeOrder.indexOf(scheme) + 1) % schemeOrder.length] ?? 'system')}
      >
        <AppIcon icon={IconSunMoon} size="xs" decorative />
      </TileB>
      <TileB
        label={`${t('capsule.tileLang')}·${locale === 'zh' ? '中文' : locale === 'en' ? 'EN' : '日本語'}`}
        onClick={() => setLocale(localeOrder[(localeOrder.indexOf(locale) + 1) % localeOrder.length] ?? 'zh')}
      >
        <AppIcon icon={IconLanguages} size="xs" decorative />
      </TileB>
      <TileB label={t('capsule.tileFind')} onClick={() => publishEditorCommand({ kind: 'findReplace' })}>
        <AppIcon icon={IconSearch} size="xs" decorative />
      </TileB>
    </Tiles>
  )
}

/** GIT 分区：分支 · 未提交数 + 提交（行内输入）/ 推送（既有 IPC，非 Git 目录静默降级） */
export function GitSection(): React.JSX.Element {
  const { t } = useLocale()
  const [branch, setBranch] = useState<string | null>(null)
  const [dirty, setDirty] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [composing, setComposing] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = (): void => {
    void window.api
      ?.gitStatus()
      ?.then((g) => {
        setBranch(g.branch)
        setDirty(g.files.length)
        setLoaded(true)
      })
      .catch(() => {
        setBranch(null)
        setLoaded(true)
      })
  }

  useEffect(() => {
    load()
  }, [])

  const commit = async (): Promise<void> => {
    const msg = message.trim()
    if (!msg || busy) return
    setBusy(true)
    try {
      await window.api?.gitCommit(msg)
      toast({ text: t('capsule.gitCommitted'), kind: 'success' })
      setMessage('')
      setComposing(false)
      load()
    } catch {
      toast({ text: t('capsule.gitFailed'), kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const push = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      await window.api?.gitPush()
      toast({ text: t('capsule.gitPushed'), kind: 'success' })
      load()
    } catch {
      toast({ text: t('capsule.gitFailed'), kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const dismiss = (): void => {
    setComposing(false)
    setMessage('')
  }

  return (
    <Sect aria-label={t('capsule.sectGit')}>
      <SectHead>{t('capsule.sectGit')}</SectHead>
      {!loaded ? (
        <GitRow>
          <GitMono>—</GitMono>
        </GitRow>
      ) : branch == null ? (
        <GitRow>
          <span>{t('capsule.gitNoRepo')}</span>
        </GitRow>
      ) : composing ? (
        <GitRow>
          <GitMsgInput
            autoFocus
            value={message}
            placeholder={t('capsule.gitMsgPlaceholder')}
            aria-label={t('capsule.gitMsgPlaceholder')}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                void commit()
              } else if (e.key === 'Escape') {
                // 输入内 Esc 只收输入行——阻断冒泡，避免窗口层把整张面板关掉
                e.stopPropagation()
                dismiss()
              }
            }}
          />
          <GBtn disabled={!message.trim() || busy} onClick={() => void commit()}>
            {t('capsule.gitCommitBtn')}
          </GBtn>
          <GBtn onClick={dismiss}>{t('common.cancel')}</GBtn>
        </GitRow>
      ) : (
        <GitRow>
          <GitMono>{branch}</GitMono>
          <span>· {dirty > 0 ? t('capsule.gitDirty', { n: dirty }) : t('capsule.gitClean')}</span>
          <GitGrow />
          <GBtn disabled={busy || dirty === 0} onClick={() => setComposing(true)}>
            {t('capsule.gitCommitBtn')}
          </GBtn>
          <GBtn disabled={busy} onClick={() => void push()}>
            {t('capsule.gitPushBtn')}
          </GBtn>
        </GitRow>
      )}
    </Sect>
  )
}

/** 排版分区：字号步进（±，12–18 钳制同 loadTypography 口径），经总线持久化 */
export function TypesetSection(): React.JSX.Element {
  const { t } = useLocale()
  const live = useEditorLiveState()
  const ty = live.typography

  const stepFont = (delta: number): void => {
    const next = Math.min(18, Math.max(12, ty.fontSize + delta))
    if (next === ty.fontSize) return
    publishEditorLiveState({ typography: { ...ty, fontSize: next } })
  }

  return (
    <Sect aria-label={t('capsule.sectTypeset')}>
      <SectHead>{t('capsule.sectTypeset')}</SectHead>
      <GitRow>
        <span>
          {t('capsule.typesetSize')} {ty.fontSize}px · {t('capsule.typesetLine')} {ty.lineHeight} ·{' '}
          {t('capsule.typesetMeasure')} {ty.measure === 'full' ? t('capsule.typesetFull') : `${ty.measure}px`}
        </span>
        <GitGrow />
        <GBtn aria-label={`${t('capsule.typesetSize')} -`} onClick={() => stepFont(-1)}>
          −
        </GBtn>
        <GBtn aria-label={`${t('capsule.typesetSize')} +`} onClick={() => stepFont(1)}>
          +
        </GBtn>
      </GitRow>
    </Sect>
  )
}

/**
 * 通栏发布磁贴（20261020-feature-publish-interaction）：状态推导只读 store
 * 与 frontmatter（issue 号 = 发布身份），发布动作一律经命令通道下发——
 * CLI 优先 / 内置降级的编排在 EditorCommandHost，本组件不触碰 IPC。
 */
export function PublishTile(): React.JSX.Element {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const busy = useSyncExternalStore(publishBusy.subscribe, publishBusy.get, publishBusy.get)
  const state = publishStateOf(doc.content)
  const pre = publishPreflight({ activePath: doc.activePath, content: doc.content })
  const status = busy
    ? t('capsule.publishBusy')
    : !pre.ok
      ? t(
          pre.reason === 'no-doc'
            ? 'capsule.publishNoDoc'
            : pre.reason === 'no-path'
              ? 'capsule.publishNoPath'
              : 'capsule.publishNoTitle'
        )
      : state.issueNumber
        ? t('capsule.publishPublished', { n: state.issueNumber })
        : t('capsule.publishReady')
  return (
    <Tiles role="group" aria-label={t('capsule.publishAria')}>
      <Tile
        $wide
        type="button"
        data-testid="publish-tile"
        disabled={!pre.ok || busy}
        aria-busy={busy || undefined}
        title={status}
        onClick={() => publishEditorCommand({ kind: 'publishDoc' })}
      >
        <TileIcon>
          <AppIcon icon={IconSend} size="xs" decorative />
        </TileIcon>
        {t('capsule.publishTile')}
        <TileMeta>{status}</TileMeta>
        <TileTag>GITHUB</TileTag>
      </Tile>
    </Tiles>
  )
}
