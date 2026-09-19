---
title: 壳层 chrome 设计与插件扩展点
domain: renderer-ui
keywords: [图标注册表, AppIcon, Icon, ActivityBar, StatusBar, 状态栏, statusItems, 徽标, 插件贡献点, 主题 token, 品牌标, IconLogo, Dock 图标]
scope: [src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts, src/plugin-sdk, build, scripts]
status: active
source:
  - changes/20260917-feature-shell-chrome-plugin-api/brief.md
  - changes/20260919-feature-brand-icon-redesign/brief.md
verified: 2026-09-20
---

# 壳层 chrome 设计与插件扩展点

## 当前结论

**图标体系**（对齐 x.wuh.site `packages/components/icons` 模式）：`components/icons/index.tsx` 集中注册表按 UI / Status / Plugin（manifest 图标白名单映射）/ Brand（自绘 `IconLogo`、`IconDiamond`，见 `brand.tsx`）分组导出 `Icon*`；渲染统一走 `<AppIcon>`，场景规格：chrome/面板 16px（md）、工具栏 14px（sm）、正文内联 12px（xs）、强调 20/24；描边 ≤14px 用 2、>14px 用 1.75（24 网格）。

**品牌标（2026-09 重绘）**：`IconLogo` = W 字母标（两个圆头 V，120 网格几何 `M12 16 L27 44 L42 16` + `M42 16 L57 44 L72 16`，stroke 6）+ primary 双条点缀（x84 起 w24/w15）；`build/icon.svg` 为 Dock 图标 master（1024 网格、824/185 圆角方底，同一几何 ×7 平移映射），两者几何参数互相注释锚定，**改动任一处必须同步另一处**。`scripts/build-icon.mjs`（npm script `build:icon`，devDep `@resvg/resvg-js`）从 master 栅格化 `build/icon.png`（1024）+ `icon-light.png`（`--variant light`，按 svg 头部注释的 token 整串替换）+ macOS `iconutil` 合成 `build/icon.icns`；electron-builder 直接取 `build/icon.icns`。生成产物（png/icns）随仓库提交，保证干净克隆可打包。壳内展示落点：设置页「关于」区块（`animated` prop 开启书写动效 + `__APP_VERSION__` 构建期 define 版本）。

**ActivityBar**：48px rail、左缘 2px 激活指示条（`::before`）、`ActivityItem.badge` 徽标位（数字 99+ 折叠 / `dot` 圆点）、`tailItems` 底部分组（设置固定底部）、`data-tip` 自绘 tooltip（hover 与 `:focus-visible` 均可见）+ `aria-label`；再点当前面板图标折叠/展开侧栏。

**StatusBar**：`components/StatusBar.tsx` 左右分区——左区 = 当前文件路径 + git 分支(↑↓) + 插件 `left` 项；右区 = 光标行列 + 字数（store 的 `cursor`/`wordCount`，由 CodeMirrorEditor `updateListener` 上报，CJK 字符逐字计 + 非 CJK 词计）+ 插件 `right` 项 + 未保存态。

**插件状态项 = manifest 声明 + 运行时更新**：manifest `statusItems`（id 限 `[a-z0-9][a-z0-9._-]*`、icon 白名单、text 必填、alignment 默认 right、order 默认 100、每插件 ≤4 项）；SDK `wuh.statusBar.update(id, patch)/remove(id)` 走帧协议 `statusBar` 服务，由渲染层宿主（`PluginFrameHost.handleFrameInvoke`）直接裁决，**主进程 broker 不参与**；注册表 `plugins/statusItems.ts` 为纯逻辑模块（useSyncExternalStore 快照模式）。插件只能 update/remove 自己声明过的项；icon/alignment/order 运行时不可变；插件停用清空、启用重注册。

## 执行约束

- 业务代码禁止裸 `import ... from 'lucide-react'`，一律从 `components/icons` 取 `Icon*`；新图标先进注册表再使用。
- 新增 chrome UI 必须用主题 token（`chrome-*`/`primary-*`），四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`。
- 品牌标书写动效属**入场型展示动画**（非过渡）：单笔 400ms（token `--motion-dur-write`）+ stagger，总长 ≤900ms，mount 播放一次，`prefers-reduced-motion: reduce` 下必须直接渲染静态终态；仅 `animated` prop 显式开启。
- 品牌/ Dock 图标几何改动必须同步 `brand.tsx` 与 `build/icon.svg`（含亮/暗变体 token 表），并重跑 `build:icon` 重新提交产物；`tests/icon-build.test.ts` 校验同源几何、产物尺寸与重跑可复现。
- 应用版本号经 electron-vite renderer `define` 注入 `__APP_VERSION__`（构建期），不得新增 preload/broker 通道消费版本。
- 插件可见性 API 扩展遵循「声明制优先」：先加 manifest schema + `validateManifest` 校验 + `tests/plugin-manifest.test.ts` 用例，运行时 API 只能操作声明过的资源。
- `statusItems.ts` 变更后必须 `commit()` 产出新 state 引用（快照订阅依赖引用变化）。

## 适用边界

适用于渲染层壳层 chrome、品牌标与插件贡献点契约。站点 web 端（x.wuh.site）的 icons 分组模式同源但代码不同库（桌面端为 lucide-react + 自绘 brand；桌面端品牌标 2026-09 起与站点端有意分叉，站点端跟进重绘须另行变更）。不适用于插件沙箱帧内部 UI。

## 验证方式

- `grep "from 'lucide-react'" src/renderer/src` 排除 `components/icons` 应为空。
- `vitest run tests/plugin-manifest.test.ts tests/plugin-statusitems.test.ts tests/icon-build.test.ts`（icon 用例覆盖设计源几何、PNG 尺寸与脚本重跑字节可复现）。
- `pnpm dev` 四主题 × 亮暗走查：指示条/徽标/tooltip、状态项声明与运行时增删、键盘遍历、设置页「关于」区块动效与 reduced-motion 降级。
- `pnpm dist:mac` 产物 .app 图标应为品牌 icns（mac 上 builder 优先取 `build/icon.icns`）。

## 关联知识

- [Renderer 壳层双层路由约定](renderer-shell-routing.md)
