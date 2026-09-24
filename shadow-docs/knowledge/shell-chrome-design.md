---
title: 壳层 chrome 设计与插件扩展点
domain: renderer-ui
keywords: [图标注册表, AppIcon, Icon, SideMenu, 菜单栏, 两栏布局, StatusBar, 状态栏, statusItems, 徽标, 插件贡献点, 主题 token, 品牌标, IconLogo, Dock 图标, 应用图标, ico, 任务栏, 浮窗, FloatLayer, float, main, toggle, styled-components, 任务胶囊, 壳层胶囊, 胶囊, 任务贡献点, TaskCapsule, TaskPopover, Capsule, CapsulePanel, tasks, 待办, 进度]
scope: [app, components, lib, src/shared/plugin.ts, src/plugin-sdk, build, scripts]
status: active
source:
  - changes/20260917-feature-shell-chrome-plugin-api/brief.md
  - changes/archive/20260919-feature-brand-icon-redesign/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
  - changes/20260920-feature-shell-two-column-layout/brief.md
  - changes/20260921-feature-app-icon-wiring/brief.md
  - changes/20260921-refactor-renderer-nextjs/brief.md
  - changes/20260921-feature-plugin-task-capsule/brief.md
  - changes/20260921-feature-startup-splash-loading/brief.md
  - changes/20260922-feature-i18n-shell-locales/brief.md
  - changes/20260922-feature-user-center-github-oauth/brief.md
  - changes/20260922-feature-user-identity-sync/brief.md
  - changes/20260922-fix-shell-avatar-app-icon/brief.md
  - changes/20260922-feature-shell-capsule/brief.md
  - changes/20260923-feature-capsule-prominence/brief.md
  - changes/20260922-refactor-codemirror-editor/brief.md
  - changes/20260923-feature-build-time-visibility/brief.md
  - changes/20260924-fix-capsule-self-close/brief.md
  - changes/archive/20260924-feature-task-center-event-bus/brief.md
  - changes/archive/20260924-fix-capsule-header-chrome/brief.md
  - changes/20260924-feature-sidemenu-bottom-toggle/brief.md
verified: 2026-09-24
---

# 壳层 chrome 设计与插件扩展点

## 当前结论

**样式载体（2026-09-21 起）**：组件样式一律 **styled-components**（Next `compiler.styledComponents: true`，与 x.wuh.site/apps/site 同因同配）；主题 token 仍是 `:root` CSS 变量 + `data-theme-family`/`data-color-scheme` 属性路由（`components/theme/tokens.ts` 构建期注入 `<style id="wd-theme-vars">`，机制未变），styled 内直接 `var(--token)` 引用。`app/globals.css` 只保留全局地基：字体 @font-face（`app/fonts/*.woff2`）、html/body 基座、滚动条、品牌标书写动效键帧。styled 类名是哈希，**自动化/测试不得依赖类名选择器**——用 aria/role/`data-*` 稳定属性。

**图标体系**（对齐 x.wuh.site `packages/components/icons` 模式）：`components/icons/index.tsx` 集中注册表按 UI / Status / Plugin（manifest 图标白名单映射）/ Brand（自绘 `IconLogo`、`IconDiamond`，见 `brand.tsx`）分组导出 `Icon*`；渲染统一走 `<AppIcon>`，场景规格：chrome/面板 16px（md）、工具栏 14px（sm）、正文内联 12px（xs）、强调 20/24；描边 ≤14px 用 2、>14px 用 1.75（24 网格）。

**品牌标（2026-09 重绘）**：`IconLogo` = W 字母标（两个圆头 V，120 网格几何 `M12 16 L27 44 L42 16` + `M42 16 L57 44 L72 16`，stroke 6）+ primary 双条点缀（x84 起 w24/w15）；`build/icon.svg` 为 Dock 图标 master（1024 网格、824/185 圆角方底，同一几何 ×7 平移映射），两者几何参数互相注释锚定，**改动任一处必须同步另一处**。`src/main/splash.html`（启动 Loading 页，2026-09-22 起）内联同几何品牌标 SVG，构成**第三同步锚点**（brand.tsx ↔ build/icon.svg ↔ splash.html），由 `tests/splash.test.ts` 从 brand.tsx 源码提取 `d`/rect 几何自动锁定。`scripts/build-icon.mjs`（npm script `build:icon`，devDep `@resvg/resvg-js`）从 master 栅格化 `build/icon.png`（1024）+ `icon-light.png`（`--variant light`，按 svg 头部注释的 token 整串替换）+ macOS `iconutil` 合成 `build/icon.icns` + **`build/icon.ico`（Windows，2026-09-21 起）**：`buildIco` 组包 ICONDIR+ICONDIRENTRY，16–256 七档 PNG 压缩条目（Vista+ 全支持，256 记 0），随 dark 变体产出。electron-builder 直接取 `build/icon.icns`（mac）；win 段 `win.icon: build/icon.ico`——显式 icon 路径按 roots=[buildResourcesDir, projectDir] 双根依次解析，`build/icon.ico` 命中项目根。生成产物（png/ico/icns）随仓库提交，保证干净克隆可打包。**dev 窗口/任务栏图标**：`BrowserWindow` 设 `icon = app.getAppPath()/build/icon.png` + `existsSync` 守卫（打包后 build/ 不进 asar，窗口/任务栏图标由 exe 资源 win.icon/icns 承担）。壳内展示落点：**左栏 SideMenu 底部用户占位区**（静态小尺寸）与设置页「关于」区块（`animated` prop 开启书写动效 + `NEXT_PUBLIC_APP_VERSION` 构建期内联版本）。

**SideMenu（2026-09-20 起，取代 ActivityBar）**：左栏菜单栏，两形态**瞬时切换**（禁 width 过渡，ui-patterns 布局位移动画禁令）——收起 = 48px 图标 rail，展开 = 220px 图标+文字（label 仅 opacity 淡入 200ms）。能力沿袭：左缘 2px 激活指示条（`::before`）、徽标位（数字 99+ 折叠 / `dot` 圆点，展开态转行内）、`data-tip` 自绘 tooltip（**仅收起态**显示，hover 与 `:focus-visible` 可见）+ `aria-label`、toggle 型 item（`toggleItems`/`openToggleKeys`/`onToggle`，激活态=浮窗打开 `aria-pressed`，区别于菜单选中态 `aria-current="page"`）、导航子树（展开态挂载 `TreeWrap`）。结构：顶部**直接是导航项** → toggle 组（浮窗开关）→ **底部系统区两行制**（`margin-top:auto` 吸附左下，20260924-feature-sidemenu-bottom-toggle，走查修订定序）：**收起态专属展开钮在上**（`IconPanelExpand`，复用导航项样式基命中区，data-tip 复合「展开菜单 ⌘/Ctrl+B」，一击直达展开菜单）+ **用户入口恒为底部最后一项**——设置/用户区永远占底，不被任何图标压在下发；**展开态不渲染该钮**（无死控件），收起动作由快捷面板行与 `⌘/Ctrl+B` 承担。低频 chrome 控件不占导航黄金位。

**用户入口与快捷面板（2026-09-22 起，二级 popover 化 + 用户中心直达；同日身份联动后头像投影已回退）**：底部唯一入口 = **图标恒为品牌标 IconLogo（头像占位）**——GitHub 头像投影（UserAvatar/PopAvatar img）当日即回退：远程图片（avatars.githubusercontent.com）网络不可靠时常破损，**壳层禁止渲染远程头像图片，头像显示待 Settings「用户设置」（本地 name/avatar）接管**；展开态名字保留 GitHub 用户名文本投影（`name‖login`，未授权/stale 回落 wuh-site，文本走 API 响应无网络依赖，数据源见 renderer-shell-routing 卡「全局身份 store」段）；版本行恒显；**点击**进入用户中心 `/account`（GitHub 授权 + 身份/仓库 + Git 提交身份，替身期「进设置页」行为已退役，`userActive` 命中 `/account` 时高亮），**悬停/键盘聚焦**弹出 `UserQuickPanel`（`role="menu"`）：**头部身份行**（仅用户名文本，未授权 = 「用户」标题；版本 + 「点击头像进入用户中心」提示恒显）、**主题（酒红/素雅）、外观（跟随系统/浅色/深色）、语言（中文/English/日本語）三组均为二级 popover 行**——通用 `PopSubmenu` 组件：行左文案右 chevron、hover/聚焦弹出选项子菜单（`menuitemradio`、当前项勾选、180ms 延迟移入、Esc、键盘可达）；语义差异：语言选中即关面板，主题/外观保持打开便于连续试选。外观 `system` 档实时解析系统明暗并监听切换（`data-color-scheme` 仍只写二值，token 路由与插件帧广播不变）。文案全部经 `useT()` 三语字典（机制见 renderer-shell-routing 卡 i18n 段）。**「收起/展开菜单」行内项（带 `⌘/Ctrl+B` 快捷键提示，与收起态底部专属展开钮两处入口并存）**、**「设置」行内项独立指向 `/settings`**（应用设置与用户中心是两个目的地，SideMenu props `onOpenSettings` 与 `onOpenUser` 分离）。面板定位 `left: calc(100% + 8px)` 贴入口右侧，二级 popover 锚定触发行右侧，延迟 180ms 关闭以允许指针移入；Esc 关闭；**Nav 不得设 `overflow: hidden`**（会裁剪面板、子菜单与 tooltip）。

**Header（2026-09-24 起双区制）**：44px TitleBar = 左区**更新通知 / 紧急通知预留位**（`aria-label="通知栏"` + `aria-live="polite"`，当前无内容）+ 右区**壳层胶囊**（任务中心入口，20260924-fix-capsule-header-chrome 自 main 容器右上迁入）。主题切换入口唯一落在左栏用户快捷面板；`AppearanceMenu` 组件已删除。

**浮窗层与 floats 注册表（2026-09-18 起）**：插件视图区域为 `views.area: 'main' | 'float'`（preview 分栏与 sidebar 侧栏均已移除；`sidebar` 声明被 validateManifest 拒绝并指引迁移 main），float 视图经 `FloatLayer`（`components/FloatLayer.tsx`）以浮窗形态按需唤起——头部拖拽、8 向缩放、点按置顶、最小化为左下角 chip（帧保持挂载，整窗 display:none）、Esc 关闭最顶层未最小化浮窗（确认框打开时让位——用 `[data-dialog-overlay]` 稳定属性判定，styled 类名是哈希）。状态注册表 `lib/floats.ts` 为纯逻辑快照模块（与 statusItems 同构：`commit()` 产新引用 + useSyncExternalStore）；开合与几何是**进程内状态**。**FloatLayer 常驻右栏 main 容器**：浮窗与右栏页面（Home/设置/插件 main 视图）共存，切换页面不再卸载浮窗，几何视口 = main 容器。浮窗内容复用 `PluginView` 帧宿主（plugin:// 沙箱协议不变）。

**StatusBar（2026-09-23 起纯插件状态项）**：左区 = statusItems（alignment=left），右区 = statusItems（alignment=right）。壳层胶囊（Capsule）自 20260922-feature-shell-capsule 起迁至 main 容器右上常驻，不再占用状态栏（见下段）。编辑器相关分区（文件路径/光标行列/字数/未保存）与 git 分支徽标未随内置编辑器回归状态栏——编辑器功能入口在胶囊面板的编辑器分区（EditorSection）与首页编辑器面板动作行（预览 toggle 等），契约见 [主编辑器卡片](editor.md)。

**壳层胶囊 Capsule 与任务中心（2026-09-24 起，事件总线 + 任务事件溯源 + 挂点入 header）**：壳层一等聚合入口，固定命名 `components/capsule/`——`Capsule.tsx`（chip，data-testid `capsule`）+ `CapsulePanel.tsx`（任务中心面板，`capsule-panel`）+ `sections/EditorSection.tsx`（编辑器分区，`EditorCommandHost` 常驻命令宿主由壳层 layout 单实例挂载）。**挂点契约（20260924-fix-capsule-header-chrome 迁移）：TitleBar（44px header）右侧 flex 子项**——chip 垂直居中、`margin-left:auto` 推右缘，面板贴 chip 下缘 10px **向下**弹出；层叠等价换算：TitleBar 不建层叠上下文，面板 z70 仍在根上下文（**>浮窗 z2、<Dialog 100**），chip 低于浮窗不变；Esc/点外关（window 级监听 + target 归属守卫，20260924-fix-capsule-self-close）不受影响；空态显示「就绪」，不整体隐藏。**chip 解剖（20260924 微进度环重设计，替代 20260923 状态环药丸）**：26px 药丸 **ghost 态**——header 上默认透明底无边框（安静的信令），hover/面板展开浮起 chrome-raised 药丸 + elevation-card 阴影；**微进度环（SVG 14px）**：环即聚合进度——空闲=空心轨道环、有任务=primary 进度弧（弧长=done/total）、有 in_progress 叠加旋转亮弧（800ms/圈，**属持续状态指示非过渡动效**，reduced-motion 静态降级）、全完成=success 满环；标签任务态整串 mono 语义色（进行中=primary、全完成=success）`任务 {done}/{total}`，空态「就绪」/编辑器入口 sans 次级色；chevron 开合旋转 180°（150ms，reduced-motion 关）。**面板 = 任务中心（420px 宽近满高，多插件并发任务的集散地）**：「任务 | 模块」双 tab（`role=tablist`；模块 tab = EditorSection + capsule 贡献点 tiles，20260923 控制中心现状保留）；任务 tab = **单流时间线**——左缘 2px 脊线（Rail）串状态标（pending 空心 / in_progress 旋转环 + 脊线段 primary 脉动 / done 对勾，圆形底色遮断脊线成珠串），排序 进行中（updatedAt 倒序）→ 待处理（createdAt 倒序）→「最近完成」（doneAt 倒序，置灰 65%）；行 = 状态标 + 标题 + 来源插件徽标（mono pill）+ 进度（细条 + n/m mono）+ detail + 相对时间（自算 s/m/h，禁 `toLocaleString`）；viewId 行整行可点跳来源视图。头部 = 聚合进度条（全完成转 success）+ mono 计数；筛选 chips（全部/未完成/已完成，`aria-pressed`）+ 插件 pill（≥2 插件有任务才出现）；空态分「等待插件任务」/「无匹配任务」；**「清空已完成」= 壳层唯一允许的写操作（remove 隐藏条目，不改状态）**；面板开着时新行 150ms 淡入（reduced-motion 关）。编辑器工具条 IconRow **横密纵疏**（column-gap 2px / row-gap 6px，20260924-fix-capsule-header-chrome——`gap` 横纵共用曾致换行工具条贴死）。

**渲染层事件总线 events 扩展点（2026-09-24 起）**：`lib/events.ts` 纯逻辑模块，与 statusItems/floats/tasks 同构（快照 = 最近 200 条环形缓冲 + `commit()` 产新引用 + useSyncExternalStore；订阅表是路由态不进快照）。插件帧经 SDK `wuh.events.publish/subscribe/unsubscribe` 走帧协议 `events` 服务（`PluginFrameHost.handleFrameInvoke` 渲染层裁决，**主进程 broker 不参与**）：**信封 `{ id, type, pluginId, payload, ts }`，pluginId 由宿主按帧身份盖章（调用方不可冒名）**；插件事件名强制 `<pluginId>:<name>` 命名空间（`[a-z0-9][a-z0-9._-]{0,63}`）；宿主内转事件可发系统级类型（如 tasks 服务写穿后发 `tasks:upsert`/`tasks:remove`，信封归属 = 任务所属插件）。订阅模式：精确类型 / `<ns>:*` 前缀通配 / `*` 全通配，每插件 ≤16 个模式（去重不占额）；投递经 `onAnyEvent` 钩子（`wireHostOnce` 接线）按 `subscribersFor(type)` 推送订阅插件的**全部帧**（`{kind:'event', name:'event', payload:信封}`，SDK `wuh.on('event', cb)` 接收）。护栏：payload 须可 JSON 序列化且 ≤4KB。插件停用清订阅 + 清其缓冲事件。测试 `tests/events.test.ts`。

**tasks 任务贡献点（2026-09-24 起事件溯源，manifest 声明制退役为可选预置）**：manifest `tasks` 仍是合法来源（bootstrap/启用注册，默认 pending，可带 viewId 跳转，每插件 ≤8），但不再是唯一来源——**运行时对未声明 id 首报带 title（1-80 字符）的 upsert 即动态创建**（任意插件随时触发任务展示的集散地入口；缺 title 报错）。SDK `wuh.tasks.upsert(id, patch)/remove(id)` 契约：patch 可含 title（仅创建首报生效，已存在任务携带 title 拒绝）/status（`pending|in_progress|done`）/progress（`{current,total}`，**严格 typeof number 校验**——帧消息来自 postMessage 不可用 `Number()` 宽转）/detail；声明任务 id/title/viewId 运行时不可变；**每插件并发可见任务 ≤8**（remove 隐藏腾位后可再建，注册表裁决）；`lib/tasks.ts` 任务增加 `declared/createdAt/updatedAt/doneAt` 字段（时间线排序与相对时间用）。注册表与 statusItems/floats 同构（commit() 产新引用 + useSyncExternalStore + getServerSnapshot 第三参）。插件停用清空、启用重注册。参考生产者：github-issues 发布流（逻辑帧内上报，失败回 pending + detail 原因）。

**插件状态项 = manifest 声明 + 运行时更新**：manifest `statusItems`（id 限 `[a-z0-9][a-z0-9._-]*`、icon 白名单、text 必填、alignment 默认 right、order 默认 100、每插件 ≤4 项）；SDK `wuh.statusBar.update(id, patch)/remove(id)` 走帧协议 `statusBar` 服务，由渲染层宿主（`components/plugins/PluginFrameHost.tsx` 的 `handleFrameInvoke`）直接裁决，**主进程 broker 不参与**；注册表 `lib/statusItems.ts` 为纯逻辑模块（useSyncExternalStore 快照模式）。插件只能 update/remove 自己声明过的项；icon/alignment/order 运行时不可变；插件停用清空、启用重注册。

**CSP 与窗口 chrome（2026-09-21 起）**：CSP 由 `app/layout.tsx` 的 `<meta http-equiv>` 承载（导出模式 headers() 不可用）——`default-src 'self'` + `script-src 'self' 'unsafe-inline'`（Next 导出 flight 内联数据必需，dev 追加 `'unsafe-eval'`，React 开发模式需要）+ `frame-src plugin:`（插件沙箱帧）+ `img-src local-resource:`。窗口不显示系统菜单栏（主进程 `win.setMenu(null)`；应用菜单仅保留编辑快捷键角色 undo/redo/cut/copy/paste/selectAll + dev 的 reload/toggleDevTools）。

## 执行约束

- 业务代码禁止裸 `import ... from 'lucide-react'`，一律从 `components/icons` 取 `Icon*`；新图标先进注册表再使用。
- 组件样式用 styled-components + 主题 token（`chrome-*`/`primary-*`/语义 token）；四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`；左栏展开收起必须瞬时（禁 width/布局位移过渡）。
- 品牌标书写动效属**入场型展示动画**（非过渡）：单笔 400ms（token `--motion-dur-write`）+ stagger，总长 ≤900ms，mount 播放一次，`prefers-reduced-motion: reduce` 下必须直接渲染静态终态；仅 `animated` prop 显式开启。
- 品牌/ Dock 图标几何改动必须同步 `components/icons/brand.tsx` 与 `build/icon.svg`（含亮/暗变体 token 表），并重跑 `build:icon` 重新提交产物（png/ico/icns）；`tests/icon-build.test.ts` 校验同源几何、产物尺寸、ico 容器结构与重跑可复现。
- 应用版本号与构建时间戳经 `next.config.ts` 的 `env.NEXT_PUBLIC_APP_VERSION` / `env.NEXT_PUBLIC_BUILD_TIME` 构建期内联（消费方读 `process.env`，格式化统一走 `lib/buildInfo` 的确定性 UTC 输出——禁 `toLocaleString`，避免 SSR/客户端 locale 差异 hydration mismatch），不得新增 preload/broker 通道消费版本。构建时间戳展示于设置页「关于」与快捷面板版本行（dev 下 = dev 服务器启动时刻，build 下 = 构建时刻；显示值与当前会话对不上 = 渲染层旧页面，即僵尸实例检测）。
- 插件可见性 API 扩展遵循「声明制优先」：先加 manifest schema + `validateManifest` 校验 + `tests/plugin-manifest.test.ts` 用例，运行时 API 只能操作声明过的资源。**例外（2026-09-24 起）**：tasks 动态创建与 events 总线为**护栏制**（运行时校验 + 数量/体积上限，见事件总线与 tasks 段）；statusBar/capsule 模块仍声明制。
- `statusItems.ts` 变更后必须 `commit()` 产出新 state 引用（快照订阅依赖引用变化）；`floats.ts`、`tasks.ts`、`events.ts` 同构同理。
- 胶囊动效（旋转亮弧/旋转环/时间线脊线脉动）属**持续状态指示**，不适用 150-300ms 过渡规则；`prefers-reduced-motion: reduce` 下必须静态降级。壳层不得反向修改任务状态（单一写方 = 插件 SDK）；**唯一例外 = 任务中心「清空已完成」**（remove 隐藏条目，不改状态）。壳层胶囊挂点契约（TitleBar 右侧垂直居中、面板贴 chip 下缘弹出、层叠等价换算）见壳层胶囊段——移动挂点或调整层级必须整段同步。
- 主区禁止硬编码插件视图容器；新增视图区域一律走 manifest `views.area` 声明（`main` | `float`）。
- 任何 `useSyncExternalStore` 必须传第三参 `getServerSnapshot`（Next 静态导出预渲染硬要求）；插件帧的 `PluginView` 与浮窗层均在客户端组件内（'use client'）。
- 浮层「点外关」一律用 **target 归属守卫**（根元素 ref + `contains(e.target)` 豁免自身），禁止依赖 effect 注册与事件冒泡的时序关系——React 18 对离散事件（真实点击）会同步刷新 passive effects，打开浮层的那次点击仍会冒泡到 window 并被自己刚挂上的监听器关掉（20260924-fix-capsule-self-close；胶囊 chip 即此伤，快速点击类回归用例在 happy-dom 的 act 语义下不可复现，须真机验证）。

## 适用边界

适用于渲染层壳层 chrome、品牌标与插件贡献点契约。站点 web 端（x.wuh.site）的 icons 分组模式与 styled-components 载体同源；桌面端品牌标 2026-09 起与站点端有意分叉，站点端跟进重绘须另行变更。不适用于插件沙箱帧内部 UI。

## 验证方式

- `grep -rn "from 'lucide-react'" components app` 排除 `components/icons` 应为空。
- `pnpm test`（含 `tests/plugin-manifest.test.ts`、`tests/plugin-statusitems.test.ts`、`tests/plugin-tasks.test.ts`、`tests/plugin-assets.test.ts`、`tests/icon-build.test.ts`、`tests/theme.test.ts`）；icon 用例覆盖设计源几何、PNG 尺寸、ico 容器结构与脚本重跑字节可复现（需 devDep `@resvg/resvg-js` 已安装）。
- `pnpm dev` 四主题 × 亮暗走查：左栏展开/收起（瞬时 + label 淡入 + tail 组吸附左下）、指示条/徽标/tooltip（仅收起态）、右栏 Home ↔ 设置 ↔ 插件 main 切换、浮窗 toggle/拖拽/缩放/最小化 chip/Esc/多开与页面切换后共存、状态项声明与运行时增删、壳层胶囊 header 右侧常驻（ghost 态/hover 浮起、微进度环空态「就绪」/进度弧/满环、面板贴 chip 向下弹出、逐页遮挡检查、浮窗拖至 header 下方与面板层叠、Esc/点外关/reduced-motion）、键盘遍历、设置页「关于」区块动效与 reduced-motion 降级。
- `pnpm dist` 产物应由 `app://` 协议加载（Windows `dist/win-unpacked` 可验）；`pnpm dist:mac` 产物 .app 图标应为品牌 icns（mac 上 builder 优先取 `build/icon.icns`）。

## 关联知识

- [Renderer 壳层两栏布局与 App Router 路由约定](renderer-shell-routing.md)
