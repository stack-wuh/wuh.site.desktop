---
{
  "schema": "shadow-dev/v1",
  "name": "20260923-feature-build-time-visibility",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260923-feature-build-time-visibility",
  "files": [
    "components/SideMenu.tsx",
    "components/settings/SettingsPage.tsx",
    "lib/buildInfo.ts",
    "lib/i18n/locales.ts",
    "next.config.ts",
    "tests/build-info.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 61,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/61",
    "pullRequest": 62,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/62"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "51ece497d6e6c9dbdef1b34fa62337327fb2cbe8",
    "verifiedAt": "2026-09-23T14:43:25.413Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:62",
    "planHash": null,
    "updatedAt": null,
    "lastError": null
  }
}
---

# 渲染层构建时间可见化——版本展示处追加构建时间戳，让「旧页面」一眼现形

## 动机

2026-09-23 连续出现两次「运行中实例与代码不同步」的事故：先是 `window.api.getGitIdentityDefault is not a function`（渲染层新、preload 旧），后是「胶囊按钮点击无响应」排查确认代码无 bug、系长跑 dev 实例跨多次分支切换后 HMR 链断裂、渲染层停留旧模块（事件未挂上）。两次都靠重启 dev 解决，但「页面是不是旧的」目前不可见——用户与排查者只能靠症状猜测。版本号已在设置页「关于」与快捷面板常驻展示，构建时间戳与版本同属构建元数据，展示在同处即可让实例新鲜度一眼可判：显示的时刻与当前会话对不上 = 旧页面。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 应用版本号经 `next.config.ts` 的 `env.NEXT_PUBLIC_APP_VERSION` 构建期内联（消费方读 `process.env.NEXT_PUBLIC_APP_VERSION`），不得新增 preload/broker 通道消费版本；设置页「关于」区块与 SideMenu 用户快捷面板版本行是版本展示位
  - 适用 scope: app, components, lib——构建时间戳与版本同源同规则，沿用 env 内联，不新增 IPC 通道
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 文案一律经 `useT()` 三语字典，key 集合三语一致性由 `tests/i18n.test.ts` 锁定
  - 适用 scope: lib——新增 label key 三语对称

## 决策

- **选型:** 方案 A——`next.config.ts` env 注入 `NEXT_PUBLIC_BUILD_TIME: new Date().toISOString()`（模块顶层求值：dev 下 = dev 服务器启动时刻，build 下 = 构建时刻）；新建 `lib/buildInfo.ts` 读取常量 + **确定性 UTC 格式化**（手写 `getUTC*` 拼接，禁 `toLocaleString`——SSR/客户端 locale 差异会造成 hydration mismatch，现被渲染零告警守卫拦截）；设置页「关于」区块追加完整格式（`2026-09-23 13:26 UTC` + 「构建时间」label 三语），快捷面板版本行追加短格式（`20260923-1326Z`）；格式化函数进 node 环境单测。
- **对比方案:** B 主进程 IPC `getBuildInfo()`——违背 Knowledge「不得新增 preload/broker 通道消费版本」的既定规则（构建时间与版本同类元数据），且契约三处同步改动面大一个量级，dev 下主进程重启时刻与渲染层代码版本并无对应关系，语义反而不准，弃；C 仅设置页展示——快捷面板是排查实例新鲜度最方便的常驻入口，仅设置页发现性差，弃（SideMenu 底部收起态占位区空间小，不加）。
- **理由:** 僵尸实例的可见性缺口已在一天内造成两次排障成本；方案 A 零新通道、完全复刻既有模式，dev/build 两种形态下时间戳语义都恰好命中「这份页面产出自哪个会话」的判定需求；确定性格式化是本变更唯一技术风险点（hydration 一致性），以纯函数 + 单测锁定。

## 任务

### Phase 1
- [x] env 注入 `NEXT_PUBLIC_BUILD_TIME`（顶层求值，注释说明 dev=服务器启动时刻/build=构建时刻） — `next.config.ts` — 修改
- [x] `lib/buildInfo.ts`：BUILD_TIME 常量读取 + `formatBuildTime`（`YYYY-MM-DD HH:mm UTC`）/`formatBuildTimeShort`（`YYYYMMDD-HHmmZ`）确定性 UTC 格式化，无效输入返回空串 — `lib/buildInfo.ts` — 新增
- [x] 格式化函数单测：正常 ISO/补零/无效输入/短格式 — `tests/build-info.test.ts` — 新增
### Phase 2
- [x] 设置页「关于」区块追加构建时间展示 + `settings.buildTime` label 三语 key（key 集合一致） — `components/settings/SettingsPage.tsx`, `lib/i18n/locales.ts` — 修改
- [x] 快捷面板版本行追加短格式时间戳 — `components/SideMenu.tsx` — 修改
### Phase 3
- [x] pnpm typecheck（三配置）+ vitest（node + DOM 双环境）全绿 — `` — 验证

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** 「版本号经 env 内联」条目扩展为「版本与构建时间戳经 env 内联」，消费落点（设置页关于/快捷面板）同步补记；若 apply 后无其他意外，属结论小幅扩写。
