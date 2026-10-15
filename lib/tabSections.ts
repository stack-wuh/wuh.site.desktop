/**
 * 插件页签 payload 解析（20261015-feature-workbench-shell 从 lib/capsule
 * updateCapsuleTab 抽取的共享纯逻辑）：capsule tabs / dock 页签 / 上下文侧栏页签
 * 共用同一护栏语义——严格 typeof 校验（帧消息禁 Number() 宽转）、≤3 sections ×
 * ≤8 rows、序列化 ≤4KB、row.icon 白名单、row.viewId 归属本插件 main 视图。
 * 非法一律抛错（错误信息含期望字段，供插件帧排查）。
 */
import { PLUGIN_ICONS } from '@shared/plugin'
import type { CapsuleTabSection, CapsuleTabRow, CapsuleTone } from './capsule'

export const MAX_TAB_SECTIONS = 3
export const MAX_TAB_ROWS_PER_SECTION = 8
export const MAX_TAB_PAYLOAD_BYTES = 4096

const TONES: readonly CapsuleTone[] = ['default', 'primary', 'success', 'warning']

export function parseTabSections(payload: unknown, viewIds: readonly string[]): CapsuleTabSection[] {
  let raw = ''
  try {
    raw = JSON.stringify(payload ?? {})
  } catch {
    throw new Error('tab payload 须可 JSON 序列化')
  }
  if (raw.length > MAX_TAB_PAYLOAD_BYTES) {
    throw new Error(`tab payload 序列化须 ≤${MAX_TAB_PAYLOAD_BYTES} 字节: ${raw.length}`)
  }
  const p = (payload ?? {}) as Record<string, unknown>
  if (!Array.isArray(p.sections)) throw new Error('sections 须为数组')
  if (p.sections.length > MAX_TAB_SECTIONS) {
    throw new Error(`sections 最多 ${MAX_TAB_SECTIONS} 组`)
  }
  return p.sections.map((s, si) => {
    if (typeof s !== 'object' || s === null || Array.isArray(s)) {
      throw new Error(`sections[${si}] 须为对象`)
    }
    const sec = s as Record<string, unknown>
    if (sec.title !== undefined && (typeof sec.title !== 'string' || sec.title.length === 0 || sec.title.length > 20)) {
      throw new Error(`sections[${si}].title 须为 1-20 字符的字符串`)
    }
    if (!Array.isArray(sec.rows)) throw new Error(`sections[${si}].rows 须为数组`)
    if (sec.rows.length > MAX_TAB_ROWS_PER_SECTION) {
      throw new Error(`sections[${si}].rows 最多 ${MAX_TAB_ROWS_PER_SECTION} 行`)
    }
    const rows: CapsuleTabRow[] = sec.rows.map((r, ri) => {
      if (typeof r !== 'object' || r === null || Array.isArray(r)) {
        throw new Error(`sections[${si}].rows[${ri}] 须为对象`)
      }
      const row = r as Record<string, unknown>
      if (typeof row.text !== 'string' || row.text.length === 0 || row.text.length > 60) {
        throw new Error(`sections[${si}].rows[${ri}].text 须为 1-60 字符的字符串`)
      }
      if (row.icon !== undefined && !(PLUGIN_ICONS as readonly string[]).includes(String(row.icon))) {
        throw new Error(`sections[${si}].rows[${ri}].icon 不在白名单: ${String(row.icon)}`)
      }
      if (row.detail !== undefined && (typeof row.detail !== 'string' || row.detail.length > 80)) {
        throw new Error(`sections[${si}].rows[${ri}].detail 须为 ≤80 字符的字符串`)
      }
      if (row.tone !== undefined && !TONES.includes(row.tone as CapsuleTone)) {
        throw new Error(`sections[${si}].rows[${ri}].tone 只能是 ${TONES.join('/')}: ${String(row.tone)}`)
      }
      if (row.viewId !== undefined) {
        if (typeof row.viewId !== 'string' || !viewIds.includes(row.viewId)) {
          throw new Error(`sections[${si}].rows[${ri}].viewId 须指向本插件已声明的 main 视图: ${String(row.viewId)}`)
        }
      }
      return {
        ...(row.icon !== undefined ? { icon: row.icon as string } : {}),
        text: row.text,
        ...(row.detail !== undefined ? { detail: row.detail as string } : {}),
        ...(row.tone !== undefined ? { tone: row.tone as CapsuleTone } : {}),
        ...(row.viewId !== undefined ? { viewId: row.viewId as string } : {})
      }
    })
    return {
      ...(sec.title !== undefined ? { title: sec.title as string } : {}),
      rows
    }
  })
}
