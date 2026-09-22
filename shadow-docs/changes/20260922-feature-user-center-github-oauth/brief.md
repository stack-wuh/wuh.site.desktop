---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-feature-user-center-github-oauth",
  "type": "feature",
  "scope": "desktop",
  "status": "branched",
  "baseBranch": "main",
  "branch": "feature/20260922-feature-user-center-github-oauth",
  "files": [
    "app/(shell)/account/page.tsx",
    "components/SideMenu.tsx",
    "components/account/AccountPage.tsx",
    "components/settings/SettingsPage.tsx",
    "lib/i18n/locales.ts",
    "lib/routes.ts",
    "src/main/credentials.ts",
    "src/main/device-flow.ts",
    "src/main/github/identity.ts",
    "src/main/index.ts",
    "src/shared/types.ts",
    "tests/device-flow.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 30,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/30",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:30",
    "planHash": "925f95b893ae913492a2695ee71f0b791d83d18844c3c134c8d124b8b6cf737c",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 用户中心：GitHub OAuth 授权（Device Flow）+ 身份/仓库/账号归拢",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n桌面端目前只有「手动粘贴 PAT」一条凭证路径（`credentials.ts` safeStorage 落盘 `gh-token.bin`），设置页裸 token 输入体验差且无授权状态感知。左栏底部用户入口点击进设置页是「用户模块接入前的替身」（shell-chrome-design 卡预留位）。本期接入用户中心：GitHub OAuth 拿用户 token，自由操作用户仓库，为后续托管中心铺路。\n\n## 引用规范\n- `apps/desktop/shadow-docs/knowledge/shell-chrome-design.md`\n  - 当前结论: 用户入口点击去向/高亮为 layout 传入 prop（替身）；图标走 `components/icons` 注册表；styled-components + token；`useSyncExternalStore` 三参；文案走 `useT()` 三语\n  - 适用 scope: components、app、lib\n- `apps/desktop/shadow-docs/knowledge/renderer-shell-routing.md`\n  - 当前结论: 静态导出 + `app://` 加载，渲染层零网络、数据全走 IPC；新增右栏页面 = 新增 `app/(shell)/<segment>/page.tsx`；客户端组件一律 'use client'\n  - 适用 scope: app、components、lib\n- `x.wuh.site/shadow-docs/knowledge/desktop-app-architecture.md`\n  - 当前结论: 凭证 safeStorage 加密存系统钥匙串，不写仓库配置、报错脱敏；渲染进程无 nodeIntegration，fs/网络收敛主进程\n  - 适用 scope: src/main、src/preload、src/shared\n- 父仓库 `shadow-docs/knowledge/admin-console.md`\n  - 当前结论: 服务端 GitHub OAuth + HttpOnly Cookie——桌面端无后端，**不适用**，仅作 OAuth 语义参照\n\n## 决策\n- **选型:** 方案 A——GitHub OAuth Device Flow（VS Code / gh CLI 同款）。主进程 Node 环境直接调 `github.com/login/device/code` 与 `access_token` 轮询端点（无 CORS 约束），内嵌 client_id（公开无害），无需 client_secret、无本地回调服务器，与静态导出架构零冲突；用户在浏览器输入一次 8 位 user_code（自动进剪贴板 + 自动开页）。\n- **对比方案:** B（Web Flow + localhost 回调）体验更顺但需内嵌 client_secret 且起临时端口，个人工具不值复杂度；C（细粒度 GitHub App）权限最小化但注册/安装流程重、仓库范围受限，与「自由操作用户仓库」目标相悖。\n- **理由:** Device Flow 是无后端桌面应用的安全/复杂度最优平衡。Knowledge 遵循：token 仍走 safeStorage 单槽位（kind 标记 oauth|pat，向后兼容旧裸 token），git push 凭证注入链路零改动；渲染层零网络，新增 IPC 契约走 `implement()`；新增 `/account` 右栏页面符合路由约定；替身退役 = layout 传 prop 改路由 + `routeKeyFromPathname` 加 account 段。\n\n**前置依赖:** 需在 GitHub 注册 OAuth App（勾选 Enable Device Flow）提供 client_id；apply 阶段以常量/环境变量占位，真值由用户提供后填入。\n\n## 任务\n### Phase 1 主进程授权基建\n\n- [ ] 新建 `src/main/device-flow.ts` — start（POST /login/device/code，scope：repo workflow read:user）/ 按 interval 轮询（处理 authorization_pending / slow_back / expired_token / access_denied）/ cancel；client_id 常量占位\n- [ ] `src/shared/types.ts` + `src/main/credentials.ts` — 契约新增 `DeviceFlowStatus`/`GithubIdentity`/`RepoSummary` 与 IPC 方法类型；token 槽位加密文 JSON `{kind: 'oauth'|'pat', token}`，解密解析失败回退旧裸 token（视为 pat）\n- [ ] 新建 `src/main/github/identity.ts` — `getGithubIdentity`（GET /user + `X-OAuth-Scopes` 响应头）、`listUserRepos`（GET /user/repos，分页聚合）；401 标记 stale；`src/main/index.ts` 挂载 import 使 implement 注册\n- [ ] 新建 `tests/device-flow.test.ts` — mock fetch 覆盖 pending/slow_down/成功/denied/expired 与 cancel 语义\n\n### Phase 2 渲染层用户中心 + 壳层接入\n\n- [ ] 新建 `app/(shell)/account/page.tsx` + `components/account/AccountPage.tsx` — 未授权态（开始授权 → user_code 展示 + 复制 + 打开浏览器 + 轮询 loading）/已授权态两段 UI，样式 token + 稳定属性\n- [ ] `components/account/` 内身份卡 — 头像/用户名/scopes 展示、断开授权（确认）、stale 失效横幅与重新授权引导；「高级：手动粘贴 Token」折叠区（PAT 回退，原 services 逻辑迁入）\n- [ ] 仓库维度 — `listUserRepos` 拉取 + 客户端搜索过滤；「默认站点仓库」选择持久化（settings 新字段），为托管中心铺路\n- [ ] 账号归拢 — `gitUserName`/`gitUserEmail` 输入迁入 `/account`；`components/settings/SettingsPage.tsx` 移除 token 输入与 git-identity 分区，仅剩应用级设置\n- [ ] 壳层接入 — `lib/routes.ts` `routeKeyFromPathname` 加 `/account` 段；`app/(shell)/layout.tsx` 用户入口点击去向/`userActive` 改指 account；`lib/i18n/locales.ts` 三语 key（tests/i18n.test.ts 自动锁一致性）\n- [ ] 回归 — `pnpm typecheck` + `pnpm test` 全绿；dev 走查授权流（无 client_id 时 UI 可达、流程不崩溃）\n\n完整 brief：shadow-docs/changes/20260922-feature-user-center-github-oauth/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-feature-user-center-github-oauth\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-feature-user-center-github-oauth/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  }
}
---

# 用户中心：GitHub OAuth 授权（Device Flow）+ 身份/仓库/账号归拢

## 动机

桌面端目前只有「手动粘贴 PAT」一条凭证路径（`credentials.ts` safeStorage 落盘 `gh-token.bin`），设置页裸 token 输入体验差且无授权状态感知。左栏底部用户入口点击进设置页是「用户模块接入前的替身」（shell-chrome-design 卡预留位）。本期接入用户中心：GitHub OAuth 拿用户 token，自由操作用户仓库，为后续托管中心铺路。

## 引用规范

- `apps/desktop/shadow-docs/knowledge/shell-chrome-design.md`
  - 当前结论: 用户入口点击去向/高亮为 layout 传入 prop（替身）；图标走 `components/icons` 注册表；styled-components + token；`useSyncExternalStore` 三参；文案走 `useT()` 三语
  - 适用 scope: components、app、lib
- `apps/desktop/shadow-docs/knowledge/renderer-shell-routing.md`
  - 当前结论: 静态导出 + `app://` 加载，渲染层零网络、数据全走 IPC；新增右栏页面 = 新增 `app/(shell)/<segment>/page.tsx`；客户端组件一律 'use client'
  - 适用 scope: app、components、lib
- `x.wuh.site/shadow-docs/knowledge/desktop-app-architecture.md`
  - 当前结论: 凭证 safeStorage 加密存系统钥匙串，不写仓库配置、报错脱敏；渲染进程无 nodeIntegration，fs/网络收敛主进程
  - 适用 scope: src/main、src/preload、src/shared
- 父仓库 `shadow-docs/knowledge/admin-console.md`
  - 当前结论: 服务端 GitHub OAuth + HttpOnly Cookie——桌面端无后端，**不适用**，仅作 OAuth 语义参照

## 决策

- **选型:** 方案 A——GitHub OAuth Device Flow（VS Code / gh CLI 同款）。主进程 Node 环境直接调 `github.com/login/device/code` 与 `access_token` 轮询端点（无 CORS 约束），内嵌 client_id（公开无害），无需 client_secret、无本地回调服务器，与静态导出架构零冲突；用户在浏览器输入一次 8 位 user_code（自动进剪贴板 + 自动开页）。
- **对比方案:** B（Web Flow + localhost 回调）体验更顺但需内嵌 client_secret 且起临时端口，个人工具不值复杂度；C（细粒度 GitHub App）权限最小化但注册/安装流程重、仓库范围受限，与「自由操作用户仓库」目标相悖。
- **理由:** Device Flow 是无后端桌面应用的安全/复杂度最优平衡。Knowledge 遵循：token 仍走 safeStorage 单槽位（kind 标记 oauth|pat，向后兼容旧裸 token），git push 凭证注入链路零改动；渲染层零网络，新增 IPC 契约走 `implement()`；新增 `/account` 右栏页面符合路由约定；替身退役 = layout 传 prop 改路由 + `routeKeyFromPathname` 加 account 段。

**前置依赖:** 需在 GitHub 注册 OAuth App（勾选 Enable Device Flow）提供 client_id；apply 阶段以常量/环境变量占位，真值由用户提供后填入。

## 任务

### Phase 1 主进程授权基建

- [x] 新建 `src/main/device-flow.ts` — start（POST /login/device/code，scope：repo workflow read:user）/ 按 interval 轮询（处理 authorization_pending / slow_back / expired_token / access_denied）/ cancel；client_id 常量占位
- [x] `src/shared/types.ts` + `src/main/credentials.ts` — 契约新增 `DeviceFlowStatus`/`GithubIdentity`/`RepoSummary` 与 IPC 方法类型；token 槽位加密文 JSON `{kind: 'oauth'|'pat', token}`，解密解析失败回退旧裸 token（视为 pat）
- [x] 新建 `src/main/github/identity.ts` — `getGithubIdentity`（GET /user + `X-OAuth-Scopes` 响应头）、`listUserRepos`（GET /user/repos，分页聚合）；401 标记 stale；`src/main/index.ts` 挂载 import 使 implement 注册
- [x] 新建 `tests/device-flow.test.ts` — mock fetch 覆盖 pending/slow_down/成功/denied/expired 与 cancel 语义

### Phase 2 渲染层用户中心 + 壳层接入

- [x] 新建 `app/(shell)/account/page.tsx` + `components/account/AccountPage.tsx` — 未授权态（开始授权 → user_code 展示 + 复制 + 打开浏览器 + 轮询 loading）/已授权态两段 UI，样式 token + 稳定属性
- [x] `components/account/` 内身份卡 — 头像/用户名/scopes 展示、断开授权（确认）、stale 失效横幅与重新授权引导；「高级：手动粘贴 Token」折叠区（PAT 回退，原 services 逻辑迁入）
- [x] 仓库维度 — `listUserRepos` 拉取 + 客户端搜索过滤；「默认站点仓库」选择持久化（settings 新字段），为托管中心铺路
- [x] 账号归拢 — `gitUserName`/`gitUserEmail` 输入迁入 `/account`；`components/settings/SettingsPage.tsx` 移除 token 输入与 git-identity 分区，仅剩应用级设置
- [x] 壳层接入 — `lib/routes.ts` `routeKeyFromPathname` 加 `/account` 段；`app/(shell)/layout.tsx` 用户入口点击去向/`userActive` 改指 account；`lib/i18n/locales.ts` 三语 key（tests/i18n.test.ts 自动锁一致性）
- [x] 回归 — `pnpm typecheck` + `pnpm test` 全绿；dev 走查授权流（无 client_id 时 UI 可达、流程不崩溃）

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `apps/desktop/shadow-docs/knowledge/shell-chrome-design.md`（用户入口替身退役 → 点击直达 `/account`，用户快捷面板语义不变）；`x.wuh.site/shadow-docs/knowledge/desktop-app-architecture.md`（凭证槽位 kind 标记 + Device Flow 路径）
- **理由:** 用户入口行为与凭证获取路径均为卡片「当前结论」级事实，合入后需回写；归档阶段更新。
