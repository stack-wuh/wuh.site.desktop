/**
 * DOM 渲染测试助手（20260923-test-dom-render-guard）：
 * - installWindowApiStub：happy-dom 里没有 Electron preload 提供的 window.api，
 *   以 Proxy 提供「任意方法返回 Promise<null>」的最小实现，并覆写组件真实依赖的
 *   少数方法（getWorkspace/pluginApi 等）；
 * - captureRenderConsole：采集渲染期 console.error/warn——React 的渲染期校验
 *   （非法 DOM 嵌套、无效 props、缺失 key）都经此通道报出，是本次要守的门；
 * - resetRenderEnv：每个用例前复位 store 与浏览器存储，避免跨用例污染。
 */
import { cleanup } from '@testing-library/react'
import { vi } from 'vitest'
import { resetCapsuleForTests } from '../../lib/capsule'
import { resetEditorLiveStateForTests } from '../../lib/editor-state'
import { resetTasksForTests } from '../../lib/tasks'
import { resetEditorCommandsForTests } from '../../lib/editor-commands'

/** React 19 act() 环境标记（RTL 也会设置，显式声明避免顺序依赖） */
export function markActEnvironment(): void {
  ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
}

/** 最小 window.api：任意方法 → Promise<null>，常用方法给可用返回值 */
export function installWindowApiStub(): void {
  const asyncNull = (): Promise<null> => Promise.resolve(null)
  const pluginApi = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'list') return () => Promise.resolve({ records: [], problems: [] })
        if (key === 'onDispatch') return () => () => undefined
        return asyncNull
      }
    }
  )
  const api = new Proxy(
    {},
    {
      get(_target, key) {
        if (typeof key !== 'string') return undefined
        if (key === 'getWorkspace' || key === 'openWorkspaceByPath') return asyncNull
        if (key === 'listRecentWorkspaces' || key === 'readTree') return () => Promise.resolve([])
        if (key === 'getSettings') return () => Promise.resolve({})
        if (key === 'getGithubIdentity' || key === 'getAboutActivity') return asyncNull
        if (key === 'pluginApi') return pluginApi
        return asyncNull
      }
    }
  )
  ;(window as unknown as { api: unknown }).api = api
}

export interface RenderConsole {
  /** 渲染期采集到的 error 输出（含 React 校验告警） */
  errors: string[]
  /** 渲染期采集到的 warn 输出 */
  warnings: string[]
  restore(): void
}

/** 采集渲染期控制台输出；调用方在断言后 restore() */
export function captureRenderConsole(): RenderConsole {
  const errors: string[] = []
  const warnings: string[] = []
  const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '))
  })
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '))
  })
  return {
    errors,
    warnings,
    restore(): void {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    }
  }
}

/** 每个用例前的复位：卸载已渲染组件、清 store 与浏览器存储、装好 window.api */
export function resetRenderEnv(): void {
  cleanup()
  resetTasksForTests()
  resetCapsuleForTests()
  resetEditorLiveStateForTests()
  resetEditorCommandsForTests()
  markActEnvironment()
  installWindowApiStub()
  try {
    localStorage.clear()
  } catch {
    // happy-dom 未提供存储时忽略
  }
}
