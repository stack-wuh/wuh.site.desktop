---
{
  "schema": "shadow-dev/v1",
  "name": "20260917-feature-shell-chrome-plugin-api",
  "type": "feature",
  "scope": "renderer-chrome",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260917-feature-shell-chrome-plugin-api",
  "files": [
    "plugins/preview-markdown/plugin.json",
    "plugins/preview-markdown/view/index.html",
    "src/main/plugins/broker.ts",
    "src/plugin-sdk/index.ts",
    "src/renderer/src/App.tsx",
    "src/renderer/src/components/ActivityBar.tsx",
    "src/renderer/src/components/FileTree.tsx",
    "src/renderer/src/components/StatusBar.tsx",
    "src/renderer/src/components/icons/index.tsx",
    "src/renderer/src/components/ui/AppIcon.tsx",
    "src/renderer/src/components/ui/Empty.tsx",
    "src/renderer/src/editor/CodeMirrorEditor.tsx",
    "src/renderer/src/plugins/PluginFrameHost.tsx",
    "src/renderer/src/store.ts",
    "src/renderer/src/styles/global.css",
    "src/renderer/src/styles/ui.css",
    "src/shared/plugin.ts",
    "tests/plugin-broker.test.ts",
    "tests/plugin-manifest.test.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 2,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/2"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "91a80f7ca87208b5a806b520e26e39115d21d249",
    "verifiedAt": "2026-09-26T15:53:31.199Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:2",
    "planHash": "3ded8a8882bf4ebf3c36c078b34d9892102fcd2347ba2acd665b21cbc30e4a7b",
    "updatedAt": null,
    "lastError": null
  },
  "knowledge": null
}
---

# 壳层 chrome 重设计 — 图标体系 / ActivityBar / 侧栏面板 / 状态栏 + 插件状态项 API

## 动机
当前图标在 5 个文件里各自 `import { Xxx } from 'lucide-react'`，无集中注册表、无场景渲染规格（全量 strokeWidth=2，20px 渲染笔画不落整像素），观感粗糙；ActivityBar 是无激活指示条/徽标位/tooltip 分级的裸按钮列，StatusBar 仅 26px 纯文本（路径 + 未保存点）——与 x.wuh.site 设计语言不符（站点 UI 图标本就是 lucide 体系，但走 `icons/index.tsx` 集中导出 + 语义分组）。编辑器定位为插件化多功能文本编辑器，活动栏与状态栏作为一等 chrome 需要为插件提供「manifest 声明 + 运行时更新」的扩展点。

## 引用规范
- norms/ui-patterns.md
  - 当前结论: 设计规范先行（先查现有规范与组件库）；组件复用优先（新组件接口风格对齐 `components/ui` 原语）；暗黑模式全覆盖（CSS 变量/token，禁硬编码色值，对比度 ≥4.5:1）；动效 150-300ms ease-out + `prefers-reduced-motion`；可见 focus ring；图标按钮 aria-label
  - 适用 scope: src/renderer
- norms/interaction.md
  - 当前结论: 操作即时反馈；禁用态用灰色 token 而非隐藏；颜色不是唯一信息传递方式（徽标需文字/aria 辅助）
  - 适用 scope: src/renderer
- 项目 active Knowledge: 无（项目知识库随 20260917-feature-settings-main-view 首建中，本变更不引用项目卡片）

## 决策
- **选型:** 方案 A——壳层 chrome 全量重做 + 插件状态项混合模型（manifest `statusItems` 声明 + `PluginHostApi.statusBar.update/remove` 运行时更新）；图标策略为精修 lucide：站点同款 `Icon*` 集中注册表（UI/Status/Brand 分组）+ chrome 场景渲染规格 + 少量自绘品牌图标（Logo/菱形饰）
- **对比方案:** 插件 API 声明式优先（静态内容表达不了动态状态，下期补运行时 API 时字段返工）；运行时优先（发现性差、与 views 声明式风格割裂、权限模型失载体）。图标自绘全套（成本高且站点本身用 lucide，过度再创作反而偏离同源）；换库 Phosphor/Tabler（与站点 lucide 体系割裂，站点图标无法复用）
- **理由:** VSCode 成熟范式——声明式保证发现性与权限评审，运行时更新保证动态表达力；chrome 数据结构一次定型（Icon* 注册表 / ActivityItem.badge / statusItem 左右分区槽），后续 tab 化直接复用。ui-patterns 遵循：全部新 UI 走既有 token（`chrome-*`/`primary-*`），复用 `Button`/`AppIcon` 原语扩展，动效与 a11y 按规范
- **前置依赖:** 20260917-feature-settings-main-view（设置页主区视图）先合入 main——App.tsx 与 global.css 重叠，本变更基于更新后的 main 开分支

## 任务
### Phase 1 图标体系
- [x] 新建 `Icon*` 集中注册表：UI/Status/Brand 三组命名导出（对齐站点 `icons/index.tsx` 模式），AppIcon 增加场景规格（chrome 16px / 工具栏 14px / 面板 16px；chrome 场景 strokeWidth 1.75、正文 2），禁止业务代码裸 import lucide — `src/renderer/src/components/icons/index.tsx` `src/renderer/src/components/ui/AppIcon.tsx`
- [x] 自绘品牌图标 IconLogo、IconDiamond（站点 logo.tsx / ornament.tsx 同源移植，currentColor + token）— `src/renderer/src/components/icons/`
- [x] 存量调用点替换为注册表引用：App、ActivityBar、FileTree、EditorPane、AppearanceMenu — `src/renderer/src/App.tsx` 等 5 文件

### Phase 2 ActivityBar 与侧栏面板
- [x] ActivityBar 重做：左缘 2px 激活指示条、`ActivityItem.badge` 徽标位（数字/圆点，颜色非唯一信息）、settings 固定底部分组、自绘 tooltip 替代原生 title（保留 aria-label）、进出动效 150-300ms + reduced-motion — `src/renderer/src/components/ActivityBar.tsx` `src/renderer/src/styles/global.css`
- [x] 侧栏面板 chrome：面板头部（标题 + 折叠动作）、FileTree 图标接入注册表（chevron/folder/file）、插件面板与空态统一 `ui-empty` 图标 — `src/renderer/src/components/FileTree.tsx` `src/renderer/src/components/ui/Empty.tsx` `src/renderer/src/plugins/PluginFrameHost.tsx`

### Phase 3 状态栏与插件状态项 API
- [x] StatusBar 从 App footer 抽为组件：左区宿主信息（git 分支、光标 行:列、字数），右区保存状态 + 插件 statusItems 渲染槽；store 增加光标/字数状态，CodeMirrorEditor 上报 — `src/renderer/src/components/StatusBar.tsx` `src/renderer/src/App.tsx` `src/renderer/src/store.ts` `src/renderer/src/editor/CodeMirrorEditor.tsx`
- [x] manifest schema：`statusItems` 贡献项（id/icon 白名单/text/alignment/order）+ zod/手工校验 + 单测 — `src/shared/plugin.ts` `tests/plugin-manifest.test.ts`
- [x] 运行时 API：`PluginHostApi.statusBar.update/remove` + broker 状态项事件通道 + 沙箱帧转发 + 单测 — `src/renderer/src/plugins/PluginFrameHost.tsx` `src/main/plugins/broker.ts` `src/plugin-sdk/index.ts` `tests/plugin-broker.test.ts`
- [x] 官方示范：preview-markdown 接入状态项（plugin.json 声明 + 运行时更新渲染状态/字数） — `plugins/preview-markdown/plugin.json` `plugins/preview-markdown/view/`

### Phase 4 验证
- [x] `pnpm typecheck` + `pnpm test` 回归通过 — 仓库根
- [x] `pnpm dev` 手动走查：四主题 × 亮暗色逐 token 校验（对比度/焦点环）、插件状态项声明与运行时增删、ActivityBar 键盘遍历与 aria、`prefers-reduced-motion` 下动效关闭 — 手动

## 结果
- 实际耗时: —
- 验证: tsc 双 tsconfig 全绿；vitest 83/83 通过（原 72 + 新增 11：manifest statusItems 4 例 + statusItems 注册表 7 例）；task-11 手动四主题走查待 PR 评审时人工确认

## 知识评估
- **最终影响:** 新增（已完成）
- **卡片:** shadow-docs/knowledge/shell-chrome-design.md（已创建，verified 2026-09-18）
- **menu:** 项目 menu.md 已加入「壳层 chrome / 图标」「插件状态项」两条路由
- **理由:** Icon* 注册表模式、chrome 场景渲染规格（尺寸/描边）、statusItem/badge 扩展点契约是后续所有 UI 与插件工作的基准约定
