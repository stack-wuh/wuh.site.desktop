---
{
  "schema": "shadow-dev/v1",
  "name": "20260919-feature-home-activity-heatmap",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": null,
  "files": [
    "src/main/aboutActivity.ts",
    "src/main/credentials.ts",
    "src/main/ipc.ts",
    "src/preload/index.ts",
    "src/renderer/src/App.tsx",
    "src/renderer/src/components/ActivityBar.tsx",
    "src/renderer/src/components/icons/index.tsx",
    "src/renderer/src/home/Heatmap.tsx",
    "src/renderer/src/home/HomePage.tsx",
    "src/renderer/src/home/heatmap.css",
    "src/renderer/src/home/heatmapData.ts",
    "src/renderer/src/home/useAboutActivity.ts",
    "src/renderer/src/settings/SettingsPage.tsx",
    "src/renderer/src/styles/global.css",
    "src/shared/types.ts",
    "tests/aboutActivity.test.ts",
    "tests/heatmapData.test.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 5,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/5"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "8e87c637f172fe997abd70cac49fe79988f2d4e3",
    "verifiedAt": "2026-09-19T16:51:45.002Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:5",
    "planHash": "9442c55436cce1d446156096072903dbea95c83d0ca639b86a8e6344d6a24f8e",
    "updatedAt": null,
    "lastError": null
  },
  "knowledge": null
}
---

# 桌面端首页 — 综合活动热力图（对齐站点 About 组件）

## 动机

desktop 目前没有首页：应用启动直接落在 work 视图，未打开文件时编辑器区只有空态提示。目标：像 Claude Code / Codex 桌面端一样提供首页，核心是一块输出活动热力图；UI 结构、数据来源、请求接口完全对齐 x.wuh.site 站点 About 页的综合活动热力图（`GET /api/about/activity`，`UnifiedActivityHeatmap` 契约）。

用户澄清（apply 阶段）：① 站点**主域名是 `wuh.site`**（x.wuh.site 为仓库/子域），数据默认端点为 `https://wuh.site/api/about/activity`（已 curl 验证 200 且契约一致）；② 使用 git worktree 完成编码。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 壳层双层路由——侧栏 `activePanel` 与主区 `mainView: 'work' | 'settings'`；非 work 渲染全屏视图，ActivityBar/侧栏/编辑器/预览全部不渲染、保留标题栏；新增全屏页扩展 `mainView` 联合类型走 `app-body` 条件渲染，禁止塞回侧栏或引入 router；全屏页必须自带显式返回入口 + Esc，焦点管理（打开移入 `tabIndex={-1}` mount focus、关闭归还触发元素）；`activePanel` 状态跨全屏视图保持
  - 适用 scope: src/renderer/src（首页即第三个全屏视图，直接约束其挂载方式与交互）
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 业务代码禁止裸 `import lucide-react`，图标一律从 `components/icons` 注册表取 `Icon*`，新图标先进注册表；chrome UI 必须用主题 token（`chrome-*`/`primary-*` 等），四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`
  - 适用 scope: src/renderer/src/components、首页 chrome（IconHome 注册 + ActivityBar 首页项 + 样式 token）
- norms/ui-patterns.md
  - 当前结论: 组件复用优先（`components/ui` 原语）；暗黑模式全覆盖；动效 + reduced-motion；visible focus ring、label 关联
  - 适用 scope: src/renderer
- norms/interaction.md
  - 当前结论: Escape 关闭模态；焦点管理；Tab 可遍历；操作即时反馈
  - 适用 scope: src/renderer
- norms/code-style-frontend.md
  - 当前结论: 状态覆盖 loading/失败/空态；不在 JSX 硬编码主题色；状态归属靠近使用位置
  - 适用 scope: src/renderer

> 跨仓库参考（父仓库 x.wuh.site 的 shadow-docs，描述性引用不作为本地卡片）：`knowledge/about-activity.md`（365 天聚合契约、单热力图、加载态同轨道、失败给明确错误）；`knowledge/desktop-app-architecture.md`（网络收敛主进程、组件自持、颜色只经主题变量）；`knowledge/repos-api.md`（5 分钟内存缓存 + 过期缓存回退模式）。

## 决策

- **选型:**
  1. **首页 = 第三个全屏视图:** `mainView` 扩展为 `'work' | 'settings' | 'home'`，按 renderer-shell-routing 走 `app-body` 条件渲染（ActivityBar/侧栏不渲染，保留标题栏）。启动默认 `home`；文件打开（store `activePath` 变化）自动切 `work`；work 视图 ActivityBar 头部新增「首页」项可返回。设置页关闭后回到打开前视图（记录 prevView，兼容从 home `Cmd+,` 进入的场景）。propose 阶段预览稿的「保留 ActivityBar 版式」作废，以本卡约束为准
  2. **数据链路:** 主进程新增 `getAboutActivity` IPC——`fetch(`${siteBaseUrl ?? 'https://wuh.site'}/api/about/activity`)`；站点地址归一化（trim 尾斜杠、空值回退默认）；内存缓存 5 分钟 + 请求失败回退过期缓存，无缓存时抛明确错误（渲染层展示错误态，不给伪数据）；`AppSettings` 新增 `siteBaseUrl: string | null`（DEFAULT_SETTINGS 补 null）
  3. **UI 自持复刻:** desktop 内自持 Heatmap 组件（`home/Heatmap.tsx` + `home/heatmap.css`，不引 styled-components），结构与站点 `@wuh.site/components/heatmap` 一致——月份标题与 53 周列同网格轨道、星期标签列、格色 = `level`（warm 色阶：`--background-200` → `color-mix(in oklab, var(--accent-color) 30/55/75%, var(--background-100))` → `--accent-color`）、hover/点击 Tooltip 显示日期+总量+7 类分项明细、加载骨架屏同轨道、错误/空态、Less/More 图例；换算纯函数（首日 weekday 补位、按 7 天切周、月份定位）与站点 `buildActivityHeatmapData` 同语义
  4. **首页组合:** 问候语 + 365 天总量概览 + 热力图 + 「打开文件夹」/「继续编辑」（有 activePath 时）快捷入口；全屏视图自带返回按钮 + Esc + 焦点管理；图标经注册表新增 `IconHome`（lucide `House`）
- **对比方案:**
  - 渲染进程直连 fetch → 放弃：违反父仓库 desktop-app-architecture「全部网络操作收敛主进程」，且需服务端放开 CORS
  - 做成插件 preview 视图 → 放弃：插件视图只有 sidebar/preview 区域承载不了首页；通用 HTTP 不在插件能力白名单
  - home 保留 ActivityBar/侧栏版式（propose 预览稿）→ 放弃：与 renderer-shell-routing「非 work 全屏不渲染壳层」约束冲突，该约定是 settings 视图已验证的既定架构
  - 复用站点 styled-components 源码 → 放弃：desktop 无该依赖，「同源」落在结构/语义层
- **理由:** 接口契约与展示语义严格对齐站点 About（只消费 `/api/about/activity`，不重拼 `/v2/v2`）；网络收敛主进程、缓存降级、图标注册表、token 配色、全屏视图路由均遵循 active Knowledge；本变更不新增跨仓库依赖。

## 任务

### Phase 1 — 主进程数据链路（TDD）
- [x] shared 类型：`AboutActivityDay`（date/total/level/counts 七类）/`AboutActivityHeatmap` + `AppSettings.siteBaseUrl` — `src/shared/types.ts` — 修改
- [x] activity 服务纯逻辑工厂（fetcher 注入）：URL 解析与归一化、5min 内存缓存、失败回退过期缓存、无缓存抛错；vitest 覆盖成功/失败回退/URL 归一 — `src/main/aboutActivity.ts`、`tests/aboutActivity.test.ts` — 新增
- [x] IPC `implement('getAboutActivity')`（net.fetch 注入）+ preload 暴露 + `DEFAULT_SETTINGS.siteBaseUrl: null` — `src/main/ipc.ts`、`src/preload/index.ts`、`src/main/credentials.ts` — 修改

### Phase 2 — 设置项
- [x] 设置页「站点服务」分组：siteBaseUrl 输入（占位提示默认 `https://wuh.site`，留空用默认；blur 保存；http(s) 前缀校验与错误反馈） — `src/renderer/src/settings/SettingsPage.tsx` — 修改

### Phase 3 — 自持 Heatmap 组件（TDD）
- [x] 换算纯函数：`AboutActivityHeatmap` → 53 周列视图数据（首日 weekday 补位、7 天切周、月份定位），vitest 对齐站点语义 — `src/renderer/src/home/heatmapData.ts`、`tests/heatmapData.test.ts` — 新增
- [x] Heatmap 组件与样式：月份行/星期标签/格点/Tooltip 明细/骨架/错误/空态/图例，warm 色阶全走主题 token — `src/renderer/src/home/Heatmap.tsx`、`src/renderer/src/home/heatmap.css` — 新增

### Phase 4 — 首页视图与壳层集成
- [x] `useAboutActivity` hook（loading/error/data + 手动重试，卸载安全） — `src/renderer/src/home/useAboutActivity.ts` — 新增
- [x] HomePage 全屏视图：问候 + 总量概览 + 热力图 + 打开文件夹/继续编辑入口；返回按钮 + Esc + tabIndex=-1 焦点管理 — `src/renderer/src/home/HomePage.tsx` — 新增
- [x] 壳层集成：`mainView` 加 `'home'`（启动默认 home、activePath 变化切 work、settings 返回 prevView）、ActivityBar 头部「首页」项（handlePanelChange 拦截）、注册表登记 `IconHome` — `src/renderer/src/App.tsx`、`src/renderer/src/components/ActivityBar.tsx`、`src/renderer/src/components/icons/index.tsx` — 修改
- [x] 样式与验证：home 布局样式进 `global.css`（token 化、150-300ms ease-out、reduced-motion）；`pnpm typecheck` + `pnpm test` 全绿；`pnpm dev` 四主题 × 亮暗走查首页/Tooltip/断网错误态 — `src/renderer/src/styles/global.css`、仓库根 — 验证

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md
- **理由:** `mainView` 联合类型新增 `'home'` 是该卡「新增全屏页扩展 mainView」约定的第二例，落定后应把 home 实例（启动默认、activePath 联动、prevView 返回语义）并入卡片，不新开卡片。
