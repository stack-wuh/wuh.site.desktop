---
{
  "schema": "shadow-dev/v1",
  "name": "20260921-feature-new-blog-project-entry",
  "type": "feature",
  "scope": "src/shared,src/main,src/preload,components/home,lib,app,tests,shadow-docs/knowledge",
  "status": "reviewed",
  "baseBranch": "refactor/20260921-refactor-renderer-nextjs",
  "branch": null,
  "files": [
    "app/(shell)/layout.tsx",
    "components/home/HomePage.tsx",
    "components/home/ProjectSection.tsx",
    "components/plugins/PluginFrameHost.tsx",
    "lib/store.ts",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "src/main/cloneWorkspace.ts",
    "src/main/recentWorkspaces.ts",
    "src/main/workspace.ts",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "src/shared/workspace.ts",
    "tests/git-clone-url.test.ts",
    "tests/recent-workspaces.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 18,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/18",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "b184ff0fcc11b8adbdab965ca4fa701d31a5433a",
    "verifiedAt": "2026-09-21T15:11:26.106Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:18",
    "planHash": "9e967c48868a7afd86b9d19de7d50e67584e587ecade3876337fe0f4a3b19b0a",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 首页改名「新建博客」+ 项目入口（选本地目录 / clone 远程仓库 / 最近项目）",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n首页当前只有问候语与活动热力图，是纯展示门面；用户需要它成为**项目入口**——选本地目录或 clone 远程仓库来打开/新建博客项目，并管理最近打开过的项目。改名「新建博客」表达页面定位（此处开始一篇博客项目的工作），右侧热力图等内容保持不变。\n\n三项范围已与用户确认：① clone v1 仅公开 HTTPS 仓库（`git@` 形式自动转 https，私有仓库/凭据注入后续单独变更）；② 选目录/clone 完成**立即切换当前工作区**；③ **最近项目列表本次一并做**。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: `/` = HomePage 默认入口；菜单项 id 与路由段一一对应（home 为字面量）；壳层不展示工作区 UI，getWorkspace 仅在 layout 挂载时 seed `setWorkspaceInfo`；`useSyncExternalStore` 必须传第三参\n  - 适用 scope: app, components, lib\n  - 本次遵循: **不新增路由段**（`/` 仍是唯一首页路径，改名只动菜单 title 与页面文案）；workspace 从「仅挂载时 seed」变为「挂载 seed + 切换时重入」，属卡片事实更新（知识评估已列）\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 消息协议 kind（hello/ready/…）变更须同步三方；帧事件经 SDK `wuh.on` 透传\n  - 适用 scope: src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, src/preload/index.ts\n  - 本次遵循: 广播 workspace 切换走既有 `documentEvents → broadcast` 通用事件链（**新增事件名，不改消息 kind**，SDK 零改动）\n- norms/code-style.md（通用）\n  - 执行约束: 跨端共享类型进 shared；不吞异常；不为未来场景提前抽象\n- norms/tdd-verification.md（通用）\n  - 执行约束: 新功能先写失败测试；完成声明必须附验证输出\n- norms/ui-patterns.md（通用）\n  - 执行约束: 复用既有 UI 组件（Button/Input/Empty），styled-components 载体\n\n## 决策\n- **选型:** 首页内嵌「项目」区块 + 主进程 workspace 域扩展（clone IPC、最近项目持久化、按路径打开），切换生效走**渲染层回调链**（不走主进程推送）。\n- **对比方案:**\n  - *独立 /projects 路由段做项目管理页*：否决——用户明确要求「首页改名 + 右侧内容保持不变 + 首页新增交互」，新页面偏离需求且扩大路由面（routes.ts/layout/菜单项全要动）。\n  - *clone 后仅主进程 setWorkspace、渲染层不感知*：否决——正确性问题：`setWorkspaceInfo` 只在 layout 挂载时 seed，插件 doc 服务的 root 会停在旧工作区，切换后插件读写错目录。\n  - *主进程 `webContents.send` 推送 workspace 变更*：否决——打开/clone 都由渲染层发起，IPC 返回值就是新 WorkspaceInfo，渲染层直接 `setWorkspaceInfo + documentEvents.emit('workspace')` 即可，少一条推送通道与订阅生命周期。\n- **理由:** 全部落在既有域（workspace 域 + HomePage + documentEvents 广播链），复用 `openWorkspace`/`setWorkspace`/UI 基件；真正的新增只有 clone 通道与最近项目持久化两块。\n- **关键设计点:**\n  1. **clone URL 解析为 shared 纯函数**（`parseGitCloneUrl`）：接受 `https://<host>/<owner>/<repo>(.git)`；`git@github.com:owner/repo(.git)` 自动转 https；提取默认目录名（repo 段去 `.git`）；非法输入返回 null。渲染层用于表单即时反馈，主进程用于 clone 执行，测试锁契约。\n  2. **最近项目**：`userData/recent-workspaces.json`（主进程独占读写），`upsertRecent` 在 `setWorkspace` 成功后统一登记（对话框打开 / clone / 列表点开三条路自动覆盖），cap 8 条、按最近使用排序、去重按 path；IPC `listRecentWorkspaces` / `openWorkspaceByPath`（校验目录存在）。\n  3. **clone 执行**：`cloneWorkspace(url)` → 主进程解析 URL → `dialog.showSaveDialog`（默认文件名 = repo 名，`createDirectory`）选目标路径 → 目标存在且非空拒绝 → `simple-git clone --progress` → **失败时清理半成品目录**（best-effort `fsp.rm`）并返回原文错误 → 成功 `setWorkspace`。v1 不做进度百分比（不解析 git stderr），进行中态在渲染层表现为禁用 + 文案。\n  4. **切换生效链（渲染层）**：`openWorkspace` / `cloneWorkspace` / `openWorkspaceByPath` 成功返回后：`setWorkspaceInfo(info)`（重入 seed）→ `workspaceStore` 重置 doc 状态（content/activePath/dirty 归属旧工作区，切走即失效）并 `doc.changed` → `documentEvents.emit('workspace', info)`（帧广播既有链路，插件可 `wuh.on('workspace')` 感知）。\n  5. **改名接线**：SideMenu `items[0].title` 首页 → 新建博客；页面 Title 区同步项目身份文案。路由 key `home`、路径 `/`、快捷键语义全部不变。\n- **非目标（本变更不做）:** 私有仓库 clone（token 注入与 .git/config 清理）；clone 进度百分比；项目管理页（重命名/删除项目）；多工作区并存。\n\n## 任务\n### Phase 1 — 共享层与主进程（TDD 先行）\n- [ ] shared 纯函数 `parseGitCloneUrl`（https / git@ 转 https / 非法拒绝 / repo 名提取）+ 失败测试先行 — `src/shared/workspace.ts,tests/git-clone-url.test.ts` — 新增\n- [ ] 最近项目纯逻辑（upsert 去重/cap 8/排序）+ 读写与 IPC（list / openWorkspaceByPath 校验目录存在）+ 失败测试先行 — `src/main/recentWorkspaces.ts,tests/recent-workspaces.test.ts` — 新增\n- [ ] `cloneWorkspace` IPC（解析→选目录→非空拒绝→clone→失败清理→setWorkspace 登记）+ `setWorkspace` 成功即 upsert 最近列表 + `openWorkspace` 打开即登记 — `src/main/cloneWorkspace.ts,src/main/workspace.ts` — 新增/修改\n- [ ] preload 通道与 shared 类型（cloneWorkspace / listRecentWorkspaces / openWorkspaceByPath / RecentWorkspace）— `src/preload/index.ts,src/shared/types.ts` — 修改\n\n### Phase 2 — 渲染层\n- [ ] 首页「项目」区块：打开本地目录按钮（复用 openWorkspace）/ clone 表单（URL 输入即时解析反馈 + 提交，进行中禁用与错误展示）/ 最近项目列表（点开、空态 Empty）— `components/home/ProjectSection.tsx,components/home/HomePage.tsx` — 新增/修改\n- [ ] 切换生效链：成功回调 → setWorkspaceInfo 重入 + workspaceStore doc 状态重置 + `documentEvents.emit('workspace')` 帧广播 — `components/plugins/PluginFrameHost.tsx,lib/store.ts,components/home/ProjectSection.tsx` — 修改\n- [ ] 改名接线：菜单「首页」→「新建博客」+ 页面身份文案 — `app/(shell)/layout.tsx,components/home/HomePage.tsx` — 修改\n\n### Phase 3 — 验证与文档\n- [ ] 验证：`pnpm typecheck` + vitest 全量 + `pnpm build`（静态导出路由不变应为 7 条）— 仓库根 — 验证\n- [ ] 用户运行验收：`pnpm dev` 打开首页（显示「新建博客」）→ 选本地目录切换成功 → clone 一个公开仓库成功且目录落地 → 最近项目出现并可点开 → 切换后插件视图 doc root 正确\n- [ ] 知识卡更新：`renderer-shell-routing.md`（菜单项「新建博客」、workspace 切换语义：挂载 seed → 可重入 + workspace 事件）— `shadow-docs/knowledge/renderer-shell-routing.md` — 修改\n- [ ] brief 结果段回填（含验收口径）— `shadow-docs/changes/<本变更>/brief.md` — 修改\n\n完整 brief：shadow-docs/changes/20260921-feature-new-blog-project-entry/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260921-feature-new-blog-project-entry\",\"type\":\"feature\",\"scope\":\"src/shared,src/main,src/preload,components/home,lib,app,tests,shadow-docs/knowledge\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"refactor/20260921-refactor-renderer-nextjs\",\"briefPath\":\"shadow-docs/changes/20260921-feature-new-blog-project-entry/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 首页改名「新建博客」+ 项目入口（选本地目录 / clone 远程仓库 / 最近项目）

## 动机

首页当前只有问候语与活动热力图，是纯展示门面；用户需要它成为**项目入口**——选本地目录或 clone 远程仓库来打开/新建博客项目，并管理最近打开过的项目。改名「新建博客」表达页面定位（此处开始一篇博客项目的工作），右侧热力图等内容保持不变。

三项范围已与用户确认：① clone v1 仅公开 HTTPS 仓库（`git@` 形式自动转 https，私有仓库/凭据注入后续单独变更）；② 选目录/clone 完成**立即切换当前工作区**；③ **最近项目列表本次一并做**。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: `/` = HomePage 默认入口；菜单项 id 与路由段一一对应（home 为字面量）；壳层不展示工作区 UI，getWorkspace 仅在 layout 挂载时 seed `setWorkspaceInfo`；`useSyncExternalStore` 必须传第三参
  - 适用 scope: app, components, lib
  - 本次遵循: **不新增路由段**（`/` 仍是唯一首页路径，改名只动菜单 title 与页面文案）；workspace 从「仅挂载时 seed」变为「挂载 seed + 切换时重入」，属卡片事实更新（知识评估已列）
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 消息协议 kind（hello/ready/…）变更须同步三方；帧事件经 SDK `wuh.on` 透传
  - 适用 scope: src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, src/preload/index.ts
  - 本次遵循: 广播 workspace 切换走既有 `documentEvents → broadcast` 通用事件链（**新增事件名，不改消息 kind**，SDK 零改动）
- norms/code-style.md（通用）
  - 执行约束: 跨端共享类型进 shared；不吞异常；不为未来场景提前抽象
- norms/tdd-verification.md（通用）
  - 执行约束: 新功能先写失败测试；完成声明必须附验证输出
- norms/ui-patterns.md（通用）
  - 执行约束: 复用既有 UI 组件（Button/Input/Empty），styled-components 载体

## 决策

- **选型:** 首页内嵌「项目」区块 + 主进程 workspace 域扩展（clone IPC、最近项目持久化、按路径打开），切换生效走**渲染层回调链**（不走主进程推送）。
- **对比方案:**
  - *独立 /projects 路由段做项目管理页*：否决——用户明确要求「首页改名 + 右侧内容保持不变 + 首页新增交互」，新页面偏离需求且扩大路由面（routes.ts/layout/菜单项全要动）。
  - *clone 后仅主进程 setWorkspace、渲染层不感知*：否决——正确性问题：`setWorkspaceInfo` 只在 layout 挂载时 seed，插件 doc 服务的 root 会停在旧工作区，切换后插件读写错目录。
  - *主进程 `webContents.send` 推送 workspace 变更*：否决——打开/clone 都由渲染层发起，IPC 返回值就是新 WorkspaceInfo，渲染层直接 `setWorkspaceInfo + documentEvents.emit('workspace')` 即可，少一条推送通道与订阅生命周期。
- **理由:** 全部落在既有域（workspace 域 + HomePage + documentEvents 广播链），复用 `openWorkspace`/`setWorkspace`/UI 基件；真正的新增只有 clone 通道与最近项目持久化两块。
- **关键设计点:**
  1. **clone URL 解析为 shared 纯函数**（`parseGitCloneUrl`）：接受 `https://<host>/<owner>/<repo>(.git)`；`git@github.com:owner/repo(.git)` 自动转 https；提取默认目录名（repo 段去 `.git`）；非法输入返回 null。渲染层用于表单即时反馈，主进程用于 clone 执行，测试锁契约。
  2. **最近项目**：`userData/recent-workspaces.json`（主进程独占读写），`upsertRecent` 在 `setWorkspace` 成功后统一登记（对话框打开 / clone / 列表点开三条路自动覆盖），cap 8 条、按最近使用排序、去重按 path；IPC `listRecentWorkspaces` / `openWorkspaceByPath`（校验目录存在）。
  3. **clone 执行**：`cloneWorkspace(url)` → 主进程解析 URL → `dialog.showSaveDialog`（默认文件名 = repo 名，`createDirectory`）选目标路径 → 目标存在且非空拒绝 → `simple-git clone --progress` → **失败时清理半成品目录**（best-effort `fsp.rm`）并返回原文错误 → 成功 `setWorkspace`。v1 不做进度百分比（不解析 git stderr），进行中态在渲染层表现为禁用 + 文案。
  4. **切换生效链（渲染层）**：`openWorkspace` / `cloneWorkspace` / `openWorkspaceByPath` 成功返回后：`setWorkspaceInfo(info)`（重入 seed）→ `workspaceStore` 重置 doc 状态（content/activePath/dirty 归属旧工作区，切走即失效）并 `doc.changed` → `documentEvents.emit('workspace', info)`（帧广播既有链路，插件可 `wuh.on('workspace')` 感知）。
  5. **改名接线**：SideMenu `items[0].title` 首页 → 新建博客；页面 Title 区同步项目身份文案。路由 key `home`、路径 `/`、快捷键语义全部不变。
- **非目标（本变更不做）:** 私有仓库 clone（token 注入与 .git/config 清理）；clone 进度百分比；项目管理页（重命名/删除项目）；多工作区并存。

## 任务

### Phase 1 — 共享层与主进程（TDD 先行）
- [x] shared 纯函数 `parseGitCloneUrl`（https / git@ 转 https / 非法拒绝 / repo 名提取）+ 失败测试先行 — `src/shared/workspace.ts,tests/git-clone-url.test.ts` — 新增
- [x] 最近项目纯逻辑（upsert 去重/cap 8/排序）+ 读写与 IPC（list / openWorkspaceByPath 校验目录存在）+ 失败测试先行 — `src/main/recentWorkspaces.ts,tests/recent-workspaces.test.ts` — 新增
- [x] `cloneWorkspace` IPC（解析→选目录→非空拒绝→clone→失败清理→setWorkspace 登记）+ `setWorkspace` 成功即 upsert 最近列表 + `openWorkspace` 打开即登记 — `src/main/cloneWorkspace.ts,src/main/workspace.ts` — 新增/修改
- [x] preload 通道与 shared 类型（cloneWorkspace / listRecentWorkspaces / openWorkspaceByPath / RecentWorkspace）— `src/preload/index.ts,src/shared/types.ts` — 修改

### Phase 2 — 渲染层
- [x] 首页「项目」区块：打开本地目录按钮（复用 openWorkspace）/ clone 表单（URL 输入即时解析反馈 + 提交，进行中禁用与错误展示）/ 最近项目列表（点开、空态 Empty）— `components/home/ProjectSection.tsx,components/home/HomePage.tsx` — 新增/修改
- [x] 切换生效链：成功回调 → setWorkspaceInfo 重入 + workspaceStore doc 状态重置 + `documentEvents.emit('workspace')` 帧广播 — `components/plugins/PluginFrameHost.tsx,lib/store.ts,components/home/ProjectSection.tsx` — 修改
- [x] 改名接线：菜单「首页」→「新建博客」+ 页面身份文案 — `app/(shell)/layout.tsx,components/home/HomePage.tsx` — 修改

### Phase 3 — 验证与文档
- [x] 验证：`pnpm typecheck` + vitest 全量 + `pnpm build`（静态导出路由不变应为 7 条）— 仓库根 — 验证
- [x] 用户运行验收：`pnpm dev` 打开首页（显示「新建博客」）→ 选本地目录切换成功 → clone 一个公开仓库成功且目录落地 → 最近项目出现并可点开 → 切换后插件视图 doc root 正确
- [x] 知识卡更新：`renderer-shell-routing.md`（菜单项「新建博客」、workspace 切换语义：挂载 seed → 可重入 + workspace 事件）— `shadow-docs/knowledge/renderer-shell-routing.md` — 修改
- [x] brief 结果段回填（含验收口径）— `shadow-docs/changes/<本变更>/brief.md` — 修改

## 结果

- 实际耗时: 约 1.5h（含并行会话分支冲突改道：先 worktree 隔离、后按用户指示回主树）
- 验证:
  - **TDD 门禁**：`tests/git-clone-url.test.ts` + `tests/recent-workspaces.test.ts` 先红（module not found）→ 实现后绿；期间 cap 用例暴露测试 seed 与 MRU 序约定不一致（实现语义正确、挤掉队尾最旧项），修正测试数据后 7/7 绿
  - `pnpm typecheck`：node + next 双工程通过（首轮抓出测试文件两处类型错：可空断言缺失、类型改从 @shared/types 导入，已修）
  - `node node_modules/vitest/vitest.mjs run`：**122/122 全绿**（18 文件；本分支基线 115 + 新增 7）
  - `pnpm build`：Next 静态导出通过，路由 **7 条不变**（/ /_not-found /settings + 3 插件 SSG）——符合「不新增路由段」决策
  - **实机验收由用户执行**：`pnpm dev` 打开左栏「新建博客」→ 项目区块显示 → 打开本地目录切换 → clone 一个公开仓库（观察 Clone 中态与完成后自动打开）→ 最近项目列表出现并可点开 → 切换后打开任一插件视图验证 doc root 指向新目录
- **文件清单偏差**（超出 brief 声明范围，均为接线必需）：`src/main/ipc.ts`（DesktopApi 三新方法的 not implemented 默认表）、`src/main/register-features.ts`（加载 cloneWorkspace 模块注册 IPC）
- **并行会话注记**：apply 期间 settings-redesign 会话占用主工作树（本变更曾短暂改道独立 worktree 开发，后按用户指示回主树）；settings 会话的 brief 未提交状态已 stash 保存（`git stash`，含 "settings-redesign brief checkpoint" 字样），其会话继续时需恢复

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md
- **理由:** 首页语义（项目门面 → 项目入口）与 workspace 生命周期（仅挂载 seed → 可重入切换 + workspace 事件广播）都是该卡的 active 结论，被本变更有意演进，不同步则 apply 后卡片与代码冲突；路由段结构与静态导出约束不变，无需动 shell-chrome-design 与 plugin-architecture（事件名新增不触及其执行约束）。
