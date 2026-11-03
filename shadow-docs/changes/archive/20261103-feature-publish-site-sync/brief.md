---
{
  "schema": "shadow-dev/v1",
  "name": "20261103-feature-publish-site-sync",
  "type": "feature",
  "scope": "src/main,src/shared,publish",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20261103-feature-publish-site-sync",
  "files": [
    "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
    "lib/i18n/locales.ts",
    "src/main/ipc.ts",
    "src/main/register-features.ts",
    "src/main/siteSync.ts",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "tests/site-sync.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 171,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/171",
    "pullRequest": 176,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/176"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "62afaa962f10678ee24591618051656ffe3eb63e",
    "verifiedAt": "2026-11-03T23:55:53.387Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:176",
    "planHash": "8d25c84c90d09a471a3f755326c093d8afc0bbe92314bed47773f7c67d4847bd",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 发布后站点同步：desktop 直呼 + GitHub webhook 修复",
      "titleRaw": "发布后站点同步：desktop 直呼 + GitHub webhook 修复",
      "supplement": "发布更新 issue 后站点 DB 不更新（bug）：CLI ping 只对本地 dev 有效（生产路由是 /api/webhook/sync 非 /v2），GitHub webhook 投递为空且 content_type=form 与验签不匹配。方案 C：desktop 发布成功后直呼生产同步端点（可观测可重试）+ webhook 修复兜底全渠道；详见 shadow-docs/changes/20261103-feature-publish-site-sync/brief.md",
      "body": "## 动机\n发布链设计为「Issue 为源、DB 为镜像」，但两条同步通道当前都是断的，造成 desktop 点【发布】更新 issue 后站点 DB 不更新（用户实测 bug）：\n\n1. **CLI ping 链**：CLI 发布后 ping `{syncUrl}/v2/webhook/sync/{n}`，desktop 不传 `--sync-url` → 打默认 `localhost:3200`（本机无 server）→ 静默失败。且 CLI ping 路径硬编码 `/v2/webhook/sync`，生产路由实测为 `/api/webhook/sync`（`POST wuh.site/api/webhook/sync/999999` → 500 路由存在；`/v2/...` → 404）——CLI ping 天生打不到生产，只对本地 dev 有效。\n2. **GitHub webhook 链**：blog 仓库 hook（`wuh.site/api/webhook/github`，active，订阅 issues/issue_comment）投递记录为空（从未成功送达），且 content_type=form 与 server 端 HMAC(JSON.stringify(payload)) 验签方式不匹配——即便触发也同步不了。\n\n方案（用户已确认 C 组合）：desktop 发布成功后主动直呼生产同步端点（即时、可观测、可重试）+ 修复 GitHub webhook（兜底覆盖「网页直接改 issue」等所有渠道）。两链收敛到同一幂等 `syncIssue`（从 GitHub 拉取 upsert），不冲突。\n\n## 引用规范\n- shadow-docs/knowledge/desktop-app-architecture.md（父仓库）\n  - 当前结论: fs/网络操作收敛主进程经类型安全 IPC；凭证不进报错\n  - 适用 scope: src/main/siteSync.ts\n  - 遵循方式: 同步调用在主进程新模块实现，渲染层只经 IPC 触发；siteUrl 非凭证随请求传入\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 文档操作经命令通道由常驻壳层 EditorCommandHost 单实例认领编排\n  - 适用 scope: components/capsule/sections/EditorSection/EditorCommandHost.tsx\n  - 遵循方式: 同步步骤挂在 runPublish 发布成功之后（编排归命令宿主），磁贴不直呼 IPC\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: Message 横幅承载带动作的反馈，toast 用于短提示\n  - 适用 scope: lib/feedback, EditorCommandHost\n  - 遵循方式: 发布结果横幅两态（已发布并同步 / 已发布但同步失败+重试动作）；重试成功后横幅更新\n\n## 决策\n- **选型:** 方案 C——desktop 直呼（本变更代码）+ GitHub webhook 修复（本变更运维任务）。\n- **对比方案:** ①仅修 webhook——同步异步不可见，发布横幅无法确认 DB 已更新；②仅 desktop 直呼——网页直接改 issue 的场景继续漏；③让 CLI 适配生产路由（`/api/webhook/sync`）——CLI ping 仍不可观测，且 CLI 改动牵一发（本地 dev 路径语义变化），否决。\n- **理由:** 双链幂等互补：直呼管「即时反馈 + 可重试」，webhook 管「全渠道兜底」。同步端点免签名属既有事实（记待确认点：server 侧宜为 `sync/:n` 加共享密钥校验，防公网滥用触发 GitHub API 消耗——不在本次范围）。\n- **运维任务（webhook 修复）:** blog 仓库 hook 611569789 PATCH content_type=json → `POST hooks/:id/pings` 触发 test ping → 查 deliveries 断言 2xx；若 400（secret 不对齐）升级为用户配合项（需生产 `GITHUB_WEBHOOK_SECRET` 对齐，本机不可见）。server 验签采用 JSON.stringify(payload) 而非 raw body——若 secret 对齐后仍 400，实锤该缺陷，开 server 仓 follow-up change（待确认点）。\n\n## 任务\n### Phase 1 — 主进程同步模块\n- [ ] task 1 — `src/main/siteSync.ts` — `syncIssueToSite(issueNumber, siteUrl)`：URL 组装（`{base}/api/webhook/sync/{n}`，base 去尾斜杠）、15s 超时、非 2xx 失败透状态码、报错脱敏（无凭证仍走统一脱敏管道）+ `implement('syncIssueToSite')` + 单测（INV-4/INV-5，mock fetch）\n- [ ] task 2 — `src/main/register-features.ts` + `src/shared/types.ts` + `src/preload/index.ts` — 模块注册 + `SiteSyncResult` 契约 + DesktopApi 透传\n### Phase 2 — 发布编排与设置\n- [ ] task 3 — `components/capsule/sections/EditorSection/EditorCommandHost.tsx` — runPublish 发布成功（回写后）调同步：横幅两态（capsule.publishSynced / capsule.publishSyncFailed+重试动作），重试只重发同步（INV-2/INV-3）\n- [ ] task 4 — `components/settings/SettingsPage.tsx`（或既有站点设置区块）+ `lib/i18n/locales.ts` — 「站点同步地址」设置项（`wd.siteSyncUrl`，默认 `https://wuh.site`，https 校验，三语键）\n### Phase 3 — 测试\n- [ ] task 5 — `tests/site-sync.test.ts` + 编排测试扩展 — URL 组装/成功/非 2xx/超时/默认兜底 + 重试路径（重试调用 syncIssueToSite 而非 publish）\n### Phase 4 — 运维与真机\n- [ ] task 6 — webhook 修复 — blog 仓库 hook 611569789（gh api）：PATCH content_type=json → test ping → deliveries 断言 2xx；400 则记用户配合项 — 无代码 — 运维\n- [ ] task 7 — 真机走查 — desktop 发布（update 场景）→ 横幅「已发布并同步」→ 站点内容刷新可见；断网场景 → 「已发布但同步失败」→ 重试成功 — 全链 — runtime 观察点\n\n## 补充\n发布更新 issue 后站点 DB 不更新（bug）：CLI ping 只对本地 dev 有效（生产路由是 /api/webhook/sync 非 /v2），GitHub webhook 投递为空且 content_type=form 与验签不匹配。方案 C：desktop 发布成功后直呼生产同步端点（可观测可重试）+ webhook 修复兜底全渠道；详见 shadow-docs/changes/20261103-feature-publish-site-sync/brief.md\n\n完整 brief：shadow-docs/changes/20261103-feature-publish-site-sync/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261103-feature-publish-site-sync\",\"type\":\"feature\",\"scope\":\"src/main,src/shared,publish\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261103-feature-publish-site-sync/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
        "lib/i18n/locales.ts",
        "src/main/ipc.ts",
        "src/main/register-features.ts",
        "src/main/siteSync.ts",
        "src/preload/index.ts",
        "src/shared/types.ts",
        "tests/site-sync.test.ts"
      ],
      "message": "feat(publish): 发布后站点同步——直呼生产 sync 端点刷新 DB 镜像，横幅两态可重试 (#171)\n\n- 新增主进程 siteSync 模块：复用 AppSettings.siteBaseUrl 推导 {origin}/api/webhook/sync/{n}（与 aboutActivity 同源约定），15s 超时、非 2xx 透状态码\n- runPublish 发布成功后同步，失败横幅「已发布但同步失败」+ 重试只重发同步不重发布\n- 横幅三语键 4 枚；站点地址不新建设置项（复用既有 siteBaseUrl）"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/publish-site-sync.md",
    "reason": "发布域五变更（同步双链/任务时间线/pod 触发面/下架生命周期/hooks 收敛）结论统一沉淀至新卡 publish-site-sync.md；真实走查 blog#175 全链取证（create/sync 201/reopen/unpublish/closed-sync 201）；editor.md 与 shell-chrome-design.md 的词表与归属增量由新卡统一登记"
  }
}
---

# 发布后站点同步：desktop 直呼 + GitHub webhook 修复（update/create 链收口）

## 动机

发布链设计为「Issue 为源、DB 为镜像」，但两条同步通道当前都是断的，造成 desktop 点【发布】更新 issue 后站点 DB 不更新（用户实测 bug）：

1. **CLI ping 链**：CLI 发布后 ping `{syncUrl}/v2/webhook/sync/{n}`，desktop 不传 `--sync-url` → 打默认 `localhost:3200`（本机无 server）→ 静默失败。且 CLI ping 路径硬编码 `/v2/webhook/sync`，生产路由实测为 `/api/webhook/sync`（`POST wuh.site/api/webhook/sync/999999` → 500 路由存在；`/v2/...` → 404）——CLI ping 天生打不到生产，只对本地 dev 有效。
2. **GitHub webhook 链**：blog 仓库 hook（`wuh.site/api/webhook/github`，active，订阅 issues/issue_comment）投递记录为空（从未成功送达），且 content_type=form 与 server 端 HMAC(JSON.stringify(payload)) 验签方式不匹配——即便触发也同步不了。

方案（用户已确认 C 组合）：desktop 发布成功后主动直呼生产同步端点（即时、可观测、可重试）+ 修复 GitHub webhook（兜底覆盖「网页直接改 issue」等所有渠道）。两链收敛到同一幂等 `syncIssue`（从 GitHub 拉取 upsert），不冲突。

## 复杂度评级

- **评级:** L
- **理由:** ①契约变更——DesktopApi 新增 `syncIssueToSite` IPC；②跨模块数据流——发布编排（渲染层）→ 主进程网络调用 → 生产 server → DB；③同步是外向副作用（写生产 DB 镜像），失败语义与重试路径需要不变量看守。
- **期望验证深度:** unit + runtime
- **取证策略:** assert-first（表格型语义最便宜：URL 组装/成功/非 2xx/超时/默认地址兜底/重试只重发同步不重发布）

## 引用规范

- shadow-docs/knowledge/desktop-app-architecture.md（父仓库）
  - 当前结论: fs/网络操作收敛主进程经类型安全 IPC；凭证不进报错
  - 适用 scope: src/main/siteSync.ts
  - 遵循方式: 同步调用在主进程新模块实现，渲染层只经 IPC 触发；siteUrl 非凭证随请求传入
- shadow-docs/knowledge/editor.md
  - 当前结论: 文档操作经命令通道由常驻壳层 EditorCommandHost 单实例认领编排
  - 适用 scope: components/capsule/sections/EditorSection/EditorCommandHost.tsx
  - 遵循方式: 同步步骤挂在 runPublish 发布成功之后（编排归命令宿主），磁贴不直呼 IPC
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: Message 横幅承载带动作的反馈，toast 用于短提示
  - 适用 scope: lib/feedback, EditorCommandHost
  - 遵循方式: 发布结果横幅两态（已发布并同步 / 已发布但同步失败+重试动作）；重试成功后横幅更新

## 领域模型

- **限界上下文:** 桌面端发布同步——发布成功后的 DB 镜像刷新。上游 = runPublish 发布结果（issueNumber/created）；下游 = 生产 server `POST /api/webhook/sync/{n}` → syncIssue（GitHub 拉取 upsert）。反腐边界：不改 CLI（其 ping 只服务本地 dev）、不改 server 代码、不改插件链路。
- **统一语言增量:**
  - 站点同步（site sync）：发布成功后对生产同步端点的直呼刷新，负载只有 issueNumber。
  - 站点地址（site URL）：同步目标基址，默认 `https://wuh.site`，设置页可改。
- **聚合与不变量:**
  - **INV-1** 同步只在发布成功（create 或 update，两通道皆算）后发起；负载只有 issueNumber，文章内容永不由 desktop 直传（单一事实源在 GitHub）
  - **INV-2** 同步失败不得掩盖发布成功：横幅明示「已发布但同步失败」并提供重试，不回滚、不重发布
  - **INV-3** 重试只重发同步请求，绝不重新发布（防同一文档双建 Issue）
  - **INV-4** siteUrl 为空/非法（非 https URL）时回退默认 `https://wuh.site`；用户显式配置的合法值优先（拒绝路径）
  - **INV-5** 同步请求 15s 超时，非 2xx 一律视为失败并透出状态码
- **领域事件:** 同步结果随发布横幅呈现；不广播 documentEvents（面板已由 publish 事件驱动，同步结果无面板消费方）。

## 决策

- **选型:** 方案 C——desktop 直呼（本变更代码）+ GitHub webhook 修复（本变更运维任务）。
- **对比方案:** ①仅修 webhook——同步异步不可见，发布横幅无法确认 DB 已更新；②仅 desktop 直呼——网页直接改 issue 的场景继续漏；③让 CLI 适配生产路由（`/api/webhook/sync`）——CLI ping 仍不可观测，且 CLI 改动牵一发（本地 dev 路径语义变化），否决。
- **理由:** 双链幂等互补：直呼管「即时反馈 + 可重试」，webhook 管「全渠道兜底」。同步端点免签名属既有事实（记待确认点：server 侧宜为 `sync/:n` 加共享密钥校验，防公网滥用触发 GitHub API 消耗——不在本次范围）。
- **运维任务（webhook 修复）:** blog 仓库 hook 611569789 PATCH content_type=json → `POST hooks/:id/pings` 触发 test ping → 查 deliveries 断言 2xx；若 400（secret 不对齐）升级为用户配合项（需生产 `GITHUB_WEBHOOK_SECRET` 对齐，本机不可见）。server 验签采用 JSON.stringify(payload) 而非 raw body——若 secret 对齐后仍 400，实锤该缺陷，开 server 仓 follow-up change（待确认点）。

## 任务

### Phase 1 — 主进程同步模块
- [x] task 1 — `src/main/siteSync.ts` — `syncIssueToSite(issueNumber, siteUrl)`：URL 组装（`{base}/api/webhook/sync/{n}`，base 去尾斜杠）、15s 超时、非 2xx 失败透状态码、报错脱敏（无凭证仍走统一脱敏管道）+ `implement('syncIssueToSite')` + 单测（INV-4/INV-5，mock fetch）
- [x] task 2 — `src/main/register-features.ts` + `src/shared/types.ts` + `src/preload/index.ts` — 模块注册 + `SiteSyncResult` 契约 + DesktopApi 透传
### Phase 2 — 发布编排与设置
- [x] task 3 — `components/capsule/sections/EditorSection/EditorCommandHost.tsx` — runPublish 发布成功（回写后）调同步：横幅两态（capsule.publishSynced / capsule.publishSyncFailed+重试动作），重试只重发同步（INV-2/INV-3）
- [x] task 4 — `components/settings/SettingsPage.tsx`（或既有站点设置区块）+ `lib/i18n/locales.ts` — 「站点同步地址」设置项（`wd.siteSyncUrl`，默认 `https://wuh.site`，https 校验，三语键）
### Phase 3 — 测试
- [x] task 5 — `tests/site-sync.test.ts` + 编排测试扩展 — URL 组装/成功/非 2xx/超时/默认兜底 + 重试路径（重试调用 syncIssueToSite 而非 publish）
### Phase 4 — 运维与真机
- [x] task 6 — webhook 修复 — blog 仓库 hook 611569789（gh api）：PATCH content_type=json → test ping → deliveries 断言 2xx；400 则记用户配合项 — 无代码 — 运维
- [x] task 7 — 真机走查 — desktop 发布（update 场景）→ 横幅「已发布并同步」→ 站点内容刷新可见；断网场景 → 「已发布但同步失败」→ 重试成功 — 全链 — runtime 观察点

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 新增或更新
- **候选卡片:** 倾向新增 `shadow-docs/knowledge/publish-site-sync.md`（发布同步双链拓扑：desktop 直呼 + webhook 兜底、同步端点路由 `/api/webhook/sync`、CLI ping 仅本地 dev 的边界）；review 时定新增还是并入 editor.md
- **理由:** 同步链拓扑是跨 desktop/CLI/server 的长期事实（路由差异、幂等语义、双链分工），后续任何发布相关变更都依赖，值得沉淀
