import { app, safeStorage } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import type { AppSettings, SettingsStatus } from '@shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  autoCommit: false,
  autoCommitDelayMs: 2000,
  uploadCommand: null,
  gitUserName: null,
  gitUserEmail: null
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

export async function getToken(): Promise<string | null> {
  try {
    const bin = await fsp.readFile(tokenFile())
    if (!safeStorage.isEncryptionAvailable()) return null
    return safeStorage.decryptString(bin)
  } catch {
    return null
  }
}

export async function setToken(token: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统级加密不可用，无法安全存储 Token')
  }
  const bin = safeStorage.encryptString(token.trim())
  await fsp.mkdir(path.dirname(tokenFile()), { recursive: true })
  await fsp.writeFile(tokenFile(), bin)
}

export async function clearToken(): Promise<void> {
  await fsp.rm(tokenFile(), { force: true })
}

implement('getSettings', async (): Promise<SettingsStatus> => {
  const settings = await loadSettings()
  const token = await getToken()
  return { hasToken: Boolean(token), settings }
})

implement('setSettings', async ([patch]): Promise<SettingsStatus> => {
  const settings = { ...(await loadSettings()), ...patch }
  await saveSettings(settings)
  const token = await getToken()
  return { hasToken: Boolean(token), settings }
})

implement('setGithubToken', async ([token]) => {
  await setToken(token)
})

implement('clearGithubToken', async () => {
  await clearToken()
})
