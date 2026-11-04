---
title: 博客发布域：同步双链、生命周期与任务呈现
domain: publish
keywords: [发布, publish, unpublish, 下架, 同步, site sync, webhook, issue 号, create-or-update, 发布磁贴, 任务时间线, host 归属, 胶囊触发面]
scope:
  - src/main/publishCli.ts
  - src/main/siteSync.ts
  - src/main/github/issues.ts
  - lib/publish.ts
  - lib/tasks.ts
  - components/capsule
  - components/capsule/sections/EditorSection/EditorCommandHost.tsx
status: active
source:
  - changes/archive/20261020-feature-publish-interaction/brief.md
  - changes/archive/20261103-feature-publish-site-sync/brief.md
  - changes/archive/20261103-feature-async-task-progress/brief.md
  - changes/archive/20261103-feature-capsule-task-surface/brief.md
  - changes/archive/20261103-feature-doc-unpublish/brief.md
  - changes/archive/20261103-refactor-shared-hooks-sweep/brief.md
verified: 2026-11-04
verified-depth: runtime
verified-scope: 真实走查（stack-wuh/blog#175）：CLI v1.9.0 create(created:true)→生产同步端点 POST /api/webhook/sync/175=201（DB 镜像写入）→回写 issue 号重发布（created:false + PATCH state:open 重开）→blog unpublish（state:closed 下架）→closed 态同步 201；桌面侧四套件 35 绿×2 + 三 tsc 绿
---

# 博客发布域：同步双链、生命周期与任务呈现

## 当前结论

**身份模型**：frontmatter `issue` 号是发布身份唯一事实源——无号=create、有号=update；下架后号**保留**（重新上架=再发布 update，PATCH 补 `state:'open'` 幂等重开）。非法号在发起前拒绝（CLI `BLOG_ISSUE_INVALID` / desktop `not-published`）。

**同步双链（幂等互补，收敛到 server `syncIssue` 从 GitHub 拉取 upsert）**：
1. **desktop 直呼链（生产权威）**：发布/下架成功后主进程 `POST {siteBaseUrl}/api/webhook/sync/{n}`（src/main/siteSync.ts，复用 AppSettings.siteBaseUrl 推导，与 aboutActivity 同源约定；15s 超时；非 2xx 透状态码）。失败不掩盖发布成功——横幅两态（「已创建/已更新 #n，站点已同步」/「已发布但同步失败」+重试），**重试只重发同步、绝不重新发布**（防双建）。
2. **GitHub webhook 兜底链（全渠道）**：blog 仓 hook（id 611569789 → `wuh.site/api/webhook/github`，订阅 issues/issue_comment）。content_type 已修 json；**secret 对齐待完成**（对齐前 GitHub 推送 400，直呼链不受影响）。CLI 自带 syncPing 硬编码 `/v2/webhook/sync` 路径，只对本地 dev 有效——**天生打不到生产**（生产路由 `/api/webhook/sync`，实测 500=路由在 vs /v2 404）。

**生命周期通道**：CLI 优先（`blog publish|unpublish plan→execute`，v1.9.0+ 能力断言经 `help blog` 输出探测）→ 不可用（available:false）降级内置（`publish` / `githubSetIssueState`）；**执行阶段错误绝不降级**（防同一文档双建）。下架载荷只含 `state:'closed'`（绝不携带 title/body 防误改内容）。

**任务时间线与触发面**：发布编排写 `host:publish` 四阶段任务（save→publish→writeback→sync——CLI plan/execute 在主进程单 IPC 内不可细分，不做假五阶段），`host` 为宿主保留归属（插件帧经 svcTasks 冒认一律拒绝，宿主直写注册表不经帧通道）；失败降级 pending+原因、重试复用同一任务。胶囊 pod 在 active 态直显最近 in_progress 任务的 detail（「阶段名 n/4」）+ 并发 +N 语言无关徽标，完成回静默，**不自动展开面板**（写作不干扰）。

**入口**：发布=胶囊通栏磁贴（一键）；下架=磁贴旁 MenuPopover「下架本文」+ 命令面板「下架当前文章」；未发布（无 issue 号）下架入口禁用。

## 执行约束

- 同步负载只有 issue 号：内容以 GitHub 为单一事实源，desktop 永不直传文章内容
- 下架/发布共用 publishBusy 互斥（同时刻仅一个生命周期操作）；下架绝不重新发布、重试绝不重发布
- `host` 归属保留字：新增宿主任务一律走该命名空间，插件帧写入路径（svcTasks）拒绝之——守卫在帧服务层，宿主直写 API 形状不变
- 磁贴状态推导纯逻辑在 lib/publish.ts（publishStateOf/publishPreflight/unpublishPreflight），呈现层不得各自重推
- 编辑器功能入口经命令通道（publishDoc/unpublishDoc）由 EditorCommandHost 单实例认领，磁贴/面板只发命令

## 适用边界

约束桌面端发布-下架-同步全链与其任务呈现。server webhook/DB 消费端、CLI blog 域实现（见 CLI 仓 shadow-docs）、站点内容 API 语义（state:'open' 过滤）不在本卡。

## 验证方式

`vitest run tests/site-sync.test.ts tests/publish-unpublish.test.ts tests/tasks-host.test.ts tests/publish-cli.test.ts`（39 用例）+ 三 tsc；真机走查见 verified-scope。webhook secret 对齐后：GitHub hook 页 redeliver → deliveries 应 2xx。

## 关联知识

- [editor](editor.md)（命令通道与编辑面约束）
- [shell-chrome-design](shell-chrome-design.md)（tasks 注册表与胶囊磁贴语言）
- 父仓库 shadow-docs/knowledge/content-api.md（站点 state:'open' 过滤语义）
