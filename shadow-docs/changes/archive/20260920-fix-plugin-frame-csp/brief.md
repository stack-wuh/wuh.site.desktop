---
{
  "schema": "shadow-dev/v1",
  "name": "20260920-fix-plugin-frame-csp",
  "type": "fix",
  "scope": "renderer-shell",
  "status": "archived",
  "baseBranch": "main",
  "branch": "fix/20260920-fix-plugin-frame-csp",
  "files": [
    "src/main/index.ts",
    "src/renderer/index.html"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 9,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/9"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "ca787029ddac9b84cf9ffe66e52439135d5fe8b2",
    "verifiedAt": "2026-09-21T06:08:48.389Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:9",
    "planHash": "874cea61b5f8a399d480bc393d6b80fcdb0bef433d6a755cd47ad0660493ab7f",
    "updatedAt": null,
    "lastError": null
  },
  "knowledge": null
}
---

# 修复插件帧被 CSP 拦截 + 应用标题改名

## 动机
自动走查（CDP）发现 main 上插件视图帧全部被页面 CSP 拦截为空白：`index.html` 的 CSP 无 `frame-src`，`default-src 'self'` 把所有 `plugin://` 帧导航判为违规（"Framing ... violates CSP"），预览/主视图内容不可见。同批次携带应用标题改名（`wuh-site desktop` → `wuh.site`，用户工作区既有改动）。

## 引用规范
- shadow-docs/knowledge/desktop-app-architecture.md（父仓库）
  - 当前结论: local-resource 协议注册 standard+secure+cors 供插件帧加载
  - 适用 scope: apps/desktop
  - 遵循: 帧加载修复只在页面 CSP 层放行 plugin: 帧导航，不放宽协议安全属性、不动沙箱

## 决策
- **选型:** CSP 追加 `frame-src plugin:`——显式允许受控 plugin:// 协议作为帧源，其余 CSP 约束（script-src 等）不变
- **对比方案:** 为 plugin 协议加 `bypassCSP` 特权（放行面更大且不可细分，否决）
- **理由:** 帧源白名单是 CSP 的原生意图表达，最小放行面
- **已知残留:** Electron 44/Chromium 152 下沙箱帧的自定义协议导航仍偶发超时（`Navigation to external protocol blocked by sandbox` / ERR_ABORTED，逻辑帧必现）——与本修复无关，main 上同样存在，需专项 fix 变更（CDP 诊断记录见 walkthrough.cjs 与 .walkthrough/ 走查产物）

## 任务
### Phase 1
- [x] CSP 追加 `frame-src plugin:`；标题改名 `wuh.site` — `src/renderer/index.html` `src/main/index.ts` — 修改
- [x] 验证：走查确认浮窗帧加载成功（非 CSP 阻断错误页）；vitest 109/109、tsc 双侧通过 — 仓库根 — 验证

## 结果
- 实际耗时: 0.5h
- 验证: CDP 走查浮窗帧「加载成功（非错误页）」；vitest 109/109（icon-build 已随依赖重装修复）；tsc 双侧通过

## 知识评估
- **预期影响:** 更新
- **候选卡片:** 父仓库 desktop-app-architecture.md（协议约束段补充：页面 CSP `frame-src plugin:` 为插件帧加载前提）
- **理由:** CSP 与协议注册同属插件帧加载的稳定前提事实，需同卡记录

## 后续规划（本变更不含）
- 插件帧在 Electron 44 下沙箱导航偶发超时的专项修复（逻辑帧必现，影响 publisher 路径）
