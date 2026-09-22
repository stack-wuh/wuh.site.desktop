---
title: Renderer 壳层两栏布局与 App Router 路由约定
domain: renderer-ui
keywords: [首页, 设置页, 路由, App Router, 路由段, SideMenu, 菜单, 两栏布局, main 容器, 浮窗, FloatLayer, 面板切换, 插件视图, 静态导出]
scope: [app, components, lib]
status: active
source:
  - changes/20260917-feature-settings-main-view/brief.md
  - changes/archive/20260919-feature-home-activity-heatmap/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
  - changes/20260920-feature-shell-two-column-layout/brief.md
  - changes/20260921-refactor-renderer-nextjs/brief.md
  - changes/20260921-feature-new-blog-project-entry/brief.md
  - changes/20260921-feature-startup-splash-loading/brief.md
  - changes/20260922-feature-i18n-shell-locales/brief.md
  - changes/20260922-feature-user-center-github-oauth/brief.md
  - changes/20260922-feature-user-identity-sync/brief.md
  - changes/20260922-fix-shell-avatar-app-icon/brief.md
verified: 2026-09-22
---

# Renderer 壳层两栏布局与 App Router 路由约定

## 当前结论

渲染层为 **Next.js App Router 项目**（2026-09-21 起，从 electron-vite + React 迁移）：两栏布局（**预留通知条**（44px 空条，待更新/紧急通知）→ body（左栏 SideMenu + 右栏 main 容器）→ StatusBar）由 **`app/(shell)/layout.tsx` 持久化**，路由段互斥渲染右栏页面：

- `/` → HomePage（默认入口 = **「新建博客」项目入口**，2026-09-21 起：项目区块承载打开本地目录 / clone 公开 https 仓库 / 最近项目列表；热力图保留其下）
- `/settings` → SettingsPage（仅应用级设置；GitHub 凭证与 Git 提交身份已归拢至 `/account`）
- `/account` → AccountPage（用户中心，2026-09-22 起：GitHub OAuth Device Flow 授权 + 身份/仓库/默认站点仓库 + Git 提交身份）
- `/plugin/<pluginId>/<viewId>` → PluginMainView（`views.area: 'main'` 的插件视图；`generateStaticParams` 从内置 `plugins/*/plugin.json` 构建期枚举）

**静态导出约束**（`output: 'export'`，next.config.ts）：产物在 `dist/next/`，由主进程 `app://` 协议离线加载（`src/main/index.ts` 的 `resolveRendererFile`，含目录穿越校验）。动态路由**必须构建期枚举**——运行时安装的新插件视图不会预生成路由页（当前内置插件无影响；未来支持运行时安装时改 query/client state 兜底）。

**启动加载路径（2026-09-22 起）**：主窗 `show: false` 后台加载，启动即现 **splash 窗**（`src/main/splash.html` 经 `?raw` 内嵌 + `data:` URL 加载的自包含静态页：品牌标 + 主题同值底色，亮暗随 `prefers-color-scheme`）；壳层 layout 挂载后经 `components/ShellReady.tsx`（双 rAF）发 `rendererReady` IPC（契约三处同步），主进程撤下 splash（淡出 240ms，`prefers-reduced-motion` 页内降级）并 show 主窗；prod 兜底 4s / dev 65s。**主题首帧地基**（根治无样式闪屏）：`app/layout.tsx` 服务端内联 `buildThemeCss()`（`<style id="wd-theme-vars">`）+ `<html>` 预置 wine/dark 默认属性 + pre-paint 内联脚本按 localStorage `wd.theme` 纠偏（含 `system` 档 matchMedia 解析分支），配合 `experimental.inlineCss` 使首帧即终态样式；`ThemeProvider` 的注入退化为缺失兜底（DOM 存在性守卫）。

**壳层 i18n（2026-09-22 起）**：`lib/i18n/locales.ts` 三语字典（zh/en/ja flat key，`{name}` 占位符）+ `lib/i18n/context.tsx` 的 `LocaleProvider`/`useT()`，持久化键 `wd.locale`（与 `wd.theme` 同模式）。**两段式渲染**：首帧固定 zh 与导出 HTML 一致（防 hydration mismatch），mount 后切存储 locale——启动切换的中文闪帧由 splash 窗覆盖，运行时切换即时。字典 key 集合一致性由 `tests/i18n.test.ts` 锁定。范围边界：仅壳层 chrome 文案；插件 manifest 标题与插件帧内容不在此机制内。

`menuExpanded`（SideMenu 展开/收起）是 layout 内的客户端状态；菜单项 id 与路由段一一对应（`lib/routes.ts` 的 `pluginPanelKey` / `routeKeyFromPathname` 负责互转，`account` 为独立路由 key）。**左栏底部用户入口点击直达 `/account` 用户中心**（2026-09-22 起，替身期「进设置页」已退役）；快捷面板「设置」项独立指向 `/settings`，菜单项 id 不含 `settings`。`FloatLayer` 常驻 main 容器叠加其上（浮窗与右栏页面**共存**，切换页面不卸载）。

**全局身份 store（2026-09-22 起）**：`lib/identity.ts`（useSyncExternalStore 快照注册表，与 tasks/statusItems/floats 同构）是 GitHub 身份（头像/昵称/login/scopes/kind/stale）的壳层唯一数据源——壳层 layout 挂载 `refreshIdentity()` 拉取一次（未配 token / `getGithubIdentity` 抛错一律落 null），用户中心 `AccountPage.reloadIdentity` 成功分支 `syncIdentity()` 写穿（授权成功 / PAT 保存 / 断开三时机全覆盖，页面本地 loading/error/stale 三态 UI 不动）；消费方 `useGithubIdentity()`：SideMenu 用户入口/快捷面板头部与 HomePage 问候语，**均仅文本投影**（`name‖login`；同日回退了侧栏头像 img 投影——远程图片网络不可靠，**壳层禁止渲染远程头像图片**，头像待 Settings「用户设置」本地接管，见 shell-chrome-design 卡）。**回退语义：undefined（尚未拉取）/ null（无身份）/ stale 一律回落品牌标 + wuh-site + 纯问候**；问候带名走 `home.greetNamed` 三语占位（昵称 name 优先、login 兜底），store 单测 `tests/identity-store.test.ts`。

**全屏视图体系已废止**（2026-09-20）：设置页与首页都是右栏普通页面，左栏常驻。键盘语义：`Cmd/Ctrl+,` 在 settings ↔ home 间 `router.push` 切换；`Cmd/Ctrl+B` 切换左栏展开/收起（控件入口在用户快捷面板内）；Esc 只关最顶层浮窗（FloatLayer 内处理，确认框打开时让位——用 `[data-dialog-overlay]` 稳定属性判定，styled 类名是哈希）。页面自身 mount 聚焦（`tabIndex={-1}`）保留。

**内置编辑器体系已移除**；`lib/store.ts`（workspaceStore）为插件 doc 服务（帧协议 `doc.get/set/save`）的宿主侧状态源。

## 执行约束

- 新增右栏页面 = 新增 `app/(shell)/<segment>/page.tsx` 路由段；禁止塞回左栏（SideMenu 纯导航不承载内容）。
- 插件视图路由统一走 `/plugin/<id>/<view>` 段；新增视图一律走 manifest `views.area` 声明（`main` 右栏页面 | `float` 浮窗），`sidebar` 已废弃（validateManifest 拒绝并指引迁移 main）。
- 插件 main 视图动态路由若新增**运行时**来源，必须同步改 `generateStaticParams` 或在页面内退化到 client 渲染，否则静态导出缺页。
- 浮窗开合与几何是进程内注册表状态（`lib/floats.ts`，commit() 产新引用 + useSyncExternalStore）；FloatLayer 几何视口 = main 容器。
- 客户端组件一律 'use client'；服务端组件只做参数透传（`plugin/[...slug]/page.tsx` 为 async server component，接收 `params: Promise<...>`）。
- 任何 `useSyncExternalStore` 必须传第三参 `getServerSnapshot`（静态导出预渲染要求，否则 `next build` 在预渲染阶段报错退出）。
- 新增会首帧渲染的 CSS/主题能力时必须保持「构建期内联 + 属性路由」机制：不要把 token CSS 改回运行时注入，不要移除 layout 的 pre-paint 纠偏脚本（其键名与 ThemeProvider 的 `STORAGE_KEY` 锚点同步）。
- 壳层不再展示工作区 UI；工作区信息两处 seed：layout 挂载时 `getWorkspace` 一次性 seed，以及**项目入口切换时 `applyWorkspaceSwitch` 重入**（`setWorkspaceInfo` + `workspaceStore.switchWorkspace` 失效 doc 状态 + `documentEvents.emit('workspace')` 经既有链路广播进全部插件帧，SDK `wuh.on('workspace')` 可感知）。最近项目持久化在主进程 `userData/recent-workspaces.json`（`setWorkspace` 成功即登记，cap 8）。

## 适用边界

适用于 App 壳层与渲染层导航。不适用于插件沙箱帧内部的视图导航（插件自管），也不适用于主进程窗口管理。桌面端有意不使用 RSC 数据获取（数据全走 IPC/preload），`output: 'export'` 下 Route Handlers 亦不可用。

## 验证方式

- 读 `app/(shell)/layout.tsx` 与 `lib/routes.ts`：路由段 ↔ 菜单项映射、Cmd+, 切换、FloatLayer 常驻。
- `pnpm typecheck`（node 侧 + tsconfig.next.json）+ `pnpm test` 回归（tsc + vitest）。
- `pnpm dev` 手动路径：启动默认 Home（左栏可见）→ 左栏切设置/插件 main 视图 → `Ctrl+,` 切换设置 ↔ 首页 → 浮窗 toggle 开合、切页后浮窗仍在、Esc 关浮窗；左栏展开/收起瞬时切换。
- 生产加载路径：`app://shell/index.html` 仅在**打包产物**（`pnpm dist`）中生效；未打包 `electron .` 恒走 dev 路径（wait-on next dev）。splash 人工走查：启动即现品牌标 splash → 主窗带样式切换无白屏/乱序；`tests/splash.test.ts` 锁定 splash 静态契约。

## 关联知识

- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)（通用约束另见 `norms/ui-patterns.md`、`norms/interaction.md`）
