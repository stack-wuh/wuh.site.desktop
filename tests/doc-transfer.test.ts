import { describe, expect, it } from 'vitest'
import {
  buildRenamePath,
  collectDirOptions,
  normalizeDocName,
  rewriteAssetsRefs,
  transferDestFor,
  validateDocName,
  validateTransfer
} from '@shared/docTransfer'

describe('normalizeDocName', () => {
  it('去首尾空白与引导路径符，.md 后缀缺省自动补', () => {
    expect(normalizeDocName(' hello ')).toBe('hello.md')
    expect(normalizeDocName('/notes/hello.md')).toBe('hello.md')
    expect(normalizeDocName('hello')).toBe('hello.md')
    expect(normalizeDocName('hello.MD')).toBe('hello.MD')
  })
})

describe('validateDocName', () => {
  it('合法名返回 null', () => {
    expect(validateDocName('hello.md')).toBeNull()
    expect(validateDocName('我的 文章-2026.md')).toBeNull()
  })
  it('空名/路径分隔符/非法字符/点目录返回错误', () => {
    expect(validateDocName('')).not.toBeNull()
    expect(validateDocName('a/b.md')).not.toBeNull()
    expect(validateDocName('a\\b.md')).not.toBeNull()
    expect(validateDocName('a:b.md')).not.toBeNull()
    expect(validateDocName('a*b.md')).not.toBeNull()
    expect(validateDocName('.')).not.toBeNull()
    expect(validateDocName('..')).not.toBeNull()
  })
})

describe('buildRenamePath', () => {
  it('仅替换 basename，目录保持', () => {
    expect(buildRenamePath('posts/2026/hello.md', 'world.md')).toBe('posts/2026/world.md')
    expect(buildRenamePath('hello.md', 'world')).toBe('world.md')
  })
})

describe('validateTransfer', () => {
  it('合法迁移/复制返回 null', () => {
    expect(validateTransfer('posts/hello.md', 'notes/hello.md')).toBeNull()
    expect(validateTransfer('posts/hello.md', 'Hello.md')).toBeNull()
  })
  it('同路径 / 目标落入 assets 目录 / 非 .md 目标 / 空 src 返回错误', () => {
    expect(validateTransfer('posts/hello.md', 'posts/hello.md')).not.toBeNull()
    expect(validateTransfer('posts/hello.md', 'posts/hello.assets')).not.toBeNull()
    expect(validateTransfer('posts/hello.md', 'posts/hello.assets/x.md')).not.toBeNull()
    expect(validateTransfer('posts/hello.md', 'notes/hello.txt')).not.toBeNull()
    expect(validateTransfer('', 'notes/hello.md')).not.toBeNull()
  })
})

describe('rewriteAssetsRefs', () => {
  it('重命名后相对引用跟随新 assets 目录名', () => {
    expect(
      rewriteAssetsRefs('![图](foo.assets/pic.png)', 'foo.assets', 'bar.assets')
    ).toBe('![图](bar.assets/pic.png)')
    expect(
      rewriteAssetsRefs('<img src="./foo.assets/a.png">', 'foo.assets', 'bar.assets')
    ).toBe('<img src="./bar.assets/a.png">')
  })
  it('边界保护：更长同名前缀目录不被误改', () => {
    expect(
      rewriteAssetsRefs('![x](myfoo.assets/a.png)', 'foo.assets', 'bar.assets')
    ).toBe('![x](myfoo.assets/a.png)')
    expect(
      rewriteAssetsRefs('文内提到 foo.assets/ 这个词', 'foo.assets', 'bar.assets')
    ).toBe('文内提到 bar.assets/ 这个词')
  })
  it('目录名未变化时原样返回', () => {
    const c = '![x](foo.assets/a.png)'
    expect(rewriteAssetsRefs(c, 'foo.assets', 'foo.assets')).toBe(c)
  })
})

describe('transferDestFor', () => {
  it('目标目录拼出新路径；根目录取 basename', () => {
    expect(transferDestFor('posts/2026/hello.md', 'notes/draft')).toBe('notes/draft/hello.md')
    expect(transferDestFor('posts/2026/hello.md', '')).toBe('hello.md')
  })
})

describe('collectDirOptions', () => {
  it('DFS 收集目录（含缩进层级），根目录以空路径打头，过滤 assets 目录', () => {
    const tree = [
      {
        name: 'posts',
        path: 'posts',
        type: 'dir' as const,
        children: [
          { name: 'foo.assets', path: 'posts/foo.assets', type: 'dir' as const },
          { name: '2026', path: 'posts/2026', type: 'dir' as const, children: [] }
        ]
      },
      { name: 'about.md', path: 'about.md', type: 'file' as const }
    ]
    expect(collectDirOptions(tree, 'proj')).toEqual([
      { path: '', name: 'proj', depth: 0 },
      { path: 'posts', name: 'posts', depth: 0 },
      { path: 'posts/2026', name: '2026', depth: 1 }
    ])
  })
})
