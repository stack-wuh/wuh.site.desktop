import { describe, expect, it } from 'vitest'
import {
  assetsDirNameFor,
  planImageSave,
  sanitizeImageName
} from '@shared/imagePlan'

describe('assetsDirNameFor', () => {
  it('与文档同名 + .assets 后缀（blog 约定）', () => {
    expect(assetsDirNameFor('docs/2024/2024-11/我的文章.md')).toBe('我的文章.assets')
    expect(assetsDirNameFor('$pnpm/如何使用pnpm.md')).toBe('如何使用pnpm.assets')
  })
})

describe('sanitizeImageName', () => {
  it('空白替换为连字符，保留中文与扩展名', () => {
    expect(sanitizeImageName('my image 中文 名.png')).toBe('my-image-中文名.png')
  })
  it('缺失扩展名时默认 png', () => {
    expect(sanitizeImageName('screenshot')).toBe('screenshot.png')
  })
})

describe('planImageSave', () => {
  it('生成图片目录、文件名与相对引用', () => {
    const plan = planImageSave({
      docRelPath: 'docs/2024/2024-11/docker.md',
      originalName: 'mongo shell.png',
      existingNames: [],
      now: new Date('2026-09-13T08:09:07')
    })
    expect(plan.assetsDirName).toBe('docker.assets')
    expect(plan.fileName).toBe('mongo-shell-20260913-080907.png')
    expect(plan.markdownRef).toBe('docker.assets/mongo-shell-20260913-080907.png')
  })

  it('同名冲突时追加序号', () => {
    const plan = planImageSave({
      docRelPath: 'a.md',
      originalName: 'x.png',
      existingNames: ['x-20260913-080907.png'],
      now: new Date('2026-09-13T08:09:07')
    })
    expect(plan.fileName).toBe('x-20260913-080907-2.png')
  })
})
