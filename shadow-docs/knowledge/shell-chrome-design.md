---
title: 壳层 chrome 设计与插件扩展点
domain: renderer-ui
keywords: [图标注册表, AppIcon, Icon, Rail, 导航列, 工作台, 上下文面板, StatusBar, 状态栏, statusItems, 徽标, 插件贡献点, 主题 token, 品牌标, IconLogo, Dock 图标, 应用图标, ico, 任务栏, 浮窗, FloatLayer, float, main, toggle, styled-components, 任务胶囊, 壳层胶囊, 胶囊, 任务贡献点, Capsule, CapsulePanel, tasks, 待办, 进度, Dock, 停靠, 命令面板, 专注模式, data-chrome, 外观与语言, AppearanceSection, panelTabs]
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
  - changes/20260924-feature-sidemenu-settings-item/brief.md
  - changes/20260924-feature-git-history-capsule/brief.md
  - changes/20260925-feature-sidemenu-settings-consolidation/brief.md
  - changes/20260925-feature-capsule-plugin-tab/brief.md
  - changes/20260927-fix-shell-ux-defects/brief.md
  - changes/20260927-style-shell-visual-consistency/brief.md
  - changes/20261007-style-scrollbars-virtual-projects-list/brief.md
  - changes/20261015-feature-workbench-shell/brief.md
  - changes/20261017-feature-app-layout-workbench/brief.md
verified: 2026-10-18
verified-depth: runtime
verified-scope: 20261017 书脊案面（整窗移植）：书脊 Rail（spine-ink 双主题恒深墨+朱砂装订线）/案面底/浮笺画芯载体（paperSurface）/控制中心（磁贴 4×2+任务 GIT 排版分区+插件 tab 追加分区）/目次书耳浮笺化/Dock 退役（views.area 去 dock 四方同步）/data-chrome 四处/专注退场/四主题实机（书脊暗色倒置被用户裁决否决→恒深墨跟随主题）；全量 86 套件 + 三 tsconfig 绿（SGN-1 小批重试）；20261015 工作台：rail 10 用例 / capsule 双形态 9（现单形态改造）/ dock 7（套件退役）/ palette 13 / 外观区段 5 全绿 + 全量 769
---

# 壳层 chrome 设计与插件扩展点

## 当前结论

**样式载体（2026-09-21 起）**：组件样式一律 **styled-components**（Next `compiler.styledComponents: true`，与 x.wuh.site/apps/site 同因同配）；主题 token 仍是 `:root` CSS 变量 + `data-theme-family`/`data-color-scheme` 属性路由（`components/theme/tokens.ts` 构建期注入 `<style id="wd-theme-vars">`，机制未变），styled 内直接 `var(--token)` 引用。`app/globals.css` 只保留全局地基：字体 @font-face（`app/fonts/*.woff2`）、html/body 基座、滚动条、品牌标书写动效键帧。**滚动条策略（20261007 交互优化起）**：全应用隐藏滚动条（`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`，此前为 8px 主题色胶囊，用户裁决观感不符弃用），滚动能力保留（滚轮/触控板/键盘）；收口唯一在 globals.css，组件层不得再写 `::-webkit-scrollbar` 定制（`tests/globals-scrollbar.test.ts` 源码级守卫）。styled 类名是哈希，**自动化/测试不得依赖类名选择器**——用 aria/role/`data-*` 稳定属性。

**图标体系**（对齐 x.wuh.site `packages/components/icons` 模式）：`components/icons/index.tsx` 集中注册表按 UI / Status / Plugin（manifest 图标白名单映射）/ Brand（自绘 `IconLogo`、`IconDiamond`，见 `brand.tsx`）分组导出 `Icon*`；渲染统一走 `<AppIcon>`，场景规格：chrome/面板 16px（md）、工具栏 14px（sm）、正文内联 12px（xs）、强调 20/24；描边 ≤14px 用 2、>14px 用 1.75（24 网格）。

**品牌标（2026-09 重绘）**：`IconLogo` = W 字母标（两个圆头 V，120 网格几何 `M12 16 L27 44 L42 16` + `M42 16 L57 44 L72 16`，stroke 6）+ primary 双条点缀（x84 起 w24/w15）；`build/icon.svg` 为 Dock 图标 master（1024 网格、824/185 圆角方底，同一几何 ×7 平移映射），两者几何参数互相注释锚定，**改动任一处必须同步另一处**。`src/main/splash.html`（启动 Loading 页，2026-09-22 起）内联同几何品牌标 SVG，构成**第三同步锚点**（brand.tsx ↔ build/icon.svg ↔ splash.html），由 `tests/splash.test.ts` 从 brand.tsx 源码提取 `d`/rect 几何自动锁定。**splash Loading 动效（20260927-fix-shell-ux-defects 起）**：W 双笔 `stroke-dasharray/offset` 生长（640ms、次笔延迟 160ms）+ accent 块 1.8s 呼吸——纯 CSS、零脚本、零标记改动（选择器 `#splash path/rect:nth-of-type`，不触碰三方互锚几何）；**基态即终态**（dashoffset 0 / opacity 1），`prefers-reduced-motion` 关停动画即静态成品。`scripts/build-icon.mjs`（npm script `build:icon`，devDep `@resvg/resvg-js`）从 master 栅格化 `build/icon.png`（1024）+ `icon-light.png`（`--variant light`，按 svg 头部注释的 token 整串替换）+ macOS `iconutil` 合成 `build/icon.icns` + **`build/icon.ico`（Windows，2026-09-21 起）**：`buildIco` 组包 ICONDIR+ICONDIRENTRY，16–256 七档 PNG 压缩条目（Vista+ 全支持，256 记 0），随 dark 变体产出。electron-builder 直接取 `build/icon.icns`（mac）；win 段 `win.icon: build/icon.ico`——显式 icon 路径按 roots=[buildResourcesDir, projectDir] 双根依次解析，`build/icon.ico` 命中项目根。生成产物（png/ico/icns）随仓库提交，保证干净克隆可打包。**dev 窗口/任务栏图标**：`BrowserWindow` 设 `icon = app.getAppPath()/build/icon.png` + `existsSync` 守卫（打包后 build/ 不进 asar，窗口/任务栏图标由 exe 资源 win.icon/icns 承担）。壳内展示落点：**左栏 SideMenu 底部用户占位区**（静态小尺寸）与设置页「关于」区块（`animated` prop 开启书写动效 + `NEXT_PUBLIC_APP_VERSION` 构建期内联版本）。

**Rail = 书脊（20261017-feature-app-layout-workbench D1 书脊化）**：恒 48px 布面深墨竖条——双向 1px 织纹（透白 3%/压黑 4.5%）+ `--spine-ink` 墨底渐变（**亮色=normal-900 墨、暗色=背景色加深的同族深墨**——normal-900 暗色反转为浅色会脱离主题，走查裁决**不倒置**；配套 `--spine-paper` 纸字对，tokens.ts 双 scheme 成对路由）+ 右缘 1px 朱砂装订线（primary 渐隐渐显，`::after`）。能力沿袭：左缘 2px 激活指示条、徽标位（13px 方角 7px）、`data-tip` 自绘 tooltip + `aria-current`；**Nav 禁 `overflow: hidden`**。结构：顶部导航项（首页/**项目钮=目次浮笺开关**（D3 假定 b：呼出即激活，/projects 路由保留经 ⌘K/首页）/草稿箱）+【插件】条目 = popover（`PluginsWrap` 相对锚定，开合态**受控于壳层 layout**——与目次浮笺互斥，开一方关另一方）+ `margin-top:auto` 底部【用户（品牌标导航 /account）/设置】。主题/外观/语言入口在**控制中心磁贴**（ AppearanceSection 仍为设置页区段）。

**案面与浮笺载体（D2/D3，同 change）**：main 容器 = 暖案面底（五层渐变：窗光扫 + 双 radial 暖晕 + 1.2% 纸纹竖纹，全 token/color-mix）；非 /editor 路由页由 layout 统一包进 `components/ui/Sheet`（浮起素笺：radius 6、双投影+顶部内高光、右缘纸页叠口——纸面配方 `paperSurface` 与编辑页素笺本体同源，纸只有一种）；目次（ContextPanel）与书耳（SidePane）为 **absolute slip-card 浮笺**（radius 14 双投影+折角，滑出 220ms ease-out-soft、reduced-motion 瞬切，保挂载 opacity/visibility 显隐 + `data-open` 稳定属性），锚点 = Body（书脊右侧 64px / 右缘 16px），**默认收起**。壳体 `Shell` 带 `overflow: clip`——任何子树溢出硬裁剪，chrome 永不随内容滚走（scrollIntoView 类程序化滚动也无法位移壳体）。

**用户入口（20261015 工作台）**：Rail 底部【用户】项 = 纯图标导航直达 `/account`（无面板、无用户名文本投影）；图标恒为品牌标 IconLogo（头像占位）——GitHub 头像投影（img）已回退：远程图片（avatars.githubusercontent.com）网络不可靠时常破损，**壳层禁止渲染远程头像图片**，头像显示待 Settings「用户设置」（本地 name/avatar）接管。**主题/外观/语言入口**：设置页「外观与语言」区段（AppearanceSection：`SegmentedControl` radiogroup，外观 `system` 档实时解析系统明暗并监听切换）+ **控制中心磁贴**（20261017 D4：单击轮转主题族/外观档/语言，写穿同一组 Provider）。

**Header（2026-09-24 起双区制）**：44px TitleBar = 左区**更新通知 / 紧急通知预留位**（`aria-label="通知栏"` + `aria-live="polite"`，当前无内容）+ 居中 ⌘K 搜索胶囊（绝对居中，不参与弹性分配）+ 右区**壳层胶囊**（控制中心入口，20260924-fix-capsule-header-chrome 自 main 容器右上迁入）。

**浮窗层与 floats 注册表（2026-09-18 起）**：插件视图区域为 `views.area: 'main' | 'float'`（preview 分栏与 sidebar 侧栏均已移除；`sidebar` 声明被 validateManifest 拒绝并指引迁移 main），float 视图经 `FloatLayer`（`components/FloatLayer.tsx`）以浮窗形态按需唤起——头部拖拽、8 向缩放、点按置顶、最小化为左下角 chip（帧保持挂载，整窗 display:none）、Esc 关闭最顶层未最小化浮窗（确认框**或胶囊面板**打开时让位——`[data-dialog-overlay]` / `[data-capsule-panel]` 稳定属性判定，styled 类名是哈希；20260927-fix-shell-ux-defects 起面板与浮窗 Esc 分治，一次按键只关一层）。**浮窗 z 分带（20260927-fix 起）**：焦点序 `z` 单调递增仅用于注册表内排序，CSS 渲染层经 `floatZIndex` 钳制 ≤58（SideMenu tooltip 60 / 胶囊面板 70 / Toast 90 / Dialog 100 之下）——无限递增曾压过面板/Toast/Dialog；超限后相对次序由 z 升序 DOM 排序保持。状态注册表 `lib/floats.ts` 为纯逻辑快照模块（与 statusItems 同构：`commit()` 产新引用 + useSyncExternalStore）；开合与几何是**进程内状态**。**FloatLayer 常驻右栏 main 容器**：浮窗与右栏页面（Home/设置/插件 main 视图）共存，切换页面不再卸载浮窗，几何视口 = main 容器。浮窗内容复用 `PluginView` 帧宿主（plugin:// 沙箱协议不变）。

**StatusBar（2026-09-23 起纯插件状态项）**：左区 = statusItems（alignment=left），右区 = statusItems（alignment=right）。壳层胶囊（Capsule）自 20260922-feature-shell-capsule 起迁至 main 容器右上常驻，不再占用状态栏（见下段）。编辑器相关分区（文件路径/光标行列/字数/未保存）与 git 分支徽标未随内置编辑器回归状态栏——编辑器功能入口在胶囊面板的编辑器分区（EditorSection）与首页编辑器面板动作行（预览 toggle 等），契约见 [主编辑器卡片](editor.md)。

**壳层胶囊 Capsule 与控制中心（2026-09-24 起事件总线 + 任务事件溯源 + 挂点入 header；20261017-feature-app-layout-workbench D4/D5 升格控制中心并退役 Dock）**：壳层一等聚合入口，固定命名 `components/capsule/`——`Capsule.tsx`（chip，data-testid `capsule`）+ `CapsulePanel/`（**控制中心**面板，`capsule-panel`）+ `sections/EditorSection/`（编辑器分区，`EditorCommandHost` 常驻命令宿主由壳层 layout 单实例挂载）+ `CapsulePanel/ControlSections.tsx`（磁贴网格 + GIT/排版分区）。**挂点契约（不变）**：TitleBar（44px header）右侧 flex 子项——chip 垂直居中、推右缘，面板贴 chip 下缘**向下**弹出；层叠等价换算：TitleBar 不建层叠上下文，面板 z70 仍在根上下文（>浮窗 z≤58、<palette 85、<Dialog 100），chip 低于浮窗不变；空态显示「就绪」，不整体隐藏。**单形态（D5 Dock 退役）**：`lib/dock.ts` 收敛为纯开合 store（`{open}`）——chip 开合控制中心下拉，Esc/点外关（target 归属守卫，20260924-fix-capsule-self-close 先例）恒可收；原「下拉 ⇄ 停靠」双形态与底部 Dock（`components/dock/` 已删除）一并退役——控制中心承接全部聚合职责，**不设第二聚合点**。**chip 解剖（不变）**：26px 药丸 ghost 态 + 微进度环（SVG 14px：空闲空心/primary 进度弧/in_progress 旋转亮弧（持续状态指示非过渡动效，reduced-motion 静态）/success 满环）+ mono 语义色任务计数 + chevron。**控制中心面板 = 470px 浮笺卡**（radius 16 + 双投影 + 折角，`overflow:hidden` 弹性列：头部+磁贴固定、`Sections` 滚动）：头部 = 「控制中心」+ 工作区·分支 mono（`getWorkspace`/`gitStatus` 随开合拉取）；上部**磁贴网格 4×2**（方印图标 radius 7px 禁圆形；激活态朱底方印 + 右上状态点 + 1.5px 朱边 + `aria-pressed`）：即时渲染（`toggleRender` 词表）/大纲跟随（editor-state 总线 `outlineFollow`）/专注模式（`toggleFocus` 词表）/图床·oss（`setSettings` uploadMode 切换）/主题/外观/语言（ThemeProvider·LocaleProvider 单击轮转）/查找替换（`findReplace` 词表）；下部**功能分区**：任务（TaskCenterBody 时间线 + 筛选 chips + 「清空已完成」= 壳层唯一允许的写操作（remove 隐藏条目，不改状态））/ GIT（`gitStatus/gitCommit/gitPush` IPC + 行内提交输入，Esc stopPropagation 防误关面板）/ 排版（字号 ± 步进 12–18 钳制，经 editor-state 总线持久化 wd.editorTypography）/ 编辑器分区（EditorSection 瘦身版：文档卡 + 格式网格 + 排版/快捷键/导出手风琴 + 大纲；开关磁贴已上收）/ 插件模块（capsule modules 贡献 tiles）/ **插件 capsule tabs → 追加分区**（D4 假定 a：声明制契约不变——manifest `tabs` + `wuh.capsule.updateTab` 上报，sections/rows 经 `parseTabSections` 渲染，仅渲染形态由 tab 降为分区）。面板内 API 调用一律 `window.api?.` 可选链（测试环境无宿主）。**chip 细节沿袭（20260924 微进度环重设计）**：ghost 态——header 上默认透明底无边框，hover/面板展开浮起 chrome-raised 药丸 + elevation-card 阴影；标签任务态整串 mono 语义色（进行中=primary、全完成=success）`任务 {done}/{total}`，空态「就绪」/编辑器入口 sans 次级色；chevron 开合旋转 180°（150ms，reduced-motion 关）。**任务分区 = 任务中心（多插件并发任务的集散地）**；**插件 capsule tab 贡献点（20260925-feature-capsule-plugin-tab 起，声明制；20261017 起渲染为控制中心追加分区，tab 结构退役）**：manifest 顶层 `tabs: [{id,title,icon}]`（每插件 ≤1，validateManifest 校验），运行时逻辑帧经 SDK `wuh.capsule.updateTab(id, { sections })` 上报结构化内容（sections[{title?,rows[{icon?,text,detail?,tone?,viewId?}]}]，护栏 ≤3 sections × ≤8 rows、序列化 ≤4KB、row.icon 白名单、row.viewId 须为本插件 main 视图——严格 typeof 校验在 `lib/capsule.ts` 注册表）、`removeTab` 隐藏；注册表 tab key = `plugin:<pid>:<tid>`（对齐 pluginPanelKey），声明注册默认 hidden（不出分区）、非 git 目录「失败不打扰」静默隐藏；被 `removeTab` 移除后分区消失，空 sections 显示「暂无数据」（`capsule.tabEmpty` 三语）；内容为通用 sections/rows 渲染器（分区间 border-top、行 = tone 色点/白名单图标 + mono 文本 + detail，含 viewId 整行可点跳 `/plugin/<id>/<view>` 并关面板）；tab 标题来自 manifest（不进壳层 i18n）；帧服务方法 `capsule.updateTab/removeTab` 走既有 capsule 帧服务（主进程 broker 不参与），三方同步 = shared/plugin.ts 类型 ↔ SDK 字符串（`src/plugin-sdk/index.ts`；protocol.ts 仅负责下发）↔ PluginFrameHost 裁决；任务 tab = **单流时间线**——左缘 2px 脊线（Rail）串状态标（pending 空心 / in_progress 旋转环 + 脊线段 primary 脉动 / done 对勾，圆形底色遮断脊线成珠串），排序 进行中（updatedAt 倒序）→ 待处理（createdAt 倒序）→「最近完成」（doneAt 倒序，置灰 65%）；行 = 状态标 + 标题 + 来源插件徽标（mono pill）+ 进度（细条 + n/m mono）+ detail + 相对时间（自算 s/m/h，禁 `toLocaleString`）；viewId 行整行可点跳来源视图。头部 = 聚合进度条（全完成转 success）+ mono 计数；筛选 chips（全部/未完成/已完成，`aria-pressed`）+ 插件 pill（≥2 插件有任务才出现）；空态分「等待插件任务」/「无匹配任务」；**「清空已完成」= 壳层唯一允许的写操作（remove 隐藏条目，不改状态）**；面板开着时新行 150ms 淡入（reduced-motion 关）。编辑器工具条 IconRow **横密纵疏**（column-gap 2px / row-gap 6px，20260924-fix-capsule-header-chrome——`gap` 横纵共用曾致换行工具条贴死）；模块卡基础件 `ModuleRow`（排版/快捷键手风琴行）纵向 margin **6px**（20260925-feature-sidemenu-settings-consolidation——曾 `margin: 0 4px` 致上下堆叠卡在子面板收起时贴死无间距）。

**渲染层事件总线 events 扩展点（2026-09-24 起）**：`lib/events.ts` 纯逻辑模块，与 statusItems/floats/tasks 同构（快照 = 最近 200 条环形缓冲 + `commit()` 产新引用 + useSyncExternalStore；订阅表是路由态不进快照）。插件帧经 SDK `wuh.events.publish/subscribe/unsubscribe` 走帧协议 `events` 服务（`PluginFrameHost.handleFrameInvoke` 渲染层裁决，**主进程 broker 不参与**）：**信封 `{ id, type, pluginId, payload, ts }`，pluginId 由宿主按帧身份盖章（调用方不可冒名）**；插件事件名强制 `<pluginId>:<name>` 命名空间（`[a-z0-9][a-z0-9._-]{0,63}`）；宿主内转事件可发系统级类型（如 tasks 服务写穿后发 `tasks:upsert`/`tasks:remove`，信封归属 = 任务所属插件）。订阅模式：精确类型 / `<ns>:*` 前缀通配 / `*` 全通配，每插件 ≤16 个模式（去重不占额）；投递经 `onAnyEvent` 钩子（`wireHostOnce` 接线）按 `subscribersFor(type)` 推送订阅插件的**全部帧**（`{kind:'event', name:'event', payload:信封}`，SDK `wuh.on('event', cb)` 接收）。护栏：payload 须可 JSON 序列化且 ≤4KB。插件停用清订阅 + 清其缓冲事件。测试 `tests/events.test.ts`。

**tasks 任务贡献点（2026-09-24 起事件溯源，manifest 声明制退役为可选预置）**：manifest `tasks` 仍是合法来源（bootstrap/启用注册，默认 pending，可带 viewId 跳转，每插件 ≤8），但不再是唯一来源——**运行时对未声明 id 首报带 title（1-80 字符）的 upsert 即动态创建**（任意插件随时触发任务展示的集散地入口；缺 title 报错）。SDK `wuh.tasks.upsert(id, patch)/remove(id)` 契约：patch 可含 title（仅创建首报生效，已存在任务携带 title 拒绝）/status（`pending|in_progress|done`）/progress（`{current,total}`，**严格 typeof number 校验**——帧消息来自 postMessage 不可用 `Number()` 宽转）/detail；声明任务 id/title/viewId 运行时不可变；**每插件并发可见任务 ≤8**（remove 隐藏腾位后可再建，注册表裁决）；`lib/tasks.ts` 任务增加 `declared/createdAt/updatedAt/doneAt` 字段（时间线排序与相对时间用）。注册表与 statusItems/floats 同构（commit() 产新引用 + useSyncExternalStore + getServerSnapshot 第三参）。插件停用清空、启用重注册。参考生产者：github-issues 发布流（逻辑帧内上报，失败回 pending + detail 原因）；git-history 状态流（20260924-feature-git-history-capsule 起，逻辑帧常驻上报 status 模板「分支 · N 未提交」，doc.saved/opened 与 workspace 事件驱动刷新，非 git 目录失败静默保持隐藏）。

**插件状态项 = manifest 声明 + 运行时更新**：manifest `statusItems`（id 限 `[a-z0-9][a-z0-9._-]*`、icon 白名单、text 必填、alignment 默认 right、order 默认 100、每插件 ≤4 项）；SDK `wuh.statusBar.update(id, patch)/remove(id)` 走帧协议 `statusBar` 服务，由渲染层宿主（`components/plugins/PluginFrameHost.tsx` 的 `handleFrameInvoke`）直接裁决，**主进程 broker 不参与**；注册表 `lib/statusItems.ts` 为纯逻辑模块（useSyncExternalStore 快照模式）。插件只能 update/remove 自己声明过的项；icon/alignment/order 运行时不可变；插件停用清空、启用重注册。

**CSP 与窗口 chrome（2026-09-21 起）**：CSP 由 `app/layout.tsx` 的 `<meta http-equiv>` 承载（导出模式 headers() 不可用）——`default-src 'self'` + `script-src 'self' 'unsafe-inline'`（Next 导出 flight 内联数据必需，dev 追加 `'unsafe-eval'`，React 开发模式需要）+ `frame-src plugin:`（插件沙箱帧）+ `img-src local-resource:`。窗口不显示系统菜单栏（主进程 `win.setMenu(null)`；应用菜单仅保留编辑快捷键角色 undo/redo/cut/copy/paste/selectAll + dev 的 reload/toggleDevTools）。

## 执行约束

- 业务代码禁止裸 `import ... from 'lucide-react'`，一律从 `components/icons` 取 `Icon*`；新图标先进注册表再使用。
- 组件样式用 styled-components + 主题 token（`chrome-*`/`primary-*`/语义 token）；四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`（**Rail/上下文面板/Dock/命令面板/专注浮条的交互过渡全部补静态降级**，20261015）；**进度类填充一律 `transform: scaleX` 而非 width 过渡**（20260927-fix-shell-ux-defects 起全仓统一，CapsulePanel HeadBarFill 即范）。
- **键盘焦点统一规范（20260927-style-shell-visual-consistency 起）**：一律 `outline: 2px solid var(--primary-color); outline-offset: -2px`（Button 基类、列表行、Picker、大纲条目同款）——禁再引入 box-shadow 光环变体或 1px offset。
- **圆角/字号散值禁新增（20260927-style-shell-visual-consistency 起）**：圆角走 token scale（2/4/8/12/16，999 药丸与 50% 圆点除外）；字号禁半 px 值（10.5/11.5/12.5 已清零归整）。
- 品牌标书写动效属**入场型展示动画**（非过渡）：单笔 400ms（token `--motion-dur-write`）+ stagger，总长 ≤900ms，mount 播放一次，`prefers-reduced-motion: reduce` 下必须直接渲染静态终态；仅 `animated` prop 显式开启。
- 品牌/ Dock 图标几何改动必须同步 `components/icons/brand.tsx` 与 `build/icon.svg`（含亮/暗变体 token 表），并重跑 `build:icon` 重新提交产物（png/ico/icns）；`tests/icon-build.test.ts` 校验同源几何、产物尺寸、ico 容器结构与重跑可复现。
- 应用版本号与构建时间戳经 `next.config.ts` 的 `env.NEXT_PUBLIC_APP_VERSION` / `env.NEXT_PUBLIC_BUILD_TIME` 构建期内联（消费方读 `process.env`，格式化统一走 `lib/buildInfo` 的确定性 UTC 输出——禁 `toLocaleString`，避免 SSR/客户端 locale 差异 hydration mismatch），不得新增 preload/broker 通道消费版本。构建时间戳展示于设置页「关于」（原快捷面板版本行随 SideMenu 退役）（dev 下 = dev 服务器启动时刻，build 下 = 构建时刻；显示值与当前会话对不上 = 渲染层旧页面，即僵尸实例检测）。
- 插件可见性 API 扩展遵循「声明制优先」：先加 manifest schema + `validateManifest` 校验 + `tests/plugin-manifest.test.ts` 用例，运行时 API 只能操作声明过的资源。**例外（2026-09-24 起）**：tasks 动态创建与 events 总线为**护栏制**（运行时校验 + 数量/体积上限，见事件总线与 tasks 段）；statusBar/capsule 模块仍声明制。
- `statusItems.ts` 变更后必须 `commit()` 产出新 state 引用（快照订阅依赖引用变化）；`floats.ts`、`tasks.ts`、`events.ts` 同构同理。
- 胶囊动效（旋转亮弧/旋转环/时间线脊线脉动）属**持续状态指示**，不适用 150-300ms 过渡规则；`prefers-reduced-motion: reduce` 下必须静态降级。壳层不得反向修改任务状态（单一写方 = 插件 SDK）；**唯一例外 = 任务中心「清空已完成」**（remove 隐藏条目，不改状态）。壳层胶囊挂点契约（TitleBar 右侧垂直居中、面板贴 chip 下缘弹出、层叠等价换算、单形态开合）见壳层胶囊段——移动挂点或调整层级必须整段同步。
- **z 分带实际值（20261018 书脊案面修订，实施为准）**：浮窗 ≤58 / rail tooltip 60 / rail popover 62 / 胶囊面板（控制中心）70 / **目次·书耳浮笺 30（Body 内 absolute slip-card）** / **命令面板 palette 85（Toast 90 下、Dialog 100 下）** / Toast 90 / Dialog 100。Dock 带（25）随 Dock 退役移除。新增浮层先归带再实现，禁止无限递增（浮窗 floatZIndex 钳制先例）。
- **壳层 chrome 元素必须带 `data-chrome` 稳定属性**（TitleBar/Rail/目次浮笺（ContextPanel）/StatusBar 四处——Dock 随 D5 退役移出清单；专注模式退场与自动化断言唯一锚点，禁用元素选择器——编辑页 PageShell 与首页卡片都是 `section`，曾是白屏级缺陷，20261015 review 修复）。
- 主区禁止硬编码插件视图容器；新增视图区域一律走 manifest `views.area` 声明（`main` | `float` | `dock` | `context`，20261015 扩展；dock/context 每插件各 ≤1 容量护栏在 `validateManifest`，运行时上报经帧服务 `panelTabs` + `lib/panelTabs` 注册表——声明制，见 [插件系统架构卡片](plugin-architecture.md)）。
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
- [UI 反馈提示系统（Toast / Message / Alert）](ui-feedback.md)
