---
{
  "schema": "shadow-dev/v1",
  "name": "20260921-feature-plugin-task-capsule",
  "type": "feature",
  "scope": "src/shared,src/plugin-sdk,components,lib,plugins/github-issues,tests,shadow-docs/knowledge,shadow-docs",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260921-feature-plugin-task-capsule",
  "files": [
    "components/StatusBar.tsx",
    "components/plugins/PluginFrameHost.tsx",
    "components/tasks/TaskCapsule.tsx",
    "components/tasks/TaskPopover.tsx",
    "lib/tasks.ts",
    "plugins/github-issues/logic/publisher.js",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "shadow-docs/menu.md",
    "src/plugin-sdk/index.ts",
    "src/shared/plugin.ts",
    "tests/plugin-manifest.test.ts",
    "tests/plugin-tasks.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 24,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/24",
    "pullRequest": 26,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/26"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "9b2b9e36551690aad8dc9380466d05cbdd6447d9",
    "verifiedAt": "2026-09-21T23:36:52.162Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:26",
    "planHash": "61a112f967cb77e06e4d5e7ab4985d255f55cb9fd3dd235f68608ff8855f9cbd",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "任务胶囊：插件任务贡献点 + StatusBar 聚合胶囊",
      "body": "",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 任务胶囊：插件任务贡献点 + StatusBar 聚合胶囊

## 动机

应用缺少任务可见性：插件执行异步工作（发布、同步、拉取）时，用户只能停在插件视图里干等，切走后进度完全不可见。Claude Code 的 todo 胶囊证明了这种形态的价值——任务出现时壳层出现一枚聚合胶囊（进度 N/M + 进行中动效），点击展开清单查看详情。本变更为桌面壳层引入同类能力：插件通过**声明制贡献点**上报任务，壳层在 StatusBar 聚合渲染胶囊，点击弹出清单并可跳转来源插件视图。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: statusItems 先例确立「manifest 声明 + SDK 运行时更新 + 渲染层宿主裁决（broker 不参与）+ lib 纯逻辑注册表（commit() 产新引用 + useSyncExternalStore）」的插件贡献点范式；StatusBar 左右分区承载插件状态项；组件样式一律 styled-components + 主题 token，动效 150-300ms ease-out 且响应 prefers-reduced-motion；声明制优先扩展流程 = 先加 manifest schema + validateManifest 校验 + 测试用例；useSyncExternalStore 必须传第三参 getServerSnapshot；styled 类名是哈希，测试不得依赖类名选择器（用 aria/role/data-* 稳定属性）
  - 适用 scope: [components, lib, src/shared/plugin.ts, src/plugin-sdk, plugins, tests]
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 两栏布局由 app/(shell)/layout.tsx 持久化；插件 main 视图路由段为 /plugin/<pluginId>/<viewId>；页面跳转用 router.push；客户端组件一律 'use client'
  - 适用 scope: [app, components, lib]

## 决策

- **选型:** 方案 A——新增 `tasks` 贡献点，完全镜像 statusItems 架构（manifest 声明 + SDK `wuh.tasks` 帧服务 + PluginFrameHost 渲染层裁决 + lib/tasks.ts 注册表），壳层 StatusBar 左区聚合 TaskCapsule + 点击弹 TaskPopover（查看 + 跳转，壳层不反向写任务状态）
- **对比方案:** B（statusItems 加任务语义字段）被否——任务是有状态集合（status/progress/跳转），塞进扁平 text 模型造成语义污染与校验特判，违背贡献点语义清晰分离；C（注册表放主进程 broker）被否——statusItems 先例明确裁决在渲染层宿主，broker 不参与，走 broker 徒增链路
- **理由:** 与既有两处先例（statusItems/floats）架构同构，风险最低、契约语义清晰；Popover 查看+跳转的第一期交互对齐用户快捷面板既有模式（Esc 关/点外关/延迟关闭），不引入反向回调通道，契约面最小；任务状态变更仍由插件经 SDK 单向上报

## 任务

### Phase 1 契约层（shared 类型 + manifest 校验）
- [x] task-1 — `src/shared/plugin.ts` — 新增 PluginTaskContribution 类型与 manifest `tasks` 声明：id 限 `[a-z0-9][a-z0-9._-]*` 且插件内唯一、title 必填、viewId 可选（须命中本插件已声明的 area=main 视图）、每插件 ≤8 条；validateManifest 增补校验与错误指引
- [x] task-2 — `tests/plugin-manifest.test.ts` — tasks 校验用例：合法声明通过；id 非法/重复拒绝；viewId 指向不存在视图或 float 视图拒绝；超上限拒绝

### Phase 2 运行时链路（SDK + 帧协议 + 注册表）
- [x] task-3 — `src/plugin-sdk/index.ts` — 新增 `wuh.tasks.upsert(id, patch) / remove(id)`；patch 允许 status（pending|in_progress|done）、progress（{current,total}）、detail；id/title/viewId 声明期不可变；经帧协议新 service `'tasks'`
- [x] task-4 — `components/plugins/PluginFrameHost.tsx` — handleFrameInvoke 增加 `'tasks'` 裁决：只能操作本插件声明过的任务 id（越权拒绝）；视图帧与逻辑帧同链路生效；插件停用清空其全部任务、启用后由插件重注册
- [x] task-5 — `lib/tasks.ts` — 新建任务注册表纯逻辑模块（同构 statusItems：commit() 产新引用 + 快照订阅；跨插件聚合；派生 total/done/in_progress 聚合态供胶囊渲染）
- [x] task-6 — `tests/plugin-tasks.test.ts` — 新建注册表测试：upsert/remove/越权拒绝/停用清空/聚合派生正确/每次变更产出新引用

### Phase 3 壳层 UI + 演示生产者
- [x] task-7 — `components/tasks/TaskCapsule.tsx`、`components/StatusBar.tsx` — StatusBar 左区任务胶囊：无活跃任务不渲染；有任务时显示 in_progress 动效（spinner 或进度点，150-300ms ease-out + prefers-reduced-motion 静态降级）与 N/M 聚合进度；styled-components + 主题 token（chrome-*/primary-*），四主题 × 亮暗校验
- [x] task-8 — `components/tasks/TaskPopover.tsx` — 点击胶囊弹出任务清单面板：复用用户快捷面板交互模式（Esc 关、点外关、延迟关闭允许指针移入）；按插件分组列任务（状态图标 + 标题 + 进度 + detail）；条目可跳转（声明了 viewId 的任务点击 router.push(`/plugin/<pluginId>/<viewId>`)）；aria/role + data-* 稳定属性，不依赖 styled 哈希类名；组件 'use client'，订阅注册表须传 getServerSnapshot
- [x] task-9 — `plugins/github-issues/logic/publisher.js` — 演示生产者：publish 过程上报任务（开始 upsert in_progress + progress，完成置 done，失败置 detail），顺带验证逻辑帧链路
- [x] task-10 — 全量验证 — `pnpm typecheck` + `pnpm test` 回归；`pnpm dev` 走查：胶囊出现/消失、popover 开合与键盘遍历、条目跳转、插件停用清空、reduced-motion 降级、四主题 × 亮暗

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md；shadow-docs/menu.md（关键词行增补）
- **理由:** 新增一类插件贡献点（tasks）与两枚壳层组件（TaskCapsule/TaskPopover），属壳层 chrome 域既有卡片的增量更新——statusItems 范式段落后并列 tasks 契约段落、StatusBar 结论补左区胶囊承载，不满足独立成卡的条件
