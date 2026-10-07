import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  buildObjectKey,
  contentTypeFor,
  renderPrefixTemplate,
  resolvePublicUrl,
  sanitizePrefix,
  validateOssConfig,
  type OssConfig
} from '../src/main/oss'
import {
  filterAllowedPaths,
  isAllowedPickedPath,
  rememberPickedPaths,
  resetPickedPaths
} from '../src/main/pickers'
import { pickUploadRoute, uploadImagesCore, type UploadImagesDeps } from '../src/main/uploader'
import { composePasteResult } from '../src/main/images'
import type { UploadMode, UploadResult } from '../src/shared/types'

/**
 * 图床上传链（20261007-feature-image-host-plugin）纯逻辑与编排：
 * - OSS key 生成（前缀模板 {yyyy}/{MM}/{dd} + UTC 时间戳 + 内容 hash8 防冲突）
 * - 外链解析（自定义域名 / bucket+endpoint 拼接）与配置校验
 * - picker 路径白名单（uploadImages 只接受本会话 picker 登记的路径，防插件夹带任意路径外传）
 * - uploadImages 编排（按 uploadMode 路由 oss|command，多文件按序聚合）
 * electron 相关（dialog/clipboard/safeStorage/ali-oss 传输）均不入本文件——
 * 传输侧经依赖注入替换，见各模块的 configure* 入口。
 */

describe('renderPrefixTemplate（前缀模板渲染）', () => {
  const now = new Date('2026-10-07T08:09:10Z')
  it('替换 {yyyy} {MM} {dd}（UTC 口径，保证确定性）', () => {
    expect(renderPrefixTemplate('blog/{yyyy}/{MM}/{dd}', now)).toBe('blog/2026/10/07')
  })
  it('无占位符原样返回', () => {
    expect(renderPrefixTemplate('static', now)).toBe('static')
  })
})

describe('sanitizePrefix（前缀清洗）', () => {
  it('去首尾斜杠、压缩连续斜杠、去空白', () => {
    expect(sanitizePrefix('/blog//2026/')).toBe('blog/2026')
    expect(sanitizePrefix(' a b ')).toBe('a b')
  })
  it('清洗后为空返回空串（桶根）', () => {
    expect(sanitizePrefix('///')).toBe('')
    expect(sanitizePrefix('')).toBe('')
  })
})

describe('buildObjectKey（key 生成）', () => {
  const content = Buffer.from('hello image')
  const now = new Date('2026-03-05T06:07:08Z')

  it('格式 = [前缀/]yyyyMMdd-HHmmss-hash8.ext（UTC 时间戳 + 内容 hash 前 8 位）', () => {
    const key = buildObjectKey({ originalName: '截图 2026.png', content, now })
    expect(key).toMatch(/^\d{8}-\d{6}-[0-9a-f]{8}\.png$/)
    // hash 稳定性：同内容同 hash
    const again = buildObjectKey({ originalName: '别的名字.png', content, now })
    expect(again.slice(-13)).toBe(key.slice(-13))
  })

  it('前缀模板按当前时间渲染', () => {
    const key = buildObjectKey({
      originalName: 'a.jpg',
      content,
      now,
      prefixTemplate: '{yyyy}/{MM}'
    })
    expect(key).toMatch(/^2026\/03\/\d{8}-\d{6}-[0-9a-f]{8}\.jpg$/)
  })

  it('显式 prefix 优先于模板（面板覆盖场景）', () => {
    const key = buildObjectKey({
      originalName: 'a.jpg',
      content,
      now,
      prefixTemplate: 'tpl',
      prefix: '/inbox//x/'
    })
    expect(key).toMatch(/^inbox\/x\/\d{8}-\d{6}-[0-9a-f]{8}\.jpg$/)
  })

  it('扩展名小写化、缺扩展名回退 bin、超长/非法扩展名回退 bin', () => {
    expect(buildObjectKey({ originalName: 'A.PNG', content, now }).endsWith('.png')).toBe(true)
    expect(buildObjectKey({ originalName: 'noext', content, now }).endsWith('.bin')).toBe(true)
    expect(buildObjectKey({ originalName: 'a.工具', content, now }).endsWith('.bin')).toBe(true)
  })
})

describe('resolvePublicUrl（外链解析）', () => {
  const base: OssConfig = {
    endpoint: 'oss-cn-hangzhou.aliyuncs.com',
    bucket: 'my-blog',
    customDomain: null,
    prefixTemplate: null
  }
  it('无自定义域名：https://{bucket}.{endpoint}/{key}', () => {
    expect(resolvePublicUrl(base, 'a/b.png')).toBe('https://my-blog.oss-cn-hangzhou.aliyuncs.com/a/b.png')
  })
  it('endpoint 已带 bucket 前缀或协议时不重复拼接', () => {
    expect(
      resolvePublicUrl({ ...base, endpoint: 'https://my-blog.oss-cn-hangzhou.aliyuncs.com' }, 'a.png')
    ).toBe('https://my-blog.oss-cn-hangzhou.aliyuncs.com/a.png')
  })
  it('自定义域名优先；补 https、去尾斜杠', () => {
    expect(resolvePublicUrl({ ...base, customDomain: 'cdn.example.com' }, 'a.png')).toBe(
      'https://cdn.example.com/a.png'
    )
    expect(resolvePublicUrl({ ...base, customDomain: 'https://cdn.example.com/' }, 'a.png')).toBe(
      'https://cdn.example.com/a.png'
    )
  })
})

describe('validateOssConfig（配置校验）', () => {
  it('缺 bucket / 缺或非法 endpoint 给出错误；完整配置通过', () => {
    expect(validateOssConfig({ ...({ endpoint: '', bucket: '' } as OssConfig) })).toMatch(/bucket/)
    expect(
      validateOssConfig({ endpoint: 'not a host', bucket: 'b', customDomain: null, prefixTemplate: null })
    ).toMatch(/endpoint/)
    expect(
      validateOssConfig({ endpoint: 'oss-cn-hangzhou.aliyuncs.com', bucket: 'b', customDomain: null, prefixTemplate: null })
    ).toBeNull()
  })
})

describe('contentTypeFor（扩展名 → MIME）', () => {
  it('覆盖常见图片格式，未知回退 octet-stream', () => {
    expect(contentTypeFor('a.png')).toBe('image/png')
    expect(contentTypeFor('b.JPG')).toBe('image/jpeg')
    expect(contentTypeFor('c.webp')).toBe('image/webp')
    expect(contentTypeFor('d.svg')).toBe('image/svg+xml')
    expect(contentTypeFor('e.txt')).toBe('application/octet-stream')
  })
})

describe('picker 路径白名单（登记 / 校验 / 重置）', () => {
  beforeEach(() => resetPickedPaths())
  afterEach(() => resetPickedPaths())

  it('登记的文件精确匹配；登记的目录放行其内路径、拒绝外部路径', () => {
    rememberPickedPaths(['/tmp/pics/a.png', '/tmp/dir'])
    expect(isAllowedPickedPath('/tmp/pics/a.png')).toBe(true)
    expect(isAllowedPickedPath('/tmp/dir/sub/b.png')).toBe(true)
    expect(isAllowedPickedPath('/tmp/pics/a.PNG')).toBe(false)
    expect(isAllowedPickedPath('/etc/passwd')).toBe(false)
    expect(isAllowedPickedPath('/tmp/pic')).toBe(false) // 前缀相近但非目录内
  })

  it('filterAllowedPaths 拆分允许/拒绝两组', () => {
    rememberPickedPaths(['/tmp/dir'])
    const { allowed, denied } = filterAllowedPaths(['/tmp/dir/a.png', '/tmp/other.png'])
    expect(allowed).toEqual(['/tmp/dir/a.png'])
    expect(denied).toEqual(['/tmp/other.png'])
  })

  it('路径按 resolve 归一化后比较', () => {
    rememberPickedPaths(['/tmp/x/../pics'])
    expect(isAllowedPickedPath('/tmp/pics/a.png')).toBe(true)
  })
})

describe('pickUploadRoute（上传模式路由）', () => {
  it('local 返回 null（未启用图床），oss/command 原样返回', () => {
    expect(pickUploadRoute('local')).toBeNull()
    expect(pickUploadRoute('oss')).toBe('oss')
    expect(pickUploadRoute('command')).toBe('command')
  })
})

describe('composePasteResult（粘贴结果组装）', () => {
  const local = { relPath: 'docs/a.assets/img.png', markdownRef: './a.assets/img.png' }

  it('本地模式（upload=null）：保持本地引用，无 uploaded 标记（现状契约）', () => {
    expect(composePasteResult(local, null)).toEqual({ ...local })
  })

  it('上传成功：markdownRef 换远程 URL，uploaded=true，本地 relPath 保留（.assets 契约不变）', () => {
    const result = composePasteResult(local, { ok: true, url: 'https://cdn.example.com/x.png' })
    expect(result).toEqual({
      relPath: local.relPath,
      markdownRef: 'https://cdn.example.com/x.png',
      uploaded: true
    })
  })

  it('上传失败：保持本地引用 + uploaded=false（渲染层据此提示回退）', () => {
    const result = composePasteResult(local, { ok: false, error: 'boom' })
    expect(result).toEqual({ ...local, uploaded: false })
  })
})

describe('uploadImagesCore（批量上传编排）', () => {
  const okResult = (url: string): UploadResult => ({ ok: true, url })

  function makeDeps(over: Partial<UploadImagesDeps> = {}): UploadImagesDeps & {
    ossCalls: string[]
    cmdCalls: string[]
  } {
    const ossCalls: string[] = []
    const cmdCalls: string[] = []
    return {
      ossCalls,
      cmdCalls,
      getMode: async (): Promise<UploadMode> => 'oss',
      isAllowed: () => true,
      ossUpload: async (p: string) => {
        ossCalls.push(p)
        return okResult(`https://cdn.example.com/${p}`)
      },
      commandUpload: async (p: string) => {
        cmdCalls.push(p)
        return okResult(`https://cmd.example.com/${p}`)
      },
      ...over
    }
  }

  it('oss 模式：逐文件调 ossUpload 并保序聚合', async () => {
    const deps = makeDeps()
    const results = await uploadImagesCore(['/a.png', '/b.png'], { prefix: 'blog' }, deps)
    expect(deps.ossCalls).toEqual(['/a.png', '/b.png'])
    expect(deps.cmdCalls).toEqual([])
    expect(results).toEqual([
      { ok: true, url: 'https://cdn.example.com//a.png' },
      { ok: true, url: 'https://cdn.example.com//b.png' }
    ])
  })

  it('command 模式：走命令适配器', async () => {
    const deps = makeDeps({ getMode: async () => 'command' })
    const results = await uploadImagesCore(['/a.png'], undefined, deps)
    expect(deps.cmdCalls).toEqual(['/a.png'])
    expect(deps.ossCalls).toEqual([])
    expect(results[0].ok).toBe(true)
  })

  it('local 模式：每文件给出未启用错误，不调任何上传', async () => {
    const deps = makeDeps({ getMode: async () => 'local' })
    const results = await uploadImagesCore(['/a.png'], undefined, deps)
    expect(results[0].ok).toBe(false)
    expect(results[0].error).toMatch(/未启用/)
    expect(deps.ossCalls).toEqual([])
  })

  it('白名单外路径：给出拒绝错误且不调上传', async () => {
    let ossCalled = false
    const deps = makeDeps({
      isAllowed: (p: string) => p === '/allowed.png',
      ossUpload: async (p: string) => {
        ossCalled = true
        return okResult(p)
      }
    })
    const results = await uploadImagesCore(['/allowed.png', '/etc/passwd'], undefined, deps)
    expect(results[0].ok).toBe(true)
    expect(results[1].ok).toBe(false)
    expect(results[1].error).toMatch(/授权|选择器/)
    expect(ossCalled).toBe(true) // 仅白名单内文件被上传
  })

  it('单文件上传失败不阻断后续文件', async () => {
    const deps = makeDeps({
      ossUpload: async (p: string) => (p === '/a.png' ? { ok: false, error: 'boom' } : okResult('u'))
    })
    const results = await uploadImagesCore(['/a.png', '/b.png'], undefined, deps)
    expect(results[0]).toEqual({ ok: false, error: 'boom' })
    expect(results[1].ok).toBe(true)
  })
})
