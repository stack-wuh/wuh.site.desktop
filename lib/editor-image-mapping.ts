/**
 * 图片链接会话映射表（20261008-feature-image-upload-choice）——
 * 正文远程↔本地链接反切的唯一事实源：图片上传成功时登记「本文档本地引用 ↔ 远程 URL ↔
 * 落盘 relPath」三元组，Message 横幅选择与菜单「切换图片链接形态」都只查本表。
 * 纯内存进程内状态（非目标：跨会话持久化——映射丢失时切换路径提示
 * 「本地文件仍在 .assets」，不做 URL→文件的启发式匹配）。
 * 键含 docRelPath 作用域：不同文档的同名相对引用（`./post.assets/a.png`）互不串台。
 */
import { findImageOnLine } from './editor-cm'
export interface ImageLinkEntry {
  /** 文档相对工作区根的路径（映射作用域） */
  docRelPath: string
  /** 正文中的本地相对引用，如 ./post.assets/a.png */
  localRef: string
  /** 图片相对工作区根的真实路径（uploadExistingAsset 的 refRelPath 入参） */
  relPath: string
  /** 图床远程链接 */
  remoteUrl: string
}

const byLocal = new Map<string, ImageLinkEntry>()
const byRemote = new Map<string, ImageLinkEntry>()

function localKey(docRelPath: string, localRef: string): string {
  return `${docRelPath}::${localRef}`
}

export function rememberImageLink(entry: ImageLinkEntry): void {
  byLocal.set(localKey(entry.docRelPath, entry.localRef), entry)
  byRemote.set(entry.remoteUrl, entry)
}

/** 本地引用 → 上传记录（本地切远程时先查此，命中免重复上传） */
export function remoteForLocalRef(docRelPath: string, localRef: string): ImageLinkEntry | null {
  return byLocal.get(localKey(docRelPath, localRef)) ?? null
}

/** 远程 URL → 原记录（远程切回本地用其 localRef；URL 全局唯一不再加文档作用域） */
export function entryForRemote(remoteUrl: string): ImageLinkEntry | null {
  return byRemote.get(remoteUrl) ?? null
}

/**
 * 正文本地引用（相对文档）→ 工作区相对路径：`./x.assets/a.png` + `docs/post.md`
 * → `docs/post.assets/x…/a.png`。非本地形态（含协议前缀）或含 `..` 上跳一律 null
 * （调用方拒绝，不给路径逃逸留口子）。
 */
export function resolveRefRelPath(docRelPath: string, ref: string): string | null {
  if (!ref || /^[a-z][a-z0-9+.-]*:\/\//i.test(ref)) return null
  let rel = ref
  if (rel.startsWith('./')) rel = rel.slice(2)
  if (rel.split('/').includes('..')) return null
  const dir = docRelPath.includes('/') ? docRelPath.slice(0, docRelPath.lastIndexOf('/') + 1) : ''
  return `${dir}${rel}`
}

/**
 * 菜单「切换图片链接形态」可用性（纯逻辑）：光标行有本地图片恒可切（无映射时经
 * uploadExistingAsset 重传）；远程图片必须有会话映射才能切回本地，否则无从得知
 * 对应的 `.assets` 引用。
 */
export function imageSwitchAvailable(content: string, cursorLine: number): boolean {
  const line = content.split(/\r?\n/)[cursorLine]
  if (!line) return false
  const img = findImageOnLine(line)
  if (!img) return false
  if (/^https?:\/\//i.test(img.ref)) return entryForRemote(img.ref) !== null
  return true
}

export function resetImageLinksForTests(): void {
  byLocal.clear()
  byRemote.clear()
}
