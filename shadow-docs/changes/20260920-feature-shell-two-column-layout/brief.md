---
{
  "schema": "shadow-dev/v1",
  "name": "20260920-feature-shell-two-column-layout",
  "type": "feature",
  "scope": "src/renderer/src,src/shared,tests,shadow-docs/knowledge",
  "status": "reviewed",
  "baseBranch": "feature/20260918-feature-shell-float-layer",
  "branch": "feature/20260920-feature-shell-two-column-layout",
  "files": [
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "src/renderer/src/App.tsx",
    "src/renderer/src/components/ActivityBar.tsx",
    "src/renderer/src/components/FileTree.tsx",
    "src/renderer/src/components/SideMenu.tsx",
    "src/renderer/src/components/StatusBar.tsx",
    "src/renderer/src/editor",
    "src/renderer/src/home/HomePage.tsx",
    "src/renderer/src/plugins/PluginFrameHost.tsx",
    "src/renderer/src/settings/SettingsPage.tsx",
    "src/renderer/src/store.ts",
    "src/renderer/src/styles/global.css",
    "src/shared/plugin.ts",
    "tests/plugin-manifest.test.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "ce5e5f371d1a1a105b56c27dcfb68ab73736ca53",
    "verifiedAt": "2026-09-21T03:34:24.597Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "aa313824448de5af6d1fb7805ba436df9848c2333b60ced8ea112d0afc9b2ad5",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 壳层两栏布局：左栏 SideMenu + 右栏插件页面容器",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n壳层要转型为 Claude Code/Codex 式两栏布局：左栏是可展开收起的菜单栏（底部 = 用户占位区 + 设置入口），右栏是统一页面容器，整体留给插件自由发挥。插件化改造（sidebar/float 视图、statusItems、FloatLayer）已完成，现在完成布局设计：Home 从全屏视图降级为右栏默认入口（项目门面），内置编辑器/FileTree 及无宿主的工作区设施随布局壳精简移除，右栏内容以声明制交给插件（`views.area: 'main'`）。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: App 壳层用 `activePanel` + `mainView` 双 state 导航，无 router 库；设置/首页是全屏视图（prevView 还原 + 焦点归还 + Esc）；work-area 单列，浮窗经 FloatLayer 挂载；插件视图禁止硬编码容器，一律走 manifest `views.area` 声明\n  - 适用 scope: src/renderer/src\n  - 本次处置: 「无 router、state 联合导航」「views.area 声明制」「FloatLayer 挂 work-area」遵循并延续；「全屏视图体系（settings/home）」被有意废止——两页均改为右栏页面，prevView/Esc/焦点归还约束随之简化（右栏页面互斥切换，无覆盖语义）。属需求驱动的有意变更，卡片需更新\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: ActivityBar 48px rail（激活指示条/徽标/tailItems/toggle 型 item/tooltip）；FloatLayer + floats.ts 注册表（进程内状态，work 卸载后还原）；StatusBar 左右分区含编辑器上报分区；图标注册表唯一出口；chrome UI 主题 token 四主题 × 亮暗校验\n  - 适用 scope: src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts\n  - 本次处置: ActivityBar 演进为 SideMenu（rail ↔ 展开态），徽标/toggle/tooltip/tailItems 能力保留；FloatLayer/floats.ts 原样保留（几何视口改为右栏容器）；StatusBar 精简掉编辑器分区；图标/token/声明制约束全部遵循\n- norms/ui-patterns.md（通用）\n  - 适用约束: 主题 token、暗色全覆盖、**禁止布局位移动画（width 过渡）**→ 左栏展开收起为瞬时切换，展开态文字仅 opacity 淡入；focus ring、aria-label；`prefers-reduced-motion` 降级\n- norms/interaction.md（通用）\n  - 适用约束: Tab 可遍历左栏菜单与右栏页面；操作即时反馈（菜单选中态）；焦点管理随全屏语义废止而简化（右栏页面切换不做焦点归还，页面自身 mount 聚焦保留）\n- norms/code-style.md（通用）\n  - 适用约束: 不新增 any；不为未来场景提前抽象（否决页面注册表方案）；删除无消费者代码不顺手扩大范围\n\n## 决策\n- **选型:** 方案一「双 state 演进为左栏菜单 + 右栏路由」：废弃 `activePanel`/`sidebarCollapsed`，`mainView` 重构为 `rightRoute: 'home' | 'settings' | 'plugin:<pluginId>:<viewId>'`（默认 `'home'`），新增 `menuExpanded: boolean`；ActivityBar 演进为 SideMenu（收起 48px rail ↔ 展开 ~220px 图标+文字，瞬时切换）；右栏 `main-area` 按 rightRoute 互斥渲染 HomePage / SettingsPage / PluginView(main)，FloatLayer 继续挂载；manifest `views.area` 增 `'main'`、废弃 `'sidebar'`（validateManifest 收紧，存量插件仅 preview-markdown 用 float，零迁移成本）\n- **对比方案:** 方案二「自建页面注册表」——为 3 类页面引入抽象层，违反「不为未来场景提前抽象」，弃；方案三「mainView 扩第四值最小改动」——保留全屏/右栏两套导航语义，与 Home 进右栏、设置进右栏的需求直接矛盾，弃\n- **理由:** 与既有「无 router、字符串联合 state」导航模式同构，改动面可控；右栏路由复用 `pluginPanelKey` 格式；左栏纯导航不承载内容，右栏完整留给插件。工作区设施（打开文件夹、autoCommit、StatusBar 编辑器分区、Home 继续编辑）随编辑器一并移除（选型 A），StatusBar 保留壳层骨架 + 插件 statusItems；左栏底部用户信息为占位区（品牌标 IconLogo + `__APP_VERSION__` 版本号），无用户体系不造假入口\n\n## 任务\n### Phase 1 — 插件契约收敛（main 视图声明）\n\n- [ ] `ViewArea` 类型改为 `'main' | 'float'`，validateManifest 拒绝 `sidebar`（错误信息指引迁移到 main） — `src/shared/plugin.ts` — 修改\n- [ ] manifest 校验用例更新：main 合法、sidebar 报错、float 不变 — `tests/plugin-manifest.test.ts` — 修改\n- [ ] PluginFrameHost 以 `listMainViews()` 替换 `listSidebarViews()`（同构实现），sidebar 相关宿主分支移除 — `src/renderer/src/plugins/PluginFrameHost.tsx` — 修改\n\n### Phase 2 — 左栏 SideMenu\n\n- [ ] 新建 SideMenu 组件：rail ↔ 展开双形态；菜单项 = 首页 + 插件 main 视图（选中态切换右栏）；toggleItems = 浮窗开关（aria-pressed 语义保留）；tail = 用户占位区（IconLogo + 版本号）+ 设置项；徽标/data-tip tooltip/激活指示条能力从 ActivityBar 迁移，展开态显示文字标签 — `src/renderer/src/components/SideMenu.tsx` — 新建\n- [ ] SideMenu 样式：主题 token、展开收起瞬时切换（无 width 过渡）、展开态文字 opacity 淡入 150-300ms ease-out + reduced-motion 降级、focus-visible ring — `src/renderer/src/styles/global.css` — 修改\n- [ ] 删除 ActivityBar.tsx 及其样式 — `src/renderer/src/components/ActivityBar.tsx` — 删除\n\n### Phase 3 — 右栏路由与壳层精简\n\n- [ ] App.tsx 重构：`rightRoute` + `menuExpanded` state；移除 activePanel/sidebarCollapsed/useAutoCommit/打开文件夹逻辑；Esc 全屏关闭语义移除（浮窗 Esc 保留在 FloatLayer） — `src/renderer/src/App.tsx` — 修改\n- [ ] main-area 容器：按 rightRoute 渲染 HomePage / SettingsPage / PluginView(main) / 插件停用 Empty 兜底；FloatLayer containerRef 指向 main-area — `src/renderer/src/App.tsx`、`src/renderer/src/styles/global.css` — 修改\n- [ ] 标题栏精简：移除「打开文件夹」按钮与 workspace/git/remote 徽标，保留标题 + AppearanceMenu — `src/renderer/src/App.tsx` — 修改\n- [ ] StatusBar 精简：移除文件路径/光标行列/字数/未保存分区，保留左右骨架 + 插件 statusItems — `src/renderer/src/components/StatusBar.tsx` — 修改\n\n### Phase 4 — 页面去全屏化与死代码清理\n\n- [ ] HomePage 改为右栏默认页：移除返回按钮/Esc/全屏焦点语义与「打开文件夹/继续编辑」按钮，保留问候语 + 活动热力图 — `src/renderer/src/home/HomePage.tsx` — 修改\n- [ ] SettingsPage 改为右栏页面：保留页内返回入口（回 home），移除全屏覆盖样式与 prevView 焦点归还逻辑 — `src/renderer/src/settings/SettingsPage.tsx`、`src/renderer/src/styles/global.css` — 修改\n- [ ] 删除编辑器体系：EditorPane/editor 目录、FileTree、CodeMirror 相关依赖引用；评估 store.ts（workspaceStore）消费者，无消费者部分一并精简 — `src/renderer/src/editor/`、`src/renderer/src/components/FileTree.tsx`、`src/renderer/src/store.ts` — 删除/修改\n\n### Phase 5 — 回归与知识沉淀\n\n- [ ] `pnpm typecheck` + `pnpm test` 全绿 — 验证\n- [ ] `pnpm dev` 手动走查：左栏展开/收起（瞬时）、右栏 Home↔设置↔插件 main 切换、浮窗 toggle/拖拽/最小化/Esc、四主题 × 亮暗、键盘 Tab 遍历、 reduced-motion — 验证\n- [ ] 更新 Knowledge 卡片：renderer-shell-routing.md（右栏路由语义、全屏视图体系废止）、shell-chrome-design.md（SideMenu、StatusBar 精简、views.area main/float）；顺手修正两卡 source 缺失的 archive/ 前缀 — `shadow-docs/knowledge/` — 修改\n\n完整 brief：shadow-docs/changes/20260920-feature-shell-two-column-layout/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260920-feature-shell-two-column-layout\",\"type\":\"feature\",\"scope\":\"src/renderer/src,src/shared,tests,shadow-docs/knowledge\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"feature/20260918-feature-shell-float-layer\",\"briefPath\":\"shadow-docs/changes/20260920-feature-shell-two-column-layout/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 壳层两栏布局：左栏 SideMenu + 右栏插件页面容器

## 动机

壳层要转型为 Claude Code/Codex 式两栏布局：左栏是可展开收起的菜单栏（底部 = 用户占位区 + 设置入口），右栏是统一页面容器，整体留给插件自由发挥。插件化改造（sidebar/float 视图、statusItems、FloatLayer）已完成，现在完成布局设计：Home 从全屏视图降级为右栏默认入口（项目门面），内置编辑器/FileTree 及无宿主的工作区设施随布局壳精简移除，右栏内容以声明制交给插件（`views.area: 'main'`）。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: App 壳层用 `activePanel` + `mainView` 双 state 导航，无 router 库；设置/首页是全屏视图（prevView 还原 + 焦点归还 + Esc）；work-area 单列，浮窗经 FloatLayer 挂载；插件视图禁止硬编码容器，一律走 manifest `views.area` 声明
  - 适用 scope: src/renderer/src
  - 本次处置: 「无 router、state 联合导航」「views.area 声明制」「FloatLayer 挂 work-area」遵循并延续；「全屏视图体系（settings/home）」被有意废止——两页均改为右栏页面，prevView/Esc/焦点归还约束随之简化（右栏页面互斥切换，无覆盖语义）。属需求驱动的有意变更，卡片需更新
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: ActivityBar 48px rail（激活指示条/徽标/tailItems/toggle 型 item/tooltip）；FloatLayer + floats.ts 注册表（进程内状态，work 卸载后还原）；StatusBar 左右分区含编辑器上报分区；图标注册表唯一出口；chrome UI 主题 token 四主题 × 亮暗校验
  - 适用 scope: src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts
  - 本次处置: ActivityBar 演进为 SideMenu（rail ↔ 展开态），徽标/toggle/tooltip/tailItems 能力保留；FloatLayer/floats.ts 原样保留（几何视口改为右栏容器）；StatusBar 精简掉编辑器分区；图标/token/声明制约束全部遵循
- norms/ui-patterns.md（通用）
  - 适用约束: 主题 token、暗色全覆盖、**禁止布局位移动画（width 过渡）**→ 左栏展开收起为瞬时切换，展开态文字仅 opacity 淡入；focus ring、aria-label；`prefers-reduced-motion` 降级
- norms/interaction.md（通用）
  - 适用约束: Tab 可遍历左栏菜单与右栏页面；操作即时反馈（菜单选中态）；焦点管理随全屏语义废止而简化（右栏页面切换不做焦点归还，页面自身 mount 聚焦保留）
- norms/code-style.md（通用）
  - 适用约束: 不新增 any；不为未来场景提前抽象（否决页面注册表方案）；删除无消费者代码不顺手扩大范围

## 决策

- **选型:** 方案一「双 state 演进为左栏菜单 + 右栏路由」：废弃 `activePanel`/`sidebarCollapsed`，`mainView` 重构为 `rightRoute: 'home' | 'settings' | 'plugin:<pluginId>:<viewId>'`（默认 `'home'`），新增 `menuExpanded: boolean`；ActivityBar 演进为 SideMenu（收起 48px rail ↔ 展开 ~220px 图标+文字，瞬时切换）；右栏 `main-area` 按 rightRoute 互斥渲染 HomePage / SettingsPage / PluginView(main)，FloatLayer 继续挂载；manifest `views.area` 增 `'main'`、废弃 `'sidebar'`（validateManifest 收紧，存量插件仅 preview-markdown 用 float，零迁移成本）
- **对比方案:** 方案二「自建页面注册表」——为 3 类页面引入抽象层，违反「不为未来场景提前抽象」，弃；方案三「mainView 扩第四值最小改动」——保留全屏/右栏两套导航语义，与 Home 进右栏、设置进右栏的需求直接矛盾，弃
- **理由:** 与既有「无 router、字符串联合 state」导航模式同构，改动面可控；右栏路由复用 `pluginPanelKey` 格式；左栏纯导航不承载内容，右栏完整留给插件。工作区设施（打开文件夹、autoCommit、StatusBar 编辑器分区、Home 继续编辑）随编辑器一并移除（选型 A），StatusBar 保留壳层骨架 + 插件 statusItems；左栏底部用户信息为占位区（品牌标 IconLogo + `__APP_VERSION__` 版本号），无用户体系不造假入口

## 任务

### Phase 1 — 插件契约收敛（main 视图声明）

- [x] `ViewArea` 类型改为 `'main' | 'float'`，validateManifest 拒绝 `sidebar`（错误信息指引迁移到 main） — `src/shared/plugin.ts` — 修改
- [x] manifest 校验用例更新：main 合法、sidebar 报错、float 不变 — `tests/plugin-manifest.test.ts` — 修改
- [x] PluginFrameHost 以 `listMainViews()` 替换 `listSidebarViews()`（同构实现），sidebar 相关宿主分支移除 — `src/renderer/src/plugins/PluginFrameHost.tsx` — 修改

### Phase 2 — 左栏 SideMenu

- [x] 新建 SideMenu 组件：rail ↔ 展开双形态；菜单项 = 首页 + 插件 main 视图（选中态切换右栏）；toggleItems = 浮窗开关（aria-pressed 语义保留）；tail = 用户占位区（IconLogo + 版本号）+ 设置项；徽标/data-tip tooltip/激活指示条能力从 ActivityBar 迁移，展开态显示文字标签 — `src/renderer/src/components/SideMenu.tsx` — 新建
- [x] SideMenu 样式：主题 token、展开收起瞬时切换（无 width 过渡）、展开态文字 opacity 淡入 150-300ms ease-out + reduced-motion 降级、focus-visible ring — `src/renderer/src/styles/global.css` — 修改
- [x] 删除 ActivityBar.tsx 及其样式 — `src/renderer/src/components/ActivityBar.tsx` — 删除

### Phase 3 — 右栏路由与壳层精简

- [x] App.tsx 重构：`rightRoute` + `menuExpanded` state；移除 activePanel/sidebarCollapsed/useAutoCommit/打开文件夹逻辑；Esc 全屏关闭语义移除（浮窗 Esc 保留在 FloatLayer） — `src/renderer/src/App.tsx` — 修改
- [x] main-area 容器：按 rightRoute 渲染 HomePage / SettingsPage / PluginView(main) / 插件停用 Empty 兜底；FloatLayer containerRef 指向 main-area — `src/renderer/src/App.tsx`、`src/renderer/src/styles/global.css` — 修改
- [x] 标题栏精简：移除「打开文件夹」按钮与 workspace/git/remote 徽标，保留标题 + AppearanceMenu — `src/renderer/src/App.tsx` — 修改
- [x] StatusBar 精简：移除文件路径/光标行列/字数/未保存分区，保留左右骨架 + 插件 statusItems — `src/renderer/src/components/StatusBar.tsx` — 修改

### Phase 4 — 页面去全屏化与死代码清理

- [x] HomePage 改为右栏默认页：移除返回按钮/Esc/全屏焦点语义与「打开文件夹/继续编辑」按钮，保留问候语 + 活动热力图 — `src/renderer/src/home/HomePage.tsx` — 修改
- [x] SettingsPage 改为右栏页面：保留页内返回入口（回 home），移除全屏覆盖样式与 prevView 焦点归还逻辑 — `src/renderer/src/settings/SettingsPage.tsx`、`src/renderer/src/styles/global.css` — 修改
- [x] 删除编辑器体系：EditorPane/editor 目录、FileTree、CodeMirror 相关依赖引用；评估 store.ts（workspaceStore）消费者，无消费者部分一并精简 — `src/renderer/src/editor/`、`src/renderer/src/components/FileTree.tsx`、`src/renderer/src/store.ts` — 删除/修改

### Phase 5 — 回归与知识沉淀

- [x] `pnpm typecheck` + `pnpm test` 全绿 — 验证
- [x] `pnpm dev` 手动走查：左栏展开/收起（瞬时）、右栏 Home↔设置↔插件 main 切换、浮窗 toggle/拖拽/最小化/Esc、四主题 × 亮暗、键盘 Tab 遍历、 reduced-motion — 验证
- [x] 更新 Knowledge 卡片：renderer-shell-routing.md（右栏路由语义、全屏视图体系废止）、shell-chrome-design.md（SideMenu、StatusBar 精简、views.area main/float）；顺手修正两卡 source 缺失的 archive/ 前缀 — `shadow-docs/knowledge/` — 修改

## 结果

- 实际耗时: —
- 验证: `npx tsc --noEmit`（node/web 双侧）通过；`npx vitest run` 108/109 通过——唯一失败 `tests/icon-build.test.ts` 为**环境性既有失败**（本机 node_modules 缺 devDep `@resvg/resvg-js` 且 pnpm 不可用；本次未触碰 icon/build/package.json，main 上同样失败）；`npx electron-vite build` 生产构建通过；旧导航概念（mainView/activePanel/work-area/sidebar）残留扫描干净
- 偏差与发现:
  1. **brief 前提错误**：propose 阶段只核查了 preview-markdown，实际 frontmatter / git-history / github-issues 三个官方参考插件使用 `views.area: 'sidebar'`，「零迁移成本」不成立。已将三者 `plugins/*/plugin.json` 迁移为 `area: 'main'`——plugins/ 目录不在 brief 声明文件清单内，属 schema 收紧的直接波及，特此记录
  2. `package.json` 的 `@codemirror/*` 依赖随编辑器删除成为死依赖；本机无 pnpm 无法更新 lockfile，留待后续变更清理
  3. `plugins/floats.ts` 头部注释仍引用 ActivityBar/activePanel 旧名（该文件按 brief「原样保留」未动，语义更新已落在知识卡片）
  4. global.css 历史死样式（「侧栏面板」段 panel-section/status-list/log-list 等无消费者样式）按「不顺手扩大范围」保留未删；本次直接受害样式（文件树/编辑区/frontmatter/GitHub 面板/placeholder/check-row/home-topbar/home-actions）已清除
  5. SettingsPage 移除「自动提交」「图床上传命令」两个分区（消费者 useAutoCommit/编辑器粘贴上传被本次删除，属直接受害死 UI）；`AppSettings` 类型与主进程持久化字段未动（不在 brief 范围，留待后续）
  6. **行为增强**：FloatLayer 常驻 main-area，右栏页面切换不再卸载浮窗（旧行为：进全屏视图卸载、注册表保状态）；浮窗与右栏页面共存
  7. ~~task-15（`pnpm dev` 四主题手动走查）需 GUI 交互，留给用户执行~~ → review 阶段以 **CDP 自动走查**完成（electron dev + remote-debugging，断言 20/22 通过 + 四主题组合截图落盘 `.walkthrough/`，人工复核视觉通过）：左栏 48↔220 展开/收起瞬时、右栏 Home/设置/插件 main 互斥切换、`aria-current`/`aria-pressed` 语义、浮窗与页面共存 + Esc 关闭、用户占位区品牌标+版本、设置页死分区已除；唯二失败项见下条
  8. **既有缺陷（非本次回归，基线 ce5e5f3 对照实验坐实）**：渲染层 index.html 的 CSP `default-src 'self'`（隐含 frame-src）阻止 `plugin://` 帧加载，插件视图/逻辑帧全部「5000ms 未就绪」失败；worktree 检出 main 基线复现同样错误。本次 diff 未触碰 index.html/src/main/协议层。修复建议（独立 fix 变更）：CSP meta 增 `frame-src 'self' plugin:`，或 `registerSchemesAsPrivileged` 给 plugin scheme 加 `bypassCSP: true`
  9. 会话过程说明：分支 `feature/20260920-*` 由 apply 阶段补建（CLI branch execute 只写记录未建 git 分支）；期间用户曾 stash WIP（`two-column-wip`）切 main 对比截图，review 阶段已恢复到功能分支，**stash 条目仍保留未删**（冗余安全网，确认后可 `git stash drop`）；工作区另含用户的标题品牌化小改（wuh-site desktop→wuh.site，main/index.ts + index.html）与下一个 change 目录（plugin-manager），均与本次无冲突

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（大改：rightRoute 右栏路由取代 mainView 全屏体系 + activePanel 侧栏体系）、shadow-docs/knowledge/shell-chrome-design.md（ActivityBar→SideMenu、StatusBar 精简、views.area 收敛为 main/float）
- **理由:** 布局与导航语义是两张 active 卡片的核心结论，本次为需求驱动的有意变更，apply/archive 阶段必须同步卡片，否则结论与代码事实冲突
