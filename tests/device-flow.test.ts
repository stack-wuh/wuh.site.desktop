import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_SCOPE,
  beginDeviceFlow,
  type DeviceFlowDeps
} from '../src/main/device-flow'

/** 构造 fetch Response 形状的最小桩 */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response
}

/** 组装依赖：记录 delay 请求的毫秒值与 onToken 调用 */
function makeDeps(fetchMock: ReturnType<typeof vi.fn>): DeviceFlowDeps & {
  delays: number[]
  tokens: string[]
} {
  const delays: number[] = []
  const tokens: string[] = []
  return {
    fetch: fetchMock as unknown as typeof globalThis.fetch,
    delay: (ms: number) => {
      delays.push(ms)
      return Promise.resolve()
    },
    onToken: (token: string) => {
      tokens.push(token)
      return Promise.resolve()
    },
    delays,
    tokens
  }
}

const DEVICE_RESPONSE = {
  device_code: 'device-code-1',
  user_code: 'WDJB-MJHT',
  verification_uri: 'https://github.com/login/device',
  expires_in: 900,
  interval: 5
}

beforeEach(() => {
  vi.restoreAllMocks()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('beginDeviceFlow', () => {
  it('正常路径：换取 device code → 轮询 pending → 拿到 token 落盘', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEVICE_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({ error: 'authorization_pending' }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'gho_token_1', token_type: 'bearer' }))
    const deps = makeDeps(fetchMock)

    const run = await beginDeviceFlow(deps)
    expect(run.start.userCode).toBe('WDJB-MJHT')
    expect(run.start.verificationUri).toBe('https://github.com/login/device')

    const outcome = await run.done
    expect(outcome).toEqual({ ok: true, accessToken: 'gho_token_1' })
    expect(deps.tokens).toEqual(['gho_token_1'])

    // device code 请求携带 client_id 与 scope（JSON body）
    const [codeUrl, codeInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(codeUrl).toContain('login/device/code')
    const codeBody = JSON.parse(String(codeInit.body)) as { client_id: string; scope: string }
    expect(codeBody.client_id).toBe(GITHUB_OAUTH_CLIENT_ID)
    expect(codeBody.scope).toBe(GITHUB_OAUTH_SCOPE)
    // token 轮询按 interval 间隔等待
    expect(deps.delays).toContain(5000)
  })

  it('slow_down：轮询间隔在原值上加 5 秒', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEVICE_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({ error: 'slow_down' }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'gho_slow', token_type: 'bearer' }))
    const deps = makeDeps(fetchMock)

    const run = await beginDeviceFlow(deps)
    await run.done
    // interval=5s → slow_down 后 10s
    expect(deps.delays).toEqual([5000, 10000])
  })

  it('expired_token：以 expired 结束且不落盘', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEVICE_RESPONSE))
      .mockResolvedValue(jsonResponse({ error: 'expired_token' }))
    const deps = makeDeps(fetchMock)

    const run = await beginDeviceFlow(deps)
    const outcome = await run.done
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe('expired')
    expect(deps.tokens).toEqual([])
  })

  it('access_denied：用户拒绝授权，以 denied 结束', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEVICE_RESPONSE))
      .mockResolvedValue(jsonResponse({ error: 'access_denied' }))
    const deps = makeDeps(fetchMock)

    const run = await beginDeviceFlow(deps)
    const outcome = await run.done
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe('denied')
  })

  it('cancel：轮询等待中取消，以 cancelled 结束且不落盘', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEVICE_RESPONSE))
      // 之后的轮询不会被消费
      .mockResolvedValue(jsonResponse({ error: 'authorization_pending' }))
    const deps = makeDeps(fetchMock)

    const run = await beginDeviceFlow(deps)
    run.cancel()
    const outcome = await run.done
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe('cancelled')
    expect(deps.tokens).toEqual([])
  })

  it('cancel：取消落在轮询请求进行中，done 仍须 settle（不挂起）', async () => {
    let releasePoll!: (r: Response) => void
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEVICE_RESPONSE))
      // 第二次轮询：返回一个由测试手动放行的挂起 Promise，模拟进行中的请求
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { releasePoll = resolve }))
    const deps = makeDeps(fetchMock)

    const run = await beginDeviceFlow(deps)
    // 等到轮询请求已发出（mockImplementation 已被消费）再取消
    await vi.waitFor(() => expect(releasePoll).toBeDefined())
    run.cancel()
    releasePoll(jsonResponse({ error: 'authorization_pending' }))

    const outcome = await Promise.race([
      run.done,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('done 未 settle')), 500))
    ])
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe('cancelled')
  })

  it('换取 device code 失败（未勾选 Device Flow 等）：抛出服务端 message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'device_flow_disabled', error_description: 'device flow not enabled' }, 401))
    const deps = makeDeps(fetchMock)

    await expect(beginDeviceFlow(deps)).rejects.toThrow('device flow not enabled')
  })

  it('网络瞬断：单次轮询失败不终止，恢复后成功', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DEVICE_RESPONSE))
      .mockRejectedValueOnce(new Error('net down'))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'gho_retry', token_type: 'bearer' }))
    const deps = makeDeps(fetchMock)

    const run = await beginDeviceFlow(deps)
    const outcome = await run.done
    expect(outcome).toEqual({ ok: true, accessToken: 'gho_retry' })
  })

  it('重复 begin：取消前一个未完成的流', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DEVICE_RESPONSE))
    const deps = makeDeps(fetchMock)

    const first = await beginDeviceFlow(deps)
    const second = await beginDeviceFlow(deps)
    const firstOutcome = await first.done
    expect(firstOutcome.ok).toBe(false)
    if (!firstOutcome.ok) expect(firstOutcome.reason).toBe('cancelled')
    second.cancel()
    await second.done
  })
})
