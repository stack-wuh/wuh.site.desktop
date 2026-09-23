---
{
  "schema": "shadow-dev/v1",
  "name": "20260923-fix-capsule-doc-card-nesting",
  "type": "fix",
  "scope": "capsule",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "fix/20260923-fix-capsule-doc-card-nesting",
  "files": [
    "components/capsule/CapsulePanel.tsx",
    "components/capsule/modules.tsx",
    "components/capsule/sections/EditorSection.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 57,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/57",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "daca6eeb4d751c7bd3350fa2003ffabe9ea10921",
    "verifiedAt": "2026-09-23T09:38:23.330Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:57",
    "planHash": "b5de7e1b135800a8650e56e734cb8dd6d244d4182abf8ee804d06a068d91cdb1",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 修复文档卡 button 嵌套导致的 hydration 错误",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n20260923-feature-capsule-control-center 引入的编辑器模块区文档卡把 `ModuleCard`（styled.button）当容器使用，内部又嵌了 4 个 `ActionMini` 原生按钮（保存/另存为/新建/关闭），产生 button 嵌套 button 的非法 HTML，React 在 SSR hydration 时报错（Console Error: In HTML, <button> cannot be a descendant of <button>）并可能引发事件语义错乱。属刚合入变更（PR #56）内的回归，需立即修复。\n\n## 引用规范\n- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）\n  - 当前结论: 胶囊控制中心编辑器模块区为模块卡布局（modules.tsx 基础件），样式全语义 token；模块内容一律经命令通道下发\n  - 适用 scope: 模块卡结构修正须保持设计稿视觉语言与 token 用法不变，动作仍走 editor-commands\n\n## 决策\n- **选型:** 模块卡二分——新增非交互内容容器 `ModulePanel`（div 语义，与 `ModuleCard` 共享同一 surface 样式基而仅去掉交互态：cursor/按压缩放/焦点环），文档卡与无跳转的插件 tile 改用 `ModulePanel`，其内部承载原生动作按钮\n- **对比方案:** (a) 保留卡片可点 + 内层改 `div role=\"button\"` 手工补键盘可达性——反模式，成本高且语义脆弱；(b) 动作钮移出卡片改卡下网格——视觉偏离已拍板设计稿\n- **理由:** 内容卡（承载信息 + 内部动作）与交互卡（整体可点）本就是两种语义，二分后原生按钮在 div 容器内合法、键盘可达性天然正确；样式经 `css` 样式基复用，视觉与设计稿零偏离。代价是失去「点文档卡聚焦编辑器」这一次要 affordance——卡内动作组已覆盖真实操作，且聚焦可由编辑区直接点击达成；同时顺带移除 `CapsuleModuleTile` 无跳转分支的 `as=\"div\"` + cursor 内联 hack\n\n## 任务\n### Phase 1\n- [ ] modules.tsx 抽出 surface 样式基并新增 `ModulePanel`（内容卡容器） — `components/capsule/modules.tsx` — 修改\n- [ ] 文档卡改用 `ModulePanel`（动作组保留在卡内），移除整体 onClick 聚焦 — `components/capsule/sections/EditorSection.tsx` — 修改\n- [ ] `CapsuleModuleTile` 无跳转分支同步改用 `ModulePanel`，移除 as/cursor hack — `components/capsule/CapsulePanel.tsx` — 修改\n- [ ] 全量验证：vitest、双侧 tsc、build；并在真实渲染页执行 `document.querySelectorAll('button button').length === 0` 结构断言（打开胶囊控制中心后） — — 验证\n\n完整 brief：shadow-docs/changes/20260923-fix-capsule-doc-card-nesting/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260923-fix-capsule-doc-card-nesting\",\"type\":\"fix\",\"scope\":\"capsule\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260923-fix-capsule-doc-card-nesting/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 修复文档卡 button 嵌套导致的 hydration 错误

## 动机

20260923-feature-capsule-control-center 引入的编辑器模块区文档卡把 `ModuleCard`（styled.button）当容器使用，内部又嵌了 4 个 `ActionMini` 原生按钮（保存/另存为/新建/关闭），产生 button 嵌套 button 的非法 HTML，React 在 SSR hydration 时报错（Console Error: In HTML, <button> cannot be a descendant of <button>）并可能引发事件语义错乱。属刚合入变更（PR #56）内的回归，需立即修复。

## 引用规范

- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）
  - 当前结论: 胶囊控制中心编辑器模块区为模块卡布局（modules.tsx 基础件），样式全语义 token；模块内容一律经命令通道下发
  - 适用 scope: 模块卡结构修正须保持设计稿视觉语言与 token 用法不变，动作仍走 editor-commands

## 决策

- **选型:** 模块卡二分——新增非交互内容容器 `ModulePanel`（div 语义，与 `ModuleCard` 共享同一 surface 样式基而仅去掉交互态：cursor/按压缩放/焦点环），文档卡与无跳转的插件 tile 改用 `ModulePanel`，其内部承载原生动作按钮
- **对比方案:** (a) 保留卡片可点 + 内层改 `div role="button"` 手工补键盘可达性——反模式，成本高且语义脆弱；(b) 动作钮移出卡片改卡下网格——视觉偏离已拍板设计稿
- **理由:** 内容卡（承载信息 + 内部动作）与交互卡（整体可点）本就是两种语义，二分后原生按钮在 div 容器内合法、键盘可达性天然正确；样式经 `css` 样式基复用，视觉与设计稿零偏离。代价是失去「点文档卡聚焦编辑器」这一次要 affordance——卡内动作组已覆盖真实操作，且聚焦可由编辑区直接点击达成；同时顺带移除 `CapsuleModuleTile` 无跳转分支的 `as="div"` + cursor 内联 hack

## 任务

### Phase 1
- [x] modules.tsx 抽出 surface 样式基并新增 `ModulePanel`（内容卡容器） — `components/capsule/modules.tsx` — 修改
- [x] 文档卡改用 `ModulePanel`（动作组保留在卡内），移除整体 onClick 聚焦 — `components/capsule/sections/EditorSection.tsx` — 修改
- [x] `CapsuleModuleTile` 无跳转分支同步改用 `ModulePanel`，移除 as/cursor hack — `components/capsule/CapsulePanel.tsx` — 修改
- [x] 全量验证：vitest、双侧 tsc、build；并在真实渲染页执行 `document.querySelectorAll('button button').length === 0` 结构断言（打开胶囊控制中心后） — — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md
- **理由:** 胶囊控制中心段的模块卡描述需补一句结构性约束——模块卡分交互型（`ModuleCard`/button）与内容型（`ModulePanel`/div，内部承载原生动作钮）两类，内容型禁再嵌交互卡；这是防止同类回归的长期有效事实
