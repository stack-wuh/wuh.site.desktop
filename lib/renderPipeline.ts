/**
 * 渲染管线服务（宿主可信实现，markdown-it 保留在核心 bundle）。
 *
 * 插件规则不进入本 realm：registerRule 只记录元数据，执行时经 host 注入的
 * dispatcher RPC 到插件自己的沙箱帧（renderRule 请求），单条规则超时/失败
 * 跳过并告警，保证预览不被坏插件卡死。相对图片的路径重写在此完成
 * （宿主才知道 workspace root 与文档目录）。
 */
import MarkdownIt from 'markdown-it'
import { parseFrontmatter } from '@shared/frontmatter'
import { isExternalRef, toFileUrl } from '@shared/url'

const md = new MarkdownIt({ html: false, linkify: true })

export interface RenderContext {
  /** workspace 绝对根目录 */
  root: string | null
  /** 当前文档相对路径 */
  docPath: string | null
}

export interface RuleMeta {
  order: number
  preprocess: boolean
  postRender: boolean
}

export type RuleDispatcher = (
  pluginId: string,
  token: number,
  method: 'preprocess' | 'postRender',
  payload: string
) => Promise<string>

interface RuleEntry {
  token: number
  pluginId: string
  meta: RuleMeta
}

let rules: RuleEntry[] = []
let tokenSeq = 0
let dispatcher: RuleDispatcher | null = null

const RULE_TIMEOUT_MS = 2000
const warnedRules = new Set<number>()

async function applyRule(
  rule: RuleEntry,
  method: 'preprocess' | 'postRender',
  payload: string
): Promise<string> {
  if (!dispatcher) return payload
  try {
    const raced = await Promise.race([
      dispatcher(rule.pluginId, rule.token, method, payload),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`规则执行超时 ${RULE_TIMEOUT_MS}ms`)), RULE_TIMEOUT_MS)
      )
    ])
    return typeof raced === 'string' ? raced : payload
  } catch (err) {
    if (!warnedRules.has(rule.token)) {
      warnedRules.add(rule.token)
      console.warn(
        `插件 ${rule.pluginId} 的渲染规则 #${rule.token} 执行失败，已跳过：${err instanceof Error ? err.message : String(err)}`
      )
    }
    return payload
  }
}

/** 预览 HTML 内的相对图片 → local-resource:// 绝对地址（与旧 Preview 行为一致） */
function rewriteLocalImages(html: string, ctx: RenderContext): string {
  if (!ctx.root || !ctx.docPath) return html
  const docDir = ctx.docPath.includes('/') ? ctx.docPath.slice(0, ctx.docPath.lastIndexOf('/')) : ''
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  parsed.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? ''
    if (src && !isExternalRef(src)) {
      img.setAttribute('src', toFileUrl(ctx.root as string, docDir, src))
    }
  })
  return parsed.body.innerHTML
}

export const renderService = {
  setRuleDispatcher(d: RuleDispatcher): void {
    dispatcher = d
  },

  register(pluginId: string, meta: RuleMeta): number {
    const token = ++tokenSeq
    rules.push({ token, pluginId, meta })
    rules.sort((a, b) => a.meta.order - b.meta.order)
    return token
  },

  unregister(token: number): void {
    rules = rules.filter((r) => r.token !== token)
  },

  /** 仅供测试与 host 服务复用：重置全部规则（渲染层重载时） */
  reset(): void {
    rules = []
    tokenSeq = 0
    warnedRules.clear()
  },

  ruleCount(): number {
    return rules.length
  },

  async execute(ctx: RenderContext, text: string): Promise<{ html: string }> {
    let src = parseFrontmatter(text).body
    for (const rule of [...rules]) {
      if (rule.meta.preprocess) src = await applyRule(rule, 'preprocess', src)
    }
    let html = md.render(src)
    for (const rule of [...rules]) {
      if (rule.meta.postRender) html = await applyRule(rule, 'postRender', html)
    }
    return { html: rewriteLocalImages(html, ctx) }
  }
}
