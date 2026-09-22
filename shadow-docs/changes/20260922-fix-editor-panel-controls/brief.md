---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-fix-editor-panel-controls",
  "type": "fix",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "fix/20260922-fix-editor-panel-controls",
  "files": [
    "app/(shell)/layout.tsx",
    "components/home/EditorPanel.tsx",
    "components/tasks/TaskCapsule.tsx",
    "components/workspace/PickerShell.tsx"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "7331eef901496d3e81a07a1c162ed94e963513c2",
    "verifiedAt": "2026-09-22T13:42:38.388Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "50172ca2a1e3cffb8bff9afba819b9f50b7e905b7bfa97010ecc170fb818d4a2",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 恢复首页编辑面板上下操作行（选择项目/保存文件）",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n胶囊化改造把选择项目/文件选择/保存/新建全部收进左下角胶囊，且胶囊显示条件是「有任务或有活动文档」——冷启动态（无文档无任务）胶囊不渲染，面板侧也无任何入口，形成死锁：打开文件的入口恰好在没有文档时不可达。用户目检判定文件交互被「全部删除」，偏离原始需求「文件相关交互拆开放在输入框上方和下方」。\n\n## 引用规范\n- `shadow-docs/knowledge/desktop-plugin-architecture.md`（父仓库）\n  - 当前结论: 胶囊为「任务 + 编辑器」复合入口；EditorCommandHost 常驻认领文档操作。\n  - 适用 scope: apps/desktop —— 面板操作行经同一命令通道发布（单一命令面），宿主上收壳层常驻保证任意状态可用；胶囊保留为全局补充入口，两者不互斥。\n- `shadow-docs/knowledge/design-system.md`（父仓库）\n  - 当前结论: 颜色只经主题 token、断点用语义常量。\n  - 适用 scope: 恢复的操作行沿用既有 PickerShell/Panel 样式体系，无新色值。\n\n## 决策\n- **选型:** 面板恢复上下两行——上方 ContextRow：选择项目 + 选择文件（PickerShell 补回触发按钮与 popover 开合，内嵌 WorkspacePanelContent/FilePanelContent）；下方 ActionRow：文档状态 Chip + 新建 + 保存（经命令通道发布，行为与胶囊完全同源）。EditorCommandHost 从 TaskCapsule 上收至壳层 layout 常驻挂载，面板按钮在冷启动态也可用。\n- **对比方案:** 仅恢复部分按钮（另存为/新建留胶囊）——用户确认上下操作行全恢复；胶囊删除编辑器分区——放弃全局入口能力，否。\n- **理由:** 原始需求（第三条）就是文件交互在输入框上下；胶囊与面板共用命令通道无重复实现；宿主常驻消除冷启动死锁。\n- **关键约束:** 命令宿主全局仅一处挂载（layout），禁止面板/胶囊重复挂载导致命令双消费；保存按钮 disabled 态与旧版一致（activePath ? dirty : 有内容）。\n\n## 任务\n### Phase 1 面板操作行恢复\n- [x] PickerShell 补回 PickerButton 样式与 usePickerOpen 开合 hook（Esc/外点关闭） — `components/workspace/PickerShell.tsx`\n- [x] EditorPanel 恢复 ContextRow（项目/文件 popover 触发 + PanelContent 内嵌）与 ActionRow（DocChip + 新建 + 保存，命令通道发布），保持 Vditor 编辑区与主题修复不动 — `components/home/EditorPanel.tsx`\n### Phase 2 宿主上收与回归\n- [x] EditorCommandHost 从 TaskCapsule 迁至壳层 layout 常驻（单实例），TaskCapsule 移除挂载 — `app/(shell)/layout.tsx`, `components/tasks/TaskCapsule.tsx`\n- [x] 全量回归：vitest + 双侧 tsc + next build + electron-vite build；冷启动/有文档/有任务三态目检面板与胶囊 — —\n\n完整 brief：shadow-docs/changes/20260922-fix-editor-panel-controls/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-fix-editor-panel-controls\",\"type\":\"fix\",\"scope\":\"desktop\",\"status\":\"reviewed\",\"branch\":\"fix/20260922-fix-editor-panel-controls\",\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-fix-editor-panel-controls/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 恢复首页编辑面板上下操作行（选择项目/保存文件）

## 动机

胶囊化改造把选择项目/文件选择/保存/新建全部收进左下角胶囊，且胶囊显示条件是「有任务或有活动文档」——冷启动态（无文档无任务）胶囊不渲染，面板侧也无任何入口，形成死锁：打开文件的入口恰好在没有文档时不可达。用户目检判定文件交互被「全部删除」，偏离原始需求「文件相关交互拆开放在输入框上方和下方」。

## 引用规范

- `shadow-docs/knowledge/desktop-plugin-architecture.md`（父仓库）
  - 当前结论: 胶囊为「任务 + 编辑器」复合入口；EditorCommandHost 常驻认领文档操作。
  - 适用 scope: apps/desktop —— 面板操作行经同一命令通道发布（单一命令面），宿主上收壳层常驻保证任意状态可用；胶囊保留为全局补充入口，两者不互斥。
- `shadow-docs/knowledge/design-system.md`（父仓库）
  - 当前结论: 颜色只经主题 token、断点用语义常量。
  - 适用 scope: 恢复的操作行沿用既有 PickerShell/Panel 样式体系，无新色值。

## 决策

- **选型:** 面板恢复上下两行——上方 ContextRow：选择项目 + 选择文件（PickerShell 补回触发按钮与 popover 开合，内嵌 WorkspacePanelContent/FilePanelContent）；下方 ActionRow：文档状态 Chip + 新建 + 保存（经命令通道发布，行为与胶囊完全同源）。EditorCommandHost 从 TaskCapsule 上收至壳层 layout 常驻挂载，面板按钮在冷启动态也可用。
- **对比方案:** 仅恢复部分按钮（另存为/新建留胶囊）——用户确认上下操作行全恢复；胶囊删除编辑器分区——放弃全局入口能力，否。
- **理由:** 原始需求（第三条）就是文件交互在输入框上下；胶囊与面板共用命令通道无重复实现；宿主常驻消除冷启动死锁。
- **关键约束:** 命令宿主全局仅一处挂载（layout），禁止面板/胶囊重复挂载导致命令双消费；保存按钮 disabled 态与旧版一致（activePath ? dirty : 有内容）。

## 任务

### Phase 1 面板操作行恢复
- [x] PickerShell 补回 PickerButton 样式与 usePickerOpen 开合 hook（Esc/外点关闭） — `components/workspace/PickerShell.tsx`
- [x] EditorPanel 恢复 ContextRow（项目/文件 popover 触发 + PanelContent 内嵌）与 ActionRow（DocChip + 新建 + 保存，命令通道发布），保持 Vditor 编辑区与主题修复不动 — `components/home/EditorPanel.tsx`
### Phase 2 宿主上收与回归
- [x] EditorCommandHost 从 TaskCapsule 迁至壳层 layout 常驻（单实例），TaskCapsule 移除挂载 — `app/(shell)/layout.tsx`, `components/tasks/TaskCapsule.tsx`
- [x] 全量回归：vitest + 双侧 tsc + next build + electron-vite build；冷启动/有文档/有任务三态目检面板与胶囊 — —

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/desktop-plugin-architecture.md`
- **理由:** 「编辑器入口双轨制：面板上下操作行（常在）+ 胶囊（全局补充）；命令宿主壳层单实例常驻」修正胶囊化结论的过激部分，release 阶段回写。
