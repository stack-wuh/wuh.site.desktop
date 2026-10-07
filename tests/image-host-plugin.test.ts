import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateManifest, type PluginManifest } from '../src/shared/plugin'

/**
 * image-host 插件契约（20261007-feature-image-host-plugin）：
 * - manifest 过 validateManifest，权限声明 = picker 读 + OSS 写 + 剪贴板写
 * - 帧资产契约：视图 HTML 自带 sdk 脚本标签（plugin-architecture 卡：协议处理器
 *   不注入，缺失即全空帧）；logic/view 源码可解析
 * - 逻辑帧编排语义：以 mock wuh SDK 驱动真实 logic/upload.js 源码（dev 帧不可用
 *   时的资产级模拟，同 plugin-manifests-real 惯例）——start 命令逐文件 uploadImages、
 *   progress 逐条推送、finish 汇总；单文件失败不阻断
 */

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '../plugins/image-host')

function loadManifest(): PluginManifest {
  const raw = JSON.parse(readFileSync(join(pluginRoot, 'plugin.json'), 'utf8'))
  const result = validateManifest(raw)
  if (!result.ok) {
    throw new Error(`image-host 清单校验失败: ${result.errors.join('; ')}`)
  }
  return result.manifest
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

/** 语法解析（不执行）：logic 为经典脚本语义（顶层 await 允许），view 为模块语义 */
function assertParses(source: string, label: string): void {
  expect(() => new AsyncFunction(source), `${label} 语法解析失败`).not.toThrow()
}

interface PublishedEvent {
  name: string
  payload: unknown
}

interface MockWuh {
  published: PublishedEvent[]
  capCalls: { method: string; args: unknown[] }[]
  dispatch: (env: { type: string; payload: unknown }) => Promise<void>
}

async function runLogicSource(uploads: Array<{ ok: boolean; url?: string; error?: string }>): Promise<MockWuh> {
  const src = readFileSync(join(pluginRoot, 'logic/upload.js'), 'utf8')
  const published: PublishedEvent[] = []
  const capCalls: { method: string; args: unknown[] }[] = []
  let handler: ((env: { type: string; payload: unknown }) => void) | null = null
  const queue = [...uploads]
  const wuh = {
    ready: Promise.resolve(),
    events: {
      subscribe: async (): Promise<void> => undefined,
      unsubscribe: async (): Promise<void> => undefined,
      publish: async (name: string, payload: unknown): Promise<void> => {
        published.push({ name, payload })
      }
    },
    cap: {
      call: async (method: string, ...args: unknown[]): Promise<unknown> => {
        capCalls.push({ method, args })
        const next = queue.shift()
        return next ? [next] : [{ ok: false, error: '上传能力无返回' }]
      }
    },
    on: (name: string, cb: (env: { type: string; payload: unknown }) => void): void => {
      if (name === 'event') handler = cb
    }
  }
  await new AsyncFunction('window', src)({ wuh })
  if (!handler) throw new Error('逻辑帧未注册事件处理器')
  const dispatch = async (env: { type: string; payload: unknown }): Promise<void> => {
    handler?.(env)
    // runUpload 为 fire-and-forget，轮询至 finish 或 progress 落盘
    for (let i = 0; i < 50; i += 1) {
      if (published.some((e) => e.name === 'finish')) return
      await new Promise((r) => setTimeout(r, 2))
    }
  }
  return { published, capCalls, dispatch }
}

describe('image-host manifest 契约', () => {
  const manifest = loadManifest()

  it('manifest 结构与入口声明', () => {
    expect(manifest.id).toBe('image-host')
    expect(manifest.logic).toBe('logic/upload.js')
    expect(manifest.views).toHaveLength(1)
    expect(manifest.views[0]).toMatchObject({ area: 'main', entry: 'view/index.html', icon: 'image' })
  })

  it('权限声明 = picker 读 + OSS 写 + 剪贴板写（无多余权限）', () => {
    expect([...manifest.permissions].sort()).toEqual(['fs.picker.read', 'net.oss.write', 'ui.clipboard.write'].sort())
  })
})

describe('image-host 帧资产契约', () => {
  it('视图 HTML 自带 sdk 脚本标签（缺失即视图全空帧）', () => {
    const html = readFileSync(join(pluginRoot, 'view/index.html'), 'utf8')
    expect(html).toContain('<script src="/@core/sdk.js"></script>')
  })

  it('logic 与 view 源码语法可解析', () => {
    assertParses(readFileSync(join(pluginRoot, 'logic/upload.js'), 'utf8'), 'logic/upload.js')
    assertParses(readFileSync(join(pluginRoot, 'view/view.js'), 'utf8'), 'view/view.js')
  })
})

describe('image-host 逻辑帧编排（mock wuh 驱动真实源码）', () => {
  it('start 命令逐文件调 uploadImages 并携带 prefix，progress 逐条推送、finish 汇总', async () => {
    const mock = await runLogicSource([
      { ok: true, url: 'https://cdn.example.com/a.png' },
      { ok: true, url: 'https://cdn.example.com/b.png' }
    ])
    await mock.dispatch({ type: 'image-host:start', payload: { paths: ['/x/a.png', '/x/b.png'], prefix: 'blog/2026' } })

    expect(mock.capCalls).toHaveLength(2)
    expect(mock.capCalls[0]).toEqual({ method: 'uploadImages', args: [['/x/a.png'], { prefix: 'blog/2026' }] })

    const progress = mock.published.filter((e) => e.name === 'progress')
    expect(progress).toHaveLength(2)
    expect(progress[0].payload).toMatchObject({ done: 1, total: 2, ok: true, url: 'https://cdn.example.com/a.png' })

    const finish = mock.published.find((e) => e.name === 'finish')
    expect(finish?.payload).toEqual({ total: 2, okCount: 2, failCount: 0 })
  })

  it('单文件失败不阻断后续；finish 汇总成败计数', async () => {
    const mock = await runLogicSource([
      { ok: false, error: 'OSS 上传失败：boom' },
      { ok: true, url: 'https://cdn.example.com/b.png' }
    ])
    await mock.dispatch({ type: 'image-host:start', payload: { paths: ['/x/a.png', '/x/b.png'], prefix: null } })

    const progress = mock.published.filter((e) => e.name === 'progress')
    expect(progress[0].payload).toMatchObject({ done: 1, ok: false, error: 'OSS 上传失败：boom' })
    expect(progress[1].payload).toMatchObject({ done: 2, ok: true })

    const finish = mock.published.find((e) => e.name === 'finish')
    expect(finish?.payload).toEqual({ total: 2, okCount: 1, failCount: 1 })
  })

  it('空 paths 直接 finish 归零，不调用上传能力', async () => {
    const mock = await runLogicSource([])
    await mock.dispatch({ type: 'image-host:start', payload: { paths: [], prefix: null } })
    expect(mock.capCalls).toHaveLength(0)
    expect(mock.published.find((e) => e.name === 'finish')?.payload).toEqual({ total: 0, okCount: 0, failCount: 0 })
  })
})
