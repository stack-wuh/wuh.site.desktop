import { useEffect, useState } from 'react'
import {
  parseFrontmatter,
  stringifyFrontmatter,
  type PostMeta
} from '@shared/frontmatter'
import { workspaceStore, useWorkspaceStore } from '../store'

function toComma(v: unknown): string {
  return Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v)
}

function fromComma(v: string): string[] {
  return v
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** frontmatter 结构化表单：应用时仅重写文档头部，正文不动 */
export function FrontmatterPanel(): React.JSX.Element | null {
  const { activePath, content } = useWorkspaceStore()
  const [draft, setDraft] = useState<PostMeta>({})

  useEffect(() => {
    if (content != null) setDraft(parseFrontmatter(content).data)
    // 仅在切换文件时重置草稿，编辑过程中保留用户输入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath])

  if (!activePath || content == null) return null

  const set = (key: keyof PostMeta, value: unknown): void =>
    setDraft((d) => ({ ...d, [key]: value }))

  const apply = (): void => {
    const { body } = parseFrontmatter(content)
    workspaceStore.setContent(stringifyFrontmatter(draft, body))
  }

  return (
    <div className="frontmatter-panel">
      <div className="fm-row">
        <label>标题</label>
        <input
          value={toComma(draft.title)}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>
      <div className="fm-row">
        <label>标签</label>
        <input
          placeholder="逗号分隔"
          value={toComma(draft.labels)}
          onChange={(e) => set('labels', fromComma(e.target.value))}
        />
      </div>
      <div className="fm-row">
        <label>摘要</label>
        <input
          value={toComma(draft.summary)}
          onChange={(e) => set('summary', e.target.value)}
        />
      </div>
      <div className="fm-row">
        <label>封面</label>
        <input
          value={toComma(draft.cover)}
          onChange={(e) => set('cover', e.target.value)}
        />
      </div>
      <div className="fm-row">
        <label>关键词</label>
        <input
          placeholder="逗号分隔"
          value={toComma(draft.keywords)}
          onChange={(e) => set('keywords', fromComma(e.target.value))}
        />
      </div>
      <div className="fm-actions">
        <button onClick={apply}>应用到文档</button>
      </div>
    </div>
  )
}
