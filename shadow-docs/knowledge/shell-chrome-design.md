---
title: 壳层 chrome 设计与插件扩展点
domain: renderer-ui
keywords: [图标注册表, AppIcon, Icon, ActivityBar, StatusBar, 状态栏, statusItems, 徽标, 插件贡献点, 主题 token]
scope: [src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts, src/plugin-sdk]
status: active
source:
  - changes/20260917-feature-shell-chrome-plugin-api/brief.md
verified: 2026-09-18
---

# 壳层 chrome 设计与插件扩展点

## 当前结论

**图标体系**（对齐 x.wuh.site `packages/components/icons` 模式）：`components/icons/index.tsx` 集中注册表按 UI / Status / Plugin（manifest 图标白名单映射）/ Brand（自绘 `IconLogo`、`IconDiamond`，见 `brand.tsx`）分组导出 `Icon*`；字形为**自绘 chrome 图标集**（`chrome.tsx`：16 网格 viewBox、round 帽/圆角连接线框、站点菱形母题的 tag/sparkles；lucide-react 已从 renderer 移除）。渲染统一走 `<AppIcon>`，场景规格：chrome/面板 16px（md）、工具栏 14px（sm）、正文内联 12px（xs）、强调 20/24；描边口径沿用 24 网格习惯 ≤14px 传 2、>14px 传 1.75（chrome 集内部按 16/24 等比换算，视觉厚度一致）。标题栏左侧为 `IconLogo`（站点 logo 同源），非 CSS 圆点。

**ActivityBar**：48px rail、左缘 2px 激活指示条（`::before`）、`ActivityItem.badge` 徽标位（数字 99+ 折叠 / `dot` 圆点）、`tailItems` 底部分组（设置固定底部）、`data-tip` 自绘 tooltip（hover 与 `:focus-visible` 均可见）+ `aria-label`；再点当前面板图标折叠/展开侧栏。

**StatusBar**：`components/StatusBar.tsx` 左右分区——左区 = 当前文件路径 + git 分支(↑↓) + 插件 `left` 项；右区 = 光标行列 + 字数（store 的 `cursor`/`wordCount`，由 CodeMirrorEditor `updateListener` 上报，CJK 字符逐字计 + 非 CJK 词计）+ 插件 `right` 项 + 未保存态。

**插件状态项 = manifest 声明 + 运行时更新**：manifest `statusItems`（id 限 `[a-z0-9][a-z0-9._-]*`、icon 白名单、text 必填、alignment 默认 right、order 默认 100、每插件 ≤4 项）；SDK `wuh.statusBar.update(id, patch)/remove(id)` 走帧协议 `statusBar` 服务，由渲染层宿主（`PluginFrameHost.handleFrameInvoke`）直接裁决，**主进程 broker 不参与**；注册表 `plugins/statusItems.ts` 为纯逻辑模块（useSyncExternalStore 快照模式）。插件只能 update/remove 自己声明过的项；icon/alignment/order 运行时不可变；插件停用清空、启用重注册。

## 执行约束

- 业务代码禁止 import 任何图标实现（lucide-react 已从 renderer 移除），一律从 `components/icons` 取 `Icon*`；新图标先进 chrome 集/注册表再使用。
- 新增 chrome UI 必须用主题 token（`chrome-*`/`primary-*`），四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`。
- 插件可见性 API 扩展遵循「声明制优先」：先加 manifest schema + `validateManifest` 校验 + `tests/plugin-manifest.test.ts` 用例，运行时 API 只能操作声明过的资源。
- `statusItems.ts` 变更后必须 `commit()` 产出新 state 引用（快照订阅依赖引用变化）。

## 适用边界

适用于渲染层壳层 chrome 与插件贡献点契约。站点 web 端（x.wuh.site）的 icons 分组模式同源但代码不同库（桌面端为 lucide-react + 自绘 brand）。不适用于插件沙箱帧内部 UI。

## 验证方式

- `grep "lucide" src/renderer/src` 应为空（含 import 与注释残留）。
- `vitest run tests/plugin-manifest.test.ts tests/plugin-statusitems.test.ts`。
- `pnpm dev` 四主题 × 亮暗走查：指示条/徽标/tooltip、状态项声明与运行时增删、键盘遍历。

## 关联知识

- [Renderer 壳层双层路由约定](renderer-shell-routing.md)
