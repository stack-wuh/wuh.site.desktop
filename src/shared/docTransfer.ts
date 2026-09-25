/**
 * 文档迁移/复制/改名纯逻辑（主进程与渲染层共用，无 node/electron API）。
 * blog 约定（见 imagePlan.ts）：图片落在与文档同目录的同名 `<stem>.assets/` 文件夹，
 * 文档内为相对引用——因此改名必须同步改 assets 目录名并改写引用，迁移时 assets 随迁。
 */
import { assetsDirNameFor } from './imagePlan'

export type TransferMode = 'move' | 'copy'

/** 跨平台文件名非法字符（Windows 保留集）+ 路径分隔符；改名只接受单段 basename */
const ILLEGAL_NAME_CHARS = /[/\\:*?"<>|]/

/** 规范化用户输入的文档名：去空白与引导路径符，仅保留 basename，.md 后缀缺省自动补 */
export function normalizeDocName(raw: string): string {
  const base = raw.trim().replace(/^\/+/, '').replace(/^\.\//, '').split(/[\\/]/).pop() ?? ''
  if (!base.toLowerCase().endsWith('.md')) return `${base}.md`
  return base
}

/** 文档名校验：合法返回 null，否则返回错误原因（调用方负责 i18n 文案） */
export function validateDocName(name: string): string | null {
  if (!name || !name.trim()) return 'empty'
  if (/[\\/]/.test(name)) return 'separator'
  if (ILLEGAL_NAME_CHARS.test(name)) return 'illegal'
  if (name === '.' || name === '..') return 'illegal'
  if (name.endsWith('.assets')) return 'assets'
  return null
}

/** 改名：仅替换 basename（新名按用户输入规范化），目录层级保持 */
export function buildRenamePath(activeRel: string, newName: string): string {
  const segments = activeRel.split('/')
  segments[segments.length - 1] = normalizeDocName(newName)
  return segments.join('/')
}

/**
 * 迁移/复制目标校验（渲染层预检与主进程守卫共用）：
 * 合法返回 null；同路径、目标为/落入 .assets 目录、非 .md 目标、空源均拒绝。
 */
export function validateTransfer(srcRel: string, destRel: string): string | null {
  if (!srcRel || !srcRel.trim()) return 'emptySrc'
  if (srcRel === destRel) return 'samePath'
  if (!destRel.toLowerCase().endsWith('.md')) return 'notMarkdown'
  if (/(^|\/)[^/]+\.assets(\/|$)/i.test(destRel)) return 'assets'
  return null
}

/** 迁移/复制目标路径：dir 为工作区相对目录（'' = 根目录） */
export function transferDestFor(srcRel: string, dir: string): string {
  const base = srcRel.split('/').pop() ?? srcRel
  return dir ? `${dir}/${base}` : base
}

/**
 * 改写文档内的 assets 相对引用（改名场景：目录名含旧文件名必须跟随）。
 * 边界保护：引用名前不得是 [A-Za-z0-9_.-]，避免 `myfoo.assets` 被 `foo.assets` 误伤。
 */
export function rewriteAssetsRefs(content: string, oldDirName: string, newDirName: string): string {
  if (oldDirName === newDirName) return content
  const escaped = oldDirName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.replace(new RegExp(`(^|[^A-Za-z0-9_.-])${escaped}/`, 'g'), `$1${newDirName}/`)
}

export interface DirOption {
  /** 工作区相对目录路径（'' = 根目录） */
  path: string
  /** 展示名（根目录为工作区名） */
  name: string
  /** 树深度（根 = 0） */
  depth: number
}

/** DFS 收集目录树中的目录项（扁平带缩进层级，供文件夹选择器渲染）；根目录以空路径打头。
 *  `.assets` 目录防御性跳过（主进程构树已过滤，手造树也安全）。 */
export function collectDirOptions(tree: import('./types').FileNode[], rootLabel: string): DirOption[] {
  const out: DirOption[] = [{ path: '', name: rootLabel, depth: 0 }]
  const walk = (nodes: import('./types').FileNode[], depth: number): void => {
    for (const node of nodes) {
      if (node.type !== 'dir' || node.name.endsWith('.assets')) continue
      out.push({ path: node.path, name: node.name, depth })
      if (node.children) walk(node.children, depth + 1)
    }
  }
  walk(tree, 0)
  return out
}
