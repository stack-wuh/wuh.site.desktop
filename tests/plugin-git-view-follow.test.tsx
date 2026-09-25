// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * git-history 视图文件历史跟随语义（20260924-feature-git-history-capsule）：
 * mock wuh SDK + happy-dom 驱动真实插件资产 view/view.js——打开即定位当前
 * 文件（直达）、doc.opened 跟随切 file scope、doc.closed 回 all scope。
 * 文件名走 .tsx 通道：视图类测试需 DOM lib 且不进 tsconfig.node（其 exclude
 * 已把 tsx 后缀的测试划出，沿用既有划分）。
 */

interface DocState {
  path: string | null
}

interface Handlers {
  handlers: Map<string, Array<(payload: unknown) => void>>
}

async function loadViewLogic(doc: DocState): Promise<{
  handlers: Map<string, Array<(payload: unknown) => void>>
  setDoc: (path: string | null) => void
  root: HTMLElement
}> {
  document.body.innerHTML = '<div class="git-panel" id="root"></div>'
  const state = { doc: { ...doc } }
  const handlers = new Map<string, Array<(payload: unknown) => void>>()
  ;(globalThis as unknown as { window?: Record<string, unknown> }).window = {
    wuh: {
      ready: Promise.resolve(),
      document: {
        get: async () => ({ ...state.doc, content: '', saved: null, dirty: false, root: null })
      },
      cap: {
        call: async (method: string) => {
          if (method === 'gitStatus') {
            return { branch: 'main', upstream: null, ahead: 0, behind: 0, files: [] }
          }
          if (method === 'gitLog') return []
          throw new Error(`unexpected cap: ${method}`)
        }
      },
      ui: { confirm: async () => false },
      on: (name: string, cb: (payload: unknown) => void) => {
        const list = handlers.get(name) ?? []
        list.push(cb)
        handlers.set(name, list)
      }
    }
  }
  vi.resetModules()
  // 插件资产为经典 JS（无类型声明），严格模式下显式豁免隐式 any
  // @ts-expect-error 插件资产经典 JS 隐式 any
  await import('../plugins/git-history/view/view.js')
  await new Promise((r) => setTimeout(r, 0))
  const root = document.getElementById('root') as HTMLElement
  return {
    handlers,
    root,
    setDoc: (path) => {
      state.doc = { path }
    }
  }
}

const historyHeading = (root: HTMLElement): string => {
  const heads = Array.from(root.querySelectorAll('.section-head > span'))
  return heads.map((s) => s.textContent ?? '').find((t) => t.startsWith('历史')) ?? ''
}

const activeScope = (root: HTMLElement): string => {
  const active = root.querySelector('.scope-toggle .gi-btn.active')
  return active?.textContent ?? ''
}

describe('git-history 视图文件历史跟随', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('打开时已有文档：直接切 file scope 展示该文件历史（直达）', async () => {
    const { root } = await loadViewLogic({ path: 'notes/plan.md' })
    expect(activeScope(root)).toBe('当前文件')
    expect(historyHeading(root)).toContain('notes/plan.md')
  })

  it('打开时无文档：保持 all scope', async () => {
    const { root } = await loadViewLogic({ path: null })
    expect(activeScope(root)).toBe('全仓')
    expect(historyHeading(root)).toBe('历史')
  })

  it('doc.opened 跟随新文档切 file scope', async () => {
    const { handlers, root, setDoc } = await loadViewLogic({ path: null })
    setDoc('blog/post-a.md')
    handlers.get('doc.opened')?.[0]?.(null)
    await new Promise((r) => setTimeout(r, 0))
    expect(activeScope(root)).toBe('当前文件')
    expect(historyHeading(root)).toContain('blog/post-a.md')
  })

  it('doc.closed（文档关闭）：回 all scope', async () => {
    const { handlers, root, setDoc } = await loadViewLogic({ path: 'notes/plan.md' })
    setDoc(null)
    handlers.get('doc.closed')?.[0]?.(null)
    await new Promise((r) => setTimeout(r, 0))
    expect(activeScope(root)).toBe('全仓')
    expect(historyHeading(root)).toBe('历史')
  })
})
