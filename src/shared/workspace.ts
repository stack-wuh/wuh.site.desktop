/**
 * Git clone URL 解析与规范化（shared 纯函数）：
 * 渲染层表单即时反馈与主进程 clone 执行共用同一份解析。
 * v1 仅接受 https 形态（git@ scp 形态自动转 https），私有仓库凭据后续单独变更。
 */
export interface ParsedCloneUrl {
  /** 规范化的 https clone 地址（补 .git 后缀） */
  httpsUrl: string
  /** 默认目录名：路径末段去 .git */
  repoName: string
  /** 去掉 .git 的完整路径段（github 形态即 owner/repo，gitlab 多级子组全保留） */
  ownerRepo: string
}

const GIT_SSH_RE = /^git@([^:\s]+):(.+?)(?:\.git)?\/?$/
const HTTPS_RE = /^https:\/\/([^/\s]+)\/(.+?)(?:\.git)?\/?$/

function repoNameOf(pathSeg: string): string {
  const last = pathSeg.split('/').pop() ?? pathSeg
  return last.replace(/\.git$/, '')
}

export function parseGitCloneUrl(input: string): ParsedCloneUrl | null {
  const raw = input.trim()
  if (!raw) return null

  const ssh = GIT_SSH_RE.exec(raw)
  if (ssh) {
    const [, host, pathSeg] = ssh
    return { httpsUrl: `https://${host}/${pathSeg}.git`, repoName: repoNameOf(pathSeg), ownerRepo: pathSeg }
  }

  const https = HTTPS_RE.exec(raw)
  if (https) {
    const [, host, pathSeg] = https
    if (pathSeg.includes(' ')) return null
    return { httpsUrl: `https://${host}/${pathSeg}.git`, repoName: repoNameOf(pathSeg), ownerRepo: pathSeg }
  }

  return null
}
