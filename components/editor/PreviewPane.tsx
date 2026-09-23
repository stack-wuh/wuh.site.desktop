'use client'

/**
 * 预览面板（20260922-refactor-codemirror-editor）：编辑器面板的分栏预览。
 * 渲染复用 lib/renderPipeline 的 renderService（markdown-it + frontmatter 剥离 +
 * 插件 preprocess/postRender 规则 + 相对图片重写为 local-resource://）——与插件
 * 浮窗预览同源；内容防抖 300ms（与 documentEvents doc.changed 节流一致）。
 * markdown-it 以 html:false 渲染（原始 HTML 转义），与插件预览同等安全边界。
 */
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useWorkspaceStore } from '../../lib/store'
import { renderService } from '../../lib/renderPipeline'
import { useLocale } from '../../lib/i18n/context'

const RENDER_DEBOUNCE_MS = 300

const Root = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 8px 12px 12px;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);

  & h1,
  & h2,
  & h3,
  & h4,
  & h5,
  & h6 {
    color: var(--text-primary);
    line-height: var(--line-height-heading, 1.3);
    margin: 14px 0 6px;
  }

  & h1 {
    font-size: 20px;
  }
  & h2 {
    font-size: 17px;
  }
  & h3 {
    font-size: 15px;
  }

  & p {
    margin: 6px 0;
  }

  & a {
    color: var(--primary-color);
  }

  & code {
    background: var(--chrome-raised);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 1px 4px;
    border-radius: 4px;
  }

  & pre {
    background: var(--chrome-raised);
    padding: 10px 12px;
    border-radius: 8px;
    overflow-x: auto;
  }

  & pre code {
    background: transparent;
    padding: 0;
  }

  & blockquote {
    margin: 8px 0;
    padding: 2px 12px;
    border-left: 3px solid var(--chrome-border);
    color: var(--text-muted);
  }

  & img {
    max-width: 100%;
    border-radius: 8px;
  }

  & table {
    border-collapse: collapse;
  }

  & th,
  & td {
    border: 1px solid var(--chrome-border);
    padding: 4px 10px;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--chrome-border);
  }
`

const Empty = styled.div`
  color: var(--text-muted);
  font-size: 12px;
`

export function PreviewPane(): React.JSX.Element {
  const doc = useWorkspaceStore()
  const { t } = useLocale()
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      const text = doc.content ?? ''
      // 未保存草稿（activePath 为 null）也可预览——renderPipeline 对空 ctx
      // 跳过相对图片重写，正文渲染不受影响
      if (!text) {
        if (!cancelled) setHtml(null)
        return
      }
      renderService
        .execute({ root: doc.root, docPath: doc.activePath }, text)
        .then(({ html }) => {
          if (!cancelled) setHtml(html)
        })
        .catch((err: unknown) => {
          console.error('预览渲染失败', err)
          if (!cancelled) setHtml(null)
        })
    }, RENDER_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [doc.content, doc.root, doc.activePath])

  if (html == null) {
    return (
      <Root aria-label={t('editor.preview')}>
        <Empty>{t('editor.previewEmpty')}</Empty>
      </Root>
    )
  }

  return <Root aria-label={t('editor.preview')} dangerouslySetInnerHTML={{ __html: html }} />
}
