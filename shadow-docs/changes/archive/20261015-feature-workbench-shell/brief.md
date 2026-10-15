---
{
  "schema": "shadow-dev/v1",
  "name": "20261015-feature-workbench-shell",
  "type": "feature",
  "scope": "shell",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20261015-feature-workbench-shell",
  "files": [
    "app/(shell)/editor/page.tsx",
    "app/(shell)/layout.tsx",
    "app/(shell)/page.tsx",
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel/index.tsx",
    "components/context/ContextPanel/index.tsx",
    "components/dock/index.tsx",
    "components/editor/Toolbar.tsx",
    "components/home/Heatmap.tsx",
    "components/home/HomePage.tsx",
    "components/menu/ProjectsTree.tsx",
    "components/palette/CommandPalette/index.tsx",
    "components/plugins/PluginFrameHost/frameServices.ts",
    "components/rail/index.tsx",
    "lib/capsule.ts",
    "lib/floats.ts",
    "lib/i18n/locales.ts",
    "lib/routes.ts",
    "src/plugin-sdk/index.ts",
    "src/shared/plugin.ts",
    "tests/plugin-manifest.test.ts",
    "tests/workbench-shell.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 153,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/153",
    "pullRequest": 154,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/154"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "6b005901f1044598550370b6bc93e06349ca495f",
    "verifiedAt": "2026-10-15T12:49:44.601Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:154",
    "planHash": "6abfe4104433832178e44dc4a7ef1ba24fadf8ab580bbfa3465510e2b61d90ed",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 工作台壳层重设计（Writing Workbench）：rail + 可停靠面板 + 插件挂点系统化",
      "titleRaw": "工作台壳层重设计（Writing Workbench）：rail + 可停靠面板 + 插件挂点系统化",
      "supplement": "推翻两栏骨架，落地方案 A 工作台范式：恒 48px rail、上下文面板（VirtualList 文档树）、胶囊双形态（下拉⇄停靠 Dock）、编辑器中央单挂载 + 专注模式、⌘K 命令面板、任务流首页（热力图首屏锚点）、插件 views.area 扩展 dock|context + commands 贡献点。设计稿已经用户走查确认（含 ①-⑨ 挂点标注）。详见 shadow-docs/changes/20261015-feature-workbench-shell/brief.md",
      "body": "## 动机\n用户裁决推翻现有「两栏布局（SideMenu + main）+ TitleBar + StatusBar」骨架，重设计 APP 结构布局，锚定四个痛点：\n\n1. **插件存在感弱/挂点散**——插件收在 SideMenu 子树，浮窗/状态项/胶囊页签缺乏系统性的位置规划\n2. **写作流不沉浸**——首页编辑面板与 /editor 双挂载割裂，chrome 常驻打断写作\n3. **信息架构按功能不按任务**——首页/项目/草稿按功能分区，常用路径跳转多\n4. **空间利用率/缺停靠区**——SideMenu 展开占宽，浮窗自由但粗糙，无常驻停靠区\n\n已产出可交互 HTML 设计稿（含 ①-⑨ 挂点标注层、胶囊双形态、⌘K、专注模式、亮暗/酒红素雅四态），经用户逐项走查并确认三项修正：热力图保留且置于首页首屏锚点位、胶囊组件双形态保留、大文档树虚拟化继承。方案 A 确认通过。\n\n## 引用规范\n- `shadow-docs/knowledge/renderer-shell-routing.md`\n  - 当前结论: 两栏布局由 `app/(shell)/layout.tsx` 持久化；路由段互斥渲染右栏页面；PageTopbar 吸顶范式 + 760/900 两档栅格；静态导出（`output: 'export'`，动态路由构建期枚举）；i18n 三语字典 + 源码键覆盖扫描；启动 splash 路径；Node 22 钉定与 V8 绕行配方\n  - 适用 scope: [app, components, lib]\n  - 本变更**有意推翻两栏骨架**（见决策 1），其余约束全部保留遵循\n- `shadow-docs/knowledge/shell-chrome-design.md`\n  - 当前结论: styled-components + 主题 token 载体；图标注册表（禁裸 lucide）；z 分带（浮窗≤58/tooltip 60/面板 70/Toast 90/Dialog 100）；键盘焦点统一 `outline: 2px solid var(--primary-color)`；圆角/字号 token scale；进度类填充 scaleX；胶囊挂点契约（TitleBar 右缘 + 面板贴 chip 下缘）；插件扩展点声明制优先流程；浮层点外关 target 归属守卫\n  - 适用 scope: [app, components, lib, src/shared/plugin.ts, src/plugin-sdk, build, scripts]\n  - 全部保留；胶囊挂点契约整段重写（决策 3），z 分带为新增浮层（palette/dock/focus 浮条）分配新层级\n- `shadow-docs/knowledge/plugin-architecture.md`\n  - 当前结论: 声明制优先（manifest schema → validateManifest → tests 用例）；帧协议三方同步；CAPABILITY_METHODS 白名单；svcUi + documentEvents 模式；`protocol.handle` scheme 不带尾冒号等三层帧可达契约\n  - 适用 scope: [src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, components/plugins/PluginFrameHost]\n  - views.area 扩展与 commands 贡献点必须走同一声明制流程（决策 2）\n- `shadow-docs/knowledge/renderer-virtual-list.md`\n  - 当前结论: 固定行高 VirtualList（压平单列表 + useMemo + 窗口纯函数）；行高恒定 26px 与 itemHeight 严格一致；展开/选中状态提升到消费方；根元素即滚动容器；懒加载保留；动态行高不支持\n  - 适用 scope: [components]\n  - 上下文面板文档树硬约束（用户明确要求继承 ahooks useVirtualList 同款模式，项目已有同构实现）\n- `shadow-docs/knowledge/editor.md`\n  - 当前结论: 首页 EditorPanel + /editor 双挂载点路由互斥保证单 CM6 实例；content 双通道防回环；EditorCommandHost 常驻壳层；saveAs 凡选位置一律原生弹窗；字节保真；命令通道词表\n  - 适用 scope: [components/editor, components/home/EditorPanel, app/(shell)/editor, lib/editor-cm, lib/editor-commands]\n  - 双挂载点模型收敛为中央单挂载（决策 4）；其余编辑器内核契约全部不变\n- `shadow-docs/knowledge/ui-feedback.md`（路由命中）\n  - 当前结论: Toast/Message/Alert 反馈体系\n  - 适用 scope: [components/ui/FeedbackHost, lib/feedback]\n  - 反馈体系不变，新浮层（palette/dock）复用既有机制\n\n## 决策\n- **选型:** 方案 A「可停靠工作台（Writing Workbench）」为主干 + 吸收方案 B 的专注模式 + 吸收方案 C 的任务流首页\n- **对比方案:** 方案 B 双模（Focus & Hub）——写作沉浸最强但插件挂点系统性弱、管理模式与现状差异不大；方案 C 任务流画布——无常驻导航对桌面写作工具反直觉。均已否决，但各自优势点被吸收。\n- **理由与关键权衡:**\n  1. **两栏骨架推翻**：SideMenu（48/220 双形态 + 底部两项制 + 插件子树）退役，替换为恒 48px 图标 rail（激活指示条、data-tip 仅此一处保留、插件 popover 呈现 main 视图与浮窗开关行）。文字导航职责让位 ⌘K 命令面板。这是对 renderer-shell-routing「两栏布局」结论的有意推翻，实施完成后更新该卡片。\n  2. **插件挂点系统化**（痛点 1 核心）：`views.area` 从 `main|float` 扩展为 `main|float|dock|context`，新增 commands 贡献点（⌘K 插件命令组）。容量护栏：每插件 dock ≤1 页签、context ≤1 页签、commands ≤8、payload 沿用 4KB 上限。与已废弃 sidebar 的本质区别：旧 sidebar 是插件视图的第三落位（平铺致滥），新 dock/context 是**壳层一等面板 + 插件贡献制**。声明制优先：manifest schema + validateManifest + tests 先行，运行时 API 只能操作声明过的资源；commands 同理（不复刻 tasks/events 的护栏制例外）。\n  3. **胶囊双形态**（用户明确要求保留）：chip（微进度环 + ghost 药丸 + mono 计数）信号位原样保留于 TitleBar 右缘；任务中心面板保留现有下拉交互，新增「停靠到底部 Dock」，停靠后 chip 兼任 Dock 开关，「取消停靠」回退下拉。shell-chrome-design 挂点契约整段重写。\n  4. **编辑器中央单挂载**（痛点 2）：首页 EditorPanel 退役，`/editor` 成为中央一等视图（沉浸列宽 + 顶部浮条形态）；双挂载点路由互斥模型简化为单挂载，workspaceStore/命令通道/EditorCommandHost 常驻机制不变——这是简化而非重写，editor.md 双通道防回环等内核契约零改动。\n  5. **专注模式**：⌘⇧F 或标题栏按钮触发，chrome（rail/上下文面板/侧栏/Dock/状态栏/TitleBar）全退场，编辑器满幅 + 顶部浮条（文档名/自动保存/字数/退出）+ 右下迷你工具簇；Esc 按既有「只关最顶层」分层语义退出。\n  6. **首页任务流 + 热力图锚点**（痛点 3 + 用户裁决）：新首页 = 问候/今日概览 → **写作活跃度热力图（首屏第一卡，视觉锚点，用户明确要求置顶）** → 继续写作主卡 → 待发布/草稿箱 → 插件动态。`components/home/Heatmap.tsx` 自持组件直接迁移（token 色阶自动适配）。\n  7. **文档树虚拟化**（用户明确要求）：上下文面板文档树沿用 ProjectsTree 压平 + VirtualList 方案，行高 26px、懒加载、展开状态提升；面板改为通栏高列后由调用方给 `flex:1` 高度。\n  8. **保留不变的清单**：路由段体系与静态导出约束、PageTopbar、状态栏 statusItems 契约、浮窗层 float（定位为「即用即走」与 Dock「常驻停靠」互补）、z 分带体系（新增浮层按序入带：palette 与 Dialog 同带 100、dock 70、focus 浮条 45）、i18n 三语机制（新增文案键三语齐配）、启动 splash、主题体系。\n\n设计稿参照：会话可视化目录 `workbench-shell-mockup.html`（用户已走查确认，含 ①-⑨ 挂点标注图例，可作实施验收对照）。\n\n## 任务\n### Phase 1 壳层骨架\n- [x] rail 组件：48px 恒定图标列（激活指示条/徽标位/data-tip/插件 popover）替代 SideMenu — `components/rail/`（新）\n- [x] layout 骨架改造：TitleBar + rail + 上下文面板 + center + dockbar/dock + 状态栏五段结构 — `app/(shell)/layout.tsx`\n- [x] 上下文面板：ProjectsTree 压平逻辑迁移 + VirtualList 接入（26px/懒加载/展开状态提升/flex:1 滚动容器）+ 最近项目 + ⌘B 开合 — `components/context/`（新）、`components/ui/VirtualList.tsx`\n- [x] SideMenu 及 toggleItems/底部两项制退役清理 + 路由 key 映射更新（`lib/routes.ts`）— `components/SideMenu/`（删）\n\n### Phase 2 胶囊与 Dock\n- [x] 胶囊双形态：chip 开合下拉 ⇄ 停靠 Dock，undock 回退，aria-expanded/点外关/Esc 分层守卫 — `components/capsule/`\n- [x] Dock 条 + 面板：任务中心时间线迁入 + 插件 dock 页签声明制渲染 + 收起/展开 — `components/dock/`（新）、`lib/capsule.ts`\n\n### Phase 3 编辑器中央化与专注模式\n- [x] `/editor` 中央一等化：沉浸列宽 + 顶栏浮条化，首页 EditorPanel 退役（双挂载 → 单挂载），面包屑文档操作/saveAs 链路回归 — `app/(shell)/editor/`、`components/home/EditorPanel/`（删）\n- [x] 专注模式：⌘⇧F/按钮触发 chrome 退场 + 顶部浮条 + 右下迷你工具簇 + Esc 分层退出 — `app/(shell)/layout.tsx`\n- [x] 右缘上下文侧栏：大纲/元数据/图床 tab（壳层自有）+ `area=context` 插件页签声明制渲染 — `components/editor/`\n\n### Phase 4 命令面板与首页\n- [x] ⌘K 命令面板：导航/文档动作/插件 commands/模式四组，输入过滤 + 键盘上下 + Enter 执行 + 点外关 — `components/palette/`（新）\n- [x] 首页任务流重排：热力图首屏锚点 + 继续写作主卡 + 待发布/草稿箱 + 插件动态 — `components/home/`\n\n### Phase 5 插件契约扩展\n- [x] manifest 扩展：`views.area` 增 `dock|context` + `commands` 贡献点 + validateManifest 容量护栏 + 用例 — `src/shared/plugin.ts`、`tests/plugin-manifest.test.ts`\n- [x] SDK 与帧服务：`wuh.dock.updateTab`/`wuh.context.updateTab`/`wuh.commands` 面扩展，三方同步（shared ↔ SDK ↔ frameServices）+ 用例 — `src/plugin-sdk/index.ts`、`components/plugins/PluginFrameHost/frameServices.ts`、`lib/capsule.ts`\n- [x] 内置插件迁移示范：git-history 贡献 dock 页签、image-host 贡献 context 页签 + commands、preview-markdown 保持 float 不变 — `plugins/*/plugin.json`\n\n### Phase 6 验证与收尾\n- [x] 全量 `pnpm test` + 三 tsconfig typecheck + `pnpm dist` 打包冒烟（app:// 加载）\n- [ ] 走查矩阵：四主题 × 亮暗 × reduced-motion × 键盘遍历 × 浮层层叠（palette/dock/focus/浮窗/Toast/Dialog）\n- [x] i18n 三语键覆盖扫描通过 + splash 回归 + L 级 field 验收（用户实机走查）\n\n## 补充\n推翻两栏骨架，落地方案 A 工作台范式：恒 48px rail、上下文面板（VirtualList 文档树）、胶囊双形态（下拉⇄停靠 Dock）、编辑器中央单挂载 + 专注模式、⌘K 命令面板、任务流首页（热力图首屏锚点）、插件 views.area 扩展 dock|context + commands 贡献点。设计稿已经用户走查确认（含 ①-⑨ 挂点标注）。详见 shadow-docs/changes/20261015-feature-workbench-shell/brief.md\n\n完整 brief：shadow-docs/changes/20261015-feature-workbench-shell/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261015-feature-workbench-shell\",\"type\":\"feature\",\"scope\":\"shell\",\"status\":\"branched\",\"branch\":\"feature/20261015-feature-workbench-shell\",\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261015-feature-workbench-shell/brief.md\",\"cliVersion\":\"1.6.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "worktree": "D:\\works\\worktrees\\desktop\\workbench-shell",
    "release": {
      "files": [
        "app/(shell)/editor/page.tsx",
        "app/(shell)/layout.tsx",
        "components/FloatLayer/index.tsx",
        "components/FloatLayer/styles.ts",
        "components/StatusBar.tsx",
        "components/capsule/Capsule.tsx",
        "components/capsule/CapsulePanel/TaskCenterBody.tsx",
        "components/capsule/CapsulePanel/index.tsx",
        "components/capsule/CapsulePanel/styles.ts",
        "components/contextpanel/index.tsx",
        "components/contextpanel/styles.ts",
        "components/dock/index.tsx",
        "components/dock/styles.ts",
        "components/editor/SidePane/index.tsx",
        "components/editor/SidePane/styles.ts",
        "components/home/HomePage.tsx",
        "components/icons/index.tsx",
        "components/menu/ProjectsTree.tsx",
        "components/plugins/PluginFrameHost/frameProtocol.ts",
        "components/plugins/PluginFrameHost/frameServices.ts",
        "components/rail/index.tsx",
        "components/rail/styles.ts",
        "components/settings/AppearanceSection.tsx",
        "components/settings/ImageHostSection.tsx",
        "components/settings/SettingsPage.tsx",
        "components/ui/SegmentedControl.tsx",
        "lib/capsule.ts",
        "lib/commands.ts",
        "lib/contributions.ts",
        "lib/dock.ts",
        "lib/drafts.ts",
        "lib/i18n/locales.ts",
        "lib/navigate.ts",
        "lib/palette.ts",
        "lib/panelTabs.ts",
        "lib/tabSections.ts",
        "plugins/git-history/logic/status.js",
        "plugins/git-history/plugin.json",
        "shadow-docs/changes/20261015-feature-workbench-shell",
        "shadow-docs/knowledge/editor.md",
        "shadow-docs/knowledge/plugin-architecture.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "shadow-docs/menu.md",
        "src/plugin-sdk/index.ts",
        "src/shared/plugin.ts",
        "tests/capsule-dock-forms.test.tsx",
        "tests/command-palette.test.tsx",
        "tests/context-panel.test.tsx",
        "tests/dock-panel.test.tsx",
        "tests/drafts-editor-dom.test.tsx",
        "tests/editor-center.test.tsx",
        "tests/editor-context-sidebar.test.tsx",
        "tests/focus-mode.test.tsx",
        "tests/frame-services.test.tsx",
        "tests/helpers/dom-env.ts",
        "tests/home-workbench.test.tsx",
        "tests/palette-commands.test.ts",
        "tests/plugin-extensions.test.ts",
        "tests/plugin-manifest.test.ts",
        "tests/settings-appearance.test.tsx",
        "tests/workbench-layout.test.tsx",
        "tests/workbench-rail.test.tsx"
      ],
      "message": "chore(shadow): 工作台变更收尾——brief 元数据（release 计划哈希/PR 关联）落盘",
      "title": "feat(shell): 工作台壳层重设计——rail + 可停靠面板 + 插件挂点系统化",
      "body": "## 工作台壳层重设计（Writing Workbench）\n\n推翻「两栏布局（SideMenu + main）+ TitleBar + StatusBar」骨架，落地方案 A 可停靠工作台范式。设计稿（含 ①-⑨ 挂点标注层）经用户逐项走查确认后实施。\n\n### 壳层骨架\n\n- **恒 48px Rail**（`components/rail/`）取代 SideMenu 双形态菜单：激活指示条/徽标/data-tip；【插件】popover 呈现 main 视图 + 浮窗开关（复用 PluginTree）；底部用户/设置两项\n- **上下文面板**（`components/contextpanel/`，⌘B）：文档树（ProjectsTree fill 形态，26px 固定行高 VirtualList + 懒加载 + 展开状态提升）+ 最近项目；hidden 保挂载不丢树缓存\n- **底部 Dock**（`components/dock/`）：任务中心停靠态 + 插件 dock 页签（声明制），空态不渲染不占高\n\n### 胶囊双形态\n\nchip（微进度环 + ghost 药丸 + mono 计数）信号位原样保留；任务中心「下拉 ⇄ 停靠 Dock」双形态（`lib/dock.ts` 单一状态源），停靠后 chip 兼任 Dock 开关，Esc/点外关只对下拉态生效。\n\n### 编辑器中央单挂载 + 专注模式\n\n- 首页 EditorPanel 退役，`/editor` 为唯一编辑面（workspaceStore/命令通道/EditorCommandHost 契约零改动）\n- **专注模式**（⌘⇧F）：chrome 全退场只锚 `[data-chrome]` 稳定属性（review 修复：元素选择器会误伤内容区——编辑页 PageShell 与首页卡片都是 section，曾是白屏级缺陷）+ 顶部浮条（文档名/保存态/字数/退出）+ 路由切换自动退出\n- **右缘上下文侧栏**（`components/editor/SidePane/`）：大纲（命令通道跳转）/元数据（只读 + 跳 Frontmatter 插件）/图床（入口）+ 插件 `area=context` 页签\n\n### ⌘K 命令面板 + 首页任务流\n\n- 命令面板（`components/palette/`）：导航/文档动作/插件命令/模式四组，输入过滤 + ↑↓ + Enter + 点外关\n- 首页任务流：热力图首屏锚点保留（用户裁决）→ 继续写作 → 草稿箱/项目 → 插件动态\n\n### 插件契约扩展\n\n- `views.area`：`main|float` → **`main|float|dock|context`**（每插件 dock/context 各 ≤1 护栏）\n- 新增 `commands` 贡献点（每插件 ≤8；v1 = main 视图快捷命令）\n- SDK `wuh.panelTab.update/remove`；帧服务 `panelTabs`；护栏解析收敛 `lib/tabSections.ts`（capsule tabs 同源共享）\n- 装配：`lib/contributions.ts` wire/unwire 挂 bootstrap/启停；git-history 端到端示范（dock 页签 + ⌘K 命令）\n\n### 回归修复\n\n- 主题/外观/语言三入口迁入设置页「外观与语言」区段（`AppearanceSection` + 通用件 `SegmentedControl`）——SideMenu 退役曾使全仓无 setFamily/setScheme/setLocale 消费方\n- ImageHostSection 上传模式行收敛到 SegmentedControl\n\n### 验证\n\n- **769/769 测试全绿**（87 文件；新增 13 个测试文件 108 条用例，TDD 先红后绿）\n- 三 tsconfig typecheck 全绿；`pnpm build` 构建冒烟通过（静态导出含全部路由段与四插件视图）\n- i18n 三语键扫描 / splash / SDK 标签 / 滚动条守卫全绿\n\nCloses #153"
    }
  },
  "knowledge": null
}
---

# 工作台壳层重设计（Writing Workbench）：rail + 可停靠面板 + 插件挂点系统化

## 动机

用户裁决推翻现有「两栏布局（SideMenu + main）+ TitleBar + StatusBar」骨架，重设计 APP 结构布局，锚定四个痛点：

1. **插件存在感弱/挂点散**——插件收在 SideMenu 子树，浮窗/状态项/胶囊页签缺乏系统性的位置规划
2. **写作流不沉浸**——首页编辑面板与 /editor 双挂载割裂，chrome 常驻打断写作
3. **信息架构按功能不按任务**——首页/项目/草稿按功能分区，常用路径跳转多
4. **空间利用率/缺停靠区**——SideMenu 展开占宽，浮窗自由但粗糙，无常驻停靠区

已产出可交互 HTML 设计稿（含 ①-⑨ 挂点标注层、胶囊双形态、⌘K、专注模式、亮暗/酒红素雅四态），经用户逐项走查并确认三项修正：热力图保留且置于首页首屏锚点位、胶囊组件双形态保留、大文档树虚拟化继承。方案 A 确认通过。

## 复杂度评级

- **评级:** L
- **理由:** ①契约变更——manifest `views.area` 扩展（dock/context）+ 新增 commands 贡献点 + SDK 面扩展，三方同步（shared 类型 ↔ SDK ↔ 帧宿主）；②触及面——壳层骨架（layout/SideMenu→rail/胶囊/状态栏）、首页重排、编辑器落位收敛、插件宿主、i18n 三语、测试矩阵全部波及；③可发现性——范式级变更需四主题×亮暗×reduced-motion×键盘遍历走查矩阵，回归风险面大。三要素全中。
- **期望验证深度:** field（L 级完整 TDD + 实机走查为最终验收）

## 引用规范

- `shadow-docs/knowledge/renderer-shell-routing.md`
  - 当前结论: 两栏布局由 `app/(shell)/layout.tsx` 持久化；路由段互斥渲染右栏页面；PageTopbar 吸顶范式 + 760/900 两档栅格；静态导出（`output: 'export'`，动态路由构建期枚举）；i18n 三语字典 + 源码键覆盖扫描；启动 splash 路径；Node 22 钉定与 V8 绕行配方
  - 适用 scope: [app, components, lib]
  - 本变更**有意推翻两栏骨架**（见决策 1），其余约束全部保留遵循
- `shadow-docs/knowledge/shell-chrome-design.md`
  - 当前结论: styled-components + 主题 token 载体；图标注册表（禁裸 lucide）；z 分带（浮窗≤58/tooltip 60/面板 70/Toast 90/Dialog 100）；键盘焦点统一 `outline: 2px solid var(--primary-color)`；圆角/字号 token scale；进度类填充 scaleX；胶囊挂点契约（TitleBar 右缘 + 面板贴 chip 下缘）；插件扩展点声明制优先流程；浮层点外关 target 归属守卫
  - 适用 scope: [app, components, lib, src/shared/plugin.ts, src/plugin-sdk, build, scripts]
  - 全部保留；胶囊挂点契约整段重写（决策 3），z 分带为新增浮层（palette/dock/focus 浮条）分配新层级
- `shadow-docs/knowledge/plugin-architecture.md`
  - 当前结论: 声明制优先（manifest schema → validateManifest → tests 用例）；帧协议三方同步；CAPABILITY_METHODS 白名单；svcUi + documentEvents 模式；`protocol.handle` scheme 不带尾冒号等三层帧可达契约
  - 适用 scope: [src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, components/plugins/PluginFrameHost]
  - views.area 扩展与 commands 贡献点必须走同一声明制流程（决策 2）
- `shadow-docs/knowledge/renderer-virtual-list.md`
  - 当前结论: 固定行高 VirtualList（压平单列表 + useMemo + 窗口纯函数）；行高恒定 26px 与 itemHeight 严格一致；展开/选中状态提升到消费方；根元素即滚动容器；懒加载保留；动态行高不支持
  - 适用 scope: [components]
  - 上下文面板文档树硬约束（用户明确要求继承 ahooks useVirtualList 同款模式，项目已有同构实现）
- `shadow-docs/knowledge/editor.md`
  - 当前结论: 首页 EditorPanel + /editor 双挂载点路由互斥保证单 CM6 实例；content 双通道防回环；EditorCommandHost 常驻壳层；saveAs 凡选位置一律原生弹窗；字节保真；命令通道词表
  - 适用 scope: [components/editor, components/home/EditorPanel, app/(shell)/editor, lib/editor-cm, lib/editor-commands]
  - 双挂载点模型收敛为中央单挂载（决策 4）；其余编辑器内核契约全部不变
- `shadow-docs/knowledge/ui-feedback.md`（路由命中）
  - 当前结论: Toast/Message/Alert 反馈体系
  - 适用 scope: [components/ui/FeedbackHost, lib/feedback]
  - 反馈体系不变，新浮层（palette/dock）复用既有机制

## 决策

- **选型:** 方案 A「可停靠工作台（Writing Workbench）」为主干 + 吸收方案 B 的专注模式 + 吸收方案 C 的任务流首页
- **对比方案:** 方案 B 双模（Focus & Hub）——写作沉浸最强但插件挂点系统性弱、管理模式与现状差异不大；方案 C 任务流画布——无常驻导航对桌面写作工具反直觉。均已否决，但各自优势点被吸收。
- **理由与关键权衡:**
  1. **两栏骨架推翻**：SideMenu（48/220 双形态 + 底部两项制 + 插件子树）退役，替换为恒 48px 图标 rail（激活指示条、data-tip 仅此一处保留、插件 popover 呈现 main 视图与浮窗开关行）。文字导航职责让位 ⌘K 命令面板。这是对 renderer-shell-routing「两栏布局」结论的有意推翻，实施完成后更新该卡片。
  2. **插件挂点系统化**（痛点 1 核心）：`views.area` 从 `main|float` 扩展为 `main|float|dock|context`，新增 commands 贡献点（⌘K 插件命令组）。容量护栏：每插件 dock ≤1 页签、context ≤1 页签、commands ≤8、payload 沿用 4KB 上限。与已废弃 sidebar 的本质区别：旧 sidebar 是插件视图的第三落位（平铺致滥），新 dock/context 是**壳层一等面板 + 插件贡献制**。声明制优先：manifest schema + validateManifest + tests 先行，运行时 API 只能操作声明过的资源；commands 同理（不复刻 tasks/events 的护栏制例外）。
  3. **胶囊双形态**（用户明确要求保留）：chip（微进度环 + ghost 药丸 + mono 计数）信号位原样保留于 TitleBar 右缘；任务中心面板保留现有下拉交互，新增「停靠到底部 Dock」，停靠后 chip 兼任 Dock 开关，「取消停靠」回退下拉。shell-chrome-design 挂点契约整段重写。
  4. **编辑器中央单挂载**（痛点 2）：首页 EditorPanel 退役，`/editor` 成为中央一等视图（沉浸列宽 + 顶部浮条形态）；双挂载点路由互斥模型简化为单挂载，workspaceStore/命令通道/EditorCommandHost 常驻机制不变——这是简化而非重写，editor.md 双通道防回环等内核契约零改动。
  5. **专注模式**：⌘⇧F 或标题栏按钮触发，chrome（rail/上下文面板/侧栏/Dock/状态栏/TitleBar）全退场，编辑器满幅 + 顶部浮条（文档名/自动保存/字数/退出）+ 右下迷你工具簇；Esc 按既有「只关最顶层」分层语义退出。
  6. **首页任务流 + 热力图锚点**（痛点 3 + 用户裁决）：新首页 = 问候/今日概览 → **写作活跃度热力图（首屏第一卡，视觉锚点，用户明确要求置顶）** → 继续写作主卡 → 待发布/草稿箱 → 插件动态。`components/home/Heatmap.tsx` 自持组件直接迁移（token 色阶自动适配）。
  7. **文档树虚拟化**（用户明确要求）：上下文面板文档树沿用 ProjectsTree 压平 + VirtualList 方案，行高 26px、懒加载、展开状态提升；面板改为通栏高列后由调用方给 `flex:1` 高度。
  8. **保留不变的清单**：路由段体系与静态导出约束、PageTopbar、状态栏 statusItems 契约、浮窗层 float（定位为「即用即走」与 Dock「常驻停靠」互补）、z 分带体系（新增浮层按序入带：palette 与 Dialog 同带 100、dock 70、focus 浮条 45）、i18n 三语机制（新增文案键三语齐配）、启动 splash、主题体系。

设计稿参照：会话可视化目录 `workbench-shell-mockup.html`（用户已走查确认，含 ①-⑨ 挂点标注图例，可作实施验收对照）。

## 任务

### Phase 1 壳层骨架
- [x] rail 组件：48px 恒定图标列（激活指示条/徽标位/data-tip/插件 popover）替代 SideMenu — `components/rail/`（新）
- [x] layout 骨架改造：TitleBar + rail + 上下文面板 + center + dockbar/dock + 状态栏五段结构 — `app/(shell)/layout.tsx`
- [x] 上下文面板：ProjectsTree 压平逻辑迁移 + VirtualList 接入（26px/懒加载/展开状态提升/flex:1 滚动容器）+ 最近项目 + ⌘B 开合 — `components/context/`（新）、`components/ui/VirtualList.tsx`
- [x] SideMenu 及 toggleItems/底部两项制退役清理 + 路由 key 映射更新（`lib/routes.ts`）— `components/SideMenu/`（删）

### Phase 2 胶囊与 Dock
- [x] 胶囊双形态：chip 开合下拉 ⇄ 停靠 Dock，undock 回退，aria-expanded/点外关/Esc 分层守卫 — `components/capsule/`
- [x] Dock 条 + 面板：任务中心时间线迁入 + 插件 dock 页签声明制渲染 + 收起/展开 — `components/dock/`（新）、`lib/capsule.ts`

### Phase 3 编辑器中央化与专注模式
- [x] `/editor` 中央一等化：沉浸列宽 + 顶栏浮条化，首页 EditorPanel 退役（双挂载 → 单挂载），面包屑文档操作/saveAs 链路回归 — `app/(shell)/editor/`、`components/home/EditorPanel/`（删）
- [x] 专注模式：⌘⇧F/按钮触发 chrome 退场 + 顶部浮条 + 右下迷你工具簇 + Esc 分层退出 — `app/(shell)/layout.tsx`
- [x] 右缘上下文侧栏：大纲/元数据/图床 tab（壳层自有）+ `area=context` 插件页签声明制渲染 — `components/editor/`

### Phase 4 命令面板与首页
- [x] ⌘K 命令面板：导航/文档动作/插件 commands/模式四组，输入过滤 + 键盘上下 + Enter 执行 + 点外关 — `components/palette/`（新）
- [x] 首页任务流重排：热力图首屏锚点 + 继续写作主卡 + 待发布/草稿箱 + 插件动态 — `components/home/`

### Phase 5 插件契约扩展
- [x] manifest 扩展：`views.area` 增 `dock|context` + `commands` 贡献点 + validateManifest 容量护栏 + 用例 — `src/shared/plugin.ts`、`tests/plugin-manifest.test.ts`
- [x] SDK 与帧服务：`wuh.dock.updateTab`/`wuh.context.updateTab`/`wuh.commands` 面扩展，三方同步（shared ↔ SDK ↔ frameServices）+ 用例 — `src/plugin-sdk/index.ts`、`components/plugins/PluginFrameHost/frameServices.ts`、`lib/capsule.ts`
- [x] 内置插件迁移示范：git-history 贡献 dock 页签、image-host 贡献 context 页签 + commands、preview-markdown 保持 float 不变 — `plugins/*/plugin.json`

### Phase 6 验证与收尾
- [x] 全量 `pnpm test` + 三 tsconfig typecheck + `pnpm dist` 打包冒烟（app:// 加载）
- [x] 走查矩阵：四主题 × 亮暗 × reduced-motion × 键盘遍历 × 浮层层叠（palette/dock/focus/浮窗/Toast/Dialog）
- [x] i18n 三语键覆盖扫描通过 + splash 回归 + L 级 field 验收（用户实机走查）

## 结果
- 实际耗时: 2026-10-15 单日（propose→apply→review→release 同日闭环；L 级走独立 worktree）
- 验证: 769/769 测试全绿（新增 13 文件 108 用例，TDD 先红后绿）· 三 tsconfig 绿 · pnpm build 冒烟通过（静态导出全路由段+四插件视图）· i18n/splash/SDK 标签/滚动条守卫绿
- 交付: PR #154（https://github.com/stack-wuh/wuh.site.desktop/pull/154，Closes #153）；用户确认无部署触发——合入 main 即交付完成，安装包按需手动 `pnpm dist`
- review 记录: 修复 focus 白屏 bug（元素选择器误伤内容区→data-chrome）+ 防回归测试；修复 SideMenu 退役致外观/语言入口丢失回归（AppearanceSection + SegmentedControl）；reduced-motion 三组件补降级；next-env.d.ts 构建副产物回退；观察点遗留——rebootstrap 不清注册表（五注册表既有模式，建议独立 change 治理）
- Knowledge: 四卡原位更新（renderer-shell-routing/shell-chrome-design/plugin-architecture/editor，verified 2026-10-15 unit）+ menu.md 路由关键词重整

## 知识评估
- **预期影响:** 更新 + 新增
- **候选卡片:**
  - 更新 `knowledge/renderer-shell-routing.md`——两栏 → 工作台范式、rail/上下文面板/专注模式/首页重排（verified-depth: runtime，实机走查后）
  - 更新 `knowledge/shell-chrome-design.md`——胶囊双形态挂点契约整段重写、Dock、z 分带扩展、rail 规范
  - 更新 `knowledge/plugin-architecture.md`——views.area 扩展 + commands 贡献点声明制流程
  - 更新 `knowledge/editor.md`——双挂载点收敛为中央单挂载
  - 视体量新增 `knowledge/workbench-extension-points.md`（dock/context/commands 三新挂点契约）或并入 shell-chrome-design，apply 完成后按查重规则裁决
- **理由:** 壳层范式级变更使多张 active 卡片的「当前结论」失效，必须随实施逐段更新并记录 verified-depth；新挂点契约需按 domain+keywords+scope 查重后决定独立成卡或并入
