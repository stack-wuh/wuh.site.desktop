---
title: Renderer 壳层双层路由约定
domain: renderer-ui
keywords: [设置页, 首页, 全屏视图, 路由, mainView, activePanel, ActivityBar, 面板切换, 焦点管理, prevView, 浮窗, FloatLayer, work-area]
scope: [src/renderer/src]
status: active
source:
  - changes/20260917-feature-settings-main-view/brief.md
  - changes/20260919-feature-home-activity-heatmap/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
verified: 2026-09-20
---

# Renderer 壳层双层路由约定

## 当前结论
App 壳层（`src/renderer/src/App.tsx`）用两个互不统属的 state 做导航，无 router 库：

- `activePanel: string`（`'files'` 历史值 | `'plugin:<pluginId>:<viewId>'`）——只管 280px 侧栏显示哪个面板（FileTree / 插件视图）。
- `mainView: 'work' | 'settings' | 'home'`——管标题栏以下整块内容区：`work` 渲染 ActivityBar + 侧栏 + work-area；非 work 渲染全屏视图，**ActivityBar、侧栏、编辑器、浮窗全部不渲染**，保留标题栏（状态栏属壳层，保留）。

work-area 结构（2026-09-18 起）：**单列**（editor-area 占满），固定 preview 分栏已移除；插件浮窗视图经 `FloatLayer` 挂在 work-area 内（`views.area: 'float'`，ActivityBar toggle 按需唤起）。浮窗开合与几何是**进程内注册表状态**（`plugins/floats.ts`）：非 work 视图卸载浮窗、注册表保状态，返回后还原——与 `activePanel` 同语义。

设置页（`SettingsPage`）与首页（`HomePage`）是全屏视图，各自接收 `onBack` 回调关闭自身；首页还是**启动默认视图**（`mainView` 初始值为 `'home'`）。

全屏视图的关闭语义（2026-09-19 起）：打开任一全屏视图时在 `viewBeforeSettingsRef` 记录打开前视图，关闭时**回到打开前视图**（非固定 `work`）；`work` 视图的 ActivityBar 为每个全屏视图提供常驻触发项（设置在 tailItems、首页在 items 头部），关闭后焦点延迟归还对应触发元素（`focusSettingsTrigger` / `focusHomeTrigger`，查询为空即跳过）。

## 执行约束
- 新增全屏级页面时扩展 `mainView` 联合类型并走 `app-body` 层级条件渲染，禁止塞回侧栏面板或引入 react-router。
- 全屏视图必须自带显式返回入口（按钮接 `onBack`）+ `Esc` 键关闭；确认框（`.ui-dialog-overlay`）打开时 Esc 处理让位给 Dialog。
- 全屏视图打开时焦点移入页面容器（`tabIndex={-1}` + mount focus），关闭时焦点归还触发元素；触发元素在全屏态已被卸载时，延迟到返回渲染完成后再 focus。
- 新增全屏视图必须接入 prevView 关闭语义（打开时记录来源视图，关闭时还原），禁止硬编码关闭目标。
- `mainView !== 'work'` 时 ActivityBar/侧栏整体不渲染；`activePanel` 状态保持不丢，返回后侧栏还原。
- 编辑器内容依赖模块级 store 持久化（`key={activePath}` + `initialValue={content}`），全屏视图卸载 EditorPane 是安全的，新增全屏视图同样可放心卸载 work-area。
- 主区插件视图禁止硬编码固定容器（预览分栏已移除）；新增视图一律走 manifest `views.area` 声明（`sidebar` | `float`），由 FloatLayer/侧栏承接。

## 适用边界
适用于 App 壳层与渲染层导航。不适用于插件沙箱帧内部的视图导航（插件自管），也不适用于主进程窗口管理。

## 验证方式
- 读 `src/renderer/src/App.tsx`：`mainView` 分支渲染结构、`handlePanelChange` 行为、`closeSettings`/`closeHome` 的 prevView 还原与焦点归还。
- `pnpm typecheck` + `pnpm test` 回归（tsc 双侧 + vitest）。
- `pnpm dev` 手动路径：`Cmd+,`/设置图标进入设置、ActivityBar 首页项进入首页 → `Esc`/返回按钮退出，观察内容区全覆盖、prevView 还原与焦点归还。

## 关联知识
- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)（通用约束另见 `norms/ui-patterns.md`、`norms/interaction.md`）
