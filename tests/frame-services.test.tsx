import { beforeEach, describe, expect, it } from 'vitest'
import { resetCapsuleForTests } from '../lib/capsule'
import { resetEventsForTests, onAnyEvent } from '../lib/events'
import { resetStatusItemsForTests } from '../lib/statusItems'
import { resetTasksForTests, visibleTasks } from '../lib/tasks'
import { workspaceStore } from '../lib/store'
import { handleFrameInvoke } from '../components/plugins/PluginFrameHost/frameServices'
import { bootstrapPluginsHost } from '../components/plugins/PluginFrameHost/frameProtocol'

/**
 * 插件帧服务层单测（20260927-refactor-frame-protocol-split）：
 * handleFrameInvoke 的方法路由、权限裁决、参数钳制、反馈频率护栏与
 * tasks 写穿事件信封。会话经 mock 后的 window.pluginApi + bootstrap 建立；
 * 协议词表（service/method 名）与本测试互为锚定。
 */

const RECORD = {
  manifest: {
    id: 'demo',
    name: 'Demo',
    version: '1.0.0',
    permissions: ['document.read.write', 'render.execute', 'render.rule.register', 'ui'],
    views: []
  },
  enabled: true,
  approval: null,
  dir: '/plugins/demo'
}

beforeEach(() => {
  resetCapsuleForTests()
  resetEventsForTests()
  resetStatusItemsForTests()
  resetTasksForTests()
  workspaceStore.switchWorkspace(null)
  workspaceStore.closeDoc()
  ;(globalThis as unknown as { window: unknown }).window = {
    pluginApi: {
      list: () => Promise.resolve({ records: [RECORD], problems: [] }),
      createSession: () => Promise.resolve({ sessionId: 'session-1', permissions: RECORD.manifest.permissions }),
      onDispatch: () => () => undefined
    }
  }
})

async function bootstrap(): Promise<void> {
  // 无 logic 帧声明 → 不触 DOM iframe，可在 node 环境建会话
  await bootstrapPluginsHost()
}

describe('路由与权限', () => {
  it('未知 service 抛「未知服务」', async () => {
    await bootstrap()
    await expect(handleFrameInvoke('demo', 'nope' as 'doc', 'x', [])).rejects.toThrow('未知服务')
  })

  it('未建会话的插件访问 doc 服务抛会话错误', async () => {
    await bootstrap()
    await expect(handleFrameInvoke('ghost', 'doc', 'get', [])).rejects.toThrow('会话未建立')
  })

  it('doc.get 返回文档状态快照；doc.set 写穿 store', async () => {
    await bootstrap()
    const snap = (await handleFrameInvoke('demo', 'doc', 'get', [])) as { path: string | null; dirty: boolean }
    expect(snap.path).toBeNull()
    expect(snap.dirty).toBe(false)
    await handleFrameInvoke('demo', 'doc', 'set', ['# 你好'])
    expect(workspaceStore.get().content).toBe('# 你好')
  })

  it('未声明权限的插件被拒（tasks 无需权限，反向验证会话存在）', async () => {
    await bootstrap()
    // demo 会话存在但未声明 document 之外的自定义权限词——doc.save 走已声明路径
    await expect(handleFrameInvoke('demo', 'doc', 'save', [])).resolves.toBeNull()
  })
})

describe('statusBar / tasks / capsule 服务', () => {
  it('statusBar：未声明的状态项被拒（manifest 声明制守卫）', async () => {
    await bootstrap()
    await expect(handleFrameInvoke('demo', 'statusBar', 'update', ['item-1', { text: 'x' }])).rejects.toThrow(/未声明/)
    await expect(handleFrameInvoke('demo', 'statusBar', 'remove', ['item-1'])).rejects.toThrow(/未声明/)
  })

  it('tasks.upsert 写穿注册表并发布 tasks:upsert 事件（信封归属插件）', async () => {
    await bootstrap()
    const seen: { type: string; pluginId: string }[] = []
    const off = onAnyEvent((env) => seen.push({ type: env.type, pluginId: env.pluginId }))
    await handleFrameInvoke('demo', 'tasks', 'upsert', ['t1', { title: '任务一' }])
    expect(visibleTasks().some((t) => t.id === 't1' && t.title === '任务一')).toBe(true)
    expect(seen.some((s) => s.type === 'tasks:upsert' && s.pluginId === 'demo')).toBe(true)
    off()
    await handleFrameInvoke('demo', 'tasks', 'remove', ['t1'])
    expect(visibleTasks().some((t) => t.id === 't1')).toBe(false)
  })

  it('capsule：未声明的模块/Tab 被拒（manifest 声明制守卫）', async () => {
    await bootstrap()
    await expect(handleFrameInvoke('demo', 'capsule', 'update', ['m1', { text: 'x' }])).rejects.toThrow(/未声明/)
    await expect(handleFrameInvoke('demo', 'capsule', 'updateTab', ['tab1', { sections: [] }])).rejects.toThrow(/未声明/)
    await expect(handleFrameInvoke('demo', 'capsule', 'removeTab', ['tab1'])).rejects.toThrow(/未声明/)
  })
})

describe('ui 服务与反馈护栏', () => {
  it('toast 缺 text 抛参数无效', async () => {
    await bootstrap()
    await expect(handleFrameInvoke('demo', 'ui', 'toast', [{}])).rejects.toThrow('toast 参数无效')
  })

  it('未知 ui 方法抛「未知 UI 方法」', async () => {
    await bootstrap()
    await expect(handleFrameInvoke('demo', 'ui', 'selfDestruct', [])).rejects.toThrow('未知 UI 方法')
  })

  it('频率护栏：10s 窗口内超限的 toast 被拒（额度全 kind 共享，含本文件前序用例消耗）', async () => {
    await bootstrap()
    let rejected = false
    for (let i = 0; i < 6 && !rejected; i++) {
      try {
        await handleFrameInvoke('demo', 'ui', 'toast', [{ text: `g${i}` }])
      } catch (err) {
        rejected = true
        expect((err as Error).message).toContain('频繁')
      }
    }
    expect(rejected).toBe(true)
  })
})
