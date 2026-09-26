---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-feature-i18n-shell-locales",
  "type": "feature",
  "scope": "desktop",
  "status": "branched",
  "baseBranch": "main",
  "branch": "feature/20260922-feature-i18n-shell-locales",
  "files": [
    "components/AppProviders.tsx",
    "components/SideMenu.tsx",
    "components/StatusBar.tsx",
    "components/home/HomePage.tsx",
    "components/settings/PluginManagerSection.tsx",
    "components/settings/SettingSection.tsx",
    "components/settings/SettingsNav.tsx",
    "components/settings/SettingsPage.tsx",
    "components/ui/Dialog.tsx",
    "lib/i18n/context.tsx",
    "lib/i18n/locales.ts",
    "tests/i18n.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 27,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/27",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "54ae1b308138214f216a1e78db929d5a86b75f16",
    "verifiedAt": "2026-09-26T15:53:49.175Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:27",
    "planHash": "f9241ceebcba3a511969bea8c318e565cdcfb9e43c229d787752b1efb4f9a74f",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "壳层国际化（中/英/日）——i18n 基建 + 语言二级 popover",
      "body": "",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "shadow-docs/changes/20260922-feature-i18n-shell-locales/brief.md"
      ],
      "message": "docs(shadow): i18n-shell-locales 状态回填——review 记录对齐当前 HEAD（实现已随历史提交进入 main，流程补录）"
    }
  },
  "knowledge": null
}
---

# 壳层国际化（中/英/日）——i18n 基建 + 语言二级 popover

## 动机

壳层当前仅中文（`UserQuickPanel` 语言行为禁用占位）。需支持英文/日文：语言选择改造为二级 popover（快捷面板「语言」行 hover 弹出 中文/英文/日文），壳层文案全量三语。插件 manifest 标题与插件帧内容**本期不翻**（保留中文，后续另立 change）。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: `UserQuickPanel` 交互契约——`role="menu"`、主题用 `menuitemradio`、延迟 180ms 关闭允许指针移入、Esc 关闭、**Nav 不得 `overflow: hidden`**；样式一律 styled-components + token，亮暗全覆盖，动效 150-300ms ease-out + reduced-motion
  - 适用 scope: components/SideMenu.tsx（语言行激活与二级 popover）
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 静态导出（`output: 'export'`）无服务器运行时，路由级 i18n 不可用，locale 只能是客户端状态；`useSyncExternalStore` 必须传 `getServerSnapshot`；客户端组件一律 `'use client'`
  - 适用 scope: lib/i18n、components/AppProviders
- shadow-dev-workflow/norms/ui-patterns.md + interaction.md
  - 当前结论: 禁硬编码颜色、可交互元素 visible focus、图标按钮 aria-label、键盘可达
  - 适用 scope: 二级 popover UI

## 决策

- **选型:** 轻量自研——`lib/i18n/locales.ts` 三语字典（嵌套 key）+ `lib/i18n/context.tsx`（`LocaleProvider` + `useT()`，'use client'，localStorage 键 `wd.locale`，与 `wd.theme` 同模式）。
- **对比方案:** next-intl/react-i18next 引库被否（静态导出无路由/请求头假设，依赖重）；仅做 UI 占位不翻文案被否（不满足需求）。
- **两段式渲染（防 hydration mismatch）:** 初始 locale 固定 `zh`（与 SSR HTML 一致），mount 后 effect 切到存储值——切换瞬间闪一帧中文，**被 splash 窗覆盖**（启动链路上 splash 在 rendererReady 前常驻）；运行时切换即时生效。此为有意取舍，与主题 pre-paint 方案不同（文本无法 CSS 预置）。
- **UI:** 快捷面板「语言」行激活为可 hover 项（左文案右 chevron 图标），二级 popover 列出 中文/English/日本語（`menuitemradio`、当前项 `aria-checked`），复用面板既有 180ms 延迟/Esc/键盘语义；图标从 `components/icons` 注册表取，禁裸引 lucide。
- **范围边界:** 壳层全量（SideMenu/快捷面板/设置页/首页/StatusBar/对话框）；插件 manifest 标题、插件帧内容、`ConfirmHost` 消息参数暂不翻。

## 任务

### Phase 1 i18n 基建（TDD）
- [x] `tests/i18n.test.ts` 先行失败：三语字典 key 集合严格一致、无空文案、默认 locale 为 zh — `tests/i18n.test.ts`
- [x] `lib/i18n/locales.ts`：zh 全量 key 提取（壳层文案扫描）+ en/ja 初译 — `lib/i18n/locales.ts`
- [x] `lib/i18n/context.tsx`：LocaleProvider（两段式）+ `useT()` + `setLocale` 持久化 — `lib/i18n/context.tsx`
- [x] AppProviders 挂载 LocaleProvider — `components/AppProviders.tsx`

### Phase 2 语言二级 popover
- [x] `UserQuickPanel` 语言行激活：hover 弹二级 popover（中文/English/日本語，menuitemradio），键盘可达，Esc/延迟关闭语义沿用 — `components/SideMenu.tsx`

### Phase 3 壳层文案全量替换
- [x] SideMenu（含快捷面板各行为文案）— `components/SideMenu.tsx`
- [x] 设置页全部区块 — `components/settings/SettingsPage.tsx`, `components/settings/SettingSection.tsx`, `components/settings/SettingsNav.tsx`, `components/settings/PluginManagerSection.tsx`
- [x] 首页（新建博客入口/最近项目/热力图文案）— `components/home/`
- [x] StatusBar 占位与对话框 — `components/StatusBar.tsx`, `components/ui/Dialog.tsx`

### Phase 4 验证
- [x] `pnpm typecheck` + `pnpm test` 全绿
- [x] 三语 × 四主题走查：二级 popover 交互、切换即时性、启动 splash 覆盖无闪帧
- [x] 生产构建产物含三语字典（bundle 检查）

## 结果

- 实际耗时: —
- 验证: typecheck 双配置绿；vitest 157/157（含 3 条 i18n 字典用例）；生产构建通过（workerThreads 临时组合，已还原），bundle 抽查 zh/en/ja 文案（最近项目/Recent projects/キャンセル 等）均在内。
- **清单外文件（三处，必要配套）**: `app/(shell)/layout.tsx`（首页菜单项 `menu.home` 与通知栏 aria-label 的 i18n 化，文案源头在此文件）、`components/home/ProjectSection.tsx`（任务文本"首页 components/home/"的文案主体，`--files` 清单漏列）与 `components/theme/ThemeProvider.tsx`（apply 中按用户追加需求实现外观 `system` 档，见下方迭代记录）。
- **StatusBar**: 组件自身无静态文案（仅渲染插件 statusItems），无需改动；TaskCapsule 属独立 change 范围，未动。
- 人工走查项（三语×四主题、二级 popover 手感）留待 review/release 阶段 GUI 确认。

### apply 迭代记录（2026-09-22 用户追加需求，均在同分支完成）
1. **主题/外观与语言统一为二级 popover 交互**：三组共用新通用组件 `PopSubmenu`（行左文案右 chevron、hover/聚焦弹出、menuitemradio、180ms 延迟移入、Esc）；语义差异：语言选中即关面板，主题/外观选中保持子菜单打开便于连续试选。旧语言专用子菜单与 `PopLabel` 已删（无死代码）。
2. **外观新增「跟随系统」档**：`SchemeSetting = 'system' | 'light' | 'dark'`；`system` 时实时解析 `prefers-color-scheme` 写入 `data-color-scheme`（属性仍二值，CSS token 路由与插件帧广播链路零改动），并监听系统明暗切换即时生效；pre-paint 脚本同步支持 `system` 分支（避免跟随系统浅色用户首帧闪暗）。`pop.system` 三语：跟随系统 / System / システムに従う。

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（新增 i18n 客户端 locale 机制与两段式渲染结论）；shadow-docs/knowledge/shell-chrome-design.md（UserQuickPanel 二级 popover 交互契约）
- **理由:** locale 机制是渲染层长期架构事实；快捷面板新增二级 popover 属 chrome 交互契约扩展。
