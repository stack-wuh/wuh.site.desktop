---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-refactor-editor-section-cleanup",
  "type": "refactor",
  "scope": "components",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "refactor/20260927-refactor-editor-section-cleanup",
  "files": [
    "components/capsule/sections/EditorSection/index.tsx",
    "components/capsule/sections/EditorSection/styles.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 117,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/117",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "368857ffecc75a13c1d92bd7008f4822c00797d0",
    "verifiedAt": "2026-09-27T07:12:48.569Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:117",
    "planHash": "04a66511d88b6de03c192ba67d4349994ecf121addccd609dabf5e3a7b54b7d0",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[refactor] refactor(editor-section): 删除死 styled + index 再拆一刀（零行为变化）",
      "titleRaw": "refactor(editor-section): 删除死 styled + index 再拆一刀（零行为变化）",
      "supplement": "EditorSection 收尾：删除早期迭代遗留的三个无消费死 styled（DocChip/DocPath/DirtyDot），index.tsx（407 行）拆出 FormatGrid 与 PanelsExport；纯机械搬移零行为变化，editor-page/capsule-render 测试网护航。方案见 shadow-docs/changes/20260927-refactor-editor-section-cleanup/brief.md",
      "body": "## 动机\n20260926 巨型拆分按「逐字携带」原则把三个无消费方的死 styled（DocChip/DocPath/DirtyDot）带进了 EditorSection/styles.ts（文件头已注明待清理）；EditorSection/index.tsx 仍 407 行，格式图标网格、排版/快捷键手风琴、导出双卡三块 JSX 挤在组件里。本变更一次收尾。\n\n## 引用规范\n- norms/code-style.md：不留死代码、单一职责；本次为清理变更的合法入口\n- norms/tdd-verification.md：M 级=绿灯测试\n- shadow-docs/knowledge/editor.md：EditorCommandHost 胶囊驻留与具名导出可达性不动\n\n## 决策\n- **选型:** ①styles.ts 删除 DocChip/DocPath/DirtyDot；②index.tsx 拆出 `FormatGrid.tsx`（格式+插入图标网格，含 FORMAT_ITEMS）与 `PanelsExport.tsx`（排版/快捷键手风琴 + 导出双卡），index 保留文档卡/开关卡/大纲/面板挂载与整体编排；子组件纯展示 + props 注入。\n- **对比方案:** 只删死代码不拆 index——EditorSection/index 仍 407 行，收尾不彻底，弃。\n- **理由:** 一个主题一次清干净；机械搬移风险被既有测试网覆盖。\n\n## 任务\n### Phase 1\n- [ ] 删除三个死 styled 及 styles.ts 头部遗留注明——`components/capsule/sections/EditorSection/styles.ts`\n- [ ] 拆出 FormatGrid 与 PanelsExport，index 减重——`components/capsule/sections/EditorSection/index.tsx`\n- [ ] 回归：editor-page/capsule-render 绿——`tests/`\n\n## 补充\nEditorSection 收尾：删除早期迭代遗留的三个无消费死 styled（DocChip/DocPath/DirtyDot），index.tsx（407 行）拆出 FormatGrid 与 PanelsExport；纯机械搬移零行为变化，editor-page/capsule-render 测试网护航。方案见 shadow-docs/changes/20260927-refactor-editor-section-cleanup/brief.md\n\n完整 brief：shadow-docs/changes/20260927-refactor-editor-section-cleanup/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-refactor-editor-section-cleanup\",\"type\":\"refactor\",\"scope\":\"components\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-refactor-editor-section-cleanup/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "refactor"
      ]
    },
    "release": {
      "files": [
        "components/capsule/sections/EditorSection/FormatGrid.tsx",
        "components/capsule/sections/EditorSection/PanelsExport.tsx",
        "components/capsule/sections/EditorSection/index.tsx",
        "components/capsule/sections/EditorSection/styles.ts",
        "shadow-docs/changes/20260927-refactor-editor-section-cleanup/brief.md"
      ],
      "message": "refactor(editor-section): 收尾清理——删除三个无消费死 styled（DocChip/DocPath/DirtyDot），index 拆出 FormatGrid（格式+插入图标网格）与 PanelsExport（排版/快捷键手风琴+导出双卡）；纯机械搬移零行为变化，tsc next PASS + editor-page/capsule-render 22 用例 + capsule-nesting 守卫 3 用例绿（Closes #117）",
      "title": "refactor(editor-section): 收尾清理——死 styled 删除 + index 再拆一刀（零行为变化）",
      "body": "Closes #117\n\n完整 brief：shadow-docs/changes/20260927-refactor-editor-section-cleanup/brief.md"
    }
  },
  "knowledge": {
    "action": "无需变更",
    "target": null,
    "reason": "死 styled 删除与 FormatGrid/PanelsExport 纯展示拆分均按 brief 落地，tsc next PASS + editor-page/capsule-render 22 用例 + capsule-nesting 结构守卫 3 用例全绿；纯清理与既有约定内重组，无新长期事实"
  }
}
---

# EditorSection 收尾：删除死 styled + index 再拆一刀

## 动机
20260926 巨型拆分按「逐字携带」原则把三个无消费方的死 styled（DocChip/DocPath/DirtyDot）带进了 EditorSection/styles.ts（文件头已注明待清理）；EditorSection/index.tsx 仍 407 行，格式图标网格、排版/快捷键手风琴、导出双卡三块 JSX 挤在组件里。本变更一次收尾。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更=无（删除死代码 + 纯 JSX/样式搬移，行为零变化）；触及面=EditorSection 目录内 3-4 文件；可发现性=高（editor-page/capsule-render 测试网锁定）。
- **期望验证深度:** unit

## 引用规范
- norms/code-style.md：不留死代码、单一职责；本次为清理变更的合法入口
- norms/tdd-verification.md：M 级=绿灯测试
- shadow-docs/knowledge/editor.md：EditorCommandHost 胶囊驻留与具名导出可达性不动

## 决策
- **选型:** ①styles.ts 删除 DocChip/DocPath/DirtyDot；②index.tsx 拆出 `FormatGrid.tsx`（格式+插入图标网格，含 FORMAT_ITEMS）与 `PanelsExport.tsx`（排版/快捷键手风琴 + 导出双卡），index 保留文档卡/开关卡/大纲/面板挂载与整体编排；子组件纯展示 + props 注入。
- **对比方案:** 只删死代码不拆 index——EditorSection/index 仍 407 行，收尾不彻底，弃。
- **理由:** 一个主题一次清干净；机械搬移风险被既有测试网覆盖。

## 任务
### Phase 1
- [x] 删除三个死 styled 及 styles.ts 头部遗留注明——`components/capsule/sections/EditorSection/styles.ts`
- [x] 拆出 FormatGrid 与 PanelsExport，index 减重——`components/capsule/sections/EditorSection/index.tsx`
- [x] 回归：editor-page/capsule-render 绿——`tests/`

## 结果
- 实际耗时: 约 40 分钟
- 验证: tsc next PASS；editor-page + capsule-render 22 用例绿；capsule-nesting 结构守卫 3 用例绿（新 index.tsx 扫描通过：文档卡 ModulePanel + ActionMini 结构不变）；FormatGrid/PanelsExport 纯展示拆分，index 由 407 行降至 260 行以内
- 偏差与发现: 无——死 styled 删除、两个子组件 props 注入均按预案落地；SubPanelKind 类型保留在 FormatGrid 并由 index/PanelsExport type-only 引用（无运行时环）

## 知识评估
- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 纯清理与既有约定内重组，不产生新长期事实。
