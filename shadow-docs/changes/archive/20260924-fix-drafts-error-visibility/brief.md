---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-fix-drafts-error-visibility",
  "type": "fix",
  "scope": "apps/desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "fix/20260924-fix-drafts-error-visibility",
  "files": [
    "components/capsule/sections/EditorSection.tsx",
    "lib/drafts.ts",
    "tests/drafts-editor-dom.test.tsx",
    "tests/drafts.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 71,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/71",
    "pullRequest": 72,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/72"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "6bf8daa70a6bc2db10312cc10ab624f3dc565f2d",
    "verifiedAt": "2026-09-24T04:05:17.722Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:72",
    "planHash": "1d3483a6a4be14c35ac75b6605ef2a08d185532c017237dcc058dfa3d82b5f89",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 草稿箱 IPC 失败静默——错误可见化与版本错位防御",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n用户报告「首页敲击后草稿箱不同步」。排障确认根因是运行实例进程版本错位：electron-vite dev 下 main/preload 仅在启动时构建，渲染层按需热编译——跨进程新增 IPC（drafts.*）后未重启 dev 的实例，渲染层新代码调用旧 preload 上不存在的方法：`window.api.saveDraft` 为 undefined，定时器回调内同步 TypeError 逃逸在 promise 链之外（连 catch 都不经过）；`refreshDrafts` 的 catch 静默吞错并降级为空列表。症状即「草稿箱永远空、无任何可见错误」，排障耗时远超问题本身。\n\n代码逻辑无缺陷（真实组件链路集成测试可复现通过），本变更只做健壮性修复：让这类失败可见、可诊断。\n\n## 引用规范\n- shadow-docs/knowledge/desktop-app-architecture.md\n  - 当前结论: 进程安全边界——fs 操作收敛主进程经 window.api 类型安全 IPC 暴露；DOM 渲染类变更验收必须跑 happy-dom 用例。\n  - 适用 scope: apps/desktop\n- norms/interaction.md\n  - 当前结论: 操作成功/失败有明确提示；异步操作显示加载态。\n  - 适用 scope: drafts.* 失败路径的用户可见反馈（console 诊断 + 保留降级语义）\n\n## 决策\n- **选型:** `lib/drafts.ts` 新增 `draftsApi()` 防御取用器——window.api 缺少 drafts.* 方法时返回 null 并 console.warn 一次性明确提示（含「重启 dev 重建 main/preload」的处置指引）；`refreshDrafts`/`scheduleDraftPersist` 经它取 api，取不到即降级/跳过；`refreshDrafts` 的 catch 从静默改为 console.warn（保留旧快照降级）；`EditorSection` 的 consumeDraft 兜底 catch 从 `() => undefined` 改为 console.warn。\n- **对比方案:** B（不做代码修复，只重启 dev 解决眼前问题）不吸收教训，下次版本错位仍全静默；C（渲染层探测版本自动重载）过度设计，超出本次范围。\n- **理由:** 失败可见是排障最低成本杠杆；降级语义不变（草稿箱不可用不阻塞编辑器主功能）。\n- **边界决策:** 不改变任何成功路径行为；console.warn 而非 console.error（非致命降级）；警告一次性（防刷屏）。\n\n## 任务\n### Phase 1 错误可见化\n- [ ] draftsApi 防御取用器（方法缺失返回 null + 一次性 warn）+ refreshDrafts/scheduleDraftPersist 接入 + listDrafts 失败 warn — `lib/drafts.ts`\n- [ ] consumeDraft 兜底 catch 警告化 — `components/capsule/sections/EditorSection.tsx`\n- [ ] 测试：api 方法缺失时 schedule 不抛、refreshDrafts 降级且 warn 一次性；正常路径回归 — `tests/drafts.test.ts`\n\n完整 brief：shadow-docs/changes/20260924-fix-drafts-error-visibility/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-fix-drafts-error-visibility\",\"type\":\"fix\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-fix-drafts-error-visibility/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 草稿箱 IPC 失败静默——错误可见化与版本错位防御

## 动机

用户报告「首页敲击后草稿箱不同步」。排障确认根因是运行实例进程版本错位：electron-vite dev 下 main/preload 仅在启动时构建，渲染层按需热编译——跨进程新增 IPC（drafts.*）后未重启 dev 的实例，渲染层新代码调用旧 preload 上不存在的方法：`window.api.saveDraft` 为 undefined，定时器回调内同步 TypeError 逃逸在 promise 链之外（连 catch 都不经过）；`refreshDrafts` 的 catch 静默吞错并降级为空列表。症状即「草稿箱永远空、无任何可见错误」，排障耗时远超问题本身。

代码逻辑无缺陷（真实组件链路集成测试可复现通过），本变更只做健壮性修复：让这类失败可见、可诊断。

## 引用规范

- shadow-docs/knowledge/desktop-app-architecture.md
  - 当前结论: 进程安全边界——fs 操作收敛主进程经 window.api 类型安全 IPC 暴露；DOM 渲染类变更验收必须跑 happy-dom 用例。
  - 适用 scope: apps/desktop
- norms/interaction.md
  - 当前结论: 操作成功/失败有明确提示；异步操作显示加载态。
  - 适用 scope: drafts.* 失败路径的用户可见反馈（console 诊断 + 保留降级语义）

## 决策

- **选型:** `lib/drafts.ts` 新增 `draftsApi()` 防御取用器——window.api 缺少 drafts.* 方法时返回 null 并 console.warn 一次性明确提示（含「重启 dev 重建 main/preload」的处置指引）；`refreshDrafts`/`scheduleDraftPersist` 经它取 api，取不到即降级/跳过；`refreshDrafts` 的 catch 从静默改为 console.warn（保留旧快照降级）；`EditorSection` 的 consumeDraft 兜底 catch 从 `() => undefined` 改为 console.warn。
- **对比方案:** B（不做代码修复，只重启 dev 解决眼前问题）不吸收教训，下次版本错位仍全静默；C（渲染层探测版本自动重载）过度设计，超出本次范围。
- **理由:** 失败可见是排障最低成本杠杆；降级语义不变（草稿箱不可用不阻塞编辑器主功能）。
- **边界决策:** 不改变任何成功路径行为；console.warn 而非 console.error（非致命降级）；警告一次性（防刷屏）。

## 任务

### Phase 1 错误可见化
- [x] draftsApi 防御取用器（方法缺失返回 null + 一次性 warn）+ refreshDrafts/scheduleDraftPersist 接入 + listDrafts 失败 warn — `lib/drafts.ts`
- [x] consumeDraft 兜底 catch 警告化 — `components/capsule/sections/EditorSection.tsx`
- [x] 测试：api 方法缺失时 schedule 不抛、refreshDrafts 降级且 warn 一次性；正常路径回归 — `tests/drafts.test.ts`

## 结果

- 实际耗时: 约 40 分钟
- 验证: vitest 320/320（含 3 个新增防御可见化用例与端到端组件链路回归）；三套 tsc 全过

## 知识评估

- **最终结果:** 更新
- **目标卡片:** shadow-docs/knowledge/desktop-app-architecture.md
- **理由:** 补充长期有效的 dev 排障事实——electron-vite dev 的 main/preload 仅启动时构建、渲染层热更新，跨进程新增 IPC 后必须重启 dev，否则渲染层调用旧 preload 方法静默失败（本次实测并已加 draftsApi 一次性 warn 可见化）。查重：仅桌面架构卡片覆盖该域，原位更新。
