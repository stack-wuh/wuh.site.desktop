'use client'

/**
 * 专注模式浮条（20261015-feature-workbench-shell task-8）：chrome 退场后编辑区
 * 顶部的最小信令——文档名（草稿态回落「新草稿」）、保存态、字数、退出按钮。
 * 状态全部来自 workspaceStore / editor-state 总线快照，退出经 focusMode 总线
 * （与 ⌘⇧F、编辑器内 Esc 同一出口，编辑页顶栏淡出语义不受影响）。
 */
import { useWorkspaceStore } from '../../lib/store'
import { publishEditorLiveState } from '../../lib/editor-state'
import { countWords } from '../../lib/editor-info'
import { useLocale } from '../../lib/i18n/context'
import { AppIcon } from '../ui/AppIcon'
import { IconMaximize2 } from '../icons'
import { BarBox, DocTitle, ExitBtn, SaveState, WordCount } from './styles'

export function FocusBar(): React.JSX.Element {
  const { t } = useLocale()
  const doc = useWorkspaceStore()
  const title = doc.activePath ?? t('focus.draft')
  // countWords 返回 { words, chars }：浮条取词数（CJK 字符 + 拉丁词）
  const count = countWords(doc.content ?? '')
  return (
    <BarBox data-testid="focus-bar" role="status" aria-label={t('focus.exit')}>
      <DocTitle>{title}</DocTitle>
      <SaveState $dirty={doc.dirty}>{doc.dirty ? t('focus.unsaved') : t('common.saved')}</SaveState>
      <WordCount>{t('focus.words', { n: count.words })}</WordCount>
      <ExitBtn type="button" data-testid="focus-exit" onClick={() => publishEditorLiveState({ focusMode: false })}>
        <AppIcon icon={IconMaximize2} size="xs" decorative />
        {t('focus.exit')}
      </ExitBtn>
    </BarBox>
  )
}
