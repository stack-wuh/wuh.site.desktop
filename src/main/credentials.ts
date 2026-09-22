import { app, safeStorage } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import type { AppSettings, SettingsStatus, TokenKind } from '@shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  autoCommit: false,
  autoCommitDelayMs: 2000,
  uploadCommand: null,
  gitUserName: null,
  gitUserEmail: null,
  siteBaseUrl: null,
  siteRepo: null
}

let cache: AppSettings | null = null

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function tokenFile(): string {
  return path.join(app.getPath('userData'), 'gh-token.bin')
}

export async function loadSettings(): Promise<AppSettings> {
  if (cache) return cache
  try {
    const raw = await fsp.readFile(settingsFile(), 'utf-8')
    cache = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    cache = { ...DEFAULT_SETTINGS }
  }
  return cache
}

async function saveSettings(next: AppSettings): Promise<void> {
  cache = next
  await fsp.mkdir(path.dirname(settingsFile()), { recursive: true })
  await fsp.writeFile(settingsFile(), JSON.stringify(next, null, 2), 'utf-8')
}

interface StoredToken {
  kind: TokenKind
  token: string
}

/** 读凭证槽位：密文为 JSON {kind, token}；旧版裸 token 密文兼容为 pat */
async function readStored(): Promise<StoredToken | null> {
  try {
    const bin = await fsp.readFile(tokenFile())
    if (!safeStorage.isEncryptionAvailable()) return null
    const plain = safeStorage.decryptString(bin)
    try {
      const parsed = JSON.parse(plain) as Partial<StoredToken>
      if (typeof parsed.token === 'string' && (parsed.kind === 'oauth' || parsed.kind === 'pat')) {
        return { kind: parsed.kind, token: parsed.token }
      }
    } catch {
      // 旧格式：整串即 token
    }
    return { kind: 'pat', token: plain }
  } catch {
    return null
  }
}

export async function getToken(): Promise<string | null> {
  return (await readStored())?.token ?? null
}

/** 凭证及来源（oauth = Device Flow 授权，pat = 手动粘贴） */
export async function getTokenInfo(): Promise<StoredToken | null> {
  return readStored()
}

export async function setToken(token: string, kind: TokenKind = 'pat'): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统级加密不可用，无法安全存储 Token')
  }
  const bin = safeStorage.encryptString(JSON.stringify({ kind, token: token.trim() }))
  await fsp.mkdir(path.dirname(tokenFile()), { recursive: true })
  await fsp.writeFile(tokenFile(), bin)
}

export async function clearToken(): Promise<void> {
  await fsp.rm(tokenFile(), { force: true })
}

async function status(): Promise<SettingsStatus> {
  const [settings, info] = await Promise.all([loadSettings(), readStored()])
  return { hasToken: Boolean(info), tokenKind: info?.kind ?? null, settings }
}

implement('getSettings', async (): Promise<SettingsStatus> => status())

implement('setSettings', async ([patch]): Promise<SettingsStatus> => {
  const settings = { ...(await loadSettings()), ...patch }
  await saveSettings(settings)
  return status()
})

implement('setGithubToken', async ([token]) => {
  await setToken(token, 'pat')
})

implement('clearGithubToken', async () => {
  await clearToken()
})
