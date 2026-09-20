---
{
  "schema": "shadow-dev/v1",
  "name": "20260918-feature-shell-float-layer",
  "type": "feature",
  "scope": "renderer-shell",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260918-feature-shell-float-layer",
  "files": [
    "plugins/preview-markdown/plugin.json",
    "src/renderer/src/App.tsx",
    "src/renderer/src/components/ActivityBar.tsx",
    "src/renderer/src/components/FloatLayer.tsx",
    "src/renderer/src/plugins/PluginFrameHost.tsx",
    "src/renderer/src/plugins/floats.ts",
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
    "verifiedCommit": "e8f309f10e60735ef79172c897e449297feaa715",
    "verifiedAt": "2026-09-20T07:59:56.089Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "f8e4e927d9d954d1cd9a1b6d44a10289109d3976184016d2ccfc8a788e7bbbc4",
    "updatedAt": null,
    "lastError": null
  },
  "knowledge": null
}
---

# 壳层浮窗层与预览浮窗化 — 内核通用 slot 第一块拼图

> 2026-09-18 起草（proposed）；2026-09-20 恢复进主线并同步至当前代码现实（首页视图/prevView 路由已落地）。

## 动机
「一切皆插件」架构愿景的第一步。当前预览区是内核硬编码的右侧固定分栏（`App.tsx` work-area 中 `preview-area` 恒占 42% 宽，`global.css` `.preview-area`），不用时白白浪费近半空间，且"预览"作为布局常量存在——用户需要的是**按需唤起**。本变更把预览改为应用内浮窗：内核提供一个通用浮窗层 slot（可拖拽/缩放/最小化/多开），manifest `views.area` 从 `preview` 泛化为 `float`，任何插件视图都能以浮窗形态打开。这是后续 editors 贡献点（变更 2）与内置官方插件化（变更 3）之前必须先落地的内核能力。

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: mainView 双层路由（`'work' | 'settings' | 'home'`，home 为启动默认视图）；work 渲染 ActivityBar+侧栏+work-area；非 work 全屏视图卸载 work-area 但 activePanel 状态保持不丢；全屏视图关闭走 prevView 语义（回到打开前视图）
  - 适用 scope: src/renderer/src
  - 遵循: 浮窗层挂在 work 视图内，不动 mainView 机制；`mainView !== 'work'`（settings/home）时浮窗随 work 卸载，开合状态与几何由 floats 注册表保持，prevView 还原后浮窗随之还原（与 activePanel 同语义）
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 贡献点扩展遵循声明制优先（manifest schema + validateManifest + tests 先行）；UI 全 token（chrome-*/primary-*）；图标走注册表 AppIcon；动效 150-300ms + reduced-motion；statusItems 注册表为 useSyncExternalStore 快照模式
  - 适用 scope: src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts
  - 遵循: area 扩展按声明制流程改（契约→校验→测试→迁移）；floats 注册表复用 statusItems.ts 的快照模式；FloatLayer 全 token 化

## 决策
- **选型:** 应用内浮窗层（内核通用 slot）。`ViewArea` 从 `'sidebar' | 'preview'` 改为 `'sidebar' | 'float'`；ActivityBar 为 float 视图自动生成 toggle 项（点击开/关浮窗，激活态=浮窗打开，区别于面板选中态）；work-area 移除固定 preview-area 列，编辑区占满；浮窗支持多开、头部拖拽、边缘缩放、最小化为角落 chip、Esc 关闭聚焦浮窗。
- **对比方案:** 独立 OS 子窗口（跨窗口会话/主题/状态复制代价大一倍以上，且与编辑器插件化耦合，否决——未来作「弹出」增强）；分栏可折叠（预览仍是布局常量，不满足按需语义，否决）。
- **理由:** 「视图=内容，区域=slot」与插件驱动模型同构；进程内浮窗主题/状态零同步成本；与 2026-09-20 确认的产品长期定位一致——个人创作中枢、类 Claude Code/Codex 的极简键优先布局，浮动面板正是该布局语言的组成部分。Knowledge 遵循：声明制先改契约，快照模式复用，token/动效/a11y 按既有规范。
- **前置依赖:** 20260917-feature-shell-chrome-plugin-api（PR #2）已合入 main（图标注册表与 statusItems 快照模式就绪），前置满足。
- **非目标:** 主区 tabs（接口留编辑器组抽象）、标题栏贡献点、SDK `wuh.ui` float 运行时 API（随变更 2）、浮窗几何持久化（本轮内存态）、弹出 OS 窗口。

## 任务
### Phase 1 贡献点契约（声明制先行）
- [x] `ViewArea` 改为 `'sidebar' | 'float'`，`validateManifest` 校验与错误文案同步更新 — `src/shared/plugin.ts` — 修改
- [x] manifest 测试用例更新：float 合法 / preview 拒绝 / 多 float 视图共存 — `tests/plugin-manifest.test.ts` — 修改
- [x] preview-markdown 插件迁移：`area: "preview"` → `"float"` — `plugins/preview-markdown/plugin.json` — 修改

### Phase 2 内核浮窗层
- [x] floats 注册表（新增）：open/close/toggle/minimize/geometry 状态，useSyncExternalStore 快照模式，`commit()` 产新引用 — `src/renderer/src/plugins/floats.ts` — 新增
- [x] FloatLayer 组件（新增）：头部拖拽、边缘/角缩放、最小化角落 chip、z 序与焦点管理、Esc 关闭聚焦浮窗、token 化动效 + reduced-motion — `src/renderer/src/components/FloatLayer.tsx` `src/renderer/src/styles/global.css` — 新增
- [x] 帧宿主适配：`listPreviewViews` → `listFloatViews`，浮窗内复用 `PluginView` 帧宿主 — `src/renderer/src/plugins/PluginFrameHost.tsx` — 修改

### Phase 3 壳层整合与验证
- [x] App.tsx：work-area 移除 preview-area 列（editor-area 占满）；float 视图注入 ActivityBar toggle 项；mainView 切换时浮窗卸载/还原 — `src/renderer/src/App.tsx` — 修改
- [x] ActivityBar 支持 toggle 型 item（激活指示=浮窗打开，区别于面板选中） — `src/renderer/src/components/ActivityBar.tsx` `src/renderer/src/styles/global.css` — 修改
- [x] 回归：`pnpm typecheck` + `pnpm test` — 仓库根 — 验证
- [x] 手动走查：四主题×亮暗下浮窗拖拽/缩放/最小化/Esc/多开，设置页/首页进出后浮窗还原，reduced-motion — 手动 — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（work-area 结构变化：editor-area 单列 + FloatLayer；浮窗随 work 卸载、注册表保状态）、shadow-docs/knowledge/shell-chrome-design.md（`views.area=float` 贡献点、ActivityBar toggle 项语义）
- **理由:** work-area 布局与贡献点契约发生结构性变化，两张 active 卡片的「当前结论」需同步；menu.md 已预留 plugin-architecture.md 路由，随变更 2（editors 贡献点 + 编辑器插件化）首建

## 后续规划（本变更不含）
- 变更 1.5 插件管理 UX（2026-09-20 确认插在本变更之后、编辑器插件化之前）：设置页插件区块（列表/启停/权限词表摘要/打开插件目录/重载）+ 首次启用权限确认弹窗（知识卡片记名的后置项转正）
- 变更 2 `editors` 贡献点 + 编辑器插件化：manifest `editors`（patterns 路由）+ 主区编辑器组宿主 + markdown-editor 内置官方插件（CodeMirror 进沙箱帧，doc 服务逐键同步）+ IME/大文档性能专项验证 + StatusBar 光标/字数改由编辑器插件 statusItems 贡献
- 变更 3 内置归属迁移：files 内置官方插件（FileTree 进沙箱帧）、git 分支/文件路径状态项归属迁移、StatusBar 收敛为纯容器、workspaceStore 瘦身
