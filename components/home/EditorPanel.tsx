'use client'

/**
 * 首页主编辑器面板（20260922-fix-editor-panel-controls 操作行恢复；
 * 20260922-refactor-codemirror-editor 起中央为 CodeMirror 6 源码编辑区，
 * 动作行新增预览 toggle——开启后面板容器内分栏，窄容器纵向堆叠）：
 * 上方上下文行（项目菜单 + 文件筛选）→ 中央编辑/预览区（主题桥接见
 * components/editor/MarkdownEditor）→ 下方动作行（文档状态 · 预览 · 新建 · 保存）。
 * 文件相关交互全部收在上下两行；新建/保存/预览经命令通道或本地状态，与胶囊
 * 全局入口同源——命令宿主常驻壳层 layout（单实例）。首页布局：问候 → 散点图 → 本面板。
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import styled from 'styled-components'
import type { WorkspaceInfo } from '@shared/types'
import { useWorkspaceStore } from '../../lib/store'
import { publishEditorCommand } from '../../lib/editor-commands'
import { getEditorLiveState, subscribeEditorLiveState } from '../../lib/editor-state'
import { Button } from '../ui/Button'
import { AppIcon } from '../ui/AppIcon'
import {
  IconChevronDown,
  IconEye,
  IconFile,
  IconFolderOpen,
  IconRedo,
  IconSave,
  IconSearch,
  IconUndo
} from '../icons'
import {
  PickerButton,
  PickerName,
  PickerPanel,
  PickerWrap,
  usePickerOpen
} from '../workspace/PickerShell'
import { FilePanelContent } from '../workspace/FilePicker'
import { WorkspacePanelContent } from '../workspace/WorkspacePicker'
import { MarkdownEditor } from '../editor/MarkdownEditor'
import { PreviewPane } from '../editor/PreviewPane'
import { useLocale } from '../../lib/i18n/context'

/** 预览开关持久化键（与 wd.theme / wd.locale 同族命名） */
const PREVIEW_STORAGE_KEY = 'wd.editorPreview'

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  /* 上内缩 10px：编辑区与面板边框留出呼吸间距（主题修复后编辑区透明底，
     无白框外溢问题；不设 overflow:hidden——会裁掉向下展开的项目/文件 popover） */
  padding: 10px 4px 0;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-lg, var(--border-radius-md));
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  &:focus-within {
    border-color: color-mix(in oklab, var(--primary-color) 55%, var(--chrome-border));
  }
`

const ContextRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 8px;
`

/* 容器查询宿主：分栏方向随面板实际宽度（非视口）切换 */
const EditorBody = styled.div`
  display: flex;
  min-height: 0;
  container-type: inline-size;
`

const Split = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: row;
  max-height: 45vh;

  /* 分栏间距：第二栏起画分隔线（方向切换时由查询内覆盖） */
  & > * + * {
    border-left: 1px solid var(--chrome-border);
  }

  @container (max-width: 700px) {
    flex-direction: column;

    & > * + * {
      border-left: none;
      border-top: 1px solid var(--chrome-border);
    }
  }
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 8px;
`

const Spacer = styled.span`
  flex: 1;
`

const DocChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 46%;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
`

const DocPath = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DirtyDot = styled.span`
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning-color);
`

/* 渲染模式分段控件（即时渲染 ↔ 纯源码；状态源 = editor-state 总线） */
const ModeSeg = styled.span`
  display: inline-flex;
  background: var(--chrome-raised);
  border: 1px solid var(--chrome-border);
  border-radius: 8px;
  padding: 2px;

  & > button {
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: 11px;
    padding: 3px 11px;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out),
      color var(--motion-dur-quick, 150ms) var(--motion-ease-out-soft, ease-out);
  }

  & > button.on {
    background: var(--primary-color);
    color: #fff;
  }

  & > button:hover:not(.on) {
    color: var(--text-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    & > button {
      transition: none;
    }
  }
`

/** 预览降级态（ghosted）：仅导出/严格排版对照场景使用 */
const GhostButton = styled(Button)`
  opacity: 0.45;
`

/** 项目菜单触发按钮：popover 内嵌 WorkspacePanelContent */
function WorkspacePicker(): React.JSX.Element {
  const { t } = useLocale()
  const [open, toggle, wrapRef] = usePickerOpen()
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)

  useEffect(() => {
    void window.api
      .getWorkspace()
      .then(setWorkspace)
      .catch(() => setWorkspace(null))
  }, [open])

  return (
    <PickerWrap ref={wrapRef}>
      <PickerButton
        type="button"
        aria-label={t('project.section')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        title={workspace?.root ?? t('project.section')}
      >
        <AppIcon icon={IconFolderOpen} size="xs" decorative />
        <PickerName>{workspace ? workspace.name : t('project.section')}</PickerName>
        <AppIcon icon={IconChevronDown} size="xs" decorative />
      </PickerButton>
      {open && (
        <PickerPanel role="dialog" aria-label={t('project.section')}>
          <WorkspacePanelContent />
        </PickerPanel>
      )}
    </PickerWrap>
  )
}

/** 文件筛选触发按钮：popover 内嵌 FilePanelContent */
function FilePicker(): React.JSX.Element {
  const { t } = useLocale()
  const [open, toggle, wrapRef] = usePickerOpen()

  return (
    <PickerWrap ref={wrapRef}>
      <PickerButton
        type="button"
        aria-label={t('project.pickFileAria')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <AppIcon icon={IconFile} size="xs" decorative />
        <PickerName>{t('project.pickFile')}</PickerName>
        <AppIcon icon={IconChevronDown} size="xs" decorative />
      </PickerButton>
      {open && (
        <PickerPanel role="dialog" aria-label={t('project.pickFileAria')}>
          <FilePanelContent />
        </PickerPanel>
      )}
    </PickerWrap>
  )
}

export function EditorPanel(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const [previewOn, setPreviewOn] = useState(false)
  // 渲染模式：编辑器侧回推（未挂载时用总线默认值 render）
  const live = useSyncExternalStore(subscribeEditorLiveState, getEditorLiveState, getEditorLiveState)

  // 预览开关记忆：挂载后读取（防 SSR 预渲染 hydration 不匹配）
  useEffect(() => {
    try {
      setPreviewOn(window.localStorage.getItem(PREVIEW_STORAGE_KEY) === '1')
    } catch {
      // 存储不可用（隐私模式）：记忆为纯增强，保持默认关闭
    }
  }, [])

  const togglePreview = (): void => {
    setPreviewOn((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(PREVIEW_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // 存储不可用（隐私模式）：仅本次会话内生效
      }
      return next
    })
  }

  const canSave = doc.activePath ? doc.dirty : (doc.content ?? '').length > 0

  return (
    <Panel>
      <ContextRow>
        <WorkspacePicker />
        <FilePicker />
      </ContextRow>

      <EditorBody>
        <Split>
          <MarkdownEditor />
          {previewOn && <PreviewPane />}
        </Split>
      </EditorBody>

      <ActionRow>
        <DocChip title={doc.activePath ?? undefined}>
          <DocPath>{doc.activePath ?? t('editor.newDraft')}</DocPath>
          {doc.dirty && <DirtyDot title={t('editor.dirtyTitle')} />}
        </DocChip>
        <Spacer />
        <ModeSeg role="group" aria-label={t('editor.toggleRender')}>
          <button
            type="button"
            className={live.renderMode === 'render' ? 'on' : ''}
            aria-pressed={live.renderMode === 'render'}
            onClick={() => {
              if (live.renderMode !== 'render') publishEditorCommand({ kind: 'toggleRender' })
            }}
          >
            {t('editor.renderLive')}
          </button>
          <button
            type="button"
            className={live.renderMode === 'source' ? 'on' : ''}
            aria-pressed={live.renderMode === 'source'}
            onClick={() => {
              if (live.renderMode !== 'source') publishEditorCommand({ kind: 'toggleRender' })
            }}
          >
            {t('editor.renderSource')}
          </button>
        </ModeSeg>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('editor.undo')}
          title={t('editor.undo')}
          onClick={() => publishEditorCommand({ kind: 'undo' })}
        >
          <AppIcon icon={IconUndo} size="xs" decorative />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('editor.redo')}
          title={t('editor.redo')}
          onClick={() => publishEditorCommand({ kind: 'redo' })}
        >
          <AppIcon icon={IconRedo} size="xs" decorative />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('editor.findReplace')}
          title={t('editor.findReplace')}
          onClick={() => publishEditorCommand({ kind: 'findReplace' })}
        >
          <AppIcon icon={IconSearch} size="xs" decorative />
        </Button>
        <GhostButton
          size="sm"
          variant="ghost"
          aria-label={t('editor.preview')}
          aria-pressed={previewOn}
          title={t('editor.previewGhost')}
          onClick={togglePreview}
        >
          <AppIcon icon={IconEye} size="xs" decorative />
        </GhostButton>
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
      </ActionRow>
    </Panel>
  )
}
