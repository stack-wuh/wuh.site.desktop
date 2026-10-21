---
{
  "schema": "shadow-dev/v1",
  "name": "20261021-style-published-seal",
  "type": "style",
  "scope": "app/(shell)/editor,components/editor/SidePane,components/capsule/CapsulePanel",
  "status": "published",
  "baseBranch": "main",
  "branch": "style/20261021-style-published-seal",
  "files": [
    "app/(shell)/editor/page.tsx",
    "components/capsule/CapsulePanel/ControlSections.tsx",
    "components/capsule/CapsulePanel/styles.ts",
    "components/editor/SidePane/index.tsx",
    "components/editor/SidePane/styles.ts",
    "lib/i18n/locales.ts",
    "tests/capsule-render.test.tsx",
    "tests/editor-context-sidebar.test.tsx",
    "tests/editor-page.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 164,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/164",
    "pullRequest": 168,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/168"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "a54e92fb64cff0107d1971070c165c1891cb8f3b",
    "verifiedAt": "2026-10-21T15:52:14.498Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:168",
    "planHash": "d9939130a66334290f3c843bfa432d258ddd33a97a506216cc861f5512a4d602",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[style] 已发布刊印与书耳题阶统一",
      "titleRaw": "已发布刊印与书耳题阶统一",
      "supplement": "发布态视觉区分（磁贴朱底激活 + 纸面「刊」朱印）与书耳大纲同源题阶（衬线分级、去 H 标签、activeHeading 联动高亮）。详见 shadow-docs/changes/20261021-style-published-seal/brief.md",
      "body": "## 动机\n两处视觉缺陷（用户实机指出）：\n\n1. **发布后无任何视觉区分**：控制中心发布磁贴只有一行文字（「已发布 #N · 点击更新」），文档本身更是完全看不出「已刊」状态；\n2. **书耳大纲与文档题阶是两套语言**：文档 h1/h2 是衬线题阶（h1 30px + 渐隐墨线、h2 22px + 朱线、h3 18px），书耳大纲却是无衬线 12.5px + mono `H1/H2` 标签、层级不可辨——书耳条目就是文档标题本身，二者应当同源并联动。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 素笺题阶（衬线 h1/h2/h3 + 墨线/朱线）；书口由 editor-state 总线 activeHeading 驱动；显示层零字节改写；书耳页签内容\n  - 适用 scope: app/(shell)/editor, components/editor/SidePane\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 控制中心磁贴激活语言（朱底方印 + 右上状态点 + 1.5px 朱边，aria-pressed）；颜色只写语义 token；动效 {150-300ms} + reduced-motion 降级\n  - 适用 scope: components/capsule\n\n## 决策\n- **选型:** 书耳同源题阶（衬线分级 + 缩进 + 去 H 标签 + activeHeading 当前章高亮）；发布磁贴已发布态 `$on` 朱底激活；纸面**骑缝**（右缘纸页叠口染朱：34% 朱底 + 双层朱缘 58%/60%、上下 16px 收口，首次发布落色 220ms；态驱动 `data-published`/`data-stamped` 属性，visual: design-mockups/20261021-published-trace）。\n- **对比方案:** ① 仅换字体不改层级——驳回（层级仍不可辨，未达成统一）；② 纯目次风但无联动高亮——驳回（联动不全）；③ 全壳层语境色——驳回（已发布是文档属性，不是壳层状态）；④ 右上角「刊」朱印——首轮实机走查被用户否决（不够显眼）；设计大师四构（折角/书口/纸色/骑缝）由用户选定骑缝。\n- **理由:** 同一批标题用同一题阶是语义正确的统一；骑缝以「纸的侧脸被盖过」表达已刊——无文字、全高可辨、与书脊/纸页叠口同一构造语言；磁贴复用既有 `$on` 激活语言，不新增色彩体系。\n\n## 任务\n### Phase 1 — 书耳题阶与联动\n- [ ] task 1 — `components/editor/SidePane/styles.ts` — OutlineItem 衬线分级（`$level`：H1 15px 满墨 + 下缘 1px 渐隐墨线 / H2 13.5px + 短朱线 / H3 12.5px 次级墨；缩进 0/10/20）；当前章 `$active`（左缘 2px 朱线 + 满墨）\n- [ ] task 2 — `components/editor/SidePane/index.tsx` — 去 `OutlineTag` 渲染；`useEditorLiveState()` 取 `activeHeading` → 当前章高亮（`aria-current=\"true\"`）；点击仍经 `scrollToHeading` 词表\n- [ ] task 3 — `tests/editor-context-sidebar.test.tsx` — 断言无 H 标签、层级样式（data-level/缩进）、当前章 aria-current 随 activeHeading 变化\n\n### Phase 2 — 已发布视觉\n- [ ] task 4 — `components/capsule/CapsulePanel/ControlSections.tsx` + `styles.ts` — PublishTile 已发布态 `$on` 激活（朱底方印 + 状态点，`aria-pressed`）\n- [x] task 5 — `app/(shell)/editor/page.tsx` — 骑缝叠口：Column 挂 `data-published`/`data-stamped`（frontmatter `issue` 只读），`::before` 叠口染朱 + 首次发布落色动效（reduced-motion 瞬切）\n- [x] task 6 — `lib/i18n/locales.ts` — 骑缝为纯视觉，**无新增文案键**（首轮的 `editor.publishedSeal` 随刊印方案一并移除）\n- [ ] task 7 — `tests/capsule-render.test.tsx` + `tests/editor-page.test.tsx` — 磁贴已发布 `aria-pressed` 断言；刊印显隐断言（有 issue 显形 / 无 issue 不渲染）\n- [ ] task 8 — 全量验证 — 三 tsconfig + 目标探针 + 全量 vitest（SGN-1 分批）+ 用户真机走查（四主题明暗、大纲联动、刊印显隐）\n\n## 补充\n发布态视觉区分（磁贴朱底激活 + 纸面「刊」朱印）与书耳大纲同源题阶（衬线分级、去 H 标签、activeHeading 联动高亮）。详见 shadow-docs/changes/20261021-style-published-seal/brief.md\n\n完整 brief：shadow-docs/changes/20261021-style-published-seal/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261021-style-published-seal\",\"type\":\"style\",\"scope\":\"app/(shell)/editor,components/editor/SidePane,components/capsule/CapsulePanel\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261021-style-published-seal/brief.md\",\"cliVersion\":\"1.8.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "style"
      ]
    },
    "release": {
      "files": [
        "app/(shell)/editor/page.tsx",
        "components/capsule/CapsulePanel/ControlSections.tsx",
        "components/editor/SidePane/index.tsx",
        "components/editor/SidePane/styles.ts",
        "design-mockups/20261021-published-trace/index.html",
        "shadow-docs/changes/20261021-style-published-seal/brief.md",
        "shadow-docs/knowledge/editor.md",
        "tests/capsule-render.test.tsx",
        "tests/editor-context-sidebar.test.tsx",
        "tests/editor-page.test.tsx"
      ],
      "message": "feat(editor): 已发布骑缝与书耳题阶统一——页缘叠口染朱+首发落色，大纲衬线分级与 activeHeading 当前章高亮",
      "title": "feat(editor): 已发布骑缝与书耳题阶统一",
      "body": "Closes #164\n\n已发布状态改以「纸面痕迹」表达：frontmatter `issue` 存在时，素笺右缘的纸页叠口染朱（双层朱缘、上下收口），首次发布瞬间朱色自叠口中段晕开一次；顶部朱印方案在走查中被否决（design-mockups/20261021-published-trace 四构原型由本人选定骑缝）。书耳大纲与文档题阶统一：衬线分级（h1 15px 渐隐墨线 / h2 13.5px 短朱线 / h3 12.5px）、去 mono H 标签、按级缩进，当前章随 activeHeading 高亮并与书口同源。\n\n验证：三 tsconfig 绿；目标探针 44 用例绿；全量 88 套件/824 用例绿；真机走查（骑缝显隐、落色、暗色、大纲联动）。\n\n完整 brief：shadow-docs/changes/20261021-style-published-seal/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "骑缝（已发布页缘叠口染朱 + 首次发布落色）与书耳大纲同源题阶/activeHeading 联动 → editor.md；磁贴已发布 $on 激活为既有语言复用，不单独起卡"
  }
}
---

# 已发布刊印与书耳题阶统一

## 动机

两处视觉缺陷（用户实机指出）：

1. **发布后无任何视觉区分**：控制中心发布磁贴只有一行文字（「已发布 #N · 点击更新」），文档本身更是完全看不出「已刊」状态；
2. **书耳大纲与文档题阶是两套语言**：文档 h1/h2 是衬线题阶（h1 30px + 渐隐墨线、h2 22px + 朱线、h3 18px），书耳大纲却是无衬线 12.5px + mono `H1/H2` 标签、层级不可辨——书耳条目就是文档标题本身，二者应当同源并联动。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更——无（纯显示层，复用 editor-state 总线与 frontmatter 身份）；触及面——编辑页纸面、书耳、控制中心磁贴、i18n 与三处测试；可发现性——用户直接可见。
- **期望验证深度:** runtime（目标探针 + 三 tsconfig + 全量分批 + 用户真机四主题走查）

## 领域模型

- **限界上下文:** renderer 编辑面显示层（素笺视觉）——把文档状态投影为可感知的视觉语言。上游 = `workspaceStore`（content/activePath）与 editor-state 总线（activeHeading）；反腐边界：不触碰发布链路、命令通道与文档字节。
- **统一语言增量:** 「骑缝」（published fore-edge）——frontmatter `issue` 存在时纸面右缘纸页叠口染朱（页缘被「盖过」），纯显示、不可点、不参与交互；首次发布瞬间朱色自叠口中段向两端晕开一次。
- **聚合与不变量:**
  - `当前文档`：刊印、题阶、大纲高亮全部零字节改写；发布身份只读 frontmatter `issue`，不建第二状态源。
  - `书耳大纲`：条目只来自 `parseOutline`（文档标题唯一事实源）；当前章高亮与书口（Spine）同源 `editor-state.activeHeading`；点击跳转只经既有 `scrollToHeading` 词表。
- **领域事件:** 发布成功回写 `issue` → 文档内容变化 → 骑缝显形并落色一次（自然派生，无新增事件；动效仅同文档 issue 无→有时触发）。

## 引用规范
- shadow-docs/knowledge/editor.md
  - 当前结论: 素笺题阶（衬线 h1/h2/h3 + 墨线/朱线）；书口由 editor-state 总线 activeHeading 驱动；显示层零字节改写；书耳页签内容
  - 适用 scope: app/(shell)/editor, components/editor/SidePane
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 控制中心磁贴激活语言（朱底方印 + 右上状态点 + 1.5px 朱边，aria-pressed）；颜色只写语义 token；动效 {150-300ms} + reduced-motion 降级
  - 适用 scope: components/capsule

## 决策
- **选型:** 书耳同源题阶（衬线分级 + 缩进 + 去 H 标签 + activeHeading 当前章高亮）；发布磁贴已发布态 `$on` 朱底激活；纸面右上角「刊」朱印（低对比、aria-label 三语、pointer-events none）。
- **对比方案:** ① 仅换字体不改层级——驳回（层级仍不可辨，未达成统一）；② 纯目次风但无联动高亮——驳回（联动不全）；③ 全壳层语境色——驳回（已发布是文档属性，不是壳层状态）；④ 在编辑器组件内嵌印——驳回（印属于纸面载体，放 PageShell 层）。
- **理由:** 同一批标题用同一题阶是语义正确的统一；以「印」的语言表达已刊，与素笺纸墨语言同源且不打扰正文；磁贴复用既有 `$on` 激活语言，不新增色彩体系。

## 任务
### Phase 1 — 书耳题阶与联动
- [x] task 1 — `components/editor/SidePane/styles.ts` — OutlineItem 衬线分级（`$level`：H1 15px 满墨 + 下缘 1px 渐隐墨线 / H2 13.5px + 短朱线 / H3 12.5px 次级墨；缩进 0/10/20）；当前章 `$active`（左缘 2px 朱线 + 满墨）
- [x] task 2 — `components/editor/SidePane/index.tsx` — 去 `OutlineTag` 渲染；`useEditorLiveState()` 取 `activeHeading` → 当前章高亮（`aria-current="true"`）；点击仍经 `scrollToHeading` 词表
- [x] task 3 — `tests/editor-context-sidebar.test.tsx` — 断言无 H 标签、层级样式（data-level/缩进）、当前章 aria-current 随 activeHeading 变化

### Phase 2 — 已发布视觉
- [x] task 4 — `components/capsule/CapsulePanel/ControlSections.tsx` + `styles.ts` — PublishTile 已发布态 `$on` 激活（朱底方印 + 状态点，`aria-pressed`）
- [x] task 5 — `app/(shell)/editor/page.tsx` — PageShell 内右上角「刊」印：frontmatter `issue` 存在显形（`parseFrontmatter` 只读），低对比半透明朱印、方角印面、`aria-label`、`pointer-events: none`
- [x] task 6 — `lib/i18n/locales.ts` — `editor.publishedSeal` 三语
- [x] task 7 — `tests/capsule-render.test.tsx` + `tests/editor-page.test.tsx` — 磁贴已发布 `aria-pressed` 断言；刊印显隐断言（有 issue 显形 / 无 issue 不渲染）
- [x] task 8 — 全量验证 — 三 tsconfig + 目标探针 + 全量 vitest（SGN-1 分批）+ 用户真机走查（四主题明暗、大纲联动、刊印显隐）

## 结果
- 实际耗时: —
- 验证: —（M 级：每条被触及不变量一个观察点）

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md（刊印 + 大纲同源题阶与 activeHeading 联动）、shadow-docs/knowledge/shell-chrome-design.md（磁贴已发布激活态）
- **理由:** 两处均为既有卡片的机制延展/新样本，不新增卡片。
