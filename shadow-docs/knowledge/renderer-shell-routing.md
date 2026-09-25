---
title: Renderer 壳层两栏布局与 App Router 路由约定
domain: renderer-ui
keywords: [首页, 设置页, 项目页, 编辑页, 路由, App Router, 路由段, SideMenu, 菜单, 项目树, 两栏布局, main 容器, 浮窗, FloatLayer, 面板切换, 插件视图, 静态导出]
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
  - changes/20260922-refactor-codemirror-editor/brief.md
  - changes/20260924-feature-projects-editor-page/brief.md
  - changes/20260924-feature-sidemenu-settings-item/brief.md
  - changes/20260924-feature-native-save-dialog/brief.md
  - changes/20260925-feature-sidemenu-settings-consolidation/brief.md
verified: 2026-09-25
verified-depth: runtime
verified-scope: app/(shell)/layout.tsx, components/SideMenu.tsx, components/menu/PluginTree.tsx
---

# Renderer 壳层两栏布局与 App Router 路由约定

## 当前结论

渲染层为 **Next.js App Router 项目**（2026-09-21 起，从 electron-vite + React 迁移）：两栏布局（**预留通知条**（44px 空条，待更新/紧急通知）→ body（左栏 SideMenu + 右栏 main 容器）→ StatusBar）由 **`app/(shell)/layout.tsx` 持久化**，路由段互斥渲染右栏页面：

- `/` → HomePage（默认入口 = **「新建博客」项目入口**，2026-09-21 起：项目区块承载打开本地目录 / clone 公开 https 仓库 / 最近项目列表；活动散点图与主编辑器面板卡片依次其下）
- `/settings` → SettingsPage（仅应用级设置；GitHub 凭证与 Git 提交身份已归拢至 `/account`）
- `/account` → AccountPage（用户中心，2026-09-22 起：GitHub OAuth Device Flow 授权 + 身份/仓库/默认站点仓库 + Git 提交身份）
- `/projects` → ProjectsPage（项目页，2026-09-24 起：当前工作区组置顶 + 最近项目组，组内列各自 `.md` 清单；组行点击经共享 `openProjectFile` 直达 `/editor`，失效目录组呈「无法访问」态）
- `/editor` → EditorPage（统一编辑页「Typora 式沉浸」，2026-09-24 起：项目页/左栏树点文件与草稿箱「继续编辑」都进此页；**菜单外路由 key**，同 `/account` 不高亮菜单项，见 [主编辑器卡片](editor.md)）
- `/plugin/<pluginId>/<viewId>` → PluginMainView（`views.area: 'main'` 的插件视图；`generateStaticParams` 从内置 `plugins/*/plugin.json` 构建期枚举）

**静态导出约束**（`output: 'export'`，next.config.ts）：产物在 `dist/next/`，由主进程 `app://` 协议离线加载（`src/main/index.ts` 的 `resolveRendererFile`，含目录穿越校验）。动态路由**必须构建期枚举**——运行时安装的新插件视图不会预生成路由页（当前内置插件无影响；未来支持运行时安装时改 query/client state 兜底）。

**启动加载路径（2026-09-22 起）**：主窗 `show: false` 后台加载，启动即现 **splash 窗**（`src/main/splash.html` 经 `?raw` 内嵌 + `data:` URL 加载的自包含静态页：品牌标 + 主题同值底色，亮暗随 `prefers-color-scheme`）；壳层 layout 挂载后经 `components/ShellReady.tsx`（双 rAF）发 `rendererReady` IPC（契约三处同步），主进程撤下 splash（淡出 240ms，`prefers-reduced-motion` 页内降级）并 show 主窗；prod 兜底 4s / dev 65s。**主题首帧地基**（根治无样式闪屏）：`app/layout.tsx` 服务端内联 `buildThemeCss()`（`<style id="wd-theme-vars">`）+ `<html>` 预置 wine/dark 默认属性 + pre-paint 内联脚本按 localStorage `wd.theme` 纠偏（含 `system` 档 matchMedia 解析分支），配合 `experimental.inlineCss` 使首帧即终态样式；`ThemeProvider` 的注入退化为缺失兜底（DOM 存在性守卫）。

**壳层 i18n（2026-09-22 起）**：`lib/i18n/locales.ts` 三语字典（zh/en/ja flat key，`{name}` 占位符）+ `lib/i18n/context.tsx` 的 `LocaleProvider`/`useT()`，持久化键 `wd.locale`（与 `wd.theme` 同模式）。**两段式渲染**：首帧固定 zh 与导出 HTML 一致（防 hydration mismatch），mount 后切存储 locale——启动切换的中文闪帧由 splash 窗覆盖，运行时切换即时。字典 key 集合一致性由 `tests/i18n.test.ts` 锁定；**缺键会静默回落为 key 本身（UI 直接显示裸 key，如 `menu.projects`）**，故同文件另有「源码引用键 ⊆ 字典」覆盖扫描（字面量 `t()` 直调 + 按命名空间识别的字面量扫描，覆盖三元/映射表等间接传键）——新增文案键必须三语齐配，否则测试红。范围边界：仅壳层 chrome 文案；插件 manifest 标题与插件帧内容不在此机制内。

`menuExpanded`（SideMenu 展开/收起）是 layout 内的客户端状态；菜单项 id 与路由段一一对应（`lib/routes.ts` 的 `pluginPanelKey` / `routeKeyFromPathname` 负责互转，`account` 为独立路由 key）。**底部系统区两项制重分工（20260925-feature-sidemenu-settings-consolidation）**：【用户】在上 = 纯导航直达 `/account`（`userActive` 高亮走 `data-active` 稳定属性，悬停不再弹任何面板）；【设置】在下 = **三态交互**——收起态图标为右箭头（`IconChevronRight`）且点击仅展开菜单（`data-tip`「设置 · 展开菜单」），展开态左 Setting 图标直达 `/settings`（`settingsActive` 高亮）+ 右缘收起旋钮（复用 TreeKnob 样式，`aria-label=pop.collapseMenu`，stopPropagation 防误触导航）收起菜单；主导航 items 数组仍不含 `settings`（底部区是 SideMenu 内硬编码 JSX）。**外观与语言快捷面板挂【设置】项**（仅展开态 hover/聚焦弹出，收起态保留 data-tip 单一职责——tooltip 与面板同锚右侧会重叠；面板仅主题/外观/语言三组，「收起/展开菜单」行已退役，⌘/Ctrl+B 全局不变）。**插件 main 视图不再平铺主导航**：统一收进【插件】单一可展开条目子树（`components/menu/PluginTree.tsx`：main 视图导航行 + 浮窗开关行 + 空态「无启用插件」；`pluginsTreeOpen` 状态在 layout，展开态点条目 = 切子树、收起态点条目 = 仅展开菜单），SideMenu 的 `toggleItems` 组已退役（浮窗开关行并入子树，`aria-pressed` 语义不变）。`FloatLayer` 常驻 main 容器叠加其上（浮窗与右栏页面**共存**，切换页面不卸载）。

**左栏【项目】条目自带项目树**（2026-09-24 起；SideMenu 条目子树槽位 `tree/treeOpen/onToggleTree` 的通用设计见 shell-chrome-design 卡）：一级 = 项目节点（当前工作区置顶带「当前」徽标，其余最近项目），二级起 = 文件夹/`.md` 递归树（`pruneMarkdownTree` 只留含 .md 分支）；项目节点懒加载（首次展开才 `readTree(root)`），失效项目呈「无法访问」且再次点击重试；**点文件与 `/projects` 页共用 `openProjectFile`**（脏确认 → 非当前项目先 `openWorkspaceByPath` 切工作区 → `readFile` → `openDoc`），随后 `router.push('/editor')`——打开流单点收口，两处 UI 不得各写一份。清单数据走 `window.api.readTree(root?)`：**显式 root 校验目录存在后按该根构树、不切换当前工作区**；缺省 = `requireRoot()` 现行为（契约见 `src/shared/types.ts`，主进程实现与测试见 workspace 域）。

**全局身份 store（2026-09-22 起）**：`lib/identity.ts`（useSyncExternalStore 快照注册表，与 tasks/statusItems/floats 同构）是 GitHub 身份（头像/昵称/login/scopes/kind/stale）的壳层唯一数据源——壳层 layout 挂载 `refreshIdentity()` 拉取一次（未配 token / `getGithubIdentity` 抛错一律落 null），用户中心 `AccountPage.reloadIdentity` 成功分支 `syncIdentity()` 写穿（授权成功 / PAT 保存 / 断开三时机全覆盖，页面本地 loading/error/stale 三态 UI 不动）；消费方 `useGithubIdentity()`：SideMenu 用户入口（展开态用户名文本投影）与 HomePage 问候语，**均仅文本投影**（`name‖login`；同日回退了侧栏头像 img 投影——远程图片网络不可靠，**壳层禁止渲染远程头像图片**，头像待 Settings「用户设置」本地接管，见 shell-chrome-design 卡）。**回退语义：undefined（尚未拉取）/ null（无身份）/ stale 一律回落品牌标 + wuh-site + 纯问候**；问候带名走 `home.greetNamed` 三语占位（昵称 name 优先、login 兜底），store 单测 `tests/identity-store.test.ts`。

**全屏视图体系已废止**（2026-09-20）：设置页与首页都是右栏普通页面，左栏常驻。键盘语义：`Cmd/Ctrl+,` 在 settings ↔ home 间 `router.push` 切换；`Cmd/Ctrl+B` 切换左栏展开/收起（全局快捷键；指针路径 = 设置项右缘收起旋钮 / 收起态点设置项）；Esc 只关最顶层浮窗（FloatLayer 内处理，确认框打开时让位——用 `[data-dialog-overlay]` 稳定属性判定，styled 类名是哈希）。页面自身 mount 聚焦（`tabIndex={-1}`）保留。

**内置编辑器已回归首页面板**（20260922-refactor-codemirror-editor 起：CodeMirror 6 源码编辑 + 分栏预览，见 [主编辑器卡片](editor.md)；2026-09-20 至 09-22 间曾有「内置编辑器已移除」窗口，其间 20260922-feature-vditor-md-editor 短暂引入 Vditor IR 后整体替换退场）。`lib/store.ts`（workspaceStore）既是首页编辑器的 content 状态源（content 双通道 + 防回环，见 editor.md 卡），也是插件 doc 服务（帧协议 `doc.get/set/save`）的宿主侧状态源。

## 执行约束

- 新增右栏页面 = 新增 `app/(shell)/<segment>/page.tsx` 路由段；禁止塞回左栏（SideMenu 纯导航不承载内容）。
- 插件视图路由统一走 `/plugin/<id>/<view>` 段；新增视图一律走 manifest `views.area` 声明（`main` 右栏页面 | `float` 浮窗），`sidebar` 已废弃（validateManifest 拒绝并指引迁移 main）。
- 插件 main 视图动态路由若新增**运行时**来源，必须同步改 `generateStaticParams` 或在页面内退化到 client 渲染，否则静态导出缺页。
- 浮窗开合与几何是进程内注册表状态（`lib/floats.ts`，commit() 产新引用 + useSyncExternalStore）；FloatLayer 几何视口 = main 容器。
- 客户端组件一律 'use client'；服务端组件只做参数透传（`plugin/[...slug]/page.tsx` 为 async server component，接收 `params: Promise<...>`）。
- 任何 `useSyncExternalStore` 必须传第三参 `getServerSnapshot`（静态导出预渲染要求，否则 `next build` 在预渲染阶段报错退出）。
- 新增会首帧渲染的 CSS/主题能力时必须保持「构建期内联 + 属性路由」机制：不要把 token CSS 改回运行时注入，不要移除 layout 的 pre-paint 纠偏脚本（其键名与 ThemeProvider 的 `STORAGE_KEY` 锚点同步）。
- 壳层不再展示工作区 UI；工作区信息两处 seed：layout 挂载时 `getWorkspace` 一次性 seed，以及**项目入口切换时 `applyWorkspaceSwitch` 重入**（`setWorkspaceInfo` + `workspaceStore.switchWorkspace` 失效 doc 状态 + `documentEvents.emit('workspace')` 经既有链路广播进全部插件帧，SDK `wuh.on('workspace')` 可感知）。打开工作区的入口：项目区块打开本地目录 / clone / 最近项目列表，以及 **saveAs 无工作区时的原生目录选择引导**（20260924-feature-native-save-dialog——引导前先捕获编辑内容，切换会清 doc 状态）。最近项目持久化在主进程 `userData/recent-workspaces.json`（`setWorkspace` 成功即登记，cap 8）。

## 适用边界

适用于 App 壳层与渲染层导航。不适用于插件沙箱帧内部的视图导航（插件自管），也不适用于主进程窗口管理。桌面端有意不使用 RSC 数据获取（数据全走 IPC/preload），`output: 'export'` 下 Route Handlers 亦不可用。

## 验证方式

- 读 `app/(shell)/layout.tsx` 与 `lib/routes.ts`：路由段 ↔ 菜单项映射、Cmd+, 切换、FloatLayer 常驻。
- `pnpm typecheck`（node 侧 + tsconfig.next.json）+ `pnpm test` 回归（tsc + vitest）；项目/编辑面专项：`tests/projects.test.ts`（分组/树剪枝纯逻辑）、`tests/projects-render.test.tsx`、`tests/projects-tree.test.tsx`（懒加载/失效重试/点击流转）、`tests/editor-page.test.tsx`（happy-dom，零 React 告警）、`tests/i18n.test.ts`（三语 parity + 源码键覆盖）。
- `pnpm dev` 手动路径：启动默认 Home（左栏可见）→ 左栏切设置/插件 main 视图 → `Ctrl+,` 切换设置 ↔ 首页 → 浮窗 toggle 开合、切页后浮窗仍在、Esc 关浮窗；左栏展开/收起瞬时切换；展开【项目】旋钮 → 点树内 `.md` 直达 `/editor`、跨项目打开自动切工作区、失效项目「无法访问」可重试。
- 生产加载路径：`app://shell/index.html` 仅在**打包产物**（`pnpm dist`）中生效；未打包 `electron .` 恒走 dev 路径（wait-on next dev）。splash 人工走查：启动即现品牌标 splash → 主窗带样式切换无白屏/乱序；`tests/splash.test.ts` 锁定 splash 静态契约。

## 关联知识

- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)（通用约束另见 `norms/ui-patterns.md`、`norms/interaction.md`）
