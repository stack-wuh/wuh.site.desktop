---
title: Renderer 壳层双层路由约定
domain: renderer-ui
keywords: [设置页, 全屏视图, 路由, mainView, activePanel, ActivityBar, 面板切换, 焦点管理, 浮窗层, FloatLayer]
scope: [src/renderer/src]
status: active
source:
  - changes/20260917-feature-settings-main-view/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
verified: 2026-09-27
---

# Renderer 壳层双层路由约定

## 当前结论
App 壳层（`src/renderer/src/App.tsx`）用两个互不统属的 state 做导航，无 router 库：

- `activePanel: string`（`'files'` | `'plugin:<pluginId>:<viewId>'`）——只管 280px 侧栏显示哪个面板（FileTree / 插件视图）。
- `mainView: 'work' | 'settings'`——管标题栏以下整块内容区：`work` 渲染 ActivityBar + 侧栏 + work-area（编辑器占满全宽）+ FloatLayer 浮窗层；非 work 渲染全屏视图，**ActivityBar、侧栏、编辑器、浮窗层全部不渲染**，保留标题栏。

设置页（`SettingsPage`）是第一个全屏视图，接收 `onBack` 回调关闭自身。预览等 `float` 区域插件视图不再是固定分栏，而是经内核浮窗层（`FloatLayer` + `plugins/floats.ts` 注册表）按需开合；浮窗开合/几何/z 序状态在注册表中保持，随 work 卸载、返回 work 时原样还原（与 `activePanel` 同语义）。

## 执行约束
- 新增全屏级页面时扩展 `mainView` 联合类型并走 `app-body` 层级条件渲染，禁止塞回侧栏面板或引入 react-router。
- 全屏视图必须自带显式返回入口（按钮接 `onBack`）+ `Esc` 键关闭；确认框（`.ui-dialog-overlay`）打开时 Esc 处理让位给 Dialog；聚焦浮窗内 Esc 关闭浮窗（`stopPropagation`），不与全屏视图 Esc 冲突。
- 全屏视图打开时焦点移入页面容器（`tabIndex={-1}` + mount focus），关闭时焦点归还触发元素；触发元素在全屏态已被卸载时，延迟到返回渲染完成后再 focus。
- `mainView !== 'work'` 时 ActivityBar/侧栏/浮窗层整体不渲染；`activePanel` 与 floats 注册表状态保持不丢，返回后侧栏与浮窗还原。
- 编辑器内容依赖模块级 store 持久化（`key={activePath}` + `initialValue={content}`），全屏视图卸载 EditorPane 是安全的，新增全屏视图同样可放心卸载 work-area。
- work-area 内禁止再加固定分栏（`preview-area` 已废弃）；按需内容一律走 `float` 贡献点进浮窗层。

## 适用边界
适用于 App 壳层与渲染层导航。不适用于插件沙箱帧内部的视图导航（插件自管），也不适用于主进程窗口管理。

## 验证方式
- 读 `src/renderer/src/App.tsx`：`mainView` 分支渲染结构与 `handlePanelChange` 行为。
- `pnpm typecheck` + `pnpm test` 回归（tsc 双侧 + vitest）。
- `pnpm dev` 手动路径：设置图标/`Cmd+,` 进入 → `Esc`/返回按钮/`Cmd+,` 退出，观察内容区全覆盖与焦点归还。

## 关联知识
- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)（通用约束另见 `norms/ui-patterns.md`、`norms/interaction.md`）
