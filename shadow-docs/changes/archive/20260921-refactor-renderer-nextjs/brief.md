---
{
  "schema": "shadow-dev/v1",
  "name": "20260921-refactor-renderer-nextjs",
  "type": "refactor",
  "scope": "app,components,lib,src,tests,shadow-docs/knowledge",
  "status": "archived",
  "baseBranch": "main",
  "branch": "refactor/20260921-refactor-renderer-nextjs",
  "files": [
    "app",
    "components",
    "electron.vite.config.ts",
    "lib",
    "next.config.ts",
    "package.json",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "shadow-docs/menu.md",
    "src/main/index.ts",
    "src/renderer",
    "tests",
    "tsconfig.json",
    "tsconfig.node.json",
    "tsconfig.web.json",
    "vitest.config.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 12,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/12",
    "pullRequest": 14,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/14"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "e5b64f48169004767377e84ddea0d6291c6c1a56",
    "verifiedAt": "2026-09-26T15:52:31.500Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:14",
    "planHash": "2d2e2fd4919f4e333de7ef8ead7d523d0908257f1488095a6162897b501a705e",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[refactor] Renderer 迁移 Next.js 静态导出——工具链与站点全面统一",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n用户确认四项痛点全选：开发链路慢、写法范式繁琐、复用 workspace 资产受限、工具链心智负担。desktop 渲染层（electron-vite + 手写 CSS + 无路由约定 + workspace 排除）与 x.wuh.site/apps/site（Next 16.3.2 App Router + styled-components + oxlint + pnpm workspace）双范式并存，切换成本高。壳层刚完成两栏布局改造（PR #8 已合并、vitest 108 项、知识卡最新），当前是迁移的最低成本窗口。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: rightRoute 字符串联合 state 路由（禁 router 库）、两栏布局 SideMenu+main-area、FloatLayer 常驻右栏与页面共存、全屏体系已废止、Esc 仅关浮窗、Cmd+, 切 settings↔home\n  - 适用 scope: src/renderer/src\n  - 关系: rightRoute state 被 App Router 文件路由取代（本卡片将大改写）；两栏结构/浮窗共存/Esc 与键盘语义等价移植为路由段与 layout 持久化\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 图标注册表唯一出口（禁裸 import lucide-react）、SideMenu 结构与展开收起瞬时约束、主题 token 四主题×亮暗逐 token 校验、__APP_VERSION__ 经 electron-vite define 构建期注入（禁新增 preload/broker 通道消费版本）、声明制插件扩展点\n  - 适用 scope: src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts\n  - 关系: 版本注入机制改 NEXT_PUBLIC_APP_VERSION（仍构建期内联，约束不破）；样式载体迁 styled-components（token 仍走 :root CSS 变量 + data-theme，主题机制不变）；图标注册表与 SideMenu 结构约束原样保留\n\n## 决策\n- **选型:** 方案一——renderer 整体迁 Next 16 App Router（`output: 'export'` 静态导出），electron-vite 退役为 main/preload 专用构建；desktop 并入 pnpm workspace（父仓库去除 `!apps/desktop` 排除）；样式载体迁 styled-components（SWC `compiler.styledComponents` 配置对齐 site）；生产经新增 `app://` 自定义协议加载 export 产物，dev 经 `next dev`(3000) + concurrently 双进程编排；CSP 随 index.html→app/layout.tsx 重建并修复 `frame-src 'self' plugin:` 既有缺陷（plugin:// 帧被 default-src 'self' 拦截，PR #8 走查坐实的既有缺陷）；@codemirror/* 死依赖随 pnpm lockfile 重写顺带清理\n- **对比方案:** ① 内嵌 Next server（完整 RSC）——启动慢/体积大/桌面数据全走 IPC 无 RSC 收益，弃；② 仅统一工具链外壳（renderer 留 vite）——不解决写法范式与资产复用两项核心痛点，弃；③ 渐进统一——纯 ROI 视角次优，用户确认「范式统一」权重最高且渐进终点（renderer 留 vite）是被拒绝的状态、后续仍需迁移即双份成本，弃；④ 渲染层托管站点（壳加载远程 URL）——免发版对个人工具价值≈0，版本漂移/离线失效/站点部署成生产依赖，弃（留作未来独立增量：加载目标 app://→URL 改动很小）\n- **理由:** Electron 三段式决定了 main/preload/electron-builder 工具链不可消除，「统一」的可行域 = renderer 范式与站点同构。静态导出产物完全离线、启动快，是桌面形态的正解。风险用 spike 先行控险：Phase 1 趟通 export×协议加载、builder×pnpm 打包两块硬骨头，不通即止损（壳层未动，损失仅限实验任务）。已知并接受的功能约束：export 模式动态路由必须构建期枚举（generateStaticParams），未来运行时安装插件的路由能力需 query/client 兜底（当下插件均为内置，无影响）；dev 编排由单进程变双进程。\n\n## 任务\n### Phase 1 — Spike：趟通硬骨头（任一不通即止损，壳层未动）\n- [ ] Next 16 脚手架：app/ 骨架 + `output: 'export'` + distDir/export 产物目录与 electron-vite `out/` 冲突消解 + styled-components SWC 编译 + turbopack 可用性验证 — `next.config.ts` — 新建\n- [ ] `app://` 协议加载 export 产物：_next 资源映射、相对/绝对路径验证、生产启动加载 — `src/main/index.ts` — 修改\n- [ ] 并入 workspace：父仓库 pnpm-workspace.yaml 去排除、corepack pnpm install 根锁收敛、electron-builder `dist --dir`（Windows）打包验证与符号链接适配 — `package.json` + 父仓库 `pnpm-workspace.yaml` — 修改\n- [ ] dev 编排：concurrently 双进程 + Electron 等 3000 就绪 + main dev URL 环境变量切换 + HMR 验证 — `package.json`,`src/main/index.ts` — 修改\n\n### Phase 2 — 壳层骨架等价迁移\n- [ ] 根布局与主题：app/layout.tsx（ThemeProvider、app/globals.css 仅 token+reset、CSP meta 重建含 frame-src 修复、NEXT_PUBLIC_APP_VERSION） — `app/layout.tsx`,`app/globals.css` — 新建\n- [ ] ui 基础件迁移（Button/AppIcon 等，styled-components 重写、组件 API 不变） — `components/ui/` — 迁移\n- [ ] 图标注册表迁移（分组注册表唯一出口约束不变、brand.tsx 原样） — `components/icons/` — 迁移\n- [ ] SideMenu 迁移（结构/toggle 语义/激活指示条/徽标/tooltip 仅收起态/瞬时展开收起全部保留，激活态改 usePathname） — `components/SideMenu.tsx` — 迁移重写\n- [ ] TitleBar + AppearanceMenu 迁移（外观菜单行为不变） — `components/` — 迁移\n- [ ] StatusBar 迁移（statusItems 订阅纯骨架） — `components/StatusBar.tsx` — 迁移\n- [ ] FloatLayer 迁移（拖拽/8 向缩放/置顶/最小化 chip/Esc 语义原样，几何视口=main 容器） — `components/FloatLayer.tsx` — 迁移\n- [ ] app/(shell)/layout.tsx 两栏壳层编排（SideMenu+main 容器+FloatLayer 常驻+menuExpanded） — `app/(shell)/layout.tsx` — 新建\n\n### Phase 3 — 页面与插件宿主迁移\n- [ ] Home 页（问候+热力图+重试，默认路由段） — `app/(shell)/page.tsx` — 新建\n- [ ] 设置页（含「关于」书写动效与 reduced-motion 降级；返回语义改 router） — `app/(shell)/settings/page.tsx` — 新建\n- [ ] 插件 main 视图路由段：[...slug] catch-all + generateStaticParams 内置 manifest 枚举 + 未知视图 Empty 兜底 — `app/(shell)/plugin/[...slug]/page.tsx` — 新建\n- [ ] 插件宿主层迁移：PluginFrameHost/statusItems/floats/registry + doc 服务 store（纯逻辑与客户端组件原样迁移；Cmd+, 改 router.push settings↔home） — `components/plugins/`,`lib/` — 迁移\n- [ ] 旧渲染层退役：删除 src/renderer/（含 index.html）、electron.vite.config.ts 移除 renderer 段、tsconfig 三件套收敛（Next tsconfig + node 侧保留） — `src/renderer/`,`electron.vite.config.ts` — 删除/修改\n- [ ] @codemirror/* 及编辑器相关死依赖清理（pnpm lockfile 重写，本次具备条件） — `package.json` — 修改\n\n### Phase 4 — 质量闭环\n- [ ] vitest 全量回归（import 路径迁移；manifest/protocol/broker/statusitems/floats/icon/theme/structure 用例全绿，icon-build 环境性失败随 resvg 安装复核） — `tests/`,`vitest.config.ts` — 修改\n- [ ] typecheck（node 侧 + Next）+ `next build` + `electron-vite build` 全链路构建通过 — 全仓 — 验证\n- [ ] CDP 自动走查：两栏导航/浮窗全交互/四主题×亮暗/Cmd+,/Esc/键盘遍历 + **CSP 插件帧加载确认既有缺陷已修** — 全仓 — 验证\n- [ ] 知识卡更新：renderer-shell-routing.md 大改（App Router 取代 rightRoute、layout 持久化两栏壳层）、shell-chrome-design.md 更新（NEXT_PUBLIC 版本注入、styled-components 载体、验证命令）；menu.md 路由关键词同步 — `shadow-docs/knowledge/`,`shadow-docs/menu.md` — 修改\n- [ ] mac 打包验证（`dist:mac` + .app 品牌图标回归，用户本机执行） — `package.json` — 验证\n\n完整 brief：shadow-docs/changes/20260921-refactor-renderer-nextjs/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260921-refactor-renderer-nextjs\",\"type\":\"refactor\",\"scope\":\"app,components,lib,src,tests,shadow-docs/knowledge\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260921-refactor-renderer-nextjs/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "refactor"
      ]
    }
  },
  "knowledge": null
}
---

# Renderer 迁移 Next.js 静态导出——工具链与站点全面统一

## 动机

用户确认四项痛点全选：开发链路慢、写法范式繁琐、复用 workspace 资产受限、工具链心智负担。desktop 渲染层（electron-vite + 手写 CSS + 无路由约定 + workspace 排除）与 x.wuh.site/apps/site（Next 16.3.2 App Router + styled-components + oxlint + pnpm workspace）双范式并存，切换成本高。壳层刚完成两栏布局改造（PR #8 已合并、vitest 108 项、知识卡最新），当前是迁移的最低成本窗口。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: rightRoute 字符串联合 state 路由（禁 router 库）、两栏布局 SideMenu+main-area、FloatLayer 常驻右栏与页面共存、全屏体系已废止、Esc 仅关浮窗、Cmd+, 切 settings↔home
  - 适用 scope: src/renderer/src
  - 关系: rightRoute state 被 App Router 文件路由取代（本卡片将大改写）；两栏结构/浮窗共存/Esc 与键盘语义等价移植为路由段与 layout 持久化
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 图标注册表唯一出口（禁裸 import lucide-react）、SideMenu 结构与展开收起瞬时约束、主题 token 四主题×亮暗逐 token 校验、__APP_VERSION__ 经 electron-vite define 构建期注入（禁新增 preload/broker 通道消费版本）、声明制插件扩展点
  - 适用 scope: src/renderer/src/components, src/renderer/src/plugins, src/shared/plugin.ts
  - 关系: 版本注入机制改 NEXT_PUBLIC_APP_VERSION（仍构建期内联，约束不破）；样式载体迁 styled-components（token 仍走 :root CSS 变量 + data-theme，主题机制不变）；图标注册表与 SideMenu 结构约束原样保留

## 决策

- **选型:** 方案一——renderer 整体迁 Next 16 App Router（`output: 'export'` 静态导出），electron-vite 退役为 main/preload 专用构建；desktop 并入 pnpm workspace（父仓库去除 `!apps/desktop` 排除）；样式载体迁 styled-components（SWC `compiler.styledComponents` 配置对齐 site）；生产经新增 `app://` 自定义协议加载 export 产物，dev 经 `next dev`(3000) + concurrently 双进程编排；CSP 随 index.html→app/layout.tsx 重建并修复 `frame-src 'self' plugin:` 既有缺陷（plugin:// 帧被 default-src 'self' 拦截，PR #8 走查坐实的既有缺陷）；@codemirror/* 死依赖随 pnpm lockfile 重写顺带清理
- **对比方案:** ① 内嵌 Next server（完整 RSC）——启动慢/体积大/桌面数据全走 IPC 无 RSC 收益，弃；② 仅统一工具链外壳（renderer 留 vite）——不解决写法范式与资产复用两项核心痛点，弃；③ 渐进统一——纯 ROI 视角次优，用户确认「范式统一」权重最高且渐进终点（renderer 留 vite）是被拒绝的状态、后续仍需迁移即双份成本，弃；④ 渲染层托管站点（壳加载远程 URL）——免发版对个人工具价值≈0，版本漂移/离线失效/站点部署成生产依赖，弃（留作未来独立增量：加载目标 app://→URL 改动很小）
- **理由:** Electron 三段式决定了 main/preload/electron-builder 工具链不可消除，「统一」的可行域 = renderer 范式与站点同构。静态导出产物完全离线、启动快，是桌面形态的正解。风险用 spike 先行控险：Phase 1 趟通 export×协议加载、builder×pnpm 打包两块硬骨头，不通即止损（壳层未动，损失仅限实验任务）。已知并接受的功能约束：export 模式动态路由必须构建期枚举（generateStaticParams），未来运行时安装插件的路由能力需 query/client 兜底（当下插件均为内置，无影响）；dev 编排由单进程变双进程。

## 待确认点（apply 期现状）

1. ~~并行 WIP 冲突~~ → 已化解：plugin-manager 已走完流程合入 main（PR #10），icon-wiring 由用户会话提交（`6262caf`），本迁移基于其后开展；会话中途用户又提交了 plugin-architecture 知识卡（`bcbf67e3`）。
2. **父仓库协同（待用户提交）**：并入 workspace 的改动落在父仓库工作区，`git status` 为 `package.json`（onlyBuiltDependencies 补 electron、移除残留 npm workspaces 字段）、`pnpm-workspace.yaml`（去 desktop 排除）、`pnpm-lock.yaml`（根锁文件重写）——不在本仓库 git 管辖，需用户在父仓库另行提交。
3. **mac 打包验证（待用户执行）**：`pnpm dist:mac` + .app 品牌图标回归需用户本机执行；Windows 侧 `dist` 已实测通过（`app://` 加载 + asar 产物）。
4. **用户手动验收中**：task-21 改为用户手动验证（不写自动验收脚本），涉及两栏导航/浮窗交互/四主题 × 亮暗/`⌘/Ctrl+B`/`Ctrl+,`/Esc/用户快捷面板。

## 任务

### Phase 1 — Spike：趟通硬骨头（任一不通即止损，壳层未动）
- [x] Next 16 脚手架：app/ 骨架 + `output: 'export'` + distDir/export 产物目录与 electron-vite `out/` 冲突消解 + styled-components SWC 编译 + turbopack 可用性验证 — `next.config.ts` — 新建
- [x] `app://` 协议加载 export 产物：_next 资源映射、相对/绝对路径验证、生产启动加载 — `src/main/index.ts` — 修改
- [x] 并入 workspace：父仓库 pnpm-workspace.yaml 去排除、corepack pnpm install 根锁收敛、electron-builder `dist --dir`（Windows）打包验证与符号链接适配 — `package.json` + 父仓库 `pnpm-workspace.yaml` — 修改
- [x] dev 编排：concurrently 双进程 + Electron 等 3000 就绪 + main dev URL 环境变量切换 + HMR 验证 — `package.json`,`src/main/index.ts` — 修改

### Phase 2 — 壳层骨架等价迁移
- [x] 根布局与主题：app/layout.tsx（ThemeProvider、app/globals.css 仅 token+reset、CSP meta 重建含 frame-src 修复、NEXT_PUBLIC_APP_VERSION） — `app/layout.tsx`,`app/globals.css` — 新建
- [x] ui 基础件迁移（Button/AppIcon 等，styled-components 重写、组件 API 不变） — `components/ui/` — 迁移
- [x] 图标注册表迁移（分组注册表唯一出口约束不变、brand.tsx 原样） — `components/icons/` — 迁移
- [x] SideMenu 迁移（结构/toggle 语义/激活指示条/徽标/tooltip 仅收起态/瞬时展开收起全部保留，激活态改 usePathname） — `components/SideMenu.tsx` — 迁移重写
- [x] TitleBar + AppearanceMenu 迁移（外观菜单行为不变） — `components/` — 迁移
- [x] StatusBar 迁移（statusItems 订阅纯骨架） — `components/StatusBar.tsx` — 迁移
- [x] FloatLayer 迁移（拖拽/8 向缩放/置顶/最小化 chip/Esc 语义原样，几何视口=main 容器） — `components/FloatLayer.tsx` — 迁移
- [x] app/(shell)/layout.tsx 两栏壳层编排（SideMenu+main 容器+FloatLayer 常驻+menuExpanded） — `app/(shell)/layout.tsx` — 新建

### Phase 3 — 页面与插件宿主迁移
- [x] Home 页（问候+热力图+重试，默认路由段） — `app/(shell)/page.tsx` — 新建
- [x] 设置页（含「关于」书写动效与 reduced-motion 降级；返回语义改 router） — `app/(shell)/settings/page.tsx` — 新建
- [x] 插件 main 视图路由段：[...slug] catch-all + generateStaticParams 内置 manifest 枚举 + 未知视图 Empty 兜底 — `app/(shell)/plugin/[...slug]/page.tsx` — 新建
- [x] 插件宿主层迁移：PluginFrameHost/statusItems/floats/registry + doc 服务 store（纯逻辑与客户端组件原样迁移；Cmd+, 改 router.push settings↔home） — `components/plugins/`,`lib/` — 迁移
- [x] 旧渲染层退役：删除 src/renderer/（含 index.html）、electron.vite.config.ts 移除 renderer 段、tsconfig 三件套收敛（Next tsconfig + node 侧保留） — `src/renderer/`,`electron.vite.config.ts` — 删除/修改
- [x] @codemirror/* 及编辑器相关死依赖清理（pnpm lockfile 重写，本次具备条件） — `package.json` — 修改

### Phase 4 — 质量闭环
- [x] vitest 全量回归（import 路径迁移；manifest/protocol/broker/statusitems/floats/icon/theme/structure 用例全绿，icon-build 环境性失败随 resvg 安装复核） — `tests/`,`vitest.config.ts` — 修改
- [x] typecheck（node 侧 + Next）+ `next build` + `electron-vite build` 全链路构建通过 — 全仓 — 验证
- [x] CDP 自动走查：两栏导航/浮窗全交互/四主题×亮暗/Cmd+,/Esc/键盘遍历 + **CSP 插件帧加载确认既有缺陷已修** — 全仓 — 验证
- [x] 知识卡更新：renderer-shell-routing.md 大改（App Router 取代 rightRoute、layout 持久化两栏壳层）、shell-chrome-design.md 更新（NEXT_PUBLIC 版本注入、styled-components 载体、验证命令）；menu.md 路由关键词同步 — `shadow-docs/knowledge/`,`shadow-docs/menu.md` — 修改
- [x] mac 打包验证（`dist:mac` + .app 品牌图标回归，用户本机执行） — `package.json` — 验证

## 结果

- 实际耗时: —
- 验证: `pnpm typecheck` 双侧通过（`tsconfig.node.json` + `tsconfig.next.json`）；`pnpm test` **115/115 全绿**（含迁移前环境性失败的 `icon-build`——workspace 安装补齐 `@resvg/resvg-js` 后转绿）；`next build` 静态导出 7/7 路由（`/`、`/settings` 与三个内置插件 main 视图均已 `generateStaticParams` 枚举）；`electron-vite build`（main/preload）通过；`electron-builder --dir` 出包成功（`dist/win-unpacked`）；**生产加载实测**：启动打包产物经 CDP 读得 `url = app://shell/index.html`、`title = wuh.site`——`app://` 协议 + asar 内静态导出完整跑通
- 偏差与发现:
  1. **monorepo 适配**：并入 pnpm workspace 后 turbopack 的编译根必须显式指向父仓库（`next.config.ts` 的 `turbopack.root`，探测根锁文件、独立克隆回退本包目录），否则报 `Could not find the Next.js package`
  2. **构建产物无冲突**：Next 导出落 `dist/next/`（`distDir` 配置），与 electron-vite 的 `out/` 互不干扰；`electron-builder.yml` files 增 `dist/next/**`；`.gitignore` 增 `.next`
  3. **并入 workspace 的连环修复**（父仓库改动，不在本仓库 git 管辖，需用户自行提交）：`pnpm-workspace.yaml` 去掉 `!apps/desktop` 排除；根 `pnpm.onlyBuiltDependencies` 补 `electron`（否则 pnpm 10 拦截其二进制安装脚本）；**移除根 `package.json` 残留的 npm `workspaces` 字段**（npm 映射不认 pnpm 的 `!**/dist/**` 排除，会把 dist 产出的 `package.json` 误判为同名子包并抛 `EDUPLICATEWORKSPACE`）
  4. **依赖全量移入 devDependencies**：main 依赖由 electron-vite 全量内联、渲染层编译进 `dist/next`，asar 本就不需要 node_modules——顺带绕开 electron-builder 的 pnpm 依赖树收集在 Windows 上 spawn `pnpm.cmd` 失败的问题；同时需让 `pnpm` 进入 PATH（本机原先只有 `corepack pnpm`，builder 探测不到）
  5. **desktop 独立 `pnpm-lock.yaml` 删除**（并入 workspace 的必然结果）：**代价是独立克隆本仓库时无锁文件、依赖版本随解析浮动**——需用户知情；将来若要恢复独立可复现安装，须重建该锁文件
  6. 静态导出预渲染要求所有 `useSyncExternalStore` 传 `getServerSnapshot` 第三参（5 处补齐），否则 `next build` 在 `/settings` 预渲染阶段报 `Missing getServerSnapshot` 并退出
  7. dev 模式 CSP 需追加 `'unsafe-eval'`（React 开发模式重建调用栈需要），生产构建不含——已按 `NODE_ENV` 分流
  8. **会话中途的用户驱动 UI 调整**（超出 brief 原任务清单，用户实时验收提出，随本次一并交付）：顶栏清空为**预留通知条**（`aria-label="通知栏"` + `aria-live="polite"`，待更新/紧急通知；`AppearanceMenu` 组件删除，主题入口收敛为唯一）；左栏底部合并为**单一用户入口**（品牌标=头像占位，点击进设置页=用户模块替身）+ 悬停**快捷面板**（主题/外观/语言占位/收起菜单/设置）；**收起/展开控件从 rail 移入快捷面板**并新增 `Cmd/Ctrl+B` 快捷键；窗口不显示系统菜单栏（`win.setMenu(null)`，应用菜单仅保留编辑快捷键角色）
  9. task-21（CDP 自动走查）→ **改为用户手动验证**（用户明确要求不写验收脚本），按用户决策勾选为完成：两栏导航/浮窗交互/主题/快捷键/用户快捷面板/设置页由用户在 dev 窗口逐项走查；**其「CSP 插件帧加载确认」一栏未满足**——帧加载失败属既有缺陷（见第 13 条），已按用户决策拆为独立 fix 变更，不在本次勾选口径内
  10. **task-23（mac 打包 + .app 图标回归）标记为「未覆盖」**：按用户决策勾选放行并在此如实标注——本次仅验证 Windows 侧（`dist --dir` 出包 + `app://` 加载实测），mac 侧 `pnpm dist:mac` 与图标回归**待用户本机执行**，若失败另开 fix 变更
  11. 首轮走查脚本暴露的两个真实缺陷已在会话内修复：Phase 1 探针页 `app/page.tsx` 未删导致路由冲突遮蔽真首页、`SideMenu` 收起态 tail 组未吸附底部
  12. 会话中两处环境事故与修复：`pnpm install` 重排 desktop 的 node_modules 致 electron 二进制丢失（补齐白名单 + npmmirror 镜像重装恢复）；端口 3000 残留 dev 进程使 electron 加载旧实例（清进程后恢复）
  13. **文档同步**：`README.md` 全面重写（技术栈/内置插件表/命令/架构树；原内容仍在描述已移除的 CodeMirror 编辑器体系与「不并入 workspace」）；`renderer-shell-routing.md` 大改（App Router 路由段取代 rightRoute、静态导出约束、`getServerSnapshot` 硬要求、用户入口语义）；`shell-chrome-design.md` 更新（styled-components 载体、`NEXT_PUBLIC_APP_VERSION` 注入、用户入口与快捷面板、预留通知条、CSP 与无系统菜单栏、`⌘/Ctrl+B`）；`plugin-architecture.md` 渲染层宿主路径修正；`menu.md` 路由词表增用户面板/通知条/构建工具链
  14. **文件清单偏差**（超出 brief 声明范围，均为迁移必然波及）：`tsconfig.web.json` → **`tsconfig.next.json`**（重命名，Next 管控该文件并自动补 `allowJs`/`incremental`/`plugins` 与 `.next/types` include）、新增 `next.config.ts` / `next-env.d.ts` / `app/fonts/*.woff2`（自托管字体随渲染层迁移）、`electron-builder.yml`（files 增 `dist/next/**`）、`.gitignore`（`.next` / `.walkthrough` / `*.tsbuildinfo`）、`README.md`（重写）
  15. **既有缺陷（非本次回归，证据链坐实）**：`plugin://` 文档帧在 Electron 44 下**导航挂起 / `net::ERR_ABORTED`**——dev 与打包产物均复现，沙箱与非沙箱 iframe 均失败，连**纯内存响应**的 SDK 虚拟路径（`@core/sdk.js`，不涉 fs）同样失败；实测为**必现**，比 PR #9 brief 记录的「偶发」更严重。**判定非本次回归的证据**：`git diff bcbf67e -- src/main src/preload src/shared/plugin.ts src/plugin-sdk` 仅 `src/main/index.ts` 一处（85+/6-，全部是 app:// 协议与窗口菜单），`plugin:` scheme 特权注册**逐字节相同**；`src/main/plugins/protocol.ts` 与 `components/plugins/PluginFrameHost.tsx` 的帧挂载逻辑未改（仅 import 路径）。全程**无 CSP 违例**（`frame-src plugin:` 在场）——缺陷不在 CSP，而在协议/子帧导航层。**影响**：插件 main 视图与浮窗预览在帧 5s 未就绪后显示「插件视图加载失败」，插件能力当前实际不可用；**建议独立 fix 变更专项修复**（PR #9 brief 已将该问题列入后续规划）
  16. **分支时序**：apply 期间用户并行会话把 icon-wiring 归档进 main（PR #13，main → `1d40b5f`）并将工作区切回 main；本次迁移改动当时仍在工作区未提交，已用 `git checkout -B refactor/20260921-refactor-renderer-nextjs` 恢复到最新 main 基点上继续，工作零丢失

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（大改：App Router 文件路由取代 rightRoute state、layout 持久化两栏壳层、export 枚举约束）、shadow-docs/knowledge/shell-chrome-design.md（更新：NEXT_PUBLIC_APP_VERSION 注入、styled-components 样式载体、用户入口与快捷面板、预留通知条、pnpm workspace 验证命令）、shadow-docs/knowledge/plugin-architecture.md（渲染层宿主路径修正：`components/plugins/PluginFrameHost.tsx` + `lib/floats.ts`）、shadow-docs/menu.md（路由词表同步）
- **实际落点:** 上述四份均已更新 + `README.md` 全文重写（技术栈/插件表/命令/架构树）；插件契约（views.area/沙箱协议/声明制/批准模型）语义未变，`plugin-architecture.md` 仅修正被迁移移动的文件路径并补 source
- **理由:** 路由语义与构建注入机制是两张 active 卡的核心结论，被本次有意变更取代；渲染层文件位移使 plugin-architecture 的路径引用失效。三者若不同步将与代码事实冲突
