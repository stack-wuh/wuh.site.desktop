import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: {},
  dialog: {},
  ipcMain: {},
  app: { getPath: () => path.join(tmpdir(), 'wuh-publish-cli-userdata') },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}))

import {
  buildExecuteArgs,
  buildPlanArgs,
  parseCliOutput,
  redactSecret,
  resolveCliEntry
} from '../src/main/publishCli'

/**
 * CLI 发布桥纯逻辑（20261020-feature-publish-interaction）：入口解析只认
 * CURRENT 指针、plan/execute 参数组装（filePath 相对参与 planHash）、stdout
 * JSON 契约解析与 token 脱敏。子进程链路本身在真机走查取证。
 */

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'wuh-cli-root-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function installVersion(version: string): Promise<string> {
  const dir = path.join(root, `shadow-dev-cli-${version}`)
  await mkdir(dir, { recursive: true })
  const entry = path.join(dir, 'cli.mjs')
  await writeFile(entry, '// probe')
  return entry
}

describe('resolveCliEntry（CURRENT 指针解析）', () => {
  it('CURRENT 指向已安装版本目录时返回 cli.mjs 路径', async () => {
    const entry = await installVersion('1.8.0')
    await writeFile(path.join(root, 'CURRENT'), '1.8.0\n')
    expect(resolveCliEntry(root)).toBe(entry)
  })

  it('CURRENT 缺失 → null', () => {
    expect(resolveCliEntry(root)).toBeNull()
  })

  it('CURRENT 指向的版本目录不存在 → null（不扫描其他版本，尊重用户回滚）', async () => {
    await installVersion('1.8.0')
    await writeFile(path.join(root, 'CURRENT'), '1.4.0\n')
    expect(resolveCliEntry(root)).toBeNull()
  })

  it('CURRENT 为空 → null', async () => {
    await writeFile(path.join(root, 'CURRENT'), '\n')
    expect(resolveCliEntry(root)).toBeNull()
  })
})

describe('参数组装（plan/execute 同源，filePath 参与 planHash）', () => {
  it('无工作区仓库：不传 --repository', () => {
    expect(buildPlanArgs('posts/a.md', null)).toEqual([
      'blog',
      'publish',
      'plan',
      '--file',
      'posts/a.md',
      '--json'
    ])
  })

  it('有工作区仓库：plan/execute 都携带同一 --repository（--json 末位）', () => {
    expect(buildPlanArgs('posts/a.md', 'stack-wuh/blog')).toEqual([
      'blog',
      'publish',
      'plan',
      '--file',
      'posts/a.md',
      '--repository',
      'stack-wuh/blog',
      '--json'
    ])
    expect(buildExecuteArgs('posts/a.md', 'stack-wuh/blog', 'hash-1')).toEqual([
      'blog',
      'publish',
      'execute',
      '--file',
      'posts/a.md',
      '--plan-hash',
      'hash-1',
      '--confirm',
      '--repository',
      'stack-wuh/blog',
      '--json'
    ])
  })
})

describe('parseCliOutput（stdout 单行 JSON 契约）', () => {
  it('解析 plan 信封（planHash 在顶层）', () => {
    const env = parseCliOutput(
      '{"ok":true,"command":"blog.publish.plan","planHash":"abc","data":{"title":"t"}}\n'
    )
    expect(env?.ok).toBe(true)
    expect(env?.planHash).toBe('abc')
  })

  it('多行输出取最后一个 JSON 行（人用噪声在前）', () => {
    const env = parseCliOutput('▶ [enter] shadow-dev blog\n{"ok":false,"error":{"code":"X","message":"m"}}\n')
    expect(env?.ok).toBe(false)
    expect(env?.error?.code).toBe('X')
  })

  it('无 JSON 行 / 非对象 → null', () => {
    expect(parseCliOutput('plain text\n')).toBeNull()
    expect(parseCliOutput('123\n')).toBeNull()
    expect(parseCliOutput('')).toBeNull()
  })
})

describe('redactSecret（token 兜底脱敏）', () => {
  it('替换所有出现位置', () => {
    expect(redactSecret('a tok123 b tok123', 'tok123')).toBe('a *** b ***')
  })

  it('无 token 时原样返回', () => {
    expect(redactSecret('plain', null)).toBe('plain')
  })
})
