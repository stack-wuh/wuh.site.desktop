---
{
  "schema": "shadow-dev/v1",
  "name": "20261021-fix-workbench-entry-return",
  "type": "fix",
  "scope": "app/(shell),lib/store,lib/routes,lib/i18n,tests",
  "status": "archived",
  "baseBranch": "main",
  "branch": "fix/20261021-fix-workbench-entry-return",
  "files": [
    "app/(shell)/layout.tsx",
    "lib/i18n/locales.ts",
    "lib/routes.ts",
    "lib/store.ts",
    "tests/projects.test.ts",
    "tests/workbench-layout.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 165,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/165",
    "pullRequest": 169,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/169"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "f2be3ff0abb12609ee8de118ec97f619d3a6733b",
    "verifiedAt": "2026-10-21T23:51:03.847Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:169",
    "planHash": "02995400d748c746b171671eea51a168c3706a7fe51a8a890fe0df70b6610b1b",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 书脊首项上下文切换：从插件页回到上次编辑文档",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n用户实机反馈：在 `/editor` 打开文件编辑时，点击插件图标进入插件 main 视图；再点书脊首项（房子图标，用户心里的“编辑图标”）期望回到上次编辑的文档，实际落在 `/` 首页。文档会话本身没有丢（`workspaceStore` 在路由切换间保留 content/activePath），缺的是一个稳定的“回编辑”入口——首项目前只有“首页/新建博客”一个语义。\n\n本次把首项改为上下文切换：有活动文档且不在编辑页时回 `/editor`；已在编辑页或无文档时回 `/`。不新增持久化，不建第二状态源。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: Rail 首项当前为 home/新建博客；/editor 为菜单外路由；workspaceStore 单状态源；路由切换不重置文档；导航经 router.push\n  - 适用 scope: app, components, lib\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: Rail = 书脊；顶部导航项含 home；激活指示条/aria-current/data-tip；图标按钮 aria-label；data-chrome=rail\n  - 适用 scope: components/rail, app/(shell)/layout.tsx\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 编辑面单挂载；workspaceStore 单状态源；路由切换不重置文档（本次只消费）\n  - 适用 scope: app/(shell)/editor, lib/store.ts\n- norms/ui-patterns.md\n  - 当前结论: 图标按钮 aria-label；颜色只写 token；亮暗两态；动效 150-300ms + reduced-motion\n  - 适用 scope: 全部新增 UI\n- norms/interaction.md\n  - 当前结论: Tab 可达、Enter/Space 触发、焦点可见、操作即时反馈\n  - 适用 scope: 全部用户可见交互\n- norms/code-style.md / norms/code-style-frontend.md\n  - 当前结论: client 边界、useSyncExternalStore 第三参、hook 清理、无 any、最小改动\n  - 适用 scope: app, lib, tests\n- norms/verification.md\n  - 当前结论: M 级 = 冒烟命令 + 每条被触及不变量一个观察点 + 走查\n  - 适用 scope: 本次验证\n- norms/domain-model.md\n  - 当前结论: M 级领域模型最小形态（上下文 + 被触及既有不变量）\n  - 适用 scope: 本 brief\n\n## 决策\n- **选型:** 方案 A「首项上下文切换」——`workbenchEntryTarget(pathname, hasActiveDoc)` 派生目标；有活动文档且不在 `/editor` → `/editor`，已在 `/editor` 或无文档 → `/`；首项动态图标/标题，`/editor` 仍为菜单外路由。\n- **对比方案:** B 新增独立编辑图标（书脊多入口，与首页继续写作卡重复）；C 依赖插件页返回/历史（history 依赖，从首页/设置/草稿箱回来不成立）；D 持久化上次路由/启动恢复（第二状态源，超出范围）。均否决。\n- **理由:** 文档会话已经由 `workspaceStore` 在路由切换间保留，本次只补一个稳定入口；不新增持久化、不新增第二状态源，首项仍是用户心里的“编辑入口”，首页仍可在编辑页一键到达。\n- **实现约束:**\n  - 布局只订阅 `useHasActiveDoc()` 布尔快照，禁止在 `app/(shell)/layout.tsx` 直接 `useWorkspaceStore()`（每次键入会重渲染整壳）。\n  - 目标计算唯一事实源 = `lib/routes.ts` 的 `workbenchEntryTarget`；布局不手写条件分支。\n  - 首项保留 id `home`；`/editor` 不高亮菜单项；首项目标为 `/editor` 时取消 `home` 激活高亮（不冒充首页）。\n  - 导航路径不调用任何文档生命周期方法；只 `router.push`。\n  - 新增标题键 `menu.backToEditor` 三语齐配；图标按钮 aria-label 随目标变化。\n- **非目标:** 不恢复上次光标/滚动位置（编辑器重挂载仍按 `cmOpenAnchor` 定位正文首行）；不改插件页顶栏「返回」的 `router.back()`；不改首页「继续写作」卡；不做启动时恢复上次文档；不改 Rail 视觉/宽度/插件 popover。\n- **隔离与合并:** 当前 checkout 被 `style/20261021-style-published-seal` 占用（未提交），apply 用 `shadow-dev worktree plan/execute` 派生独立工作树；`lib/i18n/locales.ts` 与该 change 重叠（本次只追加 `menu.backToEditor`，不同键），建议 style 先合、本 change 再 sync main 后合。\n\n## 任务\n### Phase 1\n- [ ] task 1 — `lib/store.ts` — 新增 `useHasActiveDoc()` 布尔快照（`content != null`，服务端快照 `false`），供壳层使用；不改变 `useWorkspaceStore` 语义\n- [ ] task 2 — `lib/routes.ts` — 新增 `workbenchEntryTarget(pathname, hasActiveDoc): '/' | '/editor'` 纯函数\n- [ ] task 3 — `app/(shell)/layout.tsx` — 首项接入：动态图标/标题/目标、`railActive` 激活守卫、`onChange` 用 resolver；不调用文档生命周期\n- [ ] task 4 — `lib/i18n/locales.ts` — 新增 `menu.backToEditor` 中/英/日三语\n### Phase 2\n- [ ] task 5 — `tests/projects.test.ts` — `workbenchEntryTarget` 纯逻辑用例：有文档/无文档 × 编辑页/非编辑页\n- [ ] task 6 — `tests/workbench-layout.test.tsx` — 集成用例：插件页 + 有文档点首项 → `/editor` 且 store 三字段不变；`/editor` 点首项 → `/` 且 content 保留；无文档 → `/`；首项目标为 `/editor` 时无 `home` 激活\n- [ ] task 7 — 验证 — `pnpm exec vitest run tests/projects.test.ts tests/workbench-layout.test.tsx` + `pnpm typecheck` + `pnpm dev` 实机走查（打开文件 → 插件视图 → 首项回文档 → 再点回首页；无文档冷启动首项进首页；亮暗两态与键盘焦点核对）\n\n完整 brief：shadow-docs/changes/20261021-fix-workbench-entry-return/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261021-fix-workbench-entry-return\",\"type\":\"fix\",\"scope\":\"app/(shell),lib/store,lib/routes,lib/i18n,tests\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261021-fix-workbench-entry-return/brief.md\",\"cliVersion\":\"1.8.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    },
    "worktree": null,
    "release": {
      "files": [
        "app/(shell)/layout.tsx",
        "lib/i18n/locales.ts",
        "lib/routes.ts",
        "lib/store.ts",
        "shadow-docs/changes/20261021-fix-workbench-entry-return/brief.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "shadow-docs/menu.md",
        "shadow-docs/signals.md",
        "tests/projects.test.ts",
        "tests/workbench-layout.test.tsx"
      ],
      "message": "fix(shell): 书脊首项上下文切换——插件页返回上次编辑文档，首项双态与激活守卫",
      "title": "fix(shell): 书脊首项上下文切换——从插件页回到上次编辑文档",
      "body": "Closes #165\n\n书脊首项改为「写作入口」上下文切换：有活动文档且不在 `/editor` 时回到上次编辑文档；已在编辑页或无文档时回首页（新建博客）。首项图标/标题随目标切换（文档图标 +「回到编辑」/ 房子图标 +「新建博客」），目标为 `/editor` 时取消 home 激活；布局只订阅 `useHasActiveDoc()` 布尔快照，导航不调用任何文档生命周期方法。\n\n验证：目标 vitest 2 文件 / 27 用例 + i18n 5 用例 + 壳层回归 37 用例；三 tsconfig 通过；用户实机走查通过（插件页 → 首项回文档 → 再点回首页；无文档 → 首页）。\n\n完整 brief：shadow-docs/changes/20261021-fix-workbench-entry-return/brief.md\n\n合并注意：`lib/i18n/locales.ts` 与 `style/20261021-style-published-seal` 为同文件不同键的重叠，建议 style 先合或本 PR 合并后 sync。"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/renderer-shell-routing.md",
    "reason": "书脊首项上下文切换/目标 resolver → renderer-shell-routing.md；书脊首项双态（图标/标题/激活）与 home 语义调整 → shell-chrome-design.md；editor.md 单状态源结论不变。"
  }
}
---

# 书脊首项上下文切换：从插件页回到上次编辑文档

## 动机

用户实机反馈：在 `/editor` 打开文件编辑时，点击插件图标进入插件 main 视图；再点书脊首项（房子图标，用户心里的“编辑图标”）期望回到上次编辑的文档，实际落在 `/` 首页。文档会话本身没有丢（`workspaceStore` 在路由切换间保留 content/activePath），缺的是一个稳定的“回编辑”入口——首项目前只有“首页/新建博客”一个语义。

本次把首项改为上下文切换：有活动文档且不在编辑页时回 `/editor`；已在编辑页或无文档时回 `/`。不新增持久化，不建第二状态源。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更——无协议/API/schema/权限/数据格式变更，仅导航交互契约局部调整；触及面——`app/(shell)/layout.tsx`、`lib/store.ts`、`lib/routes.ts`、i18n 与两处既有测试，不碰主进程/插件帧/命令通道；可发现性——用户直接可见，改坏在手动路径立即暴露。
- **期望验证深度:** runtime（目标纯逻辑/组件探针 + 三 tsconfig + 用户实机走查）

## 领域模型

- **限界上下文:** renderer-ui（Renderer 壳层 / 书脊导航）— 只负责“从哪来、到哪去”的导航意图。上游 = `workspaceStore`（活动文档会话）与 App Router `pathname`；下游 = Rail 首项 → `/editor`。反腐边界：不读写文档内容、不建第二状态源、不碰插件帧内部导航。
- **统一语言增量:** **写作入口**（书脊首项）——同一位置、两个目的地：有活动文档且不在编辑页时是“回到上次文档”，已在编辑页或无文档时是“首页/新建博客”。统一语言中不再把首项只叫“首页”。
- **聚合与不变量:**
  - `INV-1 书脊导航`：`content != null` 且 `pathname` 不是 `/editor` 时，点击首项导航到 `/editor`；导航前后 `content` / `activePath` / `dirty` 原值不变，不调用 `startDraft` / `openDoc` / `closeDoc` / `switchWorkspace`。
  - `INV-2 书脊导航`：`pathname` 是 `/editor` 或 `content == null` 时，点击首项导航到 `/`；在 `/editor` 点击时 `content` 不清空，文档会话保留供下次返回。
  - `INV-3 书脊导航`：首项目标只由 `pathname` + `content != null` 派生；可访问名称/图标与目标一致（回编辑 = 文档图标 +「回到编辑」；首页 = 房子图标 +「新建博客」）；不新增 localStorage、路由参数或第二文档状态。
- **既有不变量（被触及）:** 主编辑器单状态源（`workspaceStore`）；`/editor` 菜单外路由不高亮；Rail 图标按钮的 `aria-label` / `aria-current` / `data-tip` 语义；`data-chrome="rail"` 不变。
- **领域事件:** 无新增领域事件；点击只产生 `router.push`，不广播 `doc.*` 事件，文档会话由既有 `workspaceStore` 保持。

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: Rail 首项当前为 home/新建博客；/editor 为菜单外路由；workspaceStore 单状态源；路由切换不重置文档；导航经 router.push
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: Rail = 书脊；顶部导航项含 home；激活指示条/aria-current/data-tip；图标按钮 aria-label；data-chrome=rail
  - 适用 scope: components/rail, app/(shell)/layout.tsx
- shadow-docs/knowledge/editor.md
  - 当前结论: 编辑面单挂载；workspaceStore 单状态源；路由切换不重置文档（本次只消费）
  - 适用 scope: app/(shell)/editor, lib/store.ts
- norms/ui-patterns.md
  - 当前结论: 图标按钮 aria-label；颜色只写 token；亮暗两态；动效 150-300ms + reduced-motion
  - 适用 scope: 全部新增 UI
- norms/interaction.md
  - 当前结论: Tab 可达、Enter/Space 触发、焦点可见、操作即时反馈
  - 适用 scope: 全部用户可见交互
- norms/code-style.md / norms/code-style-frontend.md
  - 当前结论: client 边界、useSyncExternalStore 第三参、hook 清理、无 any、最小改动
  - 适用 scope: app, lib, tests
- norms/verification.md
  - 当前结论: M 级 = 冒烟命令 + 每条被触及不变量一个观察点 + 走查
  - 适用 scope: 本次验证
- norms/domain-model.md
  - 当前结论: M 级领域模型最小形态（上下文 + 被触及既有不变量）
  - 适用 scope: 本 brief

## 决策
- **选型:** 方案 A「首项上下文切换」——`workbenchEntryTarget(pathname, hasActiveDoc)` 派生目标；有活动文档且不在 `/editor` → `/editor`，已在 `/editor` 或无文档 → `/`；首项动态图标/标题，`/editor` 仍为菜单外路由。
- **对比方案:** B 新增独立编辑图标（书脊多入口，与首页继续写作卡重复）；C 依赖插件页返回/历史（history 依赖，从首页/设置/草稿箱回来不成立）；D 持久化上次路由/启动恢复（第二状态源，超出范围）。均否决。
- **理由:** 文档会话已经由 `workspaceStore` 在路由切换间保留，本次只补一个稳定入口；不新增持久化、不新增第二状态源，首项仍是用户心里的“编辑入口”，首页仍可在编辑页一键到达。
- **实现约束:**
  - 布局只订阅 `useHasActiveDoc()` 布尔快照，禁止在 `app/(shell)/layout.tsx` 直接 `useWorkspaceStore()`（每次键入会重渲染整壳）。
  - 目标计算唯一事实源 = `lib/routes.ts` 的 `workbenchEntryTarget`；布局不手写条件分支。
  - 首项保留 id `home`；`/editor` 不高亮菜单项；首项目标为 `/editor` 时取消 `home` 激活高亮（不冒充首页）。
  - 导航路径不调用任何文档生命周期方法；只 `router.push`。
  - 新增标题键 `menu.backToEditor` 三语齐配；图标按钮 aria-label 随目标变化。
- **非目标:** 不恢复上次光标/滚动位置（编辑器重挂载仍按 `cmOpenAnchor` 定位正文首行）；不改插件页顶栏「返回」的 `router.back()`；不改首页「继续写作」卡；不做启动时恢复上次文档；不改 Rail 视觉/宽度/插件 popover。
- **隔离与合并:** 当前 checkout 被 `style/20261021-style-published-seal` 占用（未提交），apply 用 `shadow-dev worktree plan/execute` 派生独立工作树；`lib/i18n/locales.ts` 与该 change 重叠（本次只追加 `menu.backToEditor`，不同键），建议 style 先合、本 change 再 sync main 后合。

## 任务
### Phase 1
- [x] task 1 — `lib/store.ts` — 新增 `useHasActiveDoc()` 布尔快照（`content != null`，服务端快照 `false`），供壳层使用；不改变 `useWorkspaceStore` 语义
- [x] task 2 — `lib/routes.ts` — 新增 `workbenchEntryTarget(pathname, hasActiveDoc): '/' | '/editor'` 纯函数
- [x] task 3 — `app/(shell)/layout.tsx` — 首项接入：动态图标/标题/目标、`railActive` 激活守卫、`onChange` 用 resolver；不调用文档生命周期
- [x] task 4 — `lib/i18n/locales.ts` — 新增 `menu.backToEditor` 中/英/日三语
### Phase 2
- [x] task 5 — `tests/projects.test.ts` — `workbenchEntryTarget` 纯逻辑用例：有文档/无文档 × 编辑页/非编辑页
- [x] task 6 — `tests/workbench-layout.test.tsx` — 集成用例：插件页 + 有文档点首项 → `/editor` 且 store 三字段不变；`/editor` 点首项 → `/` 且 content 保留；无文档 → `/`；首项目标为 `/editor` 时无 `home` 激活
- [x] task 7 — 验证 — `pnpm exec vitest run tests/projects.test.ts tests/workbench-layout.test.tsx` + `pnpm typecheck` + `pnpm dev` 实机走查（打开文件 → 插件视图 → 首项回文档 → 再点回首页；无文档冷启动首项进首页；亮暗两态与键盘焦点核对）

## 结果
- 实际耗时: 约 1 小时（apply：实现 + 目标探针 + 三 tsconfig + 壳层回归 + 实机走查）
- 验证: 见下表（M 级：每条 `INV-n` 一个观察点）

| 不变量 | 观察点 |
|---|---|
| INV-1 书脊导航 | 观察点：`mise exec -- node node_modules/vitest/vitest.mjs run tests/workbench-layout.test.tsx tests/projects.test.ts --no-file-parallelism`（V8 绕行）→ 2 files / 27 passed；「有活动文档且不在编辑页」用例断言 `push('/editor')` 且 content/activePath/dirty 原值不变 |
| INV-2 书脊导航 | 观察点：同上；「已在编辑页」用例断言 `push('/')` 且 content 保留；「无活动文档」用例断言 `push('/')` |
| INV-3 书脊导航 | 观察点：`tests/projects.test.ts` 纯逻辑 3 组 + 布局用例 `aria-current` 断言（目标 `/editor` 时首项无 home 激活）+ 源码扫描 `grep -n "useWorkspaceStore" 'app/(shell)/layout.tsx'` → 无输出，`workbenchEntryTarget` 与 `menu.backToEditor`（中/英/日）在位 |

- 回归/环境: `tests/i18n.test.ts` 5 passed；`workbench-rail` 15 / `settings-appearance` 5 / `command-palette` 9 / `focus-mode` 8 passed（focus-mode 在 node 22 一次 exit 139，node 20 同命令通过，归因为本机 V8 噪声）。三 tsconfig（`tsconfig.node` / `tsconfig.next` / `tsconfig.tests`）均通过；本机 tsc 需 `--jitless --single-threaded` 绕行，fresh worktree 的 `tsconfig.next` 需 `dist/next/dev/types`（已从已构建 checkout 复制）。
- 实机走查: 用户确认通过（打开文件 → 插件视图 → 首项回文档 → 再点回首页；无文档冷启动 → 首页；亮暗两态与键盘焦点）。

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（Rail 首项上下文切换 / workbenchEntryTarget）；shadow-docs/knowledge/shell-chrome-design.md（书脊首项双态、激活语义）
- **verified-depth:** runtime（两张候选卡片）
- **理由:** 既有导航机制的需求级演进，更新现有卡片即可，不新增卡片；`editor.md` 的 `workspaceStore` 单状态源结论不变，无需改写。
