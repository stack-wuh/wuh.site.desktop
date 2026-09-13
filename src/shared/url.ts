/** 渲染层不可用 node:path，这里提供纯 POSIX 相对路径解析 */

export function isExternalRef(ref: string): boolean {
  return /^(https?|data|file|local-resource):|^\/\/|^[/#]/.test(ref)
}

export function resolvePosix(baseDir: string, ref: string): string {
  const out: string[] = baseDir ? baseDir.split('/').filter(Boolean) : []
  for (const seg of ref.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') out.pop()
    else out.push(seg)
  }
  return out.join('/')
}

/** 把文档内相对图片引用解析为 local-resource:// 绝对地址（主进程注册的安全协议），供预览显示 */
export function toFileUrl(root: string, docDir: string, ref: string): string {
  const abs = resolvePosix(docDir, ref)
  return `local-resource://${encodeURI(`${root}/${abs}`)}`
}
