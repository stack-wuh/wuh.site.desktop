import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateManifest, type PluginManifest } from '../src/shared/plugin'

/**
 * 真实插件清单契约（20260924-feature-git-history-capsule）：
 * 仓库内置插件目录下每个 plugin.json 全部必须过 validateManifest（上位卡
 * desktop-plugin-architecture 的验证基线）；并锁定 git-history 作为胶囊
 * capsule 贡献点第二个参考生产者的声明契约——logic 帧存在、capsule 模块
 * 指向存在的主区视图、逻辑帧所需的 git.status.read 权限在列。
 *
 * 另以 mock wuh SDK 驱动真实插件资产（logic/status.js 与 view/view.js），
 * 锁定逻辑帧上报载荷护栏（模板字段白名单/长度）与文件历史跟随语义——
 * dev 帧运行时当前不可用（协议层环境问题，见 brief 待确认），以资产级
 * 模拟补足实机走查缺口。
 */

const pluginsRoot = join(dirname(fileURLToPath(import.meta.url)), '../plugins')

function loadManifest(id: string): PluginManifest {
  const raw = JSON.parse(readFileSync(join(pluginsRoot, id, 'plugin.json'), 'utf8'))
  const result = validateManifest(raw)
  if (!result.ok) {
    throw new Error(`${id} 清单校验失败: ${result.errors.join('; ')}`)
  }
  return result.manifest
}

describe('内置插件清单', () => {
  it('plugins 目录下每个 plugin.json 全部通过 validateManifest', () => {
    const ids = readdirSync(pluginsRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
    expect(ids.length).toBeGreaterThanOrEqual(4)
    for (const id of ids) loadManifest(id)
  })
})

describe('git-history 胶囊贡献点契约', () => {
  const m = loadManifest('git-history')

  it('声明 logic 入口且文件存在', () => {
    expect(m.logic).toBe('logic/status.js')
    expect(existsSync(join(pluginsRoot, 'git-history', m.logic ?? ''))).toBe(true)
  })

  it('capsule 恰声明一个 status 模板模块并指向存在的主区视图', () => {
    expect(m.capsule).toHaveLength(1)
    const mod = m.capsule?.[0]
    expect(mod?.id).toBe('status')
    expect(mod?.template).toBe('status')
    expect(mod?.icon).toBe('git-branch')
    expect(mod?.title.length).toBeGreaterThan(0)
    const view = m.views.find((v) => v.id === mod?.viewId)
    expect(view?.area).toBe('main')
    expect(existsSync(join(pluginsRoot, 'git-history', view?.entry ?? ''))).toBe(true)
  })

  it('逻辑帧调用 gitStatus 所需的 git.status.read 权限在列', () => {
    expect(m.permissions).toContain('git.status.read')
  })
})

// ---------- logic/status.js 资产级行为（mock wuh SDK 驱动真实文件） ----------

type Update = { id: string; patch: Record<string, unknown> }

interface WuhMock {
  updates: Update[]
  removes: string[]
  handlers: Map<string, Array<(payload: unknown) => void>>
  gitStatusImpl: () => Promise<unknown>
}

async function loadStatusLogic(gitStatusImpl: () => Promise<unknown>): Promise<WuhMock> {
  const mock: WuhMock = {
    updates: [],
    removes: [],
    handlers: new Map(),
    gitStatusImpl
  }
  ;(globalThis as unknown as { window?: Record<string, unknown> }).window = {
    wuh: {
      ready: Promise.resolve(),
      cap: {
        call: (method: string) => {
          if (method !== 'gitStatus') throw new Error(`unexpected cap: ${method}`)
          return mock.gitStatusImpl()
        }
      },
      capsule: {
        update: async (id: string, patch: Record<string, unknown>) => {
          mock.updates.push({ id, patch })
        },
        remove: async (id: string) => {
          mock.removes.push(id)
        }
      },
      on: (name: string, cb: (payload: unknown) => void) => {
        const list = mock.handlers.get(name) ?? []
        list.push(cb)
        mock.handlers.set(name, list)
      }
    }
  }
  vi.resetModules()
  // 插件资产为经典 JS（无类型声明），严格模式下显式豁免隐式 any
  // @ts-expect-error 插件资产经典 JS 隐式 any
  await import('../plugins/git-history/logic/status.js')
  return mock
}

const dirtyStatus = {
  branch: 'main',
  upstream: 'origin/main',
  ahead: 2,
  behind: 0,
  files: [
    { path: 'a.md', state: 'modified', staged: true },
    { path: 'b.md', state: 'modified', staged: false },
    { path: 'c.md', state: 'untracked', staged: false }
  ]
}

describe('git-history 逻辑帧上报', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('脏工作区：上报「分支 · N 未提交」+ primary，detail 汇总暂存与领先落后', async () => {
    const mock = await loadStatusLogic(async () => dirtyStatus)
    expect(mock.updates).toEqual([
      { id: 'status', patch: { text: 'main · 3 未提交', tone: 'primary', detail: '已暂存 1 · 领先 2' } }
    ])
  })

  it('干净工作区：上报分支名 + success，detail 为空串', async () => {
    const mock = await loadStatusLogic(async () => ({ branch: 'main', upstream: null, ahead: 0, behind: 0, files: [] }))
    expect(mock.updates).toEqual([
      { id: 'status', patch: { text: 'main', tone: 'success', detail: '' } }
    ])
  })

  it('非 git 目录（branch 为 null）：remove 隐藏模块', async () => {
    const mock = await loadStatusLogic(async () => ({ branch: null, upstream: null, ahead: 0, behind: 0, files: [] }))
    expect(mock.updates).toEqual([])
    expect(mock.removes).toEqual(['status'])
  })

  it('gitStatus 抛错（如无仓库）：静默不上报不隐藏（保持上次态）', async () => {
    const mock = await loadStatusLogic(async () => {
      throw new Error('not a git repository')
    })
    expect(mock.updates).toEqual([])
    expect(mock.removes).toEqual([])
  })

  it('doc.saved / doc.opened / workspace 事件触发重报', async () => {
    let result: unknown = dirtyStatus
    const mock = await loadStatusLogic(async () => result)
    expect(mock.updates).toHaveLength(1)
    result = { branch: 'dev', upstream: null, ahead: 0, behind: 0, files: [] }
    for (const name of ['doc.saved', 'doc.opened', 'workspace']) {
      mock.handlers.get(name)?.[0]?.(null)
      await new Promise((r) => setTimeout(r, 0))
    }
    expect(mock.updates).toHaveLength(4)
    expect(mock.updates[3]?.patch).toEqual({ text: 'dev', tone: 'success', detail: '' })
  })
})
