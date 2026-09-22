/**
 * GitHub OAuth Device Flow（RFC 8628 的 GitHub 实现）纯逻辑模块。
 * 不 import electron/credentials：外部依赖经 DeviceFlowDeps 注入，vitest 可直接测；
 * IPC 装配（token 落盘、状态查询、取消）在 github/identity.ts。
 */

export const GITHUB_DEVICE_CODE_ENDPOINT = 'https://github.com/login/device/code'
export const GITHUB_TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token'

/** OAuth App 的 client_id（Device Flow 无需 client_secret；client_id 公开无害） */
export const GITHUB_OAUTH_CLIENT_ID =
  process.env.WUH_DESKTOP_GH_CLIENT_ID ?? 'Ov23ligRJgbyFkekfd1A'

/** 请求的授权范围：仓库全量读写 + Actions 工作流推送 + 身份读取 */
export const GITHUB_OAUTH_SCOPE = 'repo workflow read:user'

/** slow_down 响应要求后续轮询间隔增加的秒数（RFC 8628 §3.5） */
const SLOW_DOWN_DELTA_MS = 5000

export interface DeviceFlowDeps {
  fetch: typeof globalThis.fetch
  /** 轮询间隔等待；默认 setTimeout（测试注入即时/假定时器） */
  delay?: (ms: number) => Promise<void>
  /** 拿到 access_token 后的落盘动作（真实装配为 safeStorage 存储） */
  onToken: (accessToken: string) => Promise<void>
}

export interface DeviceFlowStartInfo {
  userCode: string
  verificationUri: string
  /** 本流的有效期（epoch ms），超时未授权以 expired 结束 */
  expiresAt: number
}

export type DeviceFlowOutcome =
  | { ok: true; accessToken: string }
  | { ok: false; reason: 'cancelled' | 'expired' | 'denied' | 'error'; message: string }

export interface DeviceFlowRun {
  start: DeviceFlowStartInfo
  /** 流结束即 settle：授权成功 / 用户取消 / 过期 / 拒绝 / 出错 */
  done: Promise<DeviceFlowOutcome>
  cancel(): void
}

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval?: number
}

type TokenPollResponse =
  | { access_token: string; token_type: string }
  | { error: string; error_description?: string; error_uri?: string }

function isTokenSuccess(body: TokenPollResponse): body is { access_token: string; token_type: string } {
  return 'access_token' in body
}

async function requestDeviceCode(deps: DeviceFlowDeps): Promise<DeviceCodeResponse> {
  let res: Response
  try {
    res = await deps.fetch(GITHUB_DEVICE_CODE_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ client_id: GITHUB_OAUTH_CLIENT_ID, scope: GITHUB_OAUTH_SCOPE })
    })
  } catch (err) {
    throw new Error(`无法连接 GitHub（${err instanceof Error ? err.message : String(err)}）`)
  }
  const body = (await res.json().catch(() => null)) as
    | (DeviceCodeResponse & { error_description?: string; message?: string })
    | null
  if (!res.ok || !body?.device_code) {
    const detail =
      body?.error_description ?? body?.message ?? `HTTP ${res.status}`
    throw new Error(`发起设备授权失败：${detail}`)
  }
  return body
}

/** 模块级当前流：重复 begin 先取消旧流，保证同一时刻至多一个待授权流程 */
let current: { cancel(): void } | null = null

export async function beginDeviceFlow(deps: DeviceFlowDeps): Promise<DeviceFlowRun> {
  current?.cancel()

  const info = await requestDeviceCode(deps)
  const intervalMs = Math.max(1, (info.interval ?? 5) * 1000)
  const deadline = Date.now() + info.expires_in * 1000

  let cancelled = false
  let breakSleep: (() => void) | null = null
  let resolveDone: (o: DeviceFlowOutcome) => void = () => {}
  const done = new Promise<DeviceFlowOutcome>((resolve) => {
    resolveDone = resolve
  })

  const run: DeviceFlowRun = {
    start: {
      userCode: info.user_code,
      verificationUri: info.verification_uri,
      expiresAt: deadline
    },
    done,
    cancel(): void {
      cancelled = true
      breakSleep?.()
    }
  }
  current = run

  const sleep = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
      const timer = (deps.delay ?? ((wait: number) => new Promise<void>((r) => setTimeout(r, wait))))(ms)
      void timer.then(() => {
        if (!cancelled) resolve()
      })
      breakSleep = () => resolve()
    })

  const finish = (outcome: DeviceFlowOutcome): void => {
    if (current === run) current = null
    resolveDone(outcome)
  }

  void (async (): Promise<void> => {
    let wait = intervalMs
    while (true) {
      // 取消可能落在 sleep 之外（如轮询请求进行中）：进入等待前先检查，breakSleep 此时已失效
      if (cancelled) {
        finish({ ok: false, reason: 'cancelled', message: '已取消' })
        return
      }
      await sleep(wait)
      if (cancelled) {
        finish({ ok: false, reason: 'cancelled', message: '已取消' })
        return
      }
      if (Date.now() > deadline) {
        finish({ ok: false, reason: 'expired', message: '授权码已过期' })
        return
      }

      let body: TokenPollResponse | null
      try {
        const res = await deps.fetch(GITHUB_TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: GITHUB_OAUTH_CLIENT_ID,
            device_code: info.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        })
        body = (await res.json().catch(() => null)) as TokenPollResponse | null
      } catch {
        // 网络瞬断：未过有效期前继续轮询
        continue
      }

      if (body && isTokenSuccess(body)) {
        try {
          await deps.onToken(body.access_token)
          finish({ ok: true, accessToken: body.access_token })
        } catch (err) {
          finish({
            ok: false,
            reason: 'error',
            message: `Token 保存失败：${err instanceof Error ? err.message : String(err)}`
          })
        }
        return
      }

      switch (body && 'error' in body ? body.error : '') {
        case 'authorization_pending':
          break
        case 'slow_down':
          wait += SLOW_DOWN_DELTA_MS
          break
        case 'expired_token':
          finish({ ok: false, reason: 'expired', message: '授权码已过期' })
          return
        case 'access_denied':
          finish({ ok: false, reason: 'denied', message: '你取消了授权' })
          return
        default: {
          const detail =
            body && 'error_description' in body && body.error_description
              ? body.error_description
              : (body && 'error' in body ? body.error : '未知错误')
          finish({ ok: false, reason: 'error', message: `授权失败：${detail}` })
          return
        }
      }
    }
  })()

  return run
}
