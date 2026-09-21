---
title: 壳层 chrome 设计与插件扩展点
domain: renderer-ui
keywords: [图标注册表, AppIcon, Icon, SideMenu, 菜单栏, 两栏布局, StatusBar, 状态栏, statusItems, 徽标, 插件贡献点, 主题 token, 品牌标, IconLogo, Dock 图标, 浮窗, FloatLayer, float, main, toggle]
scope: [src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts, src/plugin-sdk, build, scripts]
status: active
source:
  - changes/20260917-feature-shell-chrome-plugin-api/brief.md
  - changes/archive/20260919-feature-brand-icon-redesign/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
  - changes/20260920-feature-shell-two-column-layout/brief.md
verified: 2026-09-20
---

# 壳层 chrome 设计与插件扩展点

## 当前结论

**图标体系**（对齐 x.wuh.site `packages/components/icons` 模式）：`components/icons/index.tsx` 集中注册表按 UI / Status / Plugin（manifest 图标白名单映射）/ Brand（自绘 `IconLogo`、`IconDiamond`，见 `brand.tsx`）分组导出 `Icon*`；渲染统一走 `<AppIcon>`，场景规格：chrome/面板 16px（md）、工具栏 14px（sm）、正文内联 12px（xs）、强调 20/24；描边 ≤14px 用 2、>14px 用 1.75（24 网格）。

**品牌标（2026-09 重绘）**：`IconLogo` = W 字母标（两个圆头 V，120 网格几何 `M12 16 L27 44 L42 16` + `M42 16 L57 44 L72 16`，stroke 6）+ primary 双条点缀（x84 起 w24/w15）；`build/icon.svg` 为 Dock 图标 master（1024 网格、824/185 圆角方底，同一几何 ×7 平移映射），两者几何参数互相注释锚定，**改动任一处必须同步另一处**。`scripts/build-icon.mjs`（npm script `build:icon`，devDep `@resvg/resvg-js`）从 master 栅格化 `build/icon.png`（1024）+ `icon-light.png`（`--variant light`，按 svg 头部注释的 token 整串替换）+ macOS `iconutil` 合成 `build/icon.icns`；electron-builder 直接取 `build/icon.icns`。生成产物（png/icns）随仓库提交，保证干净克隆可打包。壳内展示落点：**左栏 SideMenu 底部用户占位区**（静态小尺寸）与设置页「关于」区块（`animated` prop 开启书写动效 + `__APP_VERSION__` 构建期 define 版本）。

**SideMenu（2026-09-20 起，取代 ActivityBar）**：左栏菜单栏，两形态**瞬时切换**（禁 width 过渡，ui-patterns 布局位移动画禁令）——收起 = 48px 图标 rail，展开 = 220px 图标+文字（`.menu-label` 仅 opacity 淡入 200ms）。能力沿袭：左缘 2px 激活指示条（`::before`）、徽标位（数字 99+ 折叠 / `dot` 圆点，展开态转行内）、`data-tip` 自绘 tooltip（**仅收起态**显示，hover 与 `:focus-visible` 可见）+ `aria-label`、toggle 型 item（`toggleItems`/`openToggleKeys`/`onToggle`，激活态=浮窗打开 `aria-pressed`，区别于菜单选中态 `aria-current="page"`）。结构：顶部展开/收起钮（`IconPanelExpand`/`IconPanelCollapse`）→ 菜单项（首页 + 插件 main 视图）→ toggle 组（浮窗开关）→ tail（设置项 + `.menu-user` 用户占位区：IconLogo + 应用名 + `__APP_VERSION__`，非交互，无用户体系不造假入口）。

**浮窗层与 floats 注册表（2026-09-18 起）**：插件视图区域为 `views.area: 'main' | 'float'`（preview 分栏与 sidebar 侧栏均已移除；`sidebar` 声明被 validateManifest 拒绝并指引迁移 main），float 视图经 `FloatLayer`（`components/FloatLayer.tsx`）以浮窗形态按需唤起——头部拖拽、8 向缩放、点按置顶、最小化为左下角 chip（帧保持挂载，整窗 display:none）、Esc 关闭最顶层未最小化浮窗（确认框打开时让位）。状态注册表 `plugins/floats.ts` 为纯逻辑快照模块（与 statusItems 同构：`commit()` 产新引用 + useSyncExternalStore）；开合与几何是**进程内状态**。**2026-09-20 起 FloatLayer 常驻右栏 main-area**：浮窗与右栏页面（Home/设置/插件 main 视图）共存，切换页面不再卸载浮窗，几何视口 = main-area。浮窗内容复用 `PluginView` 帧宿主（plugin:// 沙箱协议不变）。

**StatusBar（2026-09-20 起为纯壳层骨架）**：左右分区仅承载插件 statusItems；编辑器相关分区（文件路径/光标行列/字数/未保存）与 git 分支徽标已随内置编辑器移除。

**插件状态项 = manifest 声明 + 运行时更新**：manifest `statusItems`（id 限 `[a-z0-9][a-z0-9._-]*`、icon 白名单、text 必填、alignment 默认 right、order 默认 100、每插件 ≤4 项）；SDK `wuh.statusBar.update(id, patch)/remove(id)` 走帧协议 `statusBar` 服务，由渲染层宿主（`PluginFrameHost.handleFrameInvoke`）直接裁决，**主进程 broker 不参与**；注册表 `plugins/statusItems.ts` 为纯逻辑模块（useSyncExternalStore 快照模式）。插件只能 update/remove 自己声明过的项；icon/alignment/order 运行时不可变；插件停用清空、启用重注册。

## 执行约束

- 业务代码禁止裸 `import ... from 'lucide-react'`，一律从 `components/icons` 取 `Icon*`；新图标先进注册表再使用。
- 新增 chrome UI 必须用主题 token（`chrome-*`/`primary-*`），四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`；左栏展开收起必须瞬时（禁 width/布局位移过渡）。
- 品牌标书写动效属**入场型展示动画**（非过渡）：单笔 400ms（token `--motion-dur-write`）+ stagger，总长 ≤900ms，mount 播放一次，`prefers-reduced-motion: reduce` 下必须直接渲染静态终态；仅 `animated` prop 显式开启。
- 品牌/ Dock 图标几何改动必须同步 `brand.tsx` 与 `build/icon.svg`（含亮/暗变体 token 表），并重跑 `build:icon` 重新提交产物；`tests/icon-build.test.ts` 校验同源几何、产物尺寸与重跑可复现。
- 应用版本号经 electron-vite renderer `define` 注入 `__APP_VERSION__`（构建期），不得新增 preload/broker 通道消费版本。
- 插件可见性 API 扩展遵循「声明制优先」：先加 manifest schema + `validateManifest` 校验 + `tests/plugin-manifest.test.ts` 用例，运行时 API 只能操作声明过的资源。
- `statusItems.ts` 变更后必须 `commit()` 产出新 state 引用（快照订阅依赖引用变化）；`floats.ts` 同构同理。
- 主区禁止硬编码插件视图容器；新增视图区域一律走 manifest `views.area` 声明（`main` | `float`）。

## 适用边界

适用于渲染层壳层 chrome、品牌标与插件贡献点契约。站点 web 端（x.wuh.site）的 icons 分组模式同源但代码不同库（桌面端为 lucide-react + 自绘 brand；桌面端品牌标 2026-09 起与站点端有意分叉，站点端跟进重绘须另行变更）。不适用于插件沙箱帧内部 UI。

## 验证方式

- `grep "from 'lucide-react'" src/renderer/src` 排除 `components/icons` 应为空。
- `vitest run tests/plugin-manifest.test.ts tests/plugin-statusitems.test.ts tests/plugin-assets.test.ts tests/icon-build.test.ts`（icon 用例覆盖设计源几何、PNG 尺寸与脚本重跑字节可复现；需 devDep `@resvg/resvg-js` 已安装）。
- `pnpm dev` 四主题 × 亮暗走查：左栏展开/收起（瞬时 + label 淡入）、指示条/徽标/tooltip（仅收起态）、右栏 Home ↔ 设置 ↔ 插件 main 切换、浮窗 toggle/拖拽/缩放/最小化 chip/Esc/多开与页面切换后共存、状态项声明与运行时增删、键盘遍历、设置页「关于」区块动效与 reduced-motion 降级。
- `pnpm dist:mac` 产物 .app 图标应为品牌 icns（mac 上 builder 优先取 `build/icon.icns`）。

## 关联知识

- [Renderer 壳层两栏布局与右栏路由约定](renderer-shell-routing.md)
