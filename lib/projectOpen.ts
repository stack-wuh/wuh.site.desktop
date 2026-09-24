import type { ProjectGroup } from './projects'
import { workspaceStore } from './store'
import type { Translate } from './i18n/context'
import { uiConfirm } from '../components/ui/Dialog'

/**
 * 项目文件打开流（项目页与左栏菜单树共用，20260924 走查反馈修订）：
 * 脏文档先确认丢弃（避免打开新文件静默覆盖未保存更改，与 FilePicker 同语义）→
 * 非当前组先 openWorkspaceByPath 切工作区（登记最近）→ readFile → openDoc。
 * 跳转 `/editor` 留给调用方（各自持有 router）；取消与失败以可区分结果返回。
 */
export type OpenProjectFileResult =
  | { outcome: 'opened' }
  | { outcome: 'canceled' }
  | { outcome: 'error'; error: unknown }

export async function openProjectFile(
  group: ProjectGroup,
  relPath: string,
  t: Translate
): Promise<OpenProjectFileResult> {
  const cur = workspaceStore.get()
  if (cur.dirty && cur.content) {
    const ok = await uiConfirm({
      title: t('editor.closeConfirmTitle'),
      message: t('editor.openConfirm'),
      okText: t('editor.closeConfirmTitle'),
      cancelText: t('common.cancel')
    })
    if (!ok) return { outcome: 'canceled' }
  }
  try {
    if (!group.current) await window.api.openWorkspaceByPath(group.root)
    const fc = await window.api.readFile(relPath)
    workspaceStore.openDoc(fc.path, fc.content)
    return { outcome: 'opened' }
  } catch (error) {
    return { outcome: 'error', error }
  }
}
