import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: {},
  dialog: {},
  ipcMain: {},
  app: { getPath: () => path.join(tmpdir(), 'wuh-tree-userdata') }
}))

import { getWorkspace, readTreeByRoot, setWorkspace } from '../src/main/workspace'

/**
 * readTree 可选 root（20260924-feature-projects-editor-page）：
 * 项目页无需切换工作区即可列出任意项目目录的文件清单。
 * root 缺省保持现行为（requireRoot 当前工作区）；显式 root 校验目录存在后按根构树，
 * 不触碰当前工作区状态。electron 模块仅 mock 供 import 解析（recent-workspaces.test.ts 同款）。
 */

let base: string

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'wuh-tree-'))
})

afterEach(async () => {
  await rm(base, { recursive: true, force: true })
  await rm(path.join(tmpdir(), 'wuh-tree-userdata'), { recursive: true, force: true })
})

async function makeProject(name: string, files: Record<string, string>): Promise<string> {
  const root = path.join(base, name)
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true })
    await writeFile(path.join(root, rel), content)
  }
  return root
}

describe('readTreeByRoot（readTree 可选 root）', () => {
  // 本文件首个用例：依赖模块级 current 尚未被 setWorkspace 污染（线程池串行执行）
  it('未打开工作区且未指定 root：拒绝并提示先打开文件夹', async () => {
    await expect(readTreeByRoot(null)).rejects.toThrow('未打开工作区')
  })

  it('缺省 root：按当前工作区构树', async () => {
    const a = await makeProject('proj-a', { 'a.md': '# A' })
    await setWorkspace(a)
    const tree = await readTreeByRoot(null)
    expect(tree.map((n) => n.path)).toEqual(['a.md'])
  })

  it('指定 root：按该根构树，且不切换当前工作区', async () => {
    const a = await makeProject('proj-a', { 'a.md': '# A' })
    const b = await makeProject('proj-b', { 'b.md': '# B' })
    await setWorkspace(a)
    const tree = await readTreeByRoot(b)
    expect(tree.map((n) => n.path)).toEqual(['b.md'])
    expect(getWorkspace()?.root).toBe(a)
  })

  it('目录排序与相对路径：目录在前、同类型按名排序、路径正斜杠', async () => {
    const b = await makeProject('proj-b', {
      'z.md': 'z',
      'README.md': 'r',
      'notes/a.md': 'a',
      'notes/deep/c.md': 'c'
    })
    const tree = await readTreeByRoot(b)
    expect(tree.map((n) => n.path)).toEqual(['notes', 'README.md', 'z.md'])
    const notes = tree[0]
    expect(notes?.type).toBe('dir')
    expect(notes?.children?.map((n) => n.path)).toEqual(['notes/deep', 'notes/a.md'])
    const deep = notes?.children?.[0]
    expect(deep?.children?.map((n) => n.path)).toEqual(['notes/deep/c.md'])
  })

  it('隐藏条目与忽略目录不入树（.开头 / .git / node_modules / .assets）', async () => {
    const root = await makeProject('proj-filter', {
      'z.md': 'z',
      '.hidden.md': 'h',
      '.assets/img.png': 'png',
      'node_modules/x.js': 'js',
      '.git/config': 'cfg'
    })
    const tree = await readTreeByRoot(root)
    expect(tree.map((n) => n.path)).toEqual(['z.md'])
  })

  it('root 不存在：报错且不触碰当前工作区', async () => {
    const a = await makeProject('proj-a', { 'a.md': 'a' })
    await setWorkspace(a)
    await expect(readTreeByRoot(path.join(base, 'nope'))).rejects.toThrow(
      '项目目录不存在或不可访问'
    )
    expect(getWorkspace()?.root).toBe(a)
  })

  it('root 是文件：报错', async () => {
    const a = await makeProject('proj-a', { 'a.md': 'a' })
    await setWorkspace(a)
    await expect(readTreeByRoot(path.join(a, 'a.md'))).rejects.toThrow(
      '项目目录不存在或不可访问'
    )
  })
})
