'use client'

/**
 * 首页主编辑器面板（20260922-fix-editor-panel-controls 操作行恢复；
 * 20260922-refactor-codemirror-editor 起中央为 CodeMirror 6 源码编辑区，
 * 动作行新增预览 toggle——开启后面板容器内分栏，窄容器纵向堆叠；
 * 20260924-feature-editor-simplify-draft-box 起撤除渲染模式分段控件——
 * 默认即时渲染，源码态仅经胶囊「即时渲染」开关切换）：
 * 上方上下文行（项目菜单 + 文件筛选）→ 中央编辑/预览区（主题桥接见
 * components/editor/MarkdownEditor）→ 下方动作行（文档状态 · 撤销重做 · 查找 · 预览 · 新建 · 保存）。
 * 文件相关交互全部收在上下两行；新建/保存/预览经命令通道或本地状态，与胶囊
 * 全局入口同源——命令宿主常驻壳层 layout（单实例）。首页布局：问候 → 散点图 → 本面板。
 * 拆分形态（20260927-refactor-midsize-component-split）：项目/文件选择器见
 * ./WorkspacePicker、./FilePicker，样式原子见 ./styles；对外契约不变。
 */
import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '../../../lib/store'
import { publishEditorCommand } from '../../../lib/editor-commands'
import { Button } from '../../ui/Button'
import { AppIcon } from '../../ui/AppIcon'
import { IconEye, IconRedo, IconSave, IconSearch, IconUndo } from '../../icons'
import { MarkdownEditor } from '../../editor/MarkdownEditor'
import { EditorToolbar } from '../../editor/Toolbar'
import { PreviewPane } from '../../editor/PreviewPane'
import { useLocale } from '../../../lib/i18n/context'
import { FilePicker } from './FilePicker'
import { WorkspacePicker } from './WorkspacePicker'
import { ActionRow, ContextRow, DirtyDot, DocChip, DocPath, EditorBody, GhostButton, Panel, Spacer, Split } from './styles'

/** 预览开关持久化键（与 wd.theme / wd.locale 同族命名） */
const PREVIEW_STORAGE_KEY = 'wd.editorPreview'

export function EditorPanel(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const [previewOn, setPreviewOn] = useState(false)

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

      <EditorToolbar />

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
