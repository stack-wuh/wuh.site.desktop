import { useEffect, useMemo, useRef } from 'react'
import MarkdownIt from 'markdown-it'
import { parseFrontmatter } from '@shared/frontmatter'
import { isExternalRef, toFileUrl } from '@shared/url'
import { useWorkspaceStore } from '../store'

const md = new MarkdownIt({ html: false, linkify: true })

export function Preview(): React.JSX.Element {
  const { activePath, content, root } = useWorkspaceStore()
  const containerRef = useRef<HTMLDivElement | null>(null)

  const html = useMemo(
    () => (content == null ? '' : md.render(parseFrontmatter(content).body)),
    [content]
  )

  // 相对路径图片 → file:// 绝对地址（主进程 webSecurity 默认允许 file: 协议加载本地资源）
  useEffect(() => {
    const el = containerRef.current
    if (!el || !root || !activePath) return
    const docDir = activePath.includes('/')
      ? activePath.slice(0, activePath.lastIndexOf('/'))
      : ''
    el.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') ?? ''
      if (src && !isExternalRef(src)) {
        img.src = toFileUrl(root, docDir, src)
      }
    })
  }, [html, root, activePath])

  if (!activePath) {
    return <div className="placeholder">预览区（打开文档后实时渲染）</div>
  }

  return (
    <div
      className="preview markdown-body"
      ref={containerRef}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest('a')
        if (a?.href) {
          e.preventDefault()
          window.open(a.href, '_blank')
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
