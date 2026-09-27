---
title: 壳层 chrome 设计与插件扩展点
domain: renderer-ui
keywords: [图标注册表, AppIcon, Icon, ActivityBar, StatusBar, 状态栏, statusItems, 徽标, 插件贡献点, 主题 token, 浮窗层, FloatLayer, float 贡献点, SDK 注入]
scope: [src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts, src/plugin-sdk, src/main/plugins]
status: active
source:
  - changes/20260917-feature-shell-chrome-plugin-api/brief.md
  - changes/20260918-feature-shell-float-layer/brief.md
verified: 2026-09-27
---

# 壳层 chrome 设计与插件扩展点

## 当前结论

**图标体系**（对齐 x.wuh.site `packages/components/icons` 模式）：`components/icons/index.tsx` 集中注册表按 UI / Status / Plugin（manifest 图标白名单映射）/ Brand（自绘 `IconLogo`、`IconDiamond`，见 `brand.tsx`）分组导出 `Icon*`；渲染统一走 `<AppIcon>`，场景规格：chrome/面板 16px（md）、工具栏 14px（sm）、正文内联 12px（xs）、强调 20/24；描边 ≤14px 用 2、>14px 用 1.75（24 网格）。

**ActivityBar**：48px rail、左缘 2px 激活指示条（`::before`）、`ActivityItem.badge` 徽标位（数字 99+ 折叠 / `dot` 圆点）、`tailItems` 底部分组（设置固定底部）、`data-tip` 自绘 tooltip（hover 与 `:focus-visible` 均可见）+ `aria-label`；再点当前面板图标折叠/展开侧栏。

**StatusBar**：`components/StatusBar.tsx` 左右分区——左区 = 当前文件路径 + git 分支(↑↓) + 插件 `left` 项；右区 = 光标行列 + 字数（store 的 `cursor`/`wordCount`，由 CodeMirrorEditor `updateListener` 上报，CJK 字符逐字计 + 非 CJK 词计）+ 插件 `right` 项 + 未保存态。

**插件状态项 = manifest 声明 + 运行时更新**：manifest `statusItems`（id 限 `[a-z0-9][a-z0-9._-]*`、icon 白名单、text 必填、alignment 默认 right、order 默认 100、每插件 ≤4 项）；SDK `wuh.statusBar.update(id, patch)/remove(id)` 走帧协议 `statusBar` 服务，由渲染层宿主（`PluginFrameHost.handleFrameInvoke`）直接裁决，**主进程 broker 不参与**；注册表 `plugins/statusItems.ts` 为纯逻辑模块（useSyncExternalStore 快照模式）。插件只能 update/remove 自己声明过的项；icon/alignment/order 运行时不可变；插件停用清空、启用重注册。

**浮窗层与 `float` 贡献点**：`views.area` 取值 `'sidebar' | 'float'`（`preview` 已废弃——固定预览分栏移除，编辑区占满 work-area）。float 视图 = 按需浮窗：内核 `components/FloatLayer.tsx` 渲染窗口（头部拖拽、边缘/角缩放、最小化角落 chip、Esc 关闭聚焦浮窗、z 序焦点管理），窗口态在 `plugins/floats.ts` 注册表（useSyncExternalStore 快照模式同 statusItems，几何按视口钳制、cascade 多开）。ActivityBar 为 float 视图自动生成 toggle 项：`ActivityItem.checked` 提供时激活指示跟随开合而非面板选中。

**视图帧 SDK 注入契约**：插件视图 HTML **不手写 SDK 引用**——主进程 `plugins/protocol.ts` 对 plugin:// 下发的 text/html 响应自动注入 `<script src="/@core/sdk.js">`（`injectSdkScript`，head 起始、幂等，classic 脚本先于帧内 module 执行）；logic 帧仍由 `logic-host.html` 显式 import。渲染层 CSP（`src/renderer/index.html`）必须包含 `frame-src plugin:`，否则插件帧 `ERR_BLOCKED_BY_CSP`。

## 执行约束

- 业务代码禁止裸 `import ... from 'lucide-react'`，一律从 `components/icons` 取 `Icon*`；新图标先进注册表再使用。
- 新增 chrome UI 必须用主题 token（`chrome-*`/`primary-*`），四主题 × 亮暗逐 token 校验；动效 150-300ms ease-out 并响应 `prefers-reduced-motion`。
- 插件可见性 API 扩展遵循「声明制优先」：先加 manifest schema + `validateManifest` 校验 + `tests/plugin-manifest.test.ts` 用例，运行时 API 只能操作声明过的资源。
- `statusItems.ts` / `floats.ts` 变更后必须 `commit()` 产出新 state 引用（快照订阅依赖引用变化）。
- 按需展示的新内容区域一律走 `float` 贡献点进浮窗层，禁止在 work-area 新增固定分栏。
- 插件视图 HTML 禁止手写 SDK script 标签（协议层自动注入，重复引用由 `injectSdkScript` 幂等兜底）。

## 适用边界

适用于渲染层壳层 chrome 与插件贡献点契约。站点 web 端（x.wuh.site）的 icons 分组模式同源但代码不同库（桌面端为 lucide-react + 自绘 brand）。不适用于插件沙箱帧内部 UI。

## 验证方式

- `grep "from 'lucide-react'" src/renderer/src` 排除 `components/icons` 应为空。
- `vitest run tests/plugin-manifest.test.ts tests/plugin-statusitems.test.ts`。
- `pnpm dev` 四主题 × 亮暗走查：指示条/徽标/tooltip、状态项声明与运行时增删、键盘遍历。

## 关联知识

- [Renderer 壳层双层路由约定](renderer-shell-routing.md)
