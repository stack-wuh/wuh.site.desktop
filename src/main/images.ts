import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import { loadSettings } from './credentials'
import { requireRoot, safeJoin } from './workspace'
import { assetsDirNameFor, planImageSave } from '@shared/imagePlan'
import { pickUploadRoute, uploadViaCommand } from './uploader'
import { uploadToOssFile } from './oss'
import { isAllowedPickedPath } from './pickers'
import type { SavedImage, UploadResult } from '@shared/types'

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

/**
 * 粘贴/导入结果组装（20261008-feature-image-upload-choice 双链回传契约）：
 * 本地 .assets 落盘是契约基座（editor 卡：`<stem>.assets` + 相对引用），markdownRef
 * 恒为本地引用——上传成功只回传 remoteUrl，「远程 vs 本地」的决定权在用户
 * （渲染层 Message 横幅选择后才替换正文）；失败带 uploaded=false 供提示；
 * 本地模式不带标记（现状不变）。
 */
export function composePasteResult(
  local: { relPath: string; markdownRef: string },
  upload: UploadResult | null
): SavedImage {
  if (upload && upload.ok && upload.url) {
    return { ...local, remoteUrl: upload.url, uploaded: true }
  }
  if (upload && !upload.ok) {
    return { ...local, uploaded: false }
  }
  return { ...local }
}

/**
 * `.assets` 归属守卫（纯逻辑）：refRelPath 必须落在文档同名 `<stem>.assets/` 目录内。
 * 是 uploadExistingAsset 的安全钳制——不依赖 picker 白名单，路径派生即边界。
 */
export function isAssetsRefOfDoc(docRelPath: string, refRelPath: string): boolean {
  const dir = docRelPath.includes('/') ? docRelPath.slice(0, docRelPath.lastIndexOf('/') + 1) : ''
  const assetsPrefix = `${dir}${assetsDirNameFor(docRelPath)}/`
  return refRelPath.startsWith(assetsPrefix) && refRelPath.length > assetsPrefix.length
}

const NOT_ENABLED_ERROR = '未启用图床上传（设置 → 图床，选择 OSS 或上传命令模式）'

/** 上传路由（粘贴与导入共用一条链）：按 uploadMode → oss/command；local 返回 null */
async function routeUpload(absPath: string): Promise<UploadResult | null> {
  const settings = await loadSettings()
  const route = pickUploadRoute(settings.uploadMode ?? 'local')
  if (route === 'oss') return uploadToOssFile(absPath)
  if (route === 'command') return uploadViaCommand(absPath)
  return null
}

/** 落盘+上传共用体：把字节写入文档同名 .assets（重名经 planImageSave 避让），再按路由上传 */
async function saveImageBytesToAssets(
  docRelPath: string,
  originalName: string,
  write: (fileAbs: string) => Promise<void>
): Promise<SavedImage> {
  const root = requireRoot()
  const docAbs = safeJoin(root, docRelPath)
  const docDir = path.dirname(docAbs)
  const assetsDirAbs = path.join(docDir, assetsDirNameFor(docRelPath))
  await fsp.mkdir(assetsDirAbs, { recursive: true })

  let existingNames: string[] = []
  try {
    existingNames = await fsp.readdir(assetsDirAbs)
  } catch {
    existingNames = []
  }

  const plan = planImageSave({ docRelPath, originalName, existingNames })
  const fileAbs = path.join(assetsDirAbs, plan.fileName)
  await write(fileAbs)

  const local = {
    relPath: toPosix(path.relative(root, fileAbs)),
    markdownRef: plan.markdownRef
  }
  return composePasteResult(local, await routeUpload(fileAbs))
}

/** 粘贴/拖拽图片落盘：写入文档同目录的同名 .assets 文件夹；图床模式在落盘后上传 */
implement(
  'savePastedImage',
  async ([docRelPath, originalName, base64]): Promise<SavedImage> =>
    saveImageBytesToAssets(docRelPath, originalName, (fileAbs) =>
      fsp.writeFile(fileAbs, Buffer.from(base64, 'base64'))
    )
)

/**
 * 导入本会话 picker 白名单内的图片文件：复制进文档同名 .assets 后按路由上传（与粘贴同形）。
 * 白名单是插件与宿主共享的安全边界（pickers.ts 登记表）——本会话未经选择的绝对路径一律拒绝。
 */
implement(
  'saveImageFromPickedPath',
  async ([docRelPath, srcAbsPath]): Promise<SavedImage> => {
    if (!isAllowedPickedPath(srcAbsPath)) {
      throw new Error('路径未经本会话文件选择器授权')
    }
    return saveImageBytesToAssets(docRelPath, path.basename(srcAbsPath), (fileAbs) =>
      fsp.copyFile(srcAbsPath, fileAbs)
    )
  }
)

/**
 * 上传已落盘的文档资产图片（正文已是本地链接、想换远程链接的反向场景）：
 * ref 必须位于当前文档同名 `.assets/` 内（isAssetsRefOfDoc 守卫 + safeJoin 兜底），
 * 复用 routeUpload 单一链路；local 模式返回未启用错误。
 */
implement(
  'uploadExistingAsset',
  async ([docRelPath, refRelPath]): Promise<UploadResult> => {
    if (!isAssetsRefOfDoc(docRelPath, refRelPath)) {
      throw new Error('引用不在当前文档的 .assets 目录内，拒绝上传')
    }
    const root = requireRoot()
    const fileAbs = safeJoin(root, refRelPath)
    const upload = await routeUpload(fileAbs)
    if (!upload) return { ok: false, error: NOT_ENABLED_ERROR }
    return upload
  }
)
