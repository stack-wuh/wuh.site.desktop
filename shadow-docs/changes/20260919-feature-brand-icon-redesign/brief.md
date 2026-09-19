---
{
  "schema": "shadow-dev/v1",
  "name": "20260919-feature-brand-icon-redesign",
  "type": "feature",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260919-feature-brand-icon-redesign",
  "files": [
    "build/icon.svg",
    "electron.vite.config.ts",
    "package.json",
    "scripts/build-icon.mjs",
    "src/renderer/src/components/icons/brand.tsx",
    "src/renderer/src/settings/SettingsPage.tsx",
    "src/renderer/src/styles/global.css"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 4,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/4",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "38083ec713b4dbd429be30ac8de15102f2a9c3c0",
    "verifiedAt": "2026-09-19T16:45:18.023Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:4",
    "planHash": "aafcb9b7e9e01883c4216d67b8010e47ded0cb8b86f3cb76d124e4a9c8d80a37",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "品牌图标重设计：W 字母标重绘 + 动效 + Dock 安装图标",
      "body": "",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 品牌图标重设计：W 字母标重绘 + 动效 + Dock 安装图标

## 动机

桌面端目前没有可见的品牌标识：壳内品牌标 `IconLogo`（brand.tsx）虽已定义但无任何使用点，且几何为早期草稿；应用安装图标（Dock/程序坞）未配置，打包产物使用 Electron 默认图标。本次以「W 字母标重绘」为方向统一品牌：一套 W 几何同时产出壳内带动效的 SVG 品牌标与静态 Dock 图标，并在设置页「关于」区块落地展示，让品牌标有可见、可验收的入口。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 图标走集中注册表；Brand 图标自绘、不经 AppIcon 直接渲染，`currentColor` 主体 + primary 色点缀，随四主题自适应；动效 ease-out 并响应 `prefers-reduced-motion`；新 chrome UI 用主题 token，四主题 × 亮暗走查
  - 适用 scope: src/renderer/src/components、src/renderer/src/plugins、src/shared/plugin.ts、src/plugin-sdk（本次命中 components/icons）
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 设置页为全屏 `mainView` 视图；新增全屏级页面才扩展 `mainView` 联合类型
  - 适用 scope: src/renderer/src（本次仅在 SettingsPage 内部新增区块，**不**扩展 mainView，仅作边界确认）
- norms/ui-patterns.md
  - 当前结论: 禁硬编码颜色（用 CSS 变量/主题令牌）；暗黑全覆盖；过渡动画 150-300ms ease-out；响应 `prefers-reduced-motion`；设计规范先行、组件复用优先
  - 适用 scope: 全部 UI 变更
- norms/interaction.md
  - 当前结论: 用户操作须有反馈；焦点管理规范
  - 适用 scope: 关于区块为静态展示、无交互，低风险遵循
- norms/code-style.md + norms/code-style-frontend.md
  - 当前结论: 禁新增 `any`；JSX 禁硬编码主题色；不加未来抽象；文件单一职责
  - 适用 scope: 本次全部代码变更

## 决策

- **选型:** 方案 A——仓库自持设计源 + 构建期脚本。`build/icon.svg` 为 Dock 图标 master（1024 网格，macOS 圆角方底 + 与壳内同一套 W 几何 + primary 点缀），`scripts/build-icon.mjs`（devDependency `@resvg/resvg-js`）栅格化输出 `build/icon.png`（1024×1024），electron-builder 从 buildResources 自动转 icns；壳内重绘 `IconLogo` 并加描边书写动效；设置页新增「关于」区块（动效 Logo + 产品名 + 版本号）。
- **对比方案:** 方案 B（AI 文生图 Dock 图标）质感上限高但不可复现、风格漂移、无法保证与壳内几何同源，与 ui-patterns「设计规范先行」相悖，不选；方案 C（手工导一张 PNG）代码最少但资产成黑盒、不可演进，不选。
- **理由:** 只有方案 A 同时满足「双产物同源 + 动效 + 可复现可维护」。关键权衡与规范例外：
  - **动效时长例外（有意）:** ui-patterns 的 150-300ms 约束针对「过渡动画」；W 描边书写属入场型展示动画，总长约 900ms（三笔 stagger、单笔 ≤300ms、ease-out、mount 播放一次），`prefers-reduced-motion: reduce` 下直接渲染静态终态。此例外已在此显式记录。
  - **与站点端品牌分叉（有意）:** brand.tsx 现注释为与 x.wuh.site 站点组件库 logo 同源移植；重绘后桌面端先行进化，站点端暂不动（两库本就不同源代码，shell-chrome-design 适用边界已说明）。站点端如跟进重绘，另行变更。
  - **版本号注入:** 复用 build-time define（electron-vite renderer `define` 注入 `__APP_VERSION__`，读 package.json version），不动 preload/broker 通道，最小面。
  - **Dock 图标暗色适配:** macOS Dock 图标为固定底色方底设计（不随系统主题切换），壳内 Logo 才走四主题自适应——两者形态不同但几何同源。

## 任务

### Phase 1 壳内品牌标重绘与动效
- [x] 重绘 `IconLogo`：圆头连笔 W（三笔独立 path 便于分段书写）+ primary 色点缀，几何参数与 build/icon.svg master 对齐，保持自绘直渲染模式（不经 AppIcon）与 aria/title 语义 — `src/renderer/src/components/icons/brand.tsx` — 修改
- [x] 描边书写动效：`stroke-dashoffset` keyframes（三笔 stagger、单笔 ≤300ms、总长 ~900ms、ease-out、mount 播放一次），`prefers-reduced-motion: reduce` 降级为静态终态 — `src/renderer/src/styles/global.css` — 新增
- [x] 设置页「关于」区块：复用 `.settings-page section` 结构，展示动效 IconLogo + 产品名 wuh-site-desktop + 版本号 — `src/renderer/src/settings/SettingsPage.tsx` — 修改
- [x] 版本号注入：electron-vite renderer define `__APP_VERSION__` + 环境类型声明（禁 `any`） — `electron.vite.config.ts` — 修改

### Phase 2 Dock 图标资产与打包验证
- [x] 设计源 `build/icon.svg`：1024 网格 macOS 圆角方底 + 同源 W 几何 + primary 点缀，明底暗底各一版（脚本参数切换） — `build/icon.svg` — 新增
- [x] 栅格化脚本：新增 devDependency `@resvg/resvg-js`，`scripts/build-icon.mjs` 输出 `build/icon.png`（1024×1024），注册 npm script `build:icon` — `scripts/build-icon.mjs`、`package.json` — 新增
- [x] 回归与走查：`pnpm typecheck` + `pnpm test` 通过；`pnpm dist:mac` 产物 .app 图标不再是 Electron 默认；`pnpm dev` 四主题 × 亮暗走查「关于」区块动效与 reduced-motion 降级 — 验证任务

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** 重绘后的 `IconLogo` 几何规格、书写动效约束（入场型动画例外、reduced-motion 降级）与 build/ Dock 资产管线是后续品牌相关变更的执行约束，应更新该卡片的 Brand 图标段落，而非新增卡片（domain + keywords + scope 均命中现有卡片）。
