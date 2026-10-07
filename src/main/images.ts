import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import { loadSettings } from './credentials'
import { requireRoot, safeJoin } from './workspace'
import { assetsDirNameFor, planImageSave } from '@shared/imagePlan'
import { pickUploadRoute, uploadViaCommand } from './uploader'
import { uploadToOssFile } from './oss'
import type { SavedImage, UploadResult } from '@shared/types'

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

/**
 * 粘贴结果组装：本地 .assets 落盘是契约基座（editor 卡：`<stem>.assets` + 相对引用），
 * uploadMode=oss 时尝试上传——成功把 markdownRef 换成远程外链（本地文件保留作缓存/回退），
 * 失败保持本地引用并带 uploaded=false（渲染层据此提示）；本地模式不带标记（现状不变）。
 */
export function composePasteResult(
  local: { relPath: string; markdownRef: string },
  upload: UploadResult | null
): SavedImage {
  if (upload && upload.ok && upload.url) {
    return { relPath: local.relPath, markdownRef: upload.url, uploaded: true }
  }
  if (upload && !upload.ok) {
    return { ...local, uploaded: false }
  }
  return { ...local }
}

/** 粘贴/拖拽图片落盘：写入文档同目录的同名 .assets 文件夹；图床模式在落盘后上传 */
implement(
  'savePastedImage',
  async ([docRelPath, originalName, base64]): Promise<SavedImage> => {
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
    await fsp.writeFile(fileAbs, Buffer.from(base64, 'base64'))

    const local = {
      relPath: toPosix(path.relative(root, fileAbs)),
      markdownRef: plan.markdownRef
    }

    // 上传模式路由：oss → OSS 直传；command 对粘贴语义同样适用（单文件命令上传）；
    // local 或路由不可得 → null（保持现状）
    let upload: UploadResult | null = null
    const settings = await loadSettings()
    const route = pickUploadRoute(settings.uploadMode ?? 'local')
    if (route === 'oss') {
      upload = await uploadToOssFile(fileAbs)
    } else if (route === 'command') {
      upload = await uploadViaCommand(fileAbs)
    }

    return composePasteResult(local, upload)
  }
)
