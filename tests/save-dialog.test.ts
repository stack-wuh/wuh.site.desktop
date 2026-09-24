import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  configureSaveDialogDir,
  parseSaveDialogState,
  readLastDir,
  recordLastDir,
  suggestFileStem
} from '../src/main/saveDialog'
// 说明：save-dialog.json 固定写在注入目录下，afterEach 清理目录即可，无需额外状态复位。
import { workspaceRelativePath } from '../src/shared/types'

/**
 * 原生保存面板（20260924-feature-native-save-dialog）主进程纯逻辑 + fs 联动：
 * 建议文件名清洗、上次保存目录持久化（userData/save-dialog.json，目录经
 * configureSaveDialogDir 注入 tmp，不触碰 electron app.getPath）、
 * 工作区相对路径边界校验（渲染层 saveAs 去留共用）。
 */

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'wuh-save-dialog-'))
  configureSaveDialogDir(dir)
})

afterEach(async () => {
  configureSaveDialogDir(null)
  await rm(dir, { recursive: true, force: true })
})

afterAll(() => {
  configureSaveDialogDir(null)
})

describe('suggestFileStem（建议文件名清洗）', () => {
  it('剔除文件系统非法字符并压缩空白', () => {
    expect(suggestFileStem('a/b:c*d?e"f<g>h|i')).toBe('a b c d e f g h i')
    expect(suggestFileStem('  多  空格  标题 ')).toBe('多 空格 标题')
  })

  it('去除结尾点与空格（Windows 保留名规则）、空标题回退「未命名」', () => {
    expect(suggestFileStem('hello...   ')).toBe('hello')
    expect(suggestFileStem('')).toBe('未命名')
    expect(suggestFileStem(null)).toBe('未命名')
    expect(suggestFileStem('///')).toBe('未命名')
  })

  it('超长标题截断到 80 字符', () => {
    expect(suggestFileStem('啊'.repeat(100)).length).toBe(80)
  })
})

describe('parseSaveDialogState（持久化格式）', () => {
  it('合法 JSON + 绝对路径 → lastDir', () => {
    expect(parseSaveDialogState(JSON.stringify({ lastDir: '/tmp/x' }))).toEqual({ lastDir: '/tmp/x' })
  })

  it('相对路径 / 非字符串 / 损坏 JSON → 空状态', () => {
    expect(parseSaveDialogState(JSON.stringify({ lastDir: 'rel/path' }))).toEqual({})
    expect(parseSaveDialogState(JSON.stringify({ lastDir: 42 }))).toEqual({})
    expect(parseSaveDialogState('{not json')).toEqual({})
  })
})

describe('readLastDir / recordLastDir（userData 联动）', () => {
  it('写入后回读一致；目录已删除则回落 undefined', async () => {
    const sub = path.join(dir, 'sub')
    await mkdir(sub, { recursive: true })
    await recordLastDir(sub)
    await expect(readLastDir()).resolves.toBe(sub)

    // 目录不存在 → 视为无效
    await recordLastDir(path.join(dir, 'gone'))
    await rm(path.join(dir, 'gone'), { recursive: true, force: true })
    await expect(readLastDir()).resolves.toBeUndefined()
  })

  it('相对路径拒绝写入；文件损坏回落 undefined', async () => {
    await recordLastDir('relative/path')
    await expect(readLastDir()).resolves.toBeUndefined()

    await writeFile(path.join(dir, 'save-dialog.json'), '{broken', 'utf-8')
    await expect(readLastDir()).resolves.toBeUndefined()
  })

  it('recordLastDir 产物确实是绝对路径 JSON', async () => {
    await recordLastDir(dir)
    const raw = await readFileStore()
    expect(parseSaveDialogState(raw)).toEqual({ lastDir: dir })
    await expect(stat(path.join(dir, 'save-dialog.json'))).resolves.toBeTruthy()
  })
})

async function readFileStore(): Promise<string> {
  const fsp = await import('node:fs/promises')
  return fsp.readFile(path.join(dir, 'save-dialog.json'), 'utf-8')
}

describe('workspaceRelativePath（保存边界校验）', () => {
  it('root 内绝对路径 → POSIX 相对路径', () => {
    expect(workspaceRelativePath('/ws', '/ws/posts/hello.md')).toBe('posts/hello.md')
    expect(workspaceRelativePath('/ws/', '/ws/a.md')).toBe('a.md')
  })

  it('反斜杠分隔符归一为 POSIX', () => {
    expect(workspaceRelativePath('C:\\ws', 'C:\\ws\\posts\\a.md')).toBe('posts/a.md')
  })

  it('root 外 / 恰为 root / 前缀相似目录 → null', () => {
    expect(workspaceRelativePath('/ws', '/elsewhere/a.md')).toBeNull()
    expect(workspaceRelativePath('/ws', '/ws')).toBeNull()
    expect(workspaceRelativePath('/ws', '/ws2/a.md')).toBeNull()
    expect(workspaceRelativePath('', '/ws/a.md')).toBeNull()
  })
})
