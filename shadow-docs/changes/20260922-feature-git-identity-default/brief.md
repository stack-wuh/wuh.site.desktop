---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-feature-git-identity-default",
  "type": "feature",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260922-feature-git-identity-default",
  "files": [
    "components/account/AccountPage.tsx",
    "lib/i18n/locales.ts",
    "src/main/git.ts",
    "src/main/ipc.ts",
    "src/preload/index.ts",
    "src/shared/types.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 34,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/34",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "e4ef780d0284c0332c754f40b621f4576fcff010",
    "verifiedAt": "2026-09-22T07:12:09.135Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "e4ef780d0284c0332c754f40b621f4576fcff010",
    "planHash": "18e077894ab9a778eb7e8d7159ca1907b2f3b992daf40899561d41cf941abcc8",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] Git 提交身份默认值——账户页展示本机 git 全局配置",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n用户中心的 Git 提交身份区块（user.name/user.email）留空时实际回退本机 git 配置（`gitCommit` 的 `-c` 注入仅在字段非空时生效，见 `src/main/git.ts`），但输入框空置时用户看不到「提交时会用什么身份」。期望：默认展示当前电脑 git 配置作为默认值，用户需要时可自定义覆盖。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: `/account` → AccountPage（用户中心：OAuth 授权 + 身份/仓库/默认站点仓库 + Git 提交身份）；本变更在既有页面内迭代，无路由变更；i18n 三语字典 key 集合一致性由 `tests/i18n.test.ts` 锁定\n  - 适用 scope: app, components, lib\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 文案一律经 `useT()` 三语字典；样式 styled-components、自动化定位用 aria/`data-*` 稳定属性；图标走 `components/icons` 注册表\n  - 适用 scope: components, lib\n\n## 决策\n- **选型:** 方案 A——默认值只展示、不落库：主进程读本机 git **全局** `user.name`/`user.email`（simple-git 裸实例 `config --global --get`，非 0 退出或空输出 → null）经 IPC `getGitIdentityDefault` 返回；账户页 Git 区块 mount 拉取一次，输入框空值时 placeholder 呈现默认值（未配置显示「本机未配置」），描述行标注「留空时使用本机 Git 全局配置」。settings 与 `gitCommit` 的 `-c` 注入逻辑零改动。\n- **对比方案:** B 预填并写入 settings——把全局值复制进应用配置，全局后续变更不同步、「清除」语义混乱、需额外 dirty 标记，弃；C 仅改文案不展示具体值——用户仍看不到默认值是什么，不满足诉求，弃。\n- **理由:** 现有语义「留空 = git 默认解析（repo-local → global → system）」本就正确，缺的只是可见性；placeholder + 描述行让默认值可见且零状态污染，全局配置变更即时反映。读取范围限定 `--global`：app 身份注入是命令级 `-c`，repo-local 值属终端手动配置的边缘场景，留待真实需要再迭代（记录为后续可迭代点）。\n\n## 任务\n### Phase 1\n- [ ] DesktopApi 增 `getGitIdentityDefault()` 与 `GitIdentityDefault` 类型 — `src/shared/types.ts` — 新增\n- [ ] 契约三处同步：ipc.ts handlers 表默认实现 + preload invoke 转发 — `src/main/ipc.ts`, `src/preload/index.ts` — 修改\n- [ ] 主进程实现并经 implement() 注册：读全局身份，异常/空 → null — `src/main/git.ts` — 修改\n### Phase 2\n- [ ] AccountPage Git 区块 mount 拉取默认值；placeholder/描述行动态展示 — `components/account/AccountPage.tsx` — 修改\n- [ ] i18n 三语：`account.gitDesc` 改写 + 新增默认值展示/未配置 key（key 集合三语一致） — `lib/i18n/locales.ts` — 修改\n### Phase 3\n- [ ] pnpm typecheck / lint / vitest（含 i18n key 一致性）全绿 — `` — 验证\n\n完整 brief：shadow-docs/changes/20260922-feature-git-identity-default/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-feature-git-identity-default\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-feature-git-identity-default/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# Git 提交身份默认值——账户页展示本机 git 全局配置

## 动机
用户中心的 Git 提交身份区块（user.name/user.email）留空时实际回退本机 git 配置（`gitCommit` 的 `-c` 注入仅在字段非空时生效，见 `src/main/git.ts`），但输入框空置时用户看不到「提交时会用什么身份」。期望：默认展示当前电脑 git 配置作为默认值，用户需要时可自定义覆盖。

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: `/account` → AccountPage（用户中心：OAuth 授权 + 身份/仓库/默认站点仓库 + Git 提交身份）；本变更在既有页面内迭代，无路由变更；i18n 三语字典 key 集合一致性由 `tests/i18n.test.ts` 锁定
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 文案一律经 `useT()` 三语字典；样式 styled-components、自动化定位用 aria/`data-*` 稳定属性；图标走 `components/icons` 注册表
  - 适用 scope: components, lib

## 决策
- **选型:** 方案 A——默认值只展示、不落库：主进程读本机 git **全局** `user.name`/`user.email`（simple-git 裸实例 `config --global --get`，非 0 退出或空输出 → null）经 IPC `getGitIdentityDefault` 返回；账户页 Git 区块 mount 拉取一次，输入框空值时 placeholder 呈现默认值（未配置显示「本机未配置」），描述行标注「留空时使用本机 Git 全局配置」。settings 与 `gitCommit` 的 `-c` 注入逻辑零改动。
- **对比方案:** B 预填并写入 settings——把全局值复制进应用配置，全局后续变更不同步、「清除」语义混乱、需额外 dirty 标记，弃；C 仅改文案不展示具体值——用户仍看不到默认值是什么，不满足诉求，弃。
- **理由:** 现有语义「留空 = git 默认解析（repo-local → global → system）」本就正确，缺的只是可见性；placeholder + 描述行让默认值可见且零状态污染，全局配置变更即时反映。读取范围限定 `--global`：app 身份注入是命令级 `-c`，repo-local 值属终端手动配置的边缘场景，留待真实需要再迭代（记录为后续可迭代点）。

## 任务
### Phase 1
- [x] DesktopApi 增 `getGitIdentityDefault()` 与 `GitIdentityDefault` 类型 — `src/shared/types.ts` — 新增
- [x] 契约三处同步：ipc.ts handlers 表默认实现 + preload invoke 转发 — `src/main/ipc.ts`, `src/preload/index.ts` — 修改
- [x] 主进程实现并经 implement() 注册：读全局身份，异常/空 → null — `src/main/git.ts` — 修改
### Phase 2
- [x] AccountPage Git 区块 mount 拉取默认值；placeholder/描述行动态展示 — `components/account/AccountPage.tsx` — 修改
- [x] i18n 三语：`account.gitDesc` 改写 + 新增默认值展示/未配置 key（key 集合三语一致） — `lib/i18n/locales.ts` — 修改
### Phase 3
- [x] pnpm typecheck / lint / vitest（含 i18n key 一致性）全绿 — `` — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 无需变更
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（`/account` 行描述仍准确；若 apply 中交互超出「输入框 placeholder + 描述行」范畴再评估）
- **理由:** 既有 Git 提交身份区块的可见性增强，不引入新路由/新机制/新契约模式（IPC 契约三处同步是既定模式）
