import { BrowserWindow, dialog } from 'electron'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { simpleGit, type SimpleGit } from 'simple-git'
import { implement } from './ipc'
import { recordRecent, readRecent } from './recentWorkspaces'
import type { FileNode, GithubRemote, WorkspaceInfo } from '@shared/types'

const IGNORED_DIRS = new Set([
  '.git',
  '.github',
  '.vitepress',
  '.idea',
  '.vscode',
  'node_modules',
  'out',
  'dist'
])
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.json',
  '.yml',
  '.yaml',
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx'
])
const MAX_NODES = 8000
const MAX_DEPTH = 12

let current: WorkspaceInfo | null = null
let gitClient: SimpleGit | null = null

export function parseGithubRemote(url: string | undefined): GithubRemote | null {
  if (!url) return null
  const m =
    /github\.com[/:]([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(url.trim()) ?? null
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

export async function setWorkspace(root: string): Promise<WorkspaceInfo> {
  const git = simpleGit({ baseDir: root })
  let isGitRepo = false
  let branch: string | null = null
  let ahead = 0
  let behind = 0
  let github: GithubRemote | null = null

  try {
    isGitRepo = await git.checkIsRepo()
  } catch {
    isGitRepo = false
  }

  if (isGitRepo) {
    const st = await git.status()
    branch = st.current ?? null
    ahead = st.ahead ?? 0
    behind = st.behind ?? 0
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
    github = parseGithubRemote(origin?.refs?.fetch ?? origin?.refs?.push)
  }

  current = { root, name: path.basename(root), isGitRepo, branch, ahead, behind, github }
  gitClient = isGitRepo ? git : null
  // 登记最近项目：打开/clone/列表点开三条路都经此收口。登记失败不阻断打开（仅提示性数据）
  await recordRecent({ path: current.root, name: current.name }).catch((err: unknown) => {
    console.error('最近项目登记失败:', err)
  })
  return current
}

export async function openWorkspaceDialog(): Promise<WorkspaceInfo | null> {
  const win = BrowserWindow.getFocusedWindow() ?? undefined
  const res = await dialog.showOpenDialog(win as BrowserWindow, {
    properties: ['openDirectory', 'createDirectory']
  })
  if (res.canceled || res.filePaths.length === 0) return null
  return setWorkspace(res.filePaths[0])
}

export function getWorkspace(): WorkspaceInfo | null {
  return current
}

export function requireRoot(): string {
  if (!current) throw new Error('未打开工作区，请先打开文件夹')
  return current.root
}

export function getGit(): SimpleGit {
  if (!gitClient || !current?.isGitRepo) {
    throw new Error('当前工作区不是 git 仓库')
  }
  return gitClient
}

export function safeJoin(root: string, rel: string): string {
  const abs = path.resolve(root, rel)
  const normRoot = path.resolve(root)
  if (abs !== normRoot && !abs.startsWith(normRoot + path.sep)) {
    throw new Error(`路径越界: ${rel}`)
  }
  return abs
}

async function buildTree(
  absDir: string,
  relDir: string,
  depth: number,
  budget: { count: number }
): Promise<FileNode[]> {
  if (depth > MAX_DEPTH || budget.count > MAX_NODES) return []
  let entries
  try {
    entries = await fsp.readdir(absDir, { withFileTypes: true })
  } catch {
    return []
  }
  const nodes: FileNode[] = []
  for (const e of entries) {
    if (budget.count > MAX_NODES) break
    if (e.name.startsWith('.')) continue
    if (IGNORED_DIRS.has(e.name)) continue
    if (e.name.endsWith('.assets')) continue
    const rel = relDir ? `${relDir}/${e.name}` : e.name
    const abs = path.join(absDir, e.name)
    budget.count++
    if (e.isDirectory()) {
      nodes.push({
        name: e.name,
        path: rel,
        type: 'dir',
        children: await buildTree(abs, rel, depth + 1, budget)
      })
    } else if (e.isFile()) {
      nodes.push({ name: e.name, path: rel, type: 'file' })
    }
  }
  nodes.sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1
  )
  return nodes
}

implement('openWorkspace', () => openWorkspaceDialog())
implement('getWorkspace', async () => getWorkspace())
implement('listRecentWorkspaces', () => readRecent())

implement('openWorkspaceByPath', async ([p]) => {
  const target = String(p ?? '')
  const st = await fsp.stat(target).catch(() => null)
  if (!st?.isDirectory()) throw new Error('项目目录不存在或不可访问')
  return setWorkspace(target)
})

implement('readTree', async () => {
  const root = requireRoot()
  return buildTree(root, '', 0, { count: 0 })
})

implement('readFile', async ([relPath]) => {
  const root = requireRoot()
  const abs = safeJoin(root, relPath)
  const ext = path.extname(abs).toLowerCase()
  if (!TEXT_EXTENSIONS.has(ext)) {
    throw new Error(`不支持的文件类型: ${ext || '(无扩展名)'}`)
  }
  return { path: relPath, content: await fsp.readFile(abs, 'utf-8') }
})

implement('writeFile', async ([relPath, content]) => {
  const root = requireRoot()
  const abs = safeJoin(root, relPath)
  await fsp.mkdir(path.dirname(abs), { recursive: true })
  await fsp.writeFile(abs, content, 'utf-8')
  return { path: relPath, savedAt: Date.now() }
})
