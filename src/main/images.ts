import fsp from 'node:fs/promises'
import path from 'node:path'
import { implement } from './ipc'
import { requireRoot, safeJoin } from './workspace'
import { assetsDirNameFor, planImageSave } from '@shared/imagePlan'
import type { SavedImage } from '@shared/types'

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

/** 粘贴/拖拽图片落盘：写入文档同目录的同名 .assets 文件夹 */
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
    await fsp.writeFile(
      path.join(assetsDirAbs, plan.fileName),
      Buffer.from(base64, 'base64')
    )

    return {
      relPath: toPosix(path.relative(root, path.join(assetsDirAbs, plan.fileName))),
      markdownRef: plan.markdownRef
    }
  }
)
