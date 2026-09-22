import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyMarkdownInsert,
  collectMarkdownFiles,
  documentEvents,
  filterMarkdownFiles,
  workspaceStore
} from '../lib/store'
import type { FileNode } from '../src/shared/types'

/**
 * 首页编辑器面板（20260922-feature-home-editor-panel）：
 * 宿主重新持有写入 UI——store 新增文档生命周期（openDoc/closeDoc/startDraft），
 * 外加文件筛选与 Markdown 插入两块纯逻辑。documentHooks 的事件广播语义必须保持。
 */

function resetStore(): void {
  // 走 switchWorkspace 清空全部文档状态（唯一公开的全量重置入口）
  workspaceStore.switchWorkspace(null)
}

describe('workspaceStore 文档生命周期', () => {
  beforeEach(resetStore)

  it('startDraft 进入新草稿态：无 activePath、空内容、clean', () => {
    workspaceStore.startDraft()
    const s = workspaceStore.get()
    expect(s.activePath).toBeNull()
    expect(s.content).toBe('')
    expect(s.saved).toBe('')
    expect(s.dirty).toBe(false)
  })

  it('startDraft 广播 doc.changed（path null）', () => {
    const events: Array<{ name: string; payload: Record<string, unknown> }> = []
    const off = documentEvents.subscribe((name, payload) => events.push({ name, payload }))
    workspaceStore.startDraft()
    off()
    expect(events.some((e) => e.name === 'doc.changed' && e.payload.path === null)).toBe(true)
  })

  it('openDoc 赋值 activePath/content/saved 且 clean，广播 doc.opened + doc.changed', () => {
    const events: string[] = []
    const off = documentEvents.subscribe((name) => events.push(name))
    workspaceStore.openDoc('posts/hello.md', '# hi')
    off()
    const s = workspaceStore.get()
    expect(s.activePath).toBe('posts/hello.md')
    expect(s.content).toBe('# hi')
    expect(s.saved).toBe('# hi')
    expect(s.dirty).toBe(false)
    expect(events).toContain('doc.opened')
    expect(events).toContain('doc.changed')
  })

  it('setContent 后 dirty 为 true，saveActive 语义不改', () => {
    workspaceStore.openDoc('a.md', 'v1')
    workspaceStore.setContent('v2')
    expect(workspaceStore.get().dirty).toBe(true)
    workspaceStore.setContent('v1')
    expect(workspaceStore.get().dirty).toBe(false)
  })

  it('closeDoc 清空文档状态并广播 doc.closed + doc.changed', () => {
    workspaceStore.openDoc('a.md', 'x')
    workspaceStore.setContent('y')
    const events: Array<{ name: string; payload: Record<string, unknown> }> = []
    const off = documentEvents.subscribe((name, payload) => events.push({ name, payload }))
    workspaceStore.closeDoc()
    off()
    const s = workspaceStore.get()
    expect(s.activePath).toBeNull()
    expect(s.content).toBeNull()
    expect(s.dirty).toBe(false)
    expect(events.some((e) => e.name === 'doc.closed' && e.payload.path === 'a.md')).toBe(true)
    expect(events.some((e) => e.name === 'doc.changed')).toBe(true)
  })

  it('closeDoc 在空态下为 no-op（不广播）', () => {
    const events: string[] = []
    const off = documentEvents.subscribe((name) => events.push(name))
    workspaceStore.closeDoc()
    off()
    expect(events).toEqual([])
  })
})

describe('collectMarkdownFiles（工作区 .md 收集）', () => {
  const tree: FileNode[] = [
    {
      name: 'docs',
      path: 'docs',
      type: 'dir',
      children: [
        { name: 'a.md', path: 'docs/a.md', type: 'file' },
        {
          name: 'sub',
          path: 'docs/sub',
          type: 'dir',
          children: [
            { name: 'b.md', path: 'docs/sub/b.md', type: 'file' },
            { name: 'img.png', path: 'docs/sub/img.png', type: 'file' }
          ]
        }
      ]
    },
    { name: 'README.md', path: 'README.md', type: 'file' },
    { name: 'logo.svg', path: 'logo.svg', type: 'file' }
  ]

  it('DFS 顺序收集全部 .md 文件，跳过目录与非 md', () => {
    expect(collectMarkdownFiles(tree)).toEqual([
      'docs/a.md',
      'docs/sub/b.md',
      'README.md'
    ])
  })

  it('空树返回空数组', () => {
    expect(collectMarkdownFiles([])).toEqual([])
  })

  it('filterMarkdownFiles 大小写不敏感过滤（命中路径任意段）', () => {
    const paths = ['docs/2024/Docker.md', 'posts/hello-world.md', 'README.md']
    expect(filterMarkdownFiles(paths, 'docker')).toEqual(['docs/2024/Docker.md'])
    expect(filterMarkdownFiles(paths, 'HELLO')).toEqual(['posts/hello-world.md'])
    expect(filterMarkdownFiles(paths, '')).toEqual(paths)
    expect(filterMarkdownFiles(paths, 'zzz')).toEqual([])
  })
})

describe('applyMarkdownInsert（Markdown 插入纯逻辑）', () => {
  it('bold 包裹选区：**hello**，选区回落到原文本', () => {
    const r = applyMarkdownInsert('abc hello xyz', 4, 9, 'bold')
    expect(r.content).toBe('abc **hello** xyz')
    expect(r.selStart).toBe(6)
    expect(r.selEnd).toBe(11)
  })

  it('bold 无选区：插入空标记并定位到中间待输入', () => {
    const r = applyMarkdownInsert('abc ', 4, 4, 'bold')
    expect(r.content).toBe('abc ****')
    expect(r.selStart).toBe(6)
    expect(r.selEnd).toBe(6)
  })

  it('italic 单星号包裹、code 单反引号包裹', () => {
    expect(applyMarkdownInsert('hi', 0, 2, 'italic').content).toBe('*hi*')
    expect(applyMarkdownInsert('hi', 0, 2, 'code').content).toBe('`hi`')
  })

  it('link：选区变 [text]()，光标落 url 待输入位', () => {
    const r = applyMarkdownInsert('see hello now', 4, 9, 'link')
    expect(r.content).toBe('see [hello]() now')
    expect(r.selStart).toBe(12)
    expect(r.selEnd).toBe(12)
  })

  it('h1/h2 为所在行加前缀，光标保持行内相对位置', () => {
    const r = applyMarkdownInsert('# t\nabc', 5, 5, 'h1')
    expect(r.content).toBe('# t\n# abc')
    expect(r.selStart).toBe(7)
    expect(r.selEnd).toBe(7)
    expect(applyMarkdownInsert('abc', 1, 1, 'h2').content).toBe('## abc')
  })

  it('quote 与列表为行加前缀，多行逐行加', () => {
    expect(applyMarkdownInsert('a\nb\nc', 0, 5, 'ul').content).toBe('- a\n- b\n- c')
    expect(applyMarkdownInsert('a\nb', 0, 3, 'ol').content).toBe('1. a\n1. b')
    expect(applyMarkdownInsert('a\nb', 0, 3, 'quote').content).toBe('> a\n> b')
  })

  it('多行选区时 ul 选区延伸覆盖新增前缀', () => {
    const r = applyMarkdownInsert('a\nb\nc', 0, 5, 'ul')
    expect(r.selStart).toBe(0)
    expect(r.selEnd).toBe(11)
  })
})
