---
title: 壳层 chrome 设计与插件扩展点
domain: renderer-ui
keywords: [图标注册表, AppIcon, Icon, SideMenu, 菜单栏, 两栏布局, StatusBar, 状态栏, statusItems, 徽标, 插件贡献点, 主题 token, 品牌标, IconLogo, Dock 图标, 应用图标, ico, 任务栏, 浮窗, FloatLayer, float, main, toggle, styled-components]
scope: [app, components, lib, src/shared/plugin.ts, src/plugin-sdk, build, scripts]
status: active
source:
  - changes/20260917-feature-shell-chrome-plugin-api/brief.md
  - changes/archive/20260919-feature-brand-icon-redesign/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
  - changes/20260920-feature-shell-two-column-layout/brief.md
  - changes/20260921-feature-app-icon-wiring/brief.md
  - changes/20260921-refactor-renderer-nextjs/brief.md
verified: 2026-09-21
---

# 壳层 chrome 设计与插件扩展点

## 当前结论

**样式载体（2026-09-21 起）**：组件样式一律 **styled-components**（Next `compiler.styledComponents: true`，与 x.wuh.site/apps/site 同因同配）；主题 token 仍是 `:root` CSS 变量 + `data-theme-family`/`data-color-scheme` 属性路由（`components/theme/tokens.ts` 构建期注入 `<style id="wd-theme-vars">`，机制未变），styled 内直接 `var(--token)` 引用。`app/globals.css` 只保留全局地基：字体 @font-face（`app/fonts/*.woff2`）、html/body 基座、滚动条、品牌标书写动效键帧。styled 类名是哈希，**自动化/测试不得依赖类名选择器**——用 aria/role/`data-*` 稳定属性。

**图标体系**（对齐 x.wuh.site `packages/components/icons` 模式）：`components/icons/index.tsx` 集中注册表按 UI / Status / Plugin（manifest 图标白名单映射）/ Brand（自绘 `IconLogo`、`IconDiamond`，见 `brand.tsx`）分组导出 `Icon*`；渲染统一走 `<AppIcon>`，场景规格：chrome/面板 16px（md）、工具栏 14px（sm）、正文内联 12px（xs）、强调 20/24；描边 ≤14px 用 2、>14px 用 1.75（24 网格）。

**品牌标（2026-09 重绘）**：`IconLogo` = W 字母标（两个圆头 V，120 网格几何 `M12 16 L27 44 L42 16` + `M42 16 L57 44 L72 16`，stroke 6）+ primary 双条点缀（x84 起 w24/w15）；`build/icon.svg` 为 Dock 图标 master（1024 网格、824/185 圆角方底，同一几何 ×7 平移映射），两者几何参数互相注释锚定，**改动任一处必须同步另一处**。`scripts/build-icon.mjs`（npm script `build:icon`，devDep `@resvg/resvg-js`）从 master 栅格化 `build/icon.png`（1024）+ `icon-light.png`（`--variant light`，按 svg 头部注释的 token 整串替换）+ macOS `iconutil` 合成 `build/icon.icns` + **`build/icon.ico`（Windows，2026-09-21 起）**：`buildIco` 组包 ICONDIR+ICONDIRENTRY，16–256 七档 PNG 压缩条目（Vista+ 全支持，256 记 0），随 dark 变体产出。electron-builder 直接取 `build/icon.icns`（mac）；win 段 `win.icon: build/icon.ico`——显式 icon 路径按 roots=[buildResourcesDir, projectDir] 双根依次解析，`build/icon.ico` 命中项目根。生成产物（png/ico/icns）随仓库提交，保证干净克隆可打包。**dev 窗口/任务栏图标**：`BrowserWindow` 设 `icon = app.getAppPath()/build/icon.png` + `existsSync` 守卫（打包后 build/ 不进 asar，窗口/任务栏图标由 exe 资源 win.icon/icns 承担）。壳内展示落点：**左栏 SideMenu 底部用户占位区**（静态小尺寸）与设置页「关于」区块（`animated` prop 开启书写动效 + `NEXT_PUBLIC_APP_VERSION` 构建期内联版本）。

**SideMenu（2026-09-20 起，取代 ActivityBar）**：左栏菜单栏，两形态**瞬时切换**（禁 width 过渡，ui-patterns 布局位移动画禁令）——收起 = 48px 图标 rail，展开 = 220px 图标+文字（label 仅 opacity 淡入 200ms）。能力沿袭：左缘 2px 激活指示条（`::before`）、徽标位（数字 99+ 折叠 / `dot` 圆点，展开态转行内）、`data-tip` 自绘 tooltip（**仅收起态**显示，hover 与 `:focus-visible` 可见）+ `aria-label`、toggle 型 item（`toggleItems`/`openToggleKeys`/`onToggle`，激活态=浮窗打开 `aria-pressed`，区别于菜单选中态 `aria-current="page"`）。结构：顶部**直接是导航项**（首页 + 插件 main 视图）→ toggle 组（浮窗开关）→ **底部系统区**（`margin-top:auto` 吸附左下）：**仅用户入口**（`IconLogo` 头像占位 + 应用名/版本）。**展开/收起控件不占 rail 位置**——入口在用户快捷面板内（`⌘/Ctrl+B` 常驻快捷键）；低频 chrome 控件不占导航黄金位。

**用户入口与快捷面板（2026-09-21 起，合并旧「设置项 + 品牌占位区」两栏）**：底部唯一入口 = 品牌标（头像占位）+ 应用名/版本；**点击**进入设置页（用户模块接入前的替身，`userActive` 命中 `/settings` 时高亮），**悬停/键盘聚焦**弹出 `UserQuickPanel`（`role="menu"`）：主题（酒红/素雅，`menuitemradio`）、外观（浅色/深色）、语言（中文占位禁用——i18n 未接入不造假入口）、**收起/展开菜单**（带 `⌘/Ctrl+B` 快捷键提示）、设置。面板定位 `left: calc(100% + 8px)` 贴入口右侧，延迟 180ms 关闭以允许指针移入；Esc 关闭；**Nav 不得设 `overflow: hidden`**（会裁剪面板与 tooltip）。

**预留通知条（2026-09-21 起）**：壳层顶部原「标题栏」内容（应用标题 + 外观菜单）已清空，保留 44px 空条作为**更新通知 / 紧急通知**的预留位（`aria-label="通知栏"` + `aria-live="polite"`，当前无内容）。主题切换入口唯一落在左栏用户快捷面板；`AppearanceMenu` 组件已删除。

**浮窗层与 floats 注册表（2026-09-18 起）**：插件视图区域为 `views.area: 'main' | 'float'`（preview 分栏与 sidebar 侧栏均已移除；`sidebar` 声明被 validateManifest 拒绝并指引迁移 main），float 视图经 `FloatLayer`（`components/FloatLayer.tsx`）以浮窗形态按需唤起——头部拖拽、8 向缩放、点按置顶、最小化为左下角 chip（帧保持挂载，整窗 display:none）、Esc 关闭最顶层未最小化浮窗（确认框打开时让位——用 `[data-dialog-overlay]` 稳定属性判定，styled 类名是哈希）。状态注册表 `lib/floats.ts` 为纯逻辑快照模块（与 statusItems 同构：`commit()` 产新引用 + useSyncExternalStore）；开合与几何是**进程内状态**。**FloatLayer 常驻右栏 main 容器**：浮窗与右栏页面（Home/设置/插件 main 视图）共存，切换页面不再卸载浮窗，几何视口 = main 容器。浮窗内容复用 `PluginView` 帧宿主（plugin:// 沙箱协议不变）。

**StatusBar（2026-09-20 起为纯壳层骨架）**：左右分区仅承载插件 statusItems；编辑器相关分区（文件路径/光标行列/字数/未保存）与 git 分支徽标已随内置编辑器移除。

**插件状态项 = manifest 声明 + 运行时更新**：manifest `statusItems`（id 限 `[a-z0-9][a-z0-9._-]*`、icon 白名单、text 必填、alignment 默认 right、order 默认 100、每插件 ≤4 项）；SDK `wuh.statusBar.update(id, patch)/remove(id)` 走帧协议 `statusBar` 服务，由渲染层宿主（`components/plugins/PluginFrameHost.tsx` 的 `handleFrameInvoke`）直接裁决，**主进程 broker 不参与**；注册表 `lib/statusItems.ts` 为纯逻辑模块（useSyncExternalStore 快照模式）。插件只能 update/remove 自己声明过的项；icon/alignment/order 运行时不可变；插件停用清空、启用重注册。

**CSP 与窗口 chrome（2026-09-21 起）**：CSP 由 `app/layout.tsx` 的 `<meta http-equiv>` 承载（导出模式 headers() 不可用）——`default-src 'self'` + `script-src 'self' 'unsafe-inline'`（Next 导出 flight 内联数据必需，dev 追加 `'unsafe-eval'`，React 开发模式需要）+ `frame-src plugin:`（插件沙箱帧）+ `img-src local-resource:`。窗口不显示系统菜单栏（主进程 `win.setMenu(null)`；应用菜单仅保留编辑快捷键角色 undo/redo/cut/copy/paste/selectAll + dev 的 reload/toggleDevTools）。

## 执行约束

- 业务代码禁止裸 `import ... from 'lucide-react'`，一律从 `components/icons` 取 `Icon*`；新图标先进注册表再使用。
- 组件样式用 styled-components + 主题 token（`chrome-*`/`primary-*`/语义 token）；四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`；左栏展开收起必须瞬时（禁 width/布局位移过渡）。
- 品牌标书写动效属**入场型展示动画**（非过渡）：单笔 400ms（token `--motion-dur-write`）+ stagger，总长 ≤900ms，mount 播放一次，`prefers-reduced-motion: reduce` 下必须直接渲染静态终态；仅 `animated` prop 显式开启。
- 品牌/ Dock 图标几何改动必须同步 `components/icons/brand.tsx` 与 `build/icon.svg`（含亮/暗变体 token 表），并重跑 `build:icon` 重新提交产物（png/ico/icns）；`tests/icon-build.test.ts` 校验同源几何、产物尺寸、ico 容器结构与重跑可复现。
- 应用版本号经 `next.config.ts` 的 `env.NEXT_PUBLIC_APP_VERSION` 构建期内联（消费方读 `process.env.NEXT_PUBLIC_APP_VERSION`），不得新增 preload/broker 通道消费版本。
- 插件可见性 API 扩展遵循「声明制优先」：先加 manifest schema + `validateManifest` 校验 + `tests/plugin-manifest.test.ts` 用例，运行时 API 只能操作声明过的资源。
- `statusItems.ts` 变更后必须 `commit()` 产出新 state 引用（快照订阅依赖引用变化）；`floats.ts` 同构同理。
- 主区禁止硬编码插件视图容器；新增视图区域一律走 manifest `views.area` 声明（`main` | `float`）。
- 任何 `useSyncExternalStore` 必须传第三参 `getServerSnapshot`（Next 静态导出预渲染硬要求）；插件帧的 `PluginView` 与浮窗层均在客户端组件内（'use client'）。

## 适用边界

适用于渲染层壳层 chrome、品牌标与插件贡献点契约。站点 web 端（x.wuh.site）的 icons 分组模式与 styled-components 载体同源；桌面端品牌标 2026-09 起与站点端有意分叉，站点端跟进重绘须另行变更。不适用于插件沙箱帧内部 UI。

## 验证方式

- `grep -rn "from 'lucide-react'" components app` 排除 `components/icons` 应为空。
- `pnpm test`（含 `tests/plugin-manifest.test.ts`、`tests/plugin-statusitems.test.ts`、`tests/plugin-assets.test.ts`、`tests/icon-build.test.ts`、`tests/theme.test.ts`）；icon 用例覆盖设计源几何、PNG 尺寸、ico 容器结构与脚本重跑字节可复现（需 devDep `@resvg/resvg-js` 已安装）。
- `pnpm dev` 四主题 × 亮暗走查：左栏展开/收起（瞬时 + label 淡入 + tail 组吸附左下）、指示条/徽标/tooltip（仅收起态）、右栏 Home ↔ 设置 ↔ 插件 main 切换、浮窗 toggle/拖拽/缩放/最小化 chip/Esc/多开与页面切换后共存、状态项声明与运行时增删、键盘遍历、设置页「关于」区块动效与 reduced-motion 降级。
- `pnpm dist` 产物应由 `app://` 协议加载（Windows `dist/win-unpacked` 可验）；`pnpm dist:mac` 产物 .app 图标应为品牌 icns（mac 上 builder 优先取 `build/icon.icns`）。

## 关联知识

- [Renderer 壳层两栏布局与 App Router 路由约定](renderer-shell-routing.md)
