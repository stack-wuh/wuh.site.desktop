import { describe, expect, it } from 'vitest'
import { parseGitCloneUrl } from '../src/shared/workspace'

describe('parseGitCloneUrl', () => {
  it('解析 https 仓库地址（.git 可省略，容忍尾斜杠）', () => {
    expect(parseGitCloneUrl('https://github.com/stack-wuh/wuh.site.desktop')).toEqual({
      httpsUrl: 'https://github.com/stack-wuh/wuh.site.desktop.git',
      repoName: 'wuh.site.desktop',
      ownerRepo: 'stack-wuh/wuh.site.desktop'
    })
    const r = parseGitCloneUrl('https://github.com/o/r.git/')
    expect(r?.httpsUrl).toBe('https://github.com/o/r.git')
    expect(r?.repoName).toBe('r')
  })

  it('git@ scp 形态自动转 https', () => {
    expect(parseGitCloneUrl('git@github.com:stack-wuh/blog.git')).toEqual({
      httpsUrl: 'https://github.com/stack-wuh/blog.git',
      repoName: 'blog',
      ownerRepo: 'stack-wuh/blog'
    })
    expect(parseGitCloneUrl('git@github.com:stack-wuh/blog')?.ownerRepo).toBe('stack-wuh/blog')
  })

  it('多级路径取末段为目录名', () => {
    const r = parseGitCloneUrl('https://gitlab.com/group/sub/proj.git')
    expect(r?.repoName).toBe('proj')
    expect(r?.ownerRepo).toBe('group/sub/proj')
  })

  it('非法输入拒绝：空 / http / 本地路径 / 带空格 / 残缺 scp', () => {
    expect(parseGitCloneUrl('')).toBeNull()
    expect(parseGitCloneUrl('   ')).toBeNull()
    expect(parseGitCloneUrl('http://github.com/o/r')).toBeNull()
    expect(parseGitCloneUrl('D:\\works\\blog')).toBeNull()
    expect(parseGitCloneUrl('https://github.com/o/re po')).toBeNull()
    expect(parseGitCloneUrl('git@github.com')).toBeNull()
    expect(parseGitCloneUrl('https://github.com/')).toBeNull()
  })
})
