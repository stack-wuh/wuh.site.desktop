/// <reference lib="dom" />
// @vitest-environment happy-dom
// PoC 实测：Milkdown（@milkdown/kit）真实 transformer 的 markdown round-trip 保真度。
// 背景与结论见 shadow-docs/changes/20260925-chore-milkdown-editor-poc/report.md。
//
// 每个样例做三件事：
//   1. 一次 round-trip（parse→PM doc→serialize，等价「打开→直接保存」）→ 全文快照入库当评审证据；
//   2. 二次 round-trip 幂等断言（「规范化是一次性的」；若上游序列化 bug 导致非幂等——如 #2349
//      autolink 转义翻倍——本断言会红，那本身就是实测发现）；
//   3. 翻写率统计（变更行/总行）汇总成 metrics 快照。
import { describe, expect, it } from 'vitest'
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { getMarkdown } from '@milkdown/kit/utils'

interface Sample {
  name: string
  md: string
}

const SAMPLES: Sample[] = [
  {
    name: 'frontmatter 笔记头',
    md: '---\ntitle: 我的笔记\ndate: 2026-09-25\ntags: [随笔]\n---\n\n正文第一段。\n'
  },
  {
    name: '短横列表（最常见风格）',
    md: '- 第一项\n- 第二项\n- 第三项\n'
  },
  {
    name: '短横分隔线',
    md: '第一节\n\n---\n\n第二节\n'
  },
  {
    name: '下划线强调',
    md: '这是 _emphasis 强调_ 与 **加粗** 混排。\n'
  },
  {
    name: 'setext 标题',
    md: '设置标题\n========\n\n正文。\n'
  },
  {
    name: '括号有序列表',
    md: '1) 第一项\n2) 第二项\n'
  },
  {
    name: '相邻双列表',
    md: '- 无序列表项\n\n1. 有序列表项\n'
  },
  {
    name: '中文正文混排',
    md: '# 中文标题\n\n中文与 English 混排的一段话，包含「引号」和标点。\n\n## 二级标题\n\n列表：\n\n- 苹果\n- 香蕉\n'
  },
  {
    name: '图片相对引用（blog assets 约定）',
    md: '![截图](./我的笔记.assets/20260925-abc.png)\n'
  },
  {
    name: '图片 ASCII 相对路径（对照）',
    md: '![shot](./note.assets/20260925-abc.png)\n'
  },
  {
    name: 'autolink 与裸链接',
    md: '见 <https://example.com/path?a=1&b=2> 与 [文字链接](https://example.com)。\n'
  },
  {
    name: '转义字符',
    md: '不需要的转义 \\* 与 \\-，以及必要的转义 \\*\\*。\n'
  },
  {
    name: '硬换行（两空格）',
    md: '行尾两空格  \n下一行。\n'
  },
  {
    name: '嵌套强调',
    md: '**加粗中含 _下划线强调_ 的嵌套结构**\n'
  },
  {
    name: '围栏代码块',
    md: '```ts\nconst a = 1\n```\n\n正文。\n'
  },
  {
    name: 'HTML 块',
    md: '<div class="note">\nHTML 块内容\n</div>\n\n正文。\n'
  },
  {
    name: 'GFM 任务列表与表格',
    md: '- [ ] 待办\n- [x] 已办\n\n| 列一 | 列二 |\n| --- | --- |\n| a    | b    |\n'
  }
]

function diffChangedLines(a: string, b: string): number {
  const al = a.split('\n')
  const bl = b.split('\n')
  let changed = 0
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) changed++
  }
  return changed
}

async function roundtrip(md: string): Promise<string> {
  const root = document.createElement('div')
  document.body.appendChild(root)
  try {
    const editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, md)
      })
      .use(commonmark)
      .use(gfm)
      .create()
    const out = editor.action(getMarkdown())
    await editor.destroy()
    return out
  } finally {
    root.remove()
  }
}

describe('milkdown transformer round-trip PoC（打开→直接保存）', () => {
  for (const sample of SAMPLES) {
    it(`round-trip: ${sample.name}`, async () => {
      const once = await roundtrip(sample.md)
      expect(once).toMatchSnapshot(sample.name)

      const twice = await roundtrip(once)
      expect(twice).toEqual(once)
    })
  }

  it('翻写率汇总（变更行/总行，一次 round-trip）', async () => {
    const metrics: Record<string, string> = {}
    for (const sample of SAMPLES) {
      const once = await roundtrip(sample.md)
      const changed = diffChangedLines(sample.md, once)
      const total = sample.md.split('\n').length
      metrics[sample.name] = `${changed}/${total} (${((changed / total) * 100).toFixed(0)}%)`
    }
    console.table(metrics)
    expect(metrics).toMatchSnapshot('metrics-summary')
  })
})
