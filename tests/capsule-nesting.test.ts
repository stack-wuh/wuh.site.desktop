import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 胶囊控制中心模块卡嵌套守卫（20260923-fix-capsule-doc-card-nesting）：
 * 模块卡二分——交互型 ModuleCard（styled.button，整体可点）与内容型 ModulePanel
 * （div，内部承载原生动作钮）。两条结构约束：
 * 1) ModuleCard 内不得出现原生可交互元素（否则 button 嵌套 button，非法 HTML + hydration 报错）；
 * 2) ModulePanel 内不得再嵌交互型 ModuleCard（内容卡与交互卡不同层）。
 * 源码级扫描（无 DOM 测试环境，repo 既有 plugin-assets 同款手法）。
 */

const CAPSULE_DIR = join(process.cwd(), 'components', 'capsule')

const SOURCES = [
  join(CAPSULE_DIR, 'modules.tsx'),
  join(CAPSULE_DIR, 'CapsulePanel.tsx'),
  join(CAPSULE_DIR, 'sections', 'EditorSection.tsx')
]

/** 提取 <Tag ...>…</Tag> 完整块（含开标签；自闭合标签不在扫描范围——其无子元素） */
function blocksOf(source: string, tag: string): string[] {
  return source.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'g')) ?? []
}

/** 交互卡内禁出现：原生 button 与项目内封装动作钮 */
const INTERACTIVE_IN_CARD = /<button\b|<ActionMini\b|<IconBtn\b|<ModuleRow\b/

describe('模块卡嵌套守卫', () => {
  it('ModuleCard（交互型）不内嵌原生可交互元素', () => {
    for (const file of SOURCES) {
      const source = readFileSync(file, 'utf-8')
      for (const block of blocksOf(source, 'ModuleCard')) {
        expect(block, `${file} 存在交互卡内嵌可交互元素（button 嵌套 button）`).not.toMatch(
          INTERACTIVE_IN_CARD
        )
        // 非贪婪匹配到首个 </ModuleCard>：块内出现第二个开标签即为嵌套交互卡
        expect((block.match(/<ModuleCard\b/g) ?? []).length, `${file} 交互卡嵌套交互卡`).toBe(1)
      }
    }
  })

  it('ModulePanel（内容型）不内嵌交互型 ModuleCard', () => {
    for (const file of SOURCES) {
      const source = readFileSync(file, 'utf-8')
      for (const block of blocksOf(source, 'ModulePanel')) {
        expect(block, `${file} 内容卡内嵌交互卡`).not.toMatch(/<ModuleCard\b/)
      }
    }
  })

  it('文档卡为内容型 ModulePanel，动作组承载于卡内', () => {
    const source = readFileSync(join(CAPSULE_DIR, 'sections', 'EditorSection.tsx'), 'utf-8')
    const panels = blocksOf(source, 'ModulePanel')
    expect(panels.length).toBeGreaterThan(0)
    expect(panels.some((block) => block.includes('<ActionMini'))).toBe(true)
  })
})
