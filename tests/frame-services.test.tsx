import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetCapsuleForTests } from '../lib/capsule'
import { resetEventsForTests, onAnyEvent } from '../lib/events'
import { panelTabsStore, resetPanelTabsForTests, visiblePanelTabs } from '../lib/panelTabs'
import { resetStatusItemsForTests } from '../lib/statusItems'
import { resetTasksForTests, visibleTasks } from '../lib/tasks'
import { workspaceStore } from '../lib/store'
import { handleFrameInvoke } from '../components/plugins/PluginFrameHost/frameServices'
import { bootstrapPluginsHost, rebootstrapPluginsHost } from '../components/plugins/PluginFrameHost/frameProtocol'

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
    views: [] as unknown[]
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
  resetPanelTabsForTests()
  workspaceStore.switchWorkspace(null)
  workspaceStore.closeDoc()
  ;(globalThis as unknown as { window: unknown }).window = {
    pluginApi: {
      list: () => Promise.resolve({ records: [RECORD], problems: [] }),
      reload: () => Promise.resolve({ records: [RECORD], problems: [] }),
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

  it('ui.locale 返回宿主当前语言（storedLocale 只读，免权限）（20261007-feature-frontmatter-editor-hide）', async () => {
    await bootstrap()
    expect(await handleFrameInvoke('demo', 'ui', 'locale', [])).toBe('zh')
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

  // ---------- 工作台挂点（20261015-feature-workbench-shell task-13）----------

  it('panelTabs.update 声明制路由：dock 页签上报可见，非法 kind 拒绝', async () => {
    RECORD.manifest.views = [
      { id: 'panel', area: 'dock', title: 'Demo 面板', icon: 'file-text', entry: 'panel.html', order: 20 },
      { id: 'main', area: 'main', title: 'Main', icon: 'file-text', entry: 'main.html', order: 10 }
    ]
    try {
      await rebootstrapPluginsHost()
      await handleFrameInvoke('demo', 'panelTabs', 'update', ['dock', 'panel', { sections: [{ rows: [{ text: 'main · 3 未提交' }] }] }])
      expect(visiblePanelTabs('dock').length).toBe(1)
      expect(visiblePanelTabs('dock')[0]?.sections[0]?.rows[0]?.text).toBe('main · 3 未提交')
      await expect(handleFrameInvoke('demo', 'panelTabs', 'update', ['float', 'panel', {}])).rejects.toThrow(/dock\/context/)
    } finally {
      RECORD.manifest.views = []
    }
  })

  it('panelTabs.update 未声明页签报错（声明制守卫，非静默）', async () => {
    await bootstrap()
    await expect(handleFrameInvoke('demo', 'panelTabs', 'update', ['dock', 'nope', {}])).rejects.toThrow(/未声明/)
  })

  it('panelTabs.update payload 护栏与归属校验同 capsule tabs', async () => {
    RECORD.manifest.views = [
      { id: 'panel', area: 'dock', title: 'Demo 面板', icon: 'file-text', entry: 'panel.html', order: 20 }
    ]
    try {
      await rebootstrapPluginsHost()
      await expect(
        handleFrameInvoke('demo', 'panelTabs', 'update', ['dock', 'panel', { sections: [{ rows: [{ text: 'x', icon: 'rocket' }] }] }])
      ).rejects.toThrow(/白名单/)
    } finally {
      RECORD.manifest.views = []
    }
  })

  it('panelTabs.remove 隐藏声明的页签', async () => {
    RECORD.manifest.views = [
      { id: 'panel', area: 'dock', title: 'Demo 面板', icon: 'file-text', entry: 'panel.html', order: 20 }
    ]
    try {
      await rebootstrapPluginsHost()
      await handleFrameInvoke('demo', 'panelTabs', 'update', ['dock', 'panel', { sections: [{ rows: [{ text: 'x' }] }] }])
      expect(visiblePanelTabs('dock').length).toBe(1)
      await handleFrameInvoke('demo', 'panelTabs', 'remove', ['dock', 'panel'])
      expect(visiblePanelTabs('dock')).toEqual([])
    } finally {
      RECORD.manifest.views = []
    }
  })

  it('插件启停装配：wire 注册页签与命令、unwire 整组清除（run 走导航桥）', async () => {
    const { wirePluginContributions, unwirePluginContributions } = await import('../lib/contributions')
    const { paletteCommandsStore } = await import('../lib/commands')
    const { setShellNavigate, resetShellNavigateForTests } = await import('../lib/navigate')
    const navSeen: string[] = []
    setShellNavigate((p) => navSeen.push(p))
    // 前序用例可能遗留 demo 的声明（幂等注册会跳过已存在项），先清注册表
    resetPanelTabsForTests()
    try {
      wirePluginContributions(
        {
          id: 'demo',
          name: 'Demo',
          version: '1.0.0',
          views: [
            { id: 'main', area: 'main', title: 'Main', icon: 'file-text', entry: 'main.html', order: 10 },
            { id: 'panel', area: 'dock', title: 'Demo 面板', icon: 'file-text', entry: 'panel.html', order: 20 }
          ],
          commands: [{ id: 'open', title: 'Demo · 打开', viewId: 'main' }],
          publishers: [],
          permissions: []
        } as never,
        (p) => navSeen.push(p)
      )
      expect(visiblePanelTabs('dock')).toEqual([])
      // 声明注册默认 hidden（首次 panelTabs.update 上报后才可见），注册表有声明位
      expect(panelTabsStore.get().tabs.length).toBe(1)
      await handleFrameInvoke('demo', 'panelTabs', 'update', ['dock', 'panel', { sections: [{ rows: [{ text: 'x' }] }] }])
      expect(visiblePanelTabs('dock').length).toBe(1)
      const cmds = paletteCommandsStore.get().commands
      expect(cmds.length).toBe(1)
      cmds[0]?.run()
      expect(navSeen).toContain('/plugin/demo/main')
      unwirePluginContributions('demo')
      expect(visiblePanelTabs('dock')).toEqual([])
      expect(panelTabsStore.get().tabs).toEqual([])
      expect(paletteCommandsStore.get().commands).toEqual([])
    } finally {
      resetShellNavigateForTests()
    }
  })
})
