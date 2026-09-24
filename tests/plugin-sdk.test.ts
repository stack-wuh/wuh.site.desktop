import { describe, expect, it } from 'vitest'
import { PLUGIN_SDK_JS } from '../src/plugin-sdk'

describe('PLUGIN_SDK_JS', () => {
  it('是语法合法的脚本（new Function 校验）', () => {
    expect(() => new Function(PLUGIN_SDK_JS)).not.toThrow()
  })

  it('不得引入宿主特权原语', () => {
    expect(PLUGIN_SDK_JS).not.toMatch(/window\.parent/)
    expect(PLUGIN_SDK_JS).not.toMatch(/ipcRenderer/)
    expect(PLUGIN_SDK_JS).not.toMatch(/require\(/)
    expect(PLUGIN_SDK_JS).not.toMatch(/localStorage/)
  })

  it('暴露约定的消息 kind 与入口', () => {
    for (const kind of ['wuh:connect', 'invoke', 'result', 'event', 'response', 'hello', 'ready']) {
      expect(PLUGIN_SDK_JS).toContain(kind)
    }
    expect(PLUGIN_SDK_JS).toContain('__startLogic')
    expect(PLUGIN_SDK_JS).toContain('window.wuh')
  })

  it('暴露 tasks 运行时 API（upsert/remove 经 tasks 帧服务）', () => {
    expect(PLUGIN_SDK_JS).toContain('tasks: {')
    expect(PLUGIN_SDK_JS).toContain("call('tasks', 'upsert'")
    expect(PLUGIN_SDK_JS).toContain("call('tasks', 'remove'")
  })

  it('暴露反馈提示三方法（toast/message/alert 经 ui 帧服务）', () => {
    expect(PLUGIN_SDK_JS).toContain("call('ui', 'toast'")
    expect(PLUGIN_SDK_JS).toContain("call('ui', 'message'")
    expect(PLUGIN_SDK_JS).toContain("call('ui', 'alert'")
  })
})
