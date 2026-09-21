---
{
  "schema": "shadow-dev/v1",
  "name": "20260921-feature-startup-splash-loading",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260921-feature-startup-splash-loading",
  "files": [
    "app/(shell)/layout.tsx",
    "app/layout.tsx",
    "components/ShellReady.tsx",
    "next.config.ts",
    "src/main/index.ts",
    "src/main/ipc.ts",
    "src/main/splash.html",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "tests/splash.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 23,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/23",
    "pullRequest": 25,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/25"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "68509aac5eca73622a8a63d0cd84a87850d8d952",
    "verifiedAt": "2026-09-21T23:23:11.064Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:25",
    "planHash": "18ae5b50ccbbedeff31fbfb1533387a4b6b11303d24fc8177f76b18fe81517c8",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "启动 Loading 页（splash 窗）——盖住首启闪屏并根治样式晚到",
      "body": "",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 启动 Loading 页（splash 窗）——盖住生产首启闪屏并根治样式晚到

## 动机

打包后（`pnpm dist` 产物）首次打开 App 闪屏：窗口创建即显示，生产路径直接 `loadURL('app://shell/index.html')`，静态 HTML 先上屏而样式（styled-components chunk、`globals.css`、主题 token attribute）后到，用户看到无样式乱序内容。需要开屏 Loading 页（品牌标 + 主题底色）优先展示，同时排查并根治「样式晚到」根因，缩短 Loading 页存活时间。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 渲染层为 Next App Router `output: 'export'`，产物 `dist/next/`，主进程经 `app://` 协议离线加载（`src/main/index.ts` 的 `resolveRendererFile`）；客户端组件一律 `'use client'`；验证走 `pnpm typecheck` + `pnpm test` + 生产路径 `pnpm exec electron .`
  - 适用 scope: app, components, lib, src/main（启动加载路径）
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 样式载体 styled-components，主题 token 为 `:root` CSS 变量 + `data-theme-family`/`data-color-scheme` 路由（`components/theme/tokens.ts` 构建期注入 `<style id="wd-theme-vars">`）；CSP 由 `app/layout.tsx` `<meta>` 承载；品牌标 `IconLogo` 120 网格几何与 `build/icon.svg` 互为同步锚点，改动须同步
  - 适用 scope: app, components, lib, src/main/splash.html（新增几何复制点）
- shadow-dev-workflow/norms/ui-patterns.md
  - 当前结论: 过渡动画 150-300ms ease-out；禁布局位移类动画；必须响应 `prefers-reduced-motion`；禁止硬编码颜色、亮暗双模式覆盖
  - 适用 scope: splash 窗显隐与切换动效
- shadow-dev-workflow/norms/interaction.md
  - 当前结论: 异步操作显示加载态，操作需即时反馈
  - 适用 scope: 启动期反馈（splash 即现）

## 决策

- **选型:** 方案 A——独立 splash 窗 + 就绪信号切换 + 根因排查修复。
- **对比方案:** B（单窗口纯时序修复 `show:false`+`ready-to-show`）无法提供品牌 Loading 页且根因不修时治标有限；C（纯根治）不满足 Loading 页诉求且加载慢时用户直面空白窗。A 的根治子项吸收 C，时序修复吸收 B。
- **理由:** splash 保证体验下限（无论根因是否修干净都不露乱序内容），根因修复缩短 splash 存活时间；CSP 零耦合（splash 为独立文档）。
- **splash 载体:** `src/main/splash.html` 经 vite `?raw` 内嵌进 main bundle，运行时 `data:` URL 加载——规避 build/ 目录打包后不进 asar 的分发坑（knowledge 已载）。
- **splash 颜色:** 独立文档无法消费壳层 CSS 变量，使用与主题 token 同值的静态色 + 注释锚点声明来源（如 `/* sync: tokens.ts --bg-* */`），记为规范特例；`prefers-color-scheme` 切亮暗双底色。
- **品牌标:** splash 内联 SVG 沿用 `brand.tsx` 120 网格双 V 几何，新增第三同步锚点（brand.tsx ↔ build/icon.svg ↔ splash.html），注释互锚。
- **切换:** 壳层 layout 挂载即发 `rendererReady` IPC；主进程收到后淡出销毁 splash（150-300ms ease-out，`prefers-reduced-motion` 直接切）并 show 主窗；**4s 超时兜底**防信号丢失卡死（实施细化：dev 路径需容忍 next dev 首编译 60s 等待，兜底放宽为 65s；prod 保持 4s）。
- **待确认点（已在 Phase 1 结案）:** Next 16.3.2 `experimental.inlineCss` 已确认存在（config-schema），纳入 Phase 3；`ThemeProvider.tsx` 新增一行防重复注入守卫——超出原文件清单，系首帧地基（layout 内联同 id 样式）的必要配套，见 Phase 1 结论。

## 任务

### Phase 1 根因排查（结论写回本文件，裁剪 Phase 3）
- [x] 构建产物检查：`pnpm build` 后检查 `dist/next/` 首页 HTML——styled-components 样式是否内联、`globals.css` 与 `<style id="wd-theme-vars">` 是否随首帧到达、`data-theme-*` attribute 初始值由谁设置 — `dist/next/`, `next.config.ts`, `app/layout.tsx`
- [x] 复现时序：`pnpm exec electron .` 加临时日志，确认乱序出现在 HTML 到达前 / CSS 到达前 / token 应用前哪一环 — `src/main/index.ts`

#### Phase 1 结论（2026-09-21 实证，探针已还原）

1. **产物**：导出 HTML 仅 1 个 `<link>` 外链 CSS、0 个内联 `<style>`、0 个 `data-theme-*` 属性——首帧完全无 token。
2. **时序**（暖启动）：`dom-ready`（可绘制）≈227ms、`finish-load`（CSS 到位）≈284ms、主题属性应用晚至 hydration 后 useEffect——乱序窗口 ≥300ms，冷启动更长。
3. **根因**：`ThemeProvider` 在 useEffect 内注入 `<style id="wd-theme-vars">` 并设 `data-theme-*`；导出静态 HTML 首帧两者皆无。
4. **Phase 3 裁剪执行**：inlineCss 纳入（Next 16.3.2 schema 已确认支持）；主题地基改为 layout 服务端内联 `buildThemeCss()` + `<html>` 预置默认主题 + pre-paint 内联脚本按 `wd.theme` 存储纠偏（CSP `script-src 'unsafe-inline'` 已放行）；`ThemeProvider.injectThemeCss` 加 DOM 存在性守卫防止重复注入（**清单外文件，一行配套改动**，不改动即双份 7KB CSS）。

### Phase 2 splash 窗与就绪信号
- [x] 新增 `src/main/splash.html`：内联 CSS（亮暗双底色 + `prefers-color-scheme`）、内联品牌标 SVG（几何注释锚点）、独立 meta CSP — `src/main/splash.html`
- [x] main 集成：主窗 `show: false`，`backgroundColor` 对齐主题 token 同值；splash 窗（无框、小尺寸居中、置顶）经 `?raw` + `data:` URL 即现 — `src/main/index.ts`
- [x] 就绪信号 IPC：`DesktopApi` 增 `rendererReady(): Promise<void>`，契约表三处同步（ipc.ts 默认实现 / preload 转发 / types.ts 声明） — `src/main/ipc.ts`, `src/preload/index.ts`, `src/shared/types.ts`
- [x] 壳层发信号：新增 `components/ShellReady.tsx`（`'use client'`，mount 调 `window.api.rendererReady()`，catch 静默）挂入壳层 layout — `components/ShellReady.tsx`, `app/(shell)/layout.tsx`
- [x] 切换逻辑：ready 信号或 4s 超时 → splash 淡出销毁 + 主窗 show（动效遵守 ui-patterns） — `src/main/index.ts`

### Phase 3 根因修复（按 Phase 1 结论执行或删除）
- [x] 若 CSS 未随首帧内联：验证并启用 Next inlineCss 等价能力 — `next.config.ts`
- [x] 若 token 应用晚于首帧：layout 增 pre-hydration 内联脚本预设 `data-theme-family`/`data-color-scheme`（CSP `script-src 'unsafe-inline'` 已具备） — `app/layout.tsx`

### Phase 4 验证
- [x] `pnpm typecheck` + `pnpm test` 全绿 — `tests/`
- [x] 新增 `tests/splash.test.ts`：splash.html 无外部资源引用、含品牌标几何锚点注释、亮暗双底色齐全 — `tests/splash.test.ts`
- [x] 生产路径走查：`pnpm build` + `pnpm exec electron .`——splash 即现 → 主窗就绪切换，全程无白屏/乱序；`pnpm dev` 路径无回归

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（启动加载路径与 splash 生命周期）；shadow-docs/knowledge/shell-chrome-design.md（品牌标第三同步锚点）
- **理由:** 启动加载时序是壳层路由知识的自然扩展段；品牌标新增几何复制点须按既有锚点机制登记，否则后续重绘会漏同步。
