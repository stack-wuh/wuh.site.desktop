---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-fix-git-identity-guard",
  "type": "fix",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "fix/20260922-fix-git-identity-guard",
  "files": [
    "components/account/AccountPage.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 39,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/39",
    "pullRequest": 40,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/40"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "b4ab8634cfa8e58a90121172f7166eef382fab21",
    "verifiedAt": "2026-09-22T07:52:19.059Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:40",
    "planHash": "12b1099612c4366b9b6d73040944787ca9471019167f5d6f400ca6e523cb3153",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] Git 身份默认值调用防降级——契约偏差不再崩账户页",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n`AccountPage` mount 时直接 `window.api.getGitIdentityDefault()`，若渲染层与 preload 出现版本偏差（dev 下 Next HMR 先于 Electron 重启更新到新代码，旧 `out/preload/index.js` 无此方法），属性访问抛 TypeError 使整个账户页崩溃。用户实际踩到：`Runtime TypeError: window.api.getGitIdentityDefault is not a function`。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: `/account` → AccountPage 在既有页面内迭代；i18n 三语 key 集合一致性由 `tests/i18n.test.ts` 锁定\n  - 适用 scope: components, lib\n\n## 决策\n- **选型:** 将 IPC 调用延迟进 promise 链（`Promise.resolve().then(() => window.api.getGitIdentityDefault())`），属性访问的 TypeError 变为 rejection，被既有 `.catch(() => undefined)` 吞掉——状态保持 null，placeholder 走「本机未配置」降级展示。\n- **对比方案:** `typeof` 特征检测分支——等价但多一层分支与注释；包装进 promise 链复用既有 catch，改动最小，选后者。\n- **理由:** 生产环境渲染层与 preload 同 asar 同版本不会偏差，此崩溃仅现于 dev 热更窗口期；降级语义与「读取失败」一致，不影响正确性。\n\n## 任务\n### Phase 1\n- [ ] AccountPage Git 默认值 effect 包装 promise 链防契约偏差 — `components/account/AccountPage.tsx` — 修改\n### Phase 2\n- [ ] pnpm typecheck + vitest 全绿（无组件级测试基建，防降级路径以 dev 手动验证） — `` — 验证\n\n完整 brief：shadow-docs/changes/20260922-fix-git-identity-guard/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-fix-git-identity-guard\",\"type\":\"fix\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-fix-git-identity-guard/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# Git 身份默认值调用防降级——契约偏差不再崩账户页

## 动机
`AccountPage` mount 时直接 `window.api.getGitIdentityDefault()`，若渲染层与 preload 出现版本偏差（dev 下 Next HMR 先于 Electron 重启更新到新代码，旧 `out/preload/index.js` 无此方法），属性访问抛 TypeError 使整个账户页崩溃。用户实际踩到：`Runtime TypeError: window.api.getGitIdentityDefault is not a function`。

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: `/account` → AccountPage 在既有页面内迭代；i18n 三语 key 集合一致性由 `tests/i18n.test.ts` 锁定
  - 适用 scope: components, lib

## 决策
- **选型:** 将 IPC 调用延迟进 promise 链（`Promise.resolve().then(() => window.api.getGitIdentityDefault())`），属性访问的 TypeError 变为 rejection，被既有 `.catch(() => undefined)` 吞掉——状态保持 null，placeholder 走「本机未配置」降级展示。
- **对比方案:** `typeof` 特征检测分支——等价但多一层分支与注释；包装进 promise 链复用既有 catch，改动最小，选后者。
- **理由:** 生产环境渲染层与 preload 同 asar 同版本不会偏差，此崩溃仅现于 dev 热更窗口期；降级语义与「读取失败」一致，不影响正确性。

## 任务
### Phase 1
- [x] AccountPage Git 默认值 effect 包装 promise 链防契约偏差 — `components/account/AccountPage.tsx` — 修改
### Phase 2
- [x] pnpm typecheck + vitest 全绿（无组件级测试基建，防降级路径以 dev 手动验证） — `` — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 纯调用点防御性包装，不产生新的长期事实
