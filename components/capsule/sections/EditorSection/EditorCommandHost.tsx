'use client'

/**
 * 编辑器命令宿主（拆分自 EditorSection 单文件，20260926-refactor-mega-component-split）：
 * 常驻订阅 editor-commands，认领文档操作（save/saveAs/newDraft/closeDoc/renameDoc/
 * transferDoc）与专注模式命令；saveAs 走系统原生面板，迁移/复制 Dialog 的自绘 UI
 * 在 ./TransferDialog。保持壳层 layout 单实例（不随胶囊开关）。
 */
import { useEffect, useRef, useState } from 'react'
import { uiConfirm } from '../../../ui/Dialog'
import { documentEvents, workspaceStore } from '../../../../lib/store'
import { consumeDraft } from '../../../../lib/drafts'
import { message, toast } from '../../../../lib/feedback'
import { publishEditorCommand, subscribeEditorCommands } from '../../../../lib/editor-commands'
import {
  buildBuiltinRequest,
  isPublishAuthError,
  publishBusy,
  publishPreflight,
  shouldFallbackToBuiltin,
  type PublishBlockReason
} from '../../../../lib/publish'
import { setFrontmatterField } from '@shared/frontmatter'
import { applyWorkspaceSwitch } from '../../../plugins/PluginFrameHost'
import { workspaceRelativePath } from '../../../../src/shared/types'
import { getEditorLiveState, publishEditorLiveState } from '../../../../lib/editor-state'
import { assetsDirNameFor } from '@shared/imagePlan'
import {
  buildRenamePath,
  collectDirOptions,
  rewriteAssetsRefs,
  transferDestFor,
  validateDocName,
  type DirOption
} from '@shared/docTransfer'
import { useLocale } from '../../../../lib/i18n/context'
import { errText } from '../../../workspace/PickerShell'
import { TransferDialog } from './TransferDialog'

/** 纯函数：正文首个标题行 → 建议文件名主干（无标题返回 null，由 i18n 兜底） */
function suggestTitleFromContent(content: string): string | null {
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('#'))
  if (!line) return null
  return line.replace(/^#+\s*/, '').trim() || null
}

export function EditorCommandHost(): React.JSX.Element | null {
  const { t } = useLocale()
  const busyRef = useRef(false)
  const runSaveAsRef = useRef<() => Promise<void>>(async () => {})
  // 迁移/复制 Dialog（20260924-feature-breadcrumb-doc-ops）：transferSrc 为打开时的文档路径快照
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferSrc, setTransferSrc] = useState('')
  const [dirOptions, setDirOptions] = useState<DirOption[] | null>(null)
  const [transferDir, setTransferDir] = useState('')
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)

  /**
   * saveAs 原生化（20260924-feature-native-save-dialog）：与打开项目统一为
   * 「选文件系统位置一律系统原生弹窗」。无工作区先 openWorkspace 引导（取消=终止），
   * switchWorkspace 会清空文档状态——内容与草稿归属先捕获再切；确认路径经
   * workspaceRelativePath 定边界（工作区外 feedback Message 拒绝、会话保留），
   * 工作区内走既有 writeFile + openDoc + consumeDraft 转正链路。
   */
  const runSaveAs = async (): Promise<void> => {
    if (busyRef.current) return
    const cur = workspaceStore.get()
    if (cur.content == null) return
    busyRef.current = true
    try {
      const captured = { content: cur.content, draftId: cur.activeDraftId }
      let root = cur.root
      if (!root) {
        const info = await window.api.openWorkspace()
        if (!info) return
        applyWorkspaceSwitch(info)
        root = info.root
      }
      const res = await window.api.pickSaveLocation({
        title: t('editor.saveAsTitle'),
        defaultPath: root,
        fileName: suggestTitleFromContent(captured.content) ?? t('editor.untitledFile')
      })
      if (res.canceled) return
      const rel = workspaceRelativePath(root, res.path)
      if (!rel) {
        void message({ title: t('editor.saveAsTitle'), text: t('editor.saveOutsideRoot'), kind: 'warning' })
        return
      }
      const target = rel.toLowerCase().endsWith('.md') ? rel : `${rel}.md`
      const result = await window.api.writeFile(target, captured.content)
      workspaceStore.openDoc(result.path, captured.content)
      // 草稿已落为工作区文件：消费草稿箱对应条目（失败可见但不阻断保存结果）
      if (captured.draftId) {
        void consumeDraft(captured.draftId).catch((err: unknown) => console.warn('草稿消费失败', err))
      }
    } catch (err) {
      void message({
        title: t('editor.saveAsTitle'),
        text: err instanceof Error ? err.message : String(err),
        kind: 'error'
      })
    } finally {
      busyRef.current = false
    }
  }
  runSaveAsRef.current = runSaveAs

  /**
   * 发布当前文档（20261020-feature-publish-interaction）：保存（CLI 读盘）→ CLI 优先
   * （publishViaCli）→ 不可用降级内置 publisher → frontmatter issue 回写并落盘 →
   * Message 横幅 + documentEvents('publish')。执行阶段错误不降级（防同一文档双建）。
   */
  const runPublish = async (): Promise<void> => {
    if (publishBusy.get()) return
    const pre = publishPreflight(workspaceStore.get())
    if (!pre.ok) {
      const key: Record<PublishBlockReason, string> = {
        'no-doc': 'capsule.publishNoDoc',
        'no-path': 'capsule.publishNoPath',
        'no-title': 'capsule.publishNoTitle'
      }
      toast({ text: t(key[pre.reason ?? 'no-doc']), kind: 'info' })
      return
    }
    publishBusy.set(true)
    try {
      const cur = workspaceStore.get()
      // CLI 读盘发布：脏缓冲先落盘，保证「所见即所发」与身份回写一致
      if (cur.dirty) await workspaceStore.saveActive()
      const saved = workspaceStore.get()
      const filePath = saved.activePath
      if (!filePath || saved.content == null) return

      let issueNumber: number | null = null
      let url: string | undefined
      let created = false
      const cli = await window.api.publishViaCli({ filePath }).catch((err: unknown) => ({
        ok: false as const,
        available: true,
        error: err instanceof Error ? err.message : String(err),
        code: undefined as string | undefined
      }))
      if (cli.ok) {
        issueNumber = cli.issueNumber ?? null
        url = cli.url
        created = Boolean(cli.created)
      } else if (shouldFallbackToBuiltin(cli)) {
        const req = buildBuiltinRequest(saved.content, filePath)
        if (!req) throw new Error(t('capsule.publishNoTitle'))
        const res = await window.api.publish(req)
        if (!res.ok) {
          throw new Error(
            isPublishAuthError(undefined, res.error)
              ? t('capsule.publishAuthFailed')
              : (res.error ?? t('capsule.publishFailed'))
          )
        }
        issueNumber = res.issueNumber ?? null
        url = res.url
        created = Boolean(res.created)
      } else {
        throw new Error(
          isPublishAuthError(cli.code, cli.error)
            ? t('capsule.publishAuthFailed')
            : (cli.error ?? t('capsule.publishFailed'))
        )
      }

      // 身份回写：frontmatter issue（有号幂等）。取发布完成时的最新缓冲，避免
      // 覆盖发布期间的用户输入；若期间已切换文档，则直接回写原文件不误伤当前文档
      if (issueNumber) {
        const fresh = workspaceStore.get()
        if (fresh.activePath === filePath && fresh.content != null) {
          const next = setFrontmatterField(fresh.content, 'issue', String(issueNumber))
          if (next !== fresh.content) {
            workspaceStore.setContent(next)
            await workspaceStore.saveActive()
          }
        } else {
          try {
            const disk = await window.api.readFile(filePath)
            const next = setFrontmatterField(disk.content, 'issue', String(issueNumber))
            if (next !== disk.content) await window.api.writeFile(filePath, next)
          } catch {
            // 回写失败不掩盖发布成功：Issue 已创建，号可在 Frontmatter 面板手动补
          }
        }
      }
      documentEvents.emit('publish', { path: filePath, issueNumber, url })

      const key = created ? 'capsule.publishCreated' : 'capsule.publishUpdated'
      void message({
        title: t('capsule.publishTitle'),
        text: t(key, { n: issueNumber ?? '' }),
        kind: 'success',
        actions: url
          ? [{ id: 'view', label: t('capsule.publishView'), variant: 'primary' as const }]
          : undefined
      }).then((actionId) => {
        if (actionId === 'view' && url) void window.api.openExternal(url)
      })
    } catch (err) {
      toast({ text: err instanceof Error ? err.message : String(err), kind: 'error' })
    } finally {
      publishBusy.set(false)
    }
  }

  const openTransfer = (): void => {
    setTransferSrc(workspaceStore.get().activePath ?? '')
    setTransferDir('')
    setTransferError(null)
    setDirOptions(null)
    setTransferOpen(true)
    window.api
      .readTree()
      .then((tree) => setDirOptions(collectDirOptions(tree, t('editor.transferRoot'))))
      .catch((err: unknown) => {
        setDirOptions([])
        setTransferError(errText(err))
      })
  }

  /** 改名（面包屑原地输入提交）：校验 → 迁移式改名 → store 同步（脏缓冲跟随、引用按需改写） */
  const executeRename = (rawName: string): void => {
    const cur = workspaceStore.get()
    const src = cur.activePath
    if (!src) return
    if (validateDocName(rawName.trim())) {
      toast({ text: t('editor.renameInvalid'), kind: 'error' })
      return
    }
    const destRel = buildRenamePath(src, rawName)
    if (destRel === src) return
    const wasDirty = cur.dirty
    const prevContent = cur.content ?? ''
    void (async (): Promise<void> => {
      try {
        const result = await window.api.transferDoc(src, destRel, 'move')
        const disk = await window.api.readFile(result.path)
        workspaceStore.openDoc(result.path, disk.content)
        if (wasDirty) {
          const oldAssets = assetsDirNameFor(src)
          const newAssets = assetsDirNameFor(result.path)
          workspaceStore.setContent(
            oldAssets === newAssets ? prevContent : rewriteAssetsRefs(prevContent, oldAssets, newAssets)
          )
        }
        toast({
          text: t('editor.renameDone', { name: result.path.split('/').pop() ?? result.path }),
          kind: 'success'
        })
      } catch (err) {
        toast({ text: errText(err), kind: 'error' })
      }
    })()
  }

  /** 迁移/复制（文件夹选择 Dialog 双动作）：move 缓冲跟随保持 dirty；copy 停留原文 */
  const executeTransfer = (dir: string, mode: 'move' | 'copy'): void => {
    const cur = workspaceStore.get()
    const src = cur.activePath
    if (!src) return
    const destRel = transferDestFor(src, dir)
    const wasDirty = cur.dirty
    const prevContent = cur.content ?? ''
    setTransferBusy(true)
    setTransferError(null)
    void (async (): Promise<void> => {
      try {
        // 复制「所见即所存」：脏缓冲先落盘，副本与用户所见一致
        if (mode === 'copy' && wasDirty) await workspaceStore.saveActive()
        const result = await window.api.transferDoc(src, destRel, mode)
        if (mode === 'move') {
          const disk = await window.api.readFile(result.path)
          workspaceStore.openDoc(result.path, disk.content)
          if (wasDirty) {
            const oldAssets = assetsDirNameFor(src)
            const newAssets = assetsDirNameFor(result.path)
            workspaceStore.setContent(
              oldAssets === newAssets ? prevContent : rewriteAssetsRefs(prevContent, oldAssets, newAssets)
            )
          }
          toast({ text: t('editor.transferMoveDone', { path: result.path }), kind: 'success' })
        } else {
          toast({ text: t('editor.transferCopyDone', { path: result.path }), kind: 'success' })
        }
        setTransferOpen(false)
      } catch (err) {
        setTransferError(errText(err))
      } finally {
        setTransferBusy(false)
      }
    })()
  }

  // 常驻订阅：文档操作与专注模式命令只认领自己的一类，其余放行给编辑器实例
  useEffect(() => {
    return subscribeEditorCommands((cmd) => {
      const cur = workspaceStore.get()
      switch (cmd.kind) {
        case 'save': {
          if (cur.activePath) {
            if (cur.dirty) void workspaceStore.saveActive()
          } else if (cur.content) {
            void runSaveAsRef.current()
          }
          return true
        }
        case 'saveAs': {
          if (cur.content != null) void runSaveAsRef.current()
          return true
        }
        case 'newDraft': {
          const start = (): void => workspaceStore.startDraft()
          if (cur.dirty && cur.content) {
            void uiConfirm({
              title: t('editor.closeConfirmTitle'),
              message: t('editor.closeConfirm'),
              okText: t('editor.closeConfirmTitle'),
              cancelText: t('common.cancel')
            }).then((ok) => {
              if (ok) start()
            })
          } else {
            start()
          }
          return true
        }
        case 'closeDoc': {
          if (!cur.activePath && cur.content == null) return true
          const close = (): void => workspaceStore.closeDoc()
          if (cur.dirty && cur.content) {
            void uiConfirm({
              title: t('editor.closeConfirmTitle'),
              message: t('editor.closeConfirm'),
              okText: t('editor.closeConfirmTitle'),
              cancelText: t('common.cancel')
            }).then((ok) => {
              if (ok) close()
            })
          } else {
            close()
          }
          return true
        }
        case 'renameDoc': {
          // 草稿态（无 activePath）无可改名文件，认领但 no-op
          if (cur.activePath) executeRename(cmd.newName)
          return true
        }
        case 'transferDoc': {
          if (cur.activePath) openTransfer()
          return true
        }
        case 'publishDoc': {
          void runPublish()
          return true
        }
        case 'toggleFocus': {
          publishEditorLiveState({ focusMode: !getEditorLiveState().focusMode })
          return true
        }
        default:
          return false
      }
    })
  }, [t])

  // 命令宿主仅承载迁移/复制 Dialog 的自绘 UI（20260924-feature-breadcrumb-doc-ops）；
  // 保存走系统原生面板（20260924-feature-native-save-dialog，无自绘 Dialog）
  return (
    <TransferDialog
      open={transferOpen}
      src={transferSrc}
      dir={transferDir}
      options={dirOptions}
      busy={transferBusy}
      error={transferError}
      onClose={() => setTransferOpen(false)}
      onDirChange={setTransferDir}
      onTransfer={executeTransfer}
    />
  )
}
