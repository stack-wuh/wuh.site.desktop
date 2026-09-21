---
title: Renderer 壳层两栏布局与右栏路由约定
domain: renderer-ui
keywords: [首页, 设置页, 路由, rightRoute, SideMenu, 菜单, 两栏布局, main-area, 浮窗, FloatLayer, 面板切换, 插件视图]
scope: [src/renderer/src]
status: active
source:
  - changes/20260917-feature-settings-main-view/brief.md
  - changes/archive/20260919-feature-home-activity-heatmap/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
  - changes/20260920-feature-shell-two-column-layout/brief.md
verified: 2026-09-20
---

# Renderer 壳层两栏布局与右栏路由约定

## 当前结论

App 壳层（`src/renderer/src/App.tsx`）为**两栏布局**（2026-09-20 起，Claude Code/Codex 式）：标题栏 → app-body（左栏 SideMenu + 右栏 main-area）→ StatusBar。导航无 router 库，单一 state：

- `rightRoute: string`——右栏路由，取值 `'home' | 'settings' | 'plugin:<pluginId>:<viewId>'`（插件 key 由 `pluginPanelKey()` 生成），**默认 `'home'`**（Home = 项目门面/启动入口）。
- `menuExpanded: boolean`——左栏 SideMenu 展开（~220px 图标+文字）/收起（48px 图标 rail），瞬时切换（禁 width 过渡）。

右栏 `main-area` 是统一页面容器：按 rightRoute **互斥渲染** HomePage / SettingsPage / PluginView（`views.area: 'main'`）/ 插件停用 Empty 兜底；`FloatLayer` 常驻叠加其上（浮窗与右栏页面**共存**，切换页面不再卸载浮窗——旧「全屏视图卸载浮窗」语义已随全屏体系废止）。

**全屏视图体系已废止**（2026-09-20）：设置页与首页都是右栏普通页面，左栏常驻可见；prevView 还原、Esc 关闭全屏、焦点归还触发元素等约束全部移除。保留的键盘语义：`Cmd/Ctrl+,` 在 settings ↔ home 间切换；Esc 只关最顶层浮窗（FloatLayer 内处理，确认框打开时让位）。页面自身 mount 聚焦（`tabIndex={-1}`）保留。

**内置编辑器体系已移除**：EditorPane/CodeMirror、FileTree、侧栏面板、打开文件夹/autoCommit/工作区徽标均删；标题栏只剩标题 + AppearanceMenu；StatusBar 只承载插件 statusItems。`store.ts`（workspaceStore）保留为插件 doc 服务（帧协议 `doc.get/set/save`）的宿主侧状态源，content 仅经 doc.set 更新，activePath/root 为保留字段（未来默认编辑插件回归时复用）。

## 执行约束

- 新增右栏页面时扩展 rightRoute 取值并走 main-area 条件渲染，禁止引入 react-router，禁止塞回左栏（SideMenu 纯导航不承载内容）。
- 插件主区视图禁止硬编码容器；新增视图一律走 manifest `views.area` 声明（`main` 右栏页面 | `float` 浮窗），`sidebar` 已废弃（validateManifest 拒绝并指引迁移 main）。
- 浮窗开合与几何仍是进程内注册表状态（`plugins/floats.ts`，commit() 产新引用 + useSyncExternalStore）；FloatLayer 几何视口 = main-area。
- 右栏页面互斥切换不做焦点归还；页面容器自管 mount 聚焦。
- 壳层不再展示工作区 UI；getWorkspace 仅在启动时 seed `setWorkspaceInfo`（供插件 doc 服务解析根路径）。

## 适用边界

适用于 App 壳层与渲染层导航。不适用于插件沙箱帧内部的视图导航（插件自管），也不适用于主进程窗口管理。

## 验证方式

- 读 `src/renderer/src/App.tsx`：rightRoute/menuExpanded 分支渲染结构、Cmd+, 切换。
- `pnpm typecheck` + `pnpm test` 回归（tsc 双侧 + vitest）。
- `pnpm dev` 手动路径：启动默认 Home（左栏可见）→ 左栏切设置/插件 main 视图 → `Cmd+,` 切换设置 ↔ 首页 → 浮窗 toggle 开合、切页后浮窗仍在、Esc 关浮窗；左栏展开/收起瞬时切换。

## 关联知识

- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)（通用约束另见 `norms/ui-patterns.md`、`norms/interaction.md`）
