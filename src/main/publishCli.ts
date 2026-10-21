import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { implement } from './ipc'
import { getToken } from './credentials'
import { getWorkspace, safeJoin } from './workspace'
import type { PublishViaCliRequest, PublishViaCliResult } from '@shared/types'

/**
 * CLI 发布桥（20261020-feature-publish-interaction）：把「当前文档 → GitHub Issue」
 * 交给本机 shadow-dev CLI（blog publish plan/execute，v1.8.0+，frontmatter issue
 * 号驱动 create-or-update）。CLI 不可用（未安装/版本缺 blog 能力）返回
 * available:false，由渲染层降级内置 publisher；执行阶段错误 available:true 原样
 * 上抛（不降级，避免同一文档双建 Issue）。token 仅经子进程 env 注入，不落盘、
 * 不进报错（统一脱敏）。子进程用 Electron 自带 Node（ELECTRON_RUN_AS_NODE），
 * 不依赖用户安装 node。
 */
const CLI_ROOT = join(homedir(), '.local', 'share', 'shadow-dev-cli')
const SPAWN_TIMEOUT_MS = 30_000

export interface CliEnvelope {
  ok: boolean
  planHash?: string
  data?: Record<string, unknown>
  error?: { code?: string; message?: string }
}

export interface CliRunOutcome {
  code: number | null
  stdout: string
  stderr: string
  spawnError?: string
}

/** 解析 CLI 入口：只认 CURRENT 指针（尊重用户回滚意图），不扫描其他版本目录 */
export function resolveCliEntry(root: string = CLI_ROOT): string | null {
  try {
    const version = readFileSync(join(root, 'CURRENT'), 'utf8').trim()
    if (!version) return null
    const entry = join(root, `shadow-dev-cli-${version}`, 'cli.mjs')
    return existsSync(entry) ? entry : null
  } catch {
    return null
  }
}

/** plan/execute 参数组装：filePath 保持工作区相对（参与 planHash 重算）；--json 恒在末位 */
export function buildPlanArgs(filePath: string, repository: string | null): string[] {
  const args = ['blog', 'publish', 'plan', '--file', filePath]
  if (repository) args.push('--repository', repository)
  args.push('--json')
  return args
}

export function buildExecuteArgs(filePath: string, repository: string | null, planHash: string): string[] {
  const args = ['blog', 'publish', 'execute', '--file', filePath, '--plan-hash', planHash, '--confirm']
  if (repository) args.push('--repository', repository)
  args.push('--json')
  return args
}

/** stdout 定向 JSON 契约：取最后一个可解析的 JSON 行（stderr 人用层被 SHADOW_DEV_QUIET 关闭） */
export function parseCliOutput(stdout: string): CliEnvelope | null {
  const lines = stdout.trim().split('\n').filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const value = JSON.parse(lines[i]) as unknown
      if (value && typeof value === 'object' && 'ok' in value) return value as CliEnvelope
    } catch {
      // 非 JSON 行跳过
    }
  }
  return null
}

export function redactSecret(text: string, secret: string | null): string {
  if (!secret) return text
  return text.split(secret).join('***')
}

/** 最小环境：只透传运行必需项 + 注入 token；不把宿主全量 env 泄给子进程 */
function cliEnv(token: string | null): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: process.env.LANG,
    ELECTRON_RUN_AS_NODE: '1',
    SHADOW_DEV_QUIET: '1',
    SHADOW_DEV_JSON: '1'
  }
  if (token) env.GITHUB_TOKEN = token
  return env
}

function runProcess(
  entry: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv
): Promise<CliRunOutcome> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [entry, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (outcome: CliRunOutcome): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(outcome)
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish({ code: null, stdout, stderr, spawnError: 'CLI 调用超时' })
    }, SPAWN_TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk)
    })
    child.on('error', (err) => finish({ code: null, stdout, stderr, spawnError: err.message }))
    child.on('close', (code) => finish({ code, stdout, stderr }))
  })
}

/** 能力断言缓存：entry 路径含版本目录，版本切换即失效重探 */
let capability: { entry: string; ok: boolean } | null = null

async function cliSupportsBlog(entry: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  if (capability?.entry === entry) return capability.ok
  const out = await runProcess(entry, ['help', 'blog', '--json'], homedir(), env)
  const envelope = parseCliOutput(out.stdout)
  const ok = !out.spawnError && out.code === 0 && Boolean(envelope?.ok)
  capability = { entry, ok }
  return ok
}

function cliErrorText(envelope: CliEnvelope | null, out: CliRunOutcome, fallback: string): string {
  const message = envelope?.error?.message || envelope?.error?.code
  if (message) return message
  const lastLine = out.stderr
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .pop()
  return lastLine || fallback
}

async function publishViaCli(req: PublishViaCliRequest): Promise<PublishViaCliResult> {
  const ws = getWorkspace()
  if (!ws?.root) return { ok: false, available: true, error: '当前没有工作区' }
  const entry = resolveCliEntry()
  if (!entry) {
    return { ok: false, available: false, error: '未找到 shadow-dev CLI（~/.local/share/shadow-dev-cli/CURRENT）' }
  }
  const token = await getToken().catch(() => null)
  const env = cliEnv(token)
  if (!(await cliSupportsBlog(entry, env))) {
    return { ok: false, available: false, error: '本机 CLI 版本缺少 blog 发布能力（需 v1.8.0+）' }
  }
  let abs: string
  try {
    abs = safeJoin(ws.root, req.filePath)
  } catch {
    return { ok: false, available: true, error: '文档路径越界' }
  }
  if (!existsSync(abs)) return { ok: false, available: true, error: `文件不存在：${req.filePath}` }
  const repository = ws.github ? `${ws.github.owner}/${ws.github.repo}` : null

  const plan = await runProcess(entry, buildPlanArgs(req.filePath, repository), ws.root, env)
  if (plan.spawnError) return { ok: false, available: true, error: redactSecret(plan.spawnError, token) }
  const planEnvelope = parseCliOutput(plan.stdout)
  if (!planEnvelope?.ok || !planEnvelope.planHash) {
    return {
      ok: false,
      available: true,
      error: redactSecret(cliErrorText(planEnvelope, plan, '发布预览失败'), token),
      code: planEnvelope?.error?.code
    }
  }

  const exec = await runProcess(
    entry,
    buildExecuteArgs(req.filePath, repository, planEnvelope.planHash),
    ws.root,
    env
  )
  if (exec.spawnError) return { ok: false, available: true, error: redactSecret(exec.spawnError, token) }
  const execEnvelope = parseCliOutput(exec.stdout)
  if (!execEnvelope?.ok) {
    return {
      ok: false,
      available: true,
      error: redactSecret(cliErrorText(execEnvelope, exec, '发布失败'), token),
      code: execEnvelope?.error?.code
    }
  }
  const data = execEnvelope.data as
    | { issue?: { number?: number; url?: string }; created?: boolean }
    | undefined
  const issueNumber = typeof data?.issue?.number === 'number' ? data.issue.number : undefined
  if (!issueNumber) return { ok: false, available: true, error: 'CLI 返回缺少 issue 号' }
  return { ok: true, available: true, issueNumber, url: data?.issue?.url, created: Boolean(data?.created) }
}

implement('publishViaCli', async ([req]) => publishViaCli(req))
