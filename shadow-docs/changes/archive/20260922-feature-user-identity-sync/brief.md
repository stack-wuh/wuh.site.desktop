---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-feature-user-identity-sync",
  "type": "feature",
  "scope": "lib,components,app,tests,shadow-docs/knowledge",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260922-feature-user-identity-sync",
  "files": [
    "app/(shell)/layout.tsx",
    "components/SideMenu.tsx",
    "components/account/AccountPage.tsx",
    "components/home/HomePage.tsx",
    "lib/i18n/locales.ts",
    "lib/identity.ts",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "tests/identity-store.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 33,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/33",
    "pullRequest": 35,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/35"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "ef4f139ca193869e1bd1de0cf2defa22c2c736db",
    "verifiedAt": "2026-09-22T07:14:27.016Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:35",
    "planHash": "5e8988f2f1db211fd70bd4b6d06ed06bab02a90c03c9cfdba956460696cd9d06",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 用户栏与用户中心身份联动（头像/用户名同步 + 问候语带名）",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\nGitHub 授权数据（头像/昵称/login）目前只存在于用户中心页面（AccountPage 本地 state），左栏底部用户入口与其快捷面板始终显示品牌标 + wuh-site，首页问候语也只有「下午好」不带名字——已授权用户看不出\"我是谁\"。将身份收敛为全局单一数据源后，侧栏、快捷面板、首页问候与用户中心四处联动，授权/断开即时反映。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 左栏底部用户入口点击直达 `/account` 用户中心；用户中心为 GitHub 授权 + 身份/仓库 + Git 提交身份的归拢页；快捷面板「设置」项独立指向 `/settings`\n  - 适用 scope: 壳层导航与 /account 页职责边界（本变更不改变导航语义，仅替换入口的视觉数据源）\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 底部唯一入口 = 品牌标 IconLogo（头像占位）+ 应用名/版本；悬停弹 UserQuickPanel（头部「用户 · 版本 · 点击头像进入用户中心」）；Nav 不得设 overflow: hidden\n  - 适用 scope: SideMenu 用户入口/快捷面板的视觉数据源替换（结构、定位、键盘语义全部保持）\n\n## 决策\n- **选型:** 全局 identity store（`lib/identity.ts`，useSyncExternalStore，与 lib/tasks.ts、statusItems、floats 同构）——壳层挂载拉取一次，AccountPage 每次 reloadIdentity 成功后写穿（write-through），侧栏/首页/用户中心消费同一份\n- **对比方案:** 各组件挂载时自行拉取 `getGithubIdentity`——改动最小但三份状态各自为政，授权完成后侧栏/首页不刷新；否决\n- **理由:** 单一数据源 + 显式刷新点（壳层 mount + AccountPage reloadIdentity 写穿覆盖授权成功/PAT 保存/断开三个时机），状态天然一致；回退语义统一：**未授权/stale/尚未拉取一律回落现状（品牌标 IconLogo + wuh-site + 纯问候）**。已确认决策：入口与面板都同步；问候名昵称（name）优先、login 兜底；i18n 用 `t()` 的 `{name}` 占位（zh「，」/en「, 」/ja「、」）\n\n## 任务\n### Phase 1\n- [ ] 新增 `lib/identity.ts`：模块级 identity 缓存（null=已确认无身份）+ `refreshIdentity()`（getSettings().hasToken ? getGithubIdentity() : null，异常吞掉记 null）+ `syncIdentity()`（写穿入口）+ `useGithubIdentity()` hook — `lib/identity.ts` — 新增\n- [ ] 壳层挂载拉取一次：`app/(shell)/layout.tsx` 现有 mount effect 内 `void refreshIdentity()` — `app/(shell)/layout.tsx` — 修改\n- [ ] AccountPage 写穿：reloadIdentity 成功分支调用 `syncIdentity(...)`，页面自身 loading/error/stale 三态显示逻辑不动 — `components/account/AccountPage.tsx` — 修改\n\n### Phase 2\n- [ ] SideMenu 用户入口 + 快捷面板头部：已授权显示 GitHub 头像（img，回退 IconLogo）与显示名（name||login，回退 wuh-site）；版本与「点击头像进入用户中心」提示保留；折叠态 rail 图标同换头像 — `components/SideMenu.tsx` — 修改\n- [ ] 首页问候带名：`home.greetNamed` i18n key（{greeting}/{name} 占位 ×3 语言），HomePage 已授权时渲染「下午好，{name}」 — `components/home/HomePage.tsx`, `lib/i18n/locales.ts` — 修改\n- [ ] identity store 单测：hasToken=false → null；getGithubIdentity 抛错 → null；syncIdentity 写穿可订阅 — `tests/identity-store.test.ts` — 新增\n\n完整 brief：shadow-docs/changes/20260922-feature-user-identity-sync/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-feature-user-identity-sync\",\"type\":\"feature\",\"scope\":\"lib,components,app,tests,shadow-docs/knowledge\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-feature-user-identity-sync/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 用户栏与用户中心身份联动（头像/用户名同步 + 问候语带名）

## 动机

GitHub 授权数据（头像/昵称/login）目前只存在于用户中心页面（AccountPage 本地 state），左栏底部用户入口与其快捷面板始终显示品牌标 + wuh-site，首页问候语也只有「下午好」不带名字——已授权用户看不出"我是谁"。将身份收敛为全局单一数据源后，侧栏、快捷面板、首页问候与用户中心四处联动，授权/断开即时反映。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 左栏底部用户入口点击直达 `/account` 用户中心；用户中心为 GitHub 授权 + 身份/仓库 + Git 提交身份的归拢页；快捷面板「设置」项独立指向 `/settings`
  - 适用 scope: 壳层导航与 /account 页职责边界（本变更不改变导航语义，仅替换入口的视觉数据源）
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 底部唯一入口 = 品牌标 IconLogo（头像占位）+ 应用名/版本；悬停弹 UserQuickPanel（头部「用户 · 版本 · 点击头像进入用户中心」）；Nav 不得设 overflow: hidden
  - 适用 scope: SideMenu 用户入口/快捷面板的视觉数据源替换（结构、定位、键盘语义全部保持）

## 决策

- **选型:** 全局 identity store（`lib/identity.ts`，useSyncExternalStore，与 lib/tasks.ts、statusItems、floats 同构）——壳层挂载拉取一次，AccountPage 每次 reloadIdentity 成功后写穿（write-through），侧栏/首页/用户中心消费同一份
- **对比方案:** 各组件挂载时自行拉取 `getGithubIdentity`——改动最小但三份状态各自为政，授权完成后侧栏/首页不刷新；否决
- **理由:** 单一数据源 + 显式刷新点（壳层 mount + AccountPage reloadIdentity 写穿覆盖授权成功/PAT 保存/断开三个时机），状态天然一致；回退语义统一：**未授权/stale/尚未拉取一律回落现状（品牌标 IconLogo + wuh-site + 纯问候）**。已确认决策：入口与面板都同步；问候名昵称（name）优先、login 兜底；i18n 用 `t()` 的 `{name}` 占位（zh「，」/en「, 」/ja「、」）

## 任务

### Phase 1
- [x] 新增 `lib/identity.ts`：模块级 identity 缓存（null=已确认无身份）+ `refreshIdentity()`（getSettings().hasToken ? getGithubIdentity() : null，异常吞掉记 null）+ `syncIdentity()`（写穿入口）+ `useGithubIdentity()` hook — `lib/identity.ts` — 新增
- [x] 壳层挂载拉取一次：`app/(shell)/layout.tsx` 现有 mount effect 内 `void refreshIdentity()` — `app/(shell)/layout.tsx` — 修改
- [x] AccountPage 写穿：reloadIdentity 成功分支调用 `syncIdentity(...)`，页面自身 loading/error/stale 三态显示逻辑不动 — `components/account/AccountPage.tsx` — 修改

### Phase 2
- [x] SideMenu 用户入口 + 快捷面板头部：已授权显示 GitHub 头像（img，回退 IconLogo）与显示名（name||login，回退 wuh-site）；版本与「点击头像进入用户中心」提示保留；折叠态 rail 图标同换头像 — `components/SideMenu.tsx` — 修改
- [x] 首页问候带名：`home.greetNamed` i18n key（{greeting}/{name} 占位 ×3 语言），HomePage 已授权时渲染「下午好，{name}」 — `components/home/HomePage.tsx`, `lib/i18n/locales.ts` — 修改
- [x] identity store 单测：hasToken=false → null；getGithubIdentity 抛错 → null；syncIdentity 写穿可订阅 — `tests/identity-store.test.ts` — 新增

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md、shadow-docs/knowledge/shell-chrome-design.md
- **理由:** 用户入口/快捷面板段需从「品牌标 + 应用名占位」更新为「已授权投影 GitHub 身份、未授权回落品牌标」的双态语义；身份全局 store 是新的壳层事实（挂载拉取 + 写穿刷新点），归入壳层路由卡的账户段
