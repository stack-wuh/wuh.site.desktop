import { app, safeStorage } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import { configureOssStore, toOssConfig } from './oss'
import type { AppSettings, SettingsStatus, TokenKind } from '@shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  autoCommit: false,
  autoCommitDelayMs: 2000,
  uploadCommand: null,
  gitUserName: null,
  gitUserEmail: null,
  siteBaseUrl: null,
  siteRepo: null,
  uploadMode: 'local',
  oss: null
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

// ---------- OSS AccessKey（独立加密文件；值不出主进程） ----------

export interface OssCredentials {
  accessKeyId: string
  accessKeySecret: string
}

function ossCredentialsFile(): string {
  return path.join(app.getPath('userData'), 'oss-credentials.bin')
}

/** 读 OSS 凭证：safeStorage 解密 JSON；不可用/未配置返回 null */
export async function readOssCredentials(): Promise<OssCredentials | null> {
  try {
    const bin = await fsp.readFile(ossCredentialsFile())
    if (!safeStorage.isEncryptionAvailable()) return null
    const parsed = JSON.parse(safeStorage.decryptString(bin)) as Partial<OssCredentials>
    if (typeof parsed.accessKeyId === 'string' && typeof parsed.accessKeySecret === 'string') {
      return { accessKeyId: parsed.accessKeyId, accessKeySecret: parsed.accessKeySecret }
    }
    return null
  } catch {
    return null
  }
}

export async function setOssCredentials(accessKeyId: string, accessKeySecret: string): Promise<void> {
  const id = accessKeyId.trim()
  const secret = accessKeySecret.trim()
  if (!id || !secret) {
    throw new Error('AccessKey ID 与 Secret 均不能为空')
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统级加密不可用，无法安全存储 AccessKey')
  }
  const bin = safeStorage.encryptString(JSON.stringify({ accessKeyId: id, accessKeySecret: secret }))
  await fsp.mkdir(path.dirname(ossCredentialsFile()), { recursive: true })
  await fsp.writeFile(ossCredentialsFile(), bin)
}

export async function clearOssCredentials(): Promise<void> {
  await fsp.rm(ossCredentialsFile(), { force: true })
}

async function status(): Promise<SettingsStatus> {
  const [settings, info, ossCreds] = await Promise.all([loadSettings(), readStored(), readOssCredentials()])
  return { hasToken: Boolean(info), tokenKind: info?.kind ?? null, hasOssCredentials: Boolean(ossCreds), settings }
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

implement('setOssCredentials', async ([id, secret]) => {
  await setOssCredentials(String(id ?? ''), String(secret ?? ''))
})

implement('clearOssCredentials', async () => {
  await clearOssCredentials()
})

// OSS 传输装配：配置取 settings.oss，凭证取加密存储；两者齐备才可上传
configureOssStore(async () => {
  const settings = await loadSettings()
  const config = toOssConfig(settings.oss)
  const credentials = await readOssCredentials()
  if (!config || !credentials) return null
  return { config, credentials }
})
