---
{
  "schema": "shadow-dev/v1",
  "name": "20261017-feature-app-layout-workbench",
  "type": "feature",
  "scope": "shell",
  "status": "committed",
  "baseBranch": "main",
  "branch": "feature/20261017-feature-app-layout-workbench",
  "files": [
    "app/(shell)/account/page.tsx",
    "app/(shell)/drafts/page.tsx",
    "app/(shell)/editor/page.tsx",
    "app/(shell)/layout.tsx",
    "app/(shell)/page.tsx",
    "app/(shell)/plugin/[...slug]/page.tsx",
    "app/(shell)/projects/page.tsx",
    "app/(shell)/settings/page.tsx",
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel/TaskCenterBody.tsx",
    "components/capsule/CapsulePanel/TaskTimeline.tsx",
    "components/capsule/CapsulePanel/index.tsx",
    "components/capsule/modules.tsx",
    "components/capsule/sections/EditorSection/index.tsx",
    "components/contextpanel/index.tsx",
    "components/contextpanel/styles.ts",
    "components/dock/index.tsx",
    "components/dock/styles.ts",
    "components/editor/MarkdownEditor/index.tsx",
    "components/editor/SidePane/index.tsx",
    "components/editor/SidePane/styles.ts",
    "components/plugins/PluginFrameHost/frameServices.ts",
    "components/rail/index.tsx",
    "components/rail/styles.ts",
    "components/theme/tokens.ts",
    "components/ui/Sheet.tsx",
    "lib/dock.ts",
    "lib/editor-commands.ts",
    "lib/editor-state.ts",
    "lib/i18n/locales.ts",
    "lib/panelTabs.ts",
    "plugins/git-history/plugin.json",
    "src/plugin-sdk/index.ts",
    "src/shared/plugin.ts",
    "tests/capsule-dock-forms.test.tsx",
    "tests/capsule-nesting.test.ts",
    "tests/capsule-render.test.tsx",
    "tests/context-panel.test.tsx",
    "tests/dock-panel.test.tsx",
    "tests/editor-context-sidebar.test.tsx",
    "tests/focus-mode.test.tsx",
    "tests/home-workbench.test.tsx",
    "tests/i18n.test.ts",
    "tests/plugin-capsule.test.ts",
    "tests/plugin-extensions.test.ts",
    "tests/plugin-manifest.test.ts",
    "tests/workbench-layout.test.tsx",
    "tests/workbench-rail.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 158,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/158",
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
    "checkpoint": "d8d3b7d9ac186f41e27c5046036162e46b9b40d9",
    "planHash": "3642d9f030d7129af4be208d5f34803b5eb03d322e4ce554e2d93940c2ed80c1",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 整窗「书脊案面」落地——壳层工作台 2.0",
      "titleRaw": "整窗「书脊案面」落地——壳层工作台 2.0",
      "supplement": "书脊化 Rail、案面底+浮起素笺、目次/书耳浮笺化、胶囊升格控制中心（磁贴+分区+功能迁入）、Dock 退役（不设第二聚合点）。设计与决策：brief D1-D8 引用 design-mockups/20261016-app-workbench 定稿视觉稿，四 Phase 移植。",
      "body": "## 动机\n编辑器 2.0「素笺手记」（v1.0.0，PR #156）确立了纸墨语言，但整窗壳层仍是 20261015 工作台的通用 IDE 形态：Rail/上下文面板/Dock/胶囊面板与素笺画芯气质割裂。用户经四轮设计迭代定稿「书脊案面」方向（`design-mockups/20261016-app-workbench/`，场景 b 为定稿构，decisions.md D1-D8 为契约），本轮 = 视觉稿无损移植 + 既有契约同步：书脊化 Rail、案面底 + 浮起素笺、目次/书耳浮笺化、胶囊升格控制中心（磁贴+分区+功能迁入）、Dock 退役（不设第二聚合点）。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: Rail 48px 图标导航、胶囊双形态（下拉⇄停靠）、Dock 渲染于 Body 与 StatusBar 之间、data-chrome 五处、z 分带、浮层点外关守卫\n  - 适用 scope: app, components, lib\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 工作台范式布局链（TitleBar→Rail→上下文面板→main→Dock→StatusBar）、⌘B/⌘K/⌘⇧F 键盘语义、组件域文件夹化、PageTopbar 与两档内容栅格、静态导出约束\n  - 适用 scope: app, components, lib\n- shadow-docs/knowledge/editor.md\n  - 当前结论: /editor 唯一编辑面、SidePane 三页签 + 书口让位、命令通道词表纪律、editor-state 总线\n  - 适用 scope: components/editor, app/(shell)/editor\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: views.area `main|float|dock|context` 与 panelTabs 帧服务、shared/SDK/帧服务三方同步点、声明制守卫\n  - 适用 scope: src/shared/plugin.ts, src/plugin-sdk, components/plugins, lib\n- design-mockups/20261016-app-workbench/（decisions.md D1-D8 + index.html 场景 b 为实现规格，实现 = 无损移植）\n\n## 决策\n- **选型:** 书脊案面整窗无损移植，单 change 四 Phase（Phase 1 书脊+案面 → Phase 2 控制中心 → Phase 3 浮笺+Dock 退役 → Phase 4 主题核对+走查）。\n- **对比方案:** ①拆「壳层」与「编辑页书耳」两 change——否：D3 书耳与 rail 项目钮/书口让位联动强耦合，拆分双走查成本高且视觉一体性断裂；②Dock 退役延后单独 change——否：控制中心承接后 Dock 即第二聚合点，违反 D5「不设第二聚合点」定稿；③插件 dock 契约保留但渲染空壳——否：留死契约违反声明制纪律（sidebar 先例即拒绝 + 指引迁移）。\n- **理由:** 视觉稿与 D1-D8 已由用户四轮迭代定稿，本轮是移植与契约同步而非再设计；两处跨上下文触碰都是 D3/D5 的直接后果，收敛于单 change 一次评审。D6/D7 已随 PR #156 落地不在本 change 范围。L 级走独立 worktree（`shadow-dev worktree plan/execute`），基线 origin/main@95ad23e。\n- **设计假定（实现期以视觉稿为准，偏离先修稿）：**\n  - a) 控制中心壳层三分区（任务/GIT/排版）之后**追加渲染既有插件 capsule tabs 为分区**（声明制契约不变，复用 `parseTabSections` 渲染器）\n  - b) rail 项目钮（▤）重定义为**呼出目次浮笺**（`aria-pressed` 跟随开合）；`/projects` 路由保留（⌘K/首页可达），rail 不再直达该路由\n  - c) 「大纲跟随」磁贴 = editor-state 总线新标志（默认开）+ SidePane 大纲滚动跟随 `activeHeading`\n  - d) 「查找替换」磁贴 = EditorCommand 新词表 `find` → CM6 `openSearchPanel`（自建查找替换 UI 仍留后继 change）\n  - e) GIT 分区「提交」钮 = 行内展开提交信息输入 + 确认（复用 `gitCommit` IPC；推送直发 `gitPush`）\n  - f) 编辑页 SidePane 默认态由展开翻转为**收起**（D3「默认收起」；书耳钮开合链已有）\n\n## 任务\n### Phase 1 书脊 + 案面\n- [ ] task 1 案面底 — `app/(shell)/layout.tsx` — main 容器三重渐变案面底（顶部窗光扫 + 双 radial 暖晕 + 1.2% 纸纹竖纹），颜色只走主题 token/color-mix\n- [ ] task 2 浮笺画芯载体 — `components/ui/Sheet.tsx`（新）+ 各路由页容器 — 素笺载体件（radius 6、双投影 + 顶部内高光、右缘纸页叠口两层）接入 home/projects/drafts/settings/account/plugin 页；/editor 页纸面即素笺本体（仅对齐投影层级）\n- [ ] task 3 书脊化 Rail — `components/rail/` — 48px 布纹织理深墨竖条（双向 repeating-linear-gradient）+ 右缘 1px 朱砂装订线 + 激活指示条/hover 浮起/徽标位对齐稿；底部 W 印（用户项，品牌标导航 /account 语义不变）+ ⚙ 保留\n- [ ] task 4 Phase 1 回归 — `tests/workbench-rail.test.tsx` `tests/workbench-layout.test.tsx` `tests/home-workbench.test.tsx` — 书脊样式守卫（48px/朱线/data-chrome）+ 案面接入零回归\n\n### Phase 2 控制中心\n- [ ] task 5 控制中心容器 — `components/capsule/CapsulePanel/` — 470px 浮笺卡重构（头部 = 「控制中心」+ 工作区·分支 mono；挂点契约 INV-3 不变）\n- [ ] task 6 磁贴网格 — `components/capsule/CapsulePanel/` `lib/editor-state.ts` `lib/editor-commands.ts` `components/editor/MarkdownEditor/index.tsx` — 4×2 磁贴渲染器 + 八磁贴接线：即时渲染（既有 toggleRender 词表）/大纲跟随（总线新标志 c）/专注模式（既有链）/图床·oss（上传模式切换）/主题/外观/语言（ThemeProvider·LocaleProvider 写穿）/查找替换（新词表 `find` → `openSearchPanel`）\n- [ ] task 7 功能分区 — `components/capsule/` — 任务时间线（复用既有时间线行渲染）/ GIT（`gitStatus/gitCommit/gitPush` IPC + 行内提交输入 e）/ 排版（字号步进，DEFAULT_TYPOGRAPHY 链）/ 插件 capsule tabs 追加分区（a，`parseTabSections` 复用）\n- [ ] task 8 EditorSection 收编 — `components/capsule/sections/` — 编辑器分区工具迁移入磁贴/排版分区后瘦身；EditorCommandHost 常驻单实例挂载保持\n- [ ] task 9 i18n + 回归 — `lib/i18n/locales.ts` `tests/capsule-render.test.tsx` `tests/capsule-nesting.test.ts` `tests/plugin-capsule.test.ts` `tests/i18n.test.ts` — 三语新键（磁贴/分区/控制中心）+ 磁贴激活态断言 + 插件 tab 追加分区用例\n\n### Phase 3 浮笺 + Dock 退役\n- [ ] task 10 目次浮笺 — `components/contextpanel/` `components/rail/index.tsx` — 贴边栏改浮笺 slip-card（absolute + 滑出 220ms ease-out-soft + reduced-motion 瞬切；默认收起；rail 项目钮呼出 b + ⌘B 保持 + 头部旋钮收起）；树/VirtualList/`openProjectFile` 打开流零改动\n- [ ] task 11 书耳浮笺 — `components/editor/SidePane/` `app/(shell)/editor/page.tsx` — 右缘贴边侧栏改浮笺（默认收起翻转 f；书耳钮/书口让位链已有）；插件 `area=context` 页签契约不动\n- [ ] task 12 Dock 退役 — `components/dock/`（删）`app/(shell)/layout.tsx` `lib/dock.ts` `components/capsule/Capsule.tsx` — 停靠态与 dock 页签退役、`lib/dock.ts` 单形态开合、胶囊回归纯下拉态、data-chrome 清单更新（INV-2）\n- [ ] task 13 插件 dock 契约退役 — `src/shared/plugin.ts` `src/plugin-sdk/index.ts` `components/plugins/PluginFrameHost/frameServices.ts` `lib/panelTabs.ts` `plugins/git-history/plugin.json` — `views.area` 去 `dock`（validateManifest 拒绝并指引迁移）、panelTabs kind 词表收窄、三方同步（INV-5）、git-history dock-panel 视图退役（胶囊 Git tab + main 视图承接）\n- [ ] task 14 Phase 3 回归 — `tests/capsule-dock-forms.test.tsx`（改单形态）`tests/dock-panel.test.tsx`（退役）`tests/plugin-manifest.test.ts` `tests/plugin-extensions.test.ts` `tests/context-panel.test.tsx` `tests/editor-context-sidebar.test.tsx` `tests/focus-mode.test.tsx` — 值域用例 + 浮笺滑出/reduced-motion 断言 + data-chrome 残留扫描 + dock 引用 grep 清零\n\n### Phase 4 核对 + 走查\n- [ ] task 15 四主题 × 亮暗核对 — `components/theme/tokens.ts`（如需）— 书脊暗色倒置（normal-900 反转浅脊，倒置书效果）实机核对 + 浮笺/案面/控制中心四主题过一遍\n- [ ] task 16 全量回归 — `tests/` — 全量 vitest 小批 + 重试（SGN-1 配方）+ 三 tsconfig typecheck\n- [ ] task 17 实机走查 — `pnpm dev` — 用户走查：整窗三层（书脊/案面/浮笺）、控制中心磁贴全动作、目次/书耳开合与书口让位、专注模式 chrome 退场、插件三挂点（main/float/context）、四主题、reduced-motion、键盘全链（⌘B/⌘K/⌘⇧F/Esc 分治）；缺陷当轮修复\n- [ ] task 18 知识回写 — `shadow-docs/` — shell-chrome-design 大段换代（书脊/控制中心/Dock 退役/z 带）+ renderer-shell-routing 布局段 + plugin-architecture 值域 + editor.md 书耳段 + menu.md 词表\n\n## 补充\n书脊化 Rail、案面底+浮起素笺、目次/书耳浮笺化、胶囊升格控制中心（磁贴+分区+功能迁入）、Dock 退役（不设第二聚合点）。设计与决策：brief D1-D8 引用 design-mockups/20261016-app-workbench 定稿视觉稿，四 Phase 移植。\n\n完整 brief：shadow-docs/changes/20261017-feature-app-layout-workbench/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261017-feature-app-layout-workbench\",\"type\":\"feature\",\"scope\":\"shell\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261017-feature-app-layout-workbench/brief.md\",\"cliVersion\":\"1.5.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "worktree": "/Users/wuhong/shadow-desktop/worktrees/20261017-feature-app-layout-workbench",
    "commit": {
      "files": [
        "shadow-docs/changes/20261017-feature-app-layout-workbench/brief.md"
      ],
      "message": "docs(shadow): brief 立项——整窗「书脊案面」落地（书脊化 Rail/案面底/控制中心/浮笺化目次书耳/Dock 退役），issue 已建，worktree 已派生"
    }
  }
}
---

# 整窗「书脊案面」落地——壳层工作台 2.0

## 动机

编辑器 2.0「素笺手记」（v1.0.0，PR #156）确立了纸墨语言，但整窗壳层仍是 20261015 工作台的通用 IDE 形态：Rail/上下文面板/Dock/胶囊面板与素笺画芯气质割裂。用户经四轮设计迭代定稿「书脊案面」方向（`design-mockups/20261016-app-workbench/`，场景 b 为定稿构，decisions.md D1-D8 为契约），本轮 = 视觉稿无损移植 + 既有契约同步：书脊化 Rail、案面底 + 浮起素笺、目次/书耳浮笺化、胶囊升格控制中心（磁贴+分区+功能迁入）、Dock 退役（不设第二聚合点）。

## 复杂度评级

- **评级:** L
- **理由:** 契约变更（`views.area` 值域收缩、胶囊双形态→单形态、目次/SidePane 挂点从贴边栏改浮笺、data-chrome 覆盖清单变动）× 触及面（壳层五 chrome 件动三件 + 编辑页 + 插件契约三方同步 + i18n + 17 个受影响测试套件）× 可发现性（视觉稿可对照，但键盘/浮层/四主题回归面大，必须实机走查）。
- **期望验证深度:** field（实机走查四主题 + 交互全链），unit 批次绿作前置证据。

## 领域模型

- **限界上下文:** 渲染层壳层 chrome —— 承载整窗形态、导航、聚合入口与主题路由。上游 = 编辑器上下文（SidePane/命令通道）与插件系统（贡献点契约）；下游 = 各路由页画芯。反腐边界：不在壳层重建编辑器渲染面，不在壳层直改任务状态（单一写方 = 插件 SDK）。
  - 跨上下文触碰（有意收敛于本 change，不拆分）：①编辑器上下文——SidePane 浮笺化是容器层改动、书口让位链已存在（`{!paneOpen && <Spine />}`）；新增 EditorCommand `find` 与 editor-state 总线 `outlineFollow` 标志走既有词表/总线纪律。②插件上下文——Dock 退役触发 `views.area` 值域收缩，按声明制四方同步（shared 类型/SDK/帧服务/校验测试）+ git-history manifest 迁移，是 D5 的直接后果而非顺手改。
- **统一语言增量:**
  - **书脊**：壳层 Rail 的纸书转译名（代码仍 `components/rail` 不改名；与编辑器「书口」`components/editor/Spine` 相邻不同物）
  - **案面（desk）**：main 容器的暖色书案底（三重渐变：窗光扫 + 双 radial 暖晕 + 纸纹竖纹）
  - **浮笺（slip-card）**：浮在案面上的纸笺容器形态（radius 6、双投影 + 顶部内高光、右缘纸页叠口）——目次/书耳/控制中心共用
  - **书耳**：编辑页 SidePane 的浮笺形态转译名（组件仍 `components/editor/SidePane`）
  - **目次**：ContextPanel 的浮笺形态转译名（组件仍 `components/contextpanel`）
  - **控制中心**：胶囊展开态的新形态（磁贴网格 + 功能分区），承接 Dock 聚合职责
  - **磁贴（tile）**：控制中心上部 4×2 方印功能钮（半径 7px 方印、禁圆形；激活态朱底方印 + 右上状态点 + 1.5px 朱边）
- **聚合与不变量:**
  - `壳层 chrome 聚合`：
    - INV-2 专注模式 chrome 退场只锚 `data-chrome`（Dock 退役后覆盖清单 = TitleBar/Rail/目次浮笺/StatusBar；浮笺为挂载式浮层，退场残留需用例扫描）
    - INV-3 胶囊挂点契约不破：TitleBar 右侧 chip、面板贴 chip 下缘向下弹出、z70、Esc/点外关 target 归属守卫、`data-capsule-panel` 判定保留（扩展至控制中心卡）
    - INV-4 浮层纪律：浮笺滑出 220ms ease-out-soft + reduced-motion 瞬切（禁 display 瞬切）；Esc 分治一次只关一层；点外关 target 归属守卫；新浮层先归 z 带再实现（控制中心仍 z70，目次/书耳浮笺归带实机核对）
  - `插件契约聚合`：
    - INV-5 `views.area` 值域收缩（去 `dock`）必须四方同步——`src/shared/plugin.ts` 类型 ↔ `src/plugin-sdk/index.ts` 字符串 ↔ `frameServices.ts` + `lib/panelTabs.ts` 裁决 ↔ `tests/plugin-manifest.test.ts`；panelTabs 帧 service kind 词表同步收窄（余 `context`）；git-history manifest 同 change 内迁移（dock-panel 视图退役，能力由胶囊 Git tab + main 视图承接）；`components/dock` 删除后全仓 grep 清零；context 页签契约不动
  - `编辑器聚合`：
    - INV-1 字节保真零触碰（本变更纯壳层显示层；控制中心对编辑器的操控一律经 EditorCommand 词表与既有 IPC，无 markdown 写路径改动）
    - INV-7 编辑面单挂载不变；新增编辑器操控（`find`/大纲跟随）先进词表/总线再消费，不直呼编辑器实例
  - `任务聚合`：
    - INV-6 状态栏原样保留（只读 mono 常驻）；任务状态单一写方 = 插件 SDK 不破（控制中心任务分区只读时间线 + 既有「清空已完成」唯一写例外）
- **领域事件:** Dock 停靠态消亡（`lib/dock.ts` 单形态化，进程内状态无持久化迁移）；控制中心开合沿用胶囊 chip `aria-expanded` 契约；旧版含 `dock` 视图的第三方 manifest 在装载时被 `validateManifest` 拒绝进 problems（sidebar 先例语义）。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: Rail 48px 图标导航、胶囊双形态（下拉⇄停靠）、Dock 渲染于 Body 与 StatusBar 之间、data-chrome 五处、z 分带、浮层点外关守卫
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 工作台范式布局链（TitleBar→Rail→上下文面板→main→Dock→StatusBar）、⌘B/⌘K/⌘⇧F 键盘语义、组件域文件夹化、PageTopbar 与两档内容栅格、静态导出约束
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/editor.md
  - 当前结论: /editor 唯一编辑面、SidePane 三页签 + 书口让位、命令通道词表纪律、editor-state 总线
  - 适用 scope: components/editor, app/(shell)/editor
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: views.area `main|float|dock|context` 与 panelTabs 帧服务、shared/SDK/帧服务三方同步点、声明制守卫
  - 适用 scope: src/shared/plugin.ts, src/plugin-sdk, components/plugins, lib
- design-mockups/20261016-app-workbench/（decisions.md D1-D8 + index.html 场景 b 为实现规格，实现 = 无损移植）

## 决策

- **选型:** 书脊案面整窗无损移植，单 change 四 Phase（Phase 1 书脊+案面 → Phase 2 控制中心 → Phase 3 浮笺+Dock 退役 → Phase 4 主题核对+走查）。
- **对比方案:** ①拆「壳层」与「编辑页书耳」两 change——否：D3 书耳与 rail 项目钮/书口让位联动强耦合，拆分双走查成本高且视觉一体性断裂；②Dock 退役延后单独 change——否：控制中心承接后 Dock 即第二聚合点，违反 D5「不设第二聚合点」定稿；③插件 dock 契约保留但渲染空壳——否：留死契约违反声明制纪律（sidebar 先例即拒绝 + 指引迁移）。
- **理由:** 视觉稿与 D1-D8 已由用户四轮迭代定稿，本轮是移植与契约同步而非再设计；两处跨上下文触碰都是 D3/D5 的直接后果，收敛于单 change 一次评审。D6/D7 已随 PR #156 落地不在本 change 范围。L 级走独立 worktree（`shadow-dev worktree plan/execute`），基线 origin/main@95ad23e。
- **设计假定（实现期以视觉稿为准，偏离先修稿）：**
  - a) 控制中心壳层三分区（任务/GIT/排版）之后**追加渲染既有插件 capsule tabs 为分区**（声明制契约不变，复用 `parseTabSections` 渲染器）
  - b) rail 项目钮（▤）重定义为**呼出目次浮笺**（`aria-pressed` 跟随开合）；`/projects` 路由保留（⌘K/首页可达），rail 不再直达该路由
  - c) 「大纲跟随」磁贴 = editor-state 总线新标志（默认开）+ SidePane 大纲滚动跟随 `activeHeading`
  - d) 「查找替换」磁贴 = EditorCommand 新词表 `find` → CM6 `openSearchPanel`（自建查找替换 UI 仍留后继 change）
  - e) GIT 分区「提交」钮 = 行内展开提交信息输入 + 确认（复用 `gitCommit` IPC；推送直发 `gitPush`）
  - f) 编辑页 SidePane 默认态由展开翻转为**收起**（D3「默认收起」；书耳钮开合链已有）

## 任务

### Phase 1 书脊 + 案面
- [ ] task 1 案面底 — `app/(shell)/layout.tsx` — main 容器三重渐变案面底（顶部窗光扫 + 双 radial 暖晕 + 1.2% 纸纹竖纹），颜色只走主题 token/color-mix
- [ ] task 2 浮笺画芯载体 — `components/ui/Sheet.tsx`（新）+ 各路由页容器 — 素笺载体件（radius 6、双投影 + 顶部内高光、右缘纸页叠口两层）接入 home/projects/drafts/settings/account/plugin 页；/editor 页纸面即素笺本体（仅对齐投影层级）
- [ ] task 3 书脊化 Rail — `components/rail/` — 48px 布纹织理深墨竖条（双向 repeating-linear-gradient）+ 右缘 1px 朱砂装订线 + 激活指示条/hover 浮起/徽标位对齐稿；底部 W 印（用户项，品牌标导航 /account 语义不变）+ ⚙ 保留
- [ ] task 4 Phase 1 回归 — `tests/workbench-rail.test.tsx` `tests/workbench-layout.test.tsx` `tests/home-workbench.test.tsx` — 书脊样式守卫（48px/朱线/data-chrome）+ 案面接入零回归

### Phase 2 控制中心
- [ ] task 5 控制中心容器 — `components/capsule/CapsulePanel/` — 470px 浮笺卡重构（头部 = 「控制中心」+ 工作区·分支 mono；挂点契约 INV-3 不变）
- [ ] task 6 磁贴网格 — `components/capsule/CapsulePanel/` `lib/editor-state.ts` `lib/editor-commands.ts` `components/editor/MarkdownEditor/index.tsx` — 4×2 磁贴渲染器 + 八磁贴接线：即时渲染（既有 toggleRender 词表）/大纲跟随（总线新标志 c）/专注模式（既有链）/图床·oss（上传模式切换）/主题/外观/语言（ThemeProvider·LocaleProvider 写穿）/查找替换（新词表 `find` → `openSearchPanel`）
- [ ] task 7 功能分区 — `components/capsule/` — 任务时间线（复用既有时间线行渲染）/ GIT（`gitStatus/gitCommit/gitPush` IPC + 行内提交输入 e）/ 排版（字号步进，DEFAULT_TYPOGRAPHY 链）/ 插件 capsule tabs 追加分区（a，`parseTabSections` 复用）
- [ ] task 8 EditorSection 收编 — `components/capsule/sections/` — 编辑器分区工具迁移入磁贴/排版分区后瘦身；EditorCommandHost 常驻单实例挂载保持
- [ ] task 9 i18n + 回归 — `lib/i18n/locales.ts` `tests/capsule-render.test.tsx` `tests/capsule-nesting.test.ts` `tests/plugin-capsule.test.ts` `tests/i18n.test.ts` — 三语新键（磁贴/分区/控制中心）+ 磁贴激活态断言 + 插件 tab 追加分区用例

### Phase 3 浮笺 + Dock 退役
- [ ] task 10 目次浮笺 — `components/contextpanel/` `components/rail/index.tsx` — 贴边栏改浮笺 slip-card（absolute + 滑出 220ms ease-out-soft + reduced-motion 瞬切；默认收起；rail 项目钮呼出 b + ⌘B 保持 + 头部旋钮收起）；树/VirtualList/`openProjectFile` 打开流零改动
- [ ] task 11 书耳浮笺 — `components/editor/SidePane/` `app/(shell)/editor/page.tsx` — 右缘贴边侧栏改浮笺（默认收起翻转 f；书耳钮/书口让位链已有）；插件 `area=context` 页签契约不动
- [ ] task 12 Dock 退役 — `components/dock/`（删）`app/(shell)/layout.tsx` `lib/dock.ts` `components/capsule/Capsule.tsx` — 停靠态与 dock 页签退役、`lib/dock.ts` 单形态开合、胶囊回归纯下拉态、data-chrome 清单更新（INV-2）
- [ ] task 13 插件 dock 契约退役 — `src/shared/plugin.ts` `src/plugin-sdk/index.ts` `components/plugins/PluginFrameHost/frameServices.ts` `lib/panelTabs.ts` `plugins/git-history/plugin.json` — `views.area` 去 `dock`（validateManifest 拒绝并指引迁移）、panelTabs kind 词表收窄、三方同步（INV-5）、git-history dock-panel 视图退役（胶囊 Git tab + main 视图承接）
- [ ] task 14 Phase 3 回归 — `tests/capsule-dock-forms.test.tsx`（改单形态）`tests/dock-panel.test.tsx`（退役）`tests/plugin-manifest.test.ts` `tests/plugin-extensions.test.ts` `tests/context-panel.test.tsx` `tests/editor-context-sidebar.test.tsx` `tests/focus-mode.test.tsx` — 值域用例 + 浮笺滑出/reduced-motion 断言 + data-chrome 残留扫描 + dock 引用 grep 清零

### Phase 4 核对 + 走查
- [ ] task 15 四主题 × 亮暗核对 — `components/theme/tokens.ts`（如需）— 书脊暗色倒置（normal-900 反转浅脊，倒置书效果）实机核对 + 浮笺/案面/控制中心四主题过一遍
- [ ] task 16 全量回归 — `tests/` — 全量 vitest 小批 + 重试（SGN-1 配方）+ 三 tsconfig typecheck
- [ ] task 17 实机走查 — `pnpm dev` — 用户走查：整窗三层（书脊/案面/浮笺）、控制中心磁贴全动作、目次/书耳开合与书口让位、专注模式 chrome 退场、插件三挂点（main/float/context）、四主题、reduced-motion、键盘全链（⌘B/⌘K/⌘⇧F/Esc 分治）；缺陷当轮修复
- [ ] task 18 知识回写 — `shadow-docs/` — shell-chrome-design 大段换代（书脊/控制中心/Dock 退役/z 带）+ renderer-shell-routing 布局段 + plugin-architecture 值域 + editor.md 书耳段 + menu.md 词表

## 结果

- 实际耗时: —
- 验证: —（L 级逐条对账：INV-1 diff 无 markdown 写路径 / INV-2 专注退场用例 + data-chrome 扫描 / INV-3 胶囊挂点断言 / INV-4 滑出动效 + Esc 分治 + reduced-motion 用例 / INV-5 plugin-manifest 值域用例 + `grep -rn "dock"` 清零扫描 / INV-6 状态栏与任务只读用例 / INV-7 editor 套件绿；field 证据 = task 17 走查记录）

## 知识评估

- **预期影响:** 更新（大段换代）
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md（书脊/控制中心/Dock 退役/z 带）、shadow-docs/knowledge/renderer-shell-routing.md（布局链与键盘语义）、shadow-docs/knowledge/plugin-architecture.md（views.area 值域）、shadow-docs/knowledge/editor.md（SidePane→书耳段）、shadow-docs/menu.md（词表）
- **理由:** 壳层形态与插件挂点契约双双换代，四张 active 卡的「当前结论」与「执行约束」多处失真（胶囊双形态/Dock 渲染位/area 四值/上下文面板贴边/SidePane 贴边默认展开），必须随归档回写，否则下个 change 按旧契约施工。
