---
{
  "schema": "shadow-dev/v1",
  "name": "20260928-fix-editor-render-defects",
  "type": "fix",
  "scope": "apps/desktop",
  "status": "published",
  "baseBranch": "main",
  "branch": "fix/20260928-fix-editor-render-defects",
  "files": [
    "components/editor/MarkdownEditor/renderTheme.ts",
    "components/editor/decorations.ts",
    "tests/editor-interactions-widgets.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 138,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/138",
    "pullRequest": 139,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/139"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "04706dc8f08f64d96ffbbbae2f464d95b3b54bf2",
    "verifiedAt": "2026-09-28T14:00:46.070Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:139",
    "planHash": "e184dc38d9c4ceac06f0b7490008c93cec4e21f90b077152d78622bb10ed8958",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 编辑器渲染态视觉缺陷修复：链接 URL 挤贴 / 任务行双标记 / 图片坍缩 2px",
      "titleRaw": "编辑器渲染态视觉缺陷修复：链接 URL 挤贴 / 任务行双标记 / 图片坍缩 2px",
      "supplement": "PR #135 合并后实测三处视觉缺陷：链接渲染态 URL 挤贴文字（改为隐藏+hover title）、任务行圆点与 checkbox 叠加（改为隐藏列表标记仅留 checkbox）、图片坍缩 2×2px（inline-block 循环依赖，改显式 width:100%）。呈现层修正零契约变更（M 级），细节见 shadow-docs/changes/20260928-fix-editor-render-defects/brief.md",
      "body": "## 动机\nchange 2（20260927-feature-editor-interactions，PR #135）合并后用户实测效果不佳。经真实代码打包镜像（harness）截图定位三处缺陷：①链接渲染态 URL 原文挤贴在链接文字后（`站点写作规范https://...`），与已验收原型（仅墨水下划文字）不符；②任务行圆点与 checkbox 双重标记；③图片渲染态坍缩为 2×2px（inline-block 收缩适配 + 子元素 max-width:100% 循环依赖，change 1 引入）。另发现链接 hover 无 URL 提示。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: L4 渲染态交互契约；墨水层次 token 语言\n  - 适用 scope: components/editor\n\n## 决策\n- **选型:** ①渲染态隐藏整个 url 段（symbols 原有 4 符号隐藏不变），URL 放入 linkText mark 的 title 属性 hover 可见，Ctrl/Cmd+点击逻辑（findLinkTargetAt 读源码）不受影响；②任务行隐藏列表标记+缩进+空格（tm[1] 恒非空，规避零长 mark RangeError），仅 checkbox 替换 `[x]`，不与圆点/序号叠加；③图片包裹器显式 `width:100% + text-align:center`，img 恢复 `inline-block`，消除循环依赖坍缩，点击放大的 zoom-in 光标一并补上。\n- **对比方案:** 表格真渲染（原型有样式表格、实现为行底纹）——期望差距确认为 change 2 遗留，但属新增 widget 特性非缺陷修复，不在本 change 扩 scope，立后续候选。\n- **理由:** 三处均为呈现层修正，行为契约不变；截图镜像（真实代码打包）逐项验证。\n\n## 任务\n### Phase 1\n\n- [ ] 链接渲染态隐藏 url + linkText title 提示 — `components/editor/decorations.ts`\n- [ ] 任务行隐藏列表标记（去圆点叠加） — `components/editor/decorations.ts`\n- [ ] 图片包裹器 width:100% 修坍缩 + zoom-in 光标 + 移除失效 linkurl 样式 — `components/editor/MarkdownEditor/renderTheme.ts`\n- [ ] 测试期望同步（任务行 widget 区间/链接隐藏区间+title 断言） — `tests/editor-interactions-widgets.test.tsx`\n\n### Phase 2\n\n- [ ] 编辑器相关 8 套件回归 + 三 tsconfig + 截图镜像复验（酒红浅色已验，其余主题同 token 自动跟随） — `tests/`\n\n## 补充\nPR #135 合并后实测三处视觉缺陷：链接渲染态 URL 挤贴文字（改为隐藏+hover title）、任务行圆点与 checkbox 叠加（改为隐藏列表标记仅留 checkbox）、图片坍缩 2×2px（inline-block 循环依赖，改显式 width:100%）。呈现层修正零契约变更（M 级），细节见 shadow-docs/changes/20260928-fix-editor-render-defects/brief.md\n\n完整 brief：shadow-docs/changes/20260928-fix-editor-render-defects/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260928-fix-editor-render-defects\",\"type\":\"fix\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260928-fix-editor-render-defects/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    },
    "release": {
      "files": [
        "components/editor/MarkdownEditor/renderTheme.ts",
        "components/editor/decorations.ts",
        "shadow-docs/knowledge/editor.md",
        "tests/editor-interactions-widgets.test.tsx"
      ],
      "message": "fix(editor): 渲染态三缺陷——链接 URL 挤贴（隐藏+hover title，Ctrl/Cmd+点击不受影响）、任务行圆点与 checkbox 叠加（隐藏列表标记仅留 checkbox）、图片坍缩 2×2px（inline-block 循环依赖改显式 width:100%）；截图镜像逐项验证，编辑器 8 套件 83 用例+三 tsconfig 绿（Closes #138）",
      "title": "[fix] 编辑器渲染态视觉缺陷修复：链接 URL 挤贴 / 任务行双标记 / 图片坍缩",
      "body": "Closes #138\n\n完整 brief：shadow-docs/changes/20260928-fix-editor-render-defects/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "三处视觉缺陷修复经截图镜像逐项验证（链接仅墨水下划文字+hover title、任务行纯 checkbox、图片 728×347 大图居中）；编辑器 8 套件 83 用例 + 三 tsconfig 绿（全量套件因本机 V8 恶劣期连崩未跑全，覆盖本次修复面的套件已全绿，如实记录）；知识更新：L4 交互段补渲染态链接 URL 隐藏语义、任务行无叠点、图片 inline-block 坍缩坑"
  }
}
---

# 编辑器渲染态视觉缺陷修复（链接 URL 挤贴 / 任务行双标记 / 图片坍缩）

## 动机

change 2（20260927-feature-editor-interactions，PR #135）合并后用户实测效果不佳。经真实代码打包镜像（harness）截图定位三处缺陷：①链接渲染态 URL 原文挤贴在链接文字后（`站点写作规范https://...`），与已验收原型（仅墨水下划文字）不符；②任务行圆点与 checkbox 双重标记；③图片渲染态坍缩为 2×2px（inline-block 收缩适配 + 子元素 max-width:100% 循环依赖，change 1 引入）。另发现链接 hover 无 URL 提示。

## 复杂度评级

- **评级:** M
- **理由:** 零契约变更（装饰呈现层：隐藏范围调整 + CSS 修正 + title 属性）；触及面 decorations.ts/renderTheme.ts 局部；改坏立刻可见（截图镜像验证）。既有测试期望随行为修正同步更新并新增链接隐藏断言（绿灯测试）。
- **期望验证深度:** unit（编辑器 8 套件 83 用例绿）+ 截图镜像四主题走查 + 真实 app 走查留 PR 后

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: L4 渲染态交互契约；墨水层次 token 语言
  - 适用 scope: components/editor

## 决策

- **选型:** ①渲染态隐藏整个 url 段（symbols 原有 4 符号隐藏不变），URL 放入 linkText mark 的 title 属性 hover 可见，Ctrl/Cmd+点击逻辑（findLinkTargetAt 读源码）不受影响；②任务行隐藏列表标记+缩进+空格（tm[1] 恒非空，规避零长 mark RangeError），仅 checkbox 替换 `[x]`，不与圆点/序号叠加；③图片包裹器显式 `width:100% + text-align:center`，img 恢复 `inline-block`，消除循环依赖坍缩，点击放大的 zoom-in 光标一并补上。
- **对比方案:** 表格真渲染（原型有样式表格、实现为行底纹）——期望差距确认为 change 2 遗留，但属新增 widget 特性非缺陷修复，不在本 change 扩 scope，立后续候选。
- **理由:** 三处均为呈现层修正，行为契约不变；截图镜像（真实代码打包）逐项验证。

## 任务

### Phase 1

- [x] 链接渲染态隐藏 url + linkText title 提示 — `components/editor/decorations.ts`
- [x] 任务行隐藏列表标记（去圆点叠加） — `components/editor/decorations.ts`
- [x] 图片包裹器 width:100% 修坍缩 + zoom-in 光标 + 移除失效 linkurl 样式 — `components/editor/MarkdownEditor/renderTheme.ts`
- [x] 测试期望同步（任务行 widget 区间/链接隐藏区间+title 断言） — `tests/editor-interactions-widgets.test.tsx`

### Phase 2

- [x] 编辑器相关 8 套件回归 + 三 tsconfig + 截图镜像复验（酒红浅色已验，其余主题同 token 自动跟随） — `tests/`

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/editor.md`
- **理由:** 渲染态链接语义收敛（URL 隐藏进 title）与任务行呈现（无叠点）是 L4 交互段的行为细化；图片 inline-block 坍缩坑记入渲染语言段防回归。
