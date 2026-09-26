---
{
  "schema": "shadow-dev/v1",
  "name": "20260917-feature-settings-main-view",
  "type": "feature",
  "scope": "renderer-ui",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260917-feature-settings-main-view",
  "files": [
    "src/renderer/src/App.tsx",
    "src/renderer/src/settings/SettingsPage.tsx",
    "src/renderer/src/styles/global.css"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 111,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/111"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "952be90affb9a61414cf832bfaaa7bc2d9960ec6",
    "verifiedAt": "2026-09-26T16:16:47.803Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:111",
    "planHash": "d14b75e4fc0b98b46c7dad7ebdcbcb9577b3caa3242fb6849c911b8d85cd7cb9",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        "shadow-docs/changes/20260917-feature-settings-main-view/brief.md"
      ],
      "message": "docs(shadow): settings-main-view 状态回填——review 记录对齐当前 HEAD（实现已随历史提交进入 main，流程补录）"
    }
  },
  "knowledge": null
}
---

# 设置模块主区页面化 — 壳层视图状态路由（类 VSCode）

## 动机
当前 `SettingsPage` 挤在 240px 侧栏里（`App.tsx:138`，与 FileTree 共用 aside），配置项表单空间局促，无法浏览和扩展。目标：类 VSCode 交互——设置作为独立主区视图占满编辑器+预览区，用户可自由进入/退出 Settings 页面处理配置项。

## 引用规范
- norms/ui-patterns.md
  - 当前结论: 组件复用优先（先复用 `components/ui` 原语）；暗黑模式全覆盖（CSS 变量/token，禁硬编码色值）；动效 150-300ms ease-out + `prefers-reduced-motion`；可交互元素 visible focus ring、form 输入 label 关联
  - 适用 scope: src/renderer
- norms/interaction.md
  - 当前结论: Escape 关闭弹窗/模态；焦点管理（打开移入、关闭移回触发元素）；Tab 可遍历、Enter/Space 触发主操作；操作即时反馈
  - 适用 scope: src/renderer
- norms/code-style-frontend.md
  - 当前结论: 「前端通用」节——状态覆盖 loading/失败/保存反馈；不在 JSX 硬编码主题色；状态归属靠近使用位置
  - 适用 scope: src/renderer（Next.js/Console/组件库章节面向 packages/*，本项目不适用）

## 决策
- **选型:** 方案 A——App 壳层视图状态路由：`mainView: 'work' | 'settings'`，无 router 依赖
- **对比方案:** B react-router(MemoryRouter)——与现有侧栏 `activePanel` state 路由双轨并存、架构割裂，单窗口 Electron 无 URL 收益；C VSCode 式 tab 框架——需先造 tab 系统，工作量数倍，超出诉求
- **理由:** 现状 App 即为 state 面板路由（无 router 库），A 与其同构、改动集中在 `App.tsx` + `SettingsPage.tsx` + `global.css`；`mainView` 抽象是未来 tab 化的天然挂载点。遵循 ui-patterns 组件复用：不新建组件，复用 ActivityBar/Button/Input 与 token 主题

## 任务
### Phase 1 壳层路由
- [x] App.tsx 新增 `mainView` 状态（'work' | 'settings'）；ActivityBar 的 settings 项点击切换主区视图（再点返回 work），图标高亮跟随 `mainView`；work-area 条件渲染 SettingsPage 或 EditorPane+预览区；侧栏 `activePanel` 维持独立（设置打开时侧栏保持原面板）；插件视图停用占位逻辑不变 — `src/renderer/src/App.tsx`
- [x] 键盘交互：`Cmd/Ctrl+,` 打开设置页、`Esc` 返回编辑器；打开/关闭按 interaction.md 做焦点管理；设置项为纯视图切换，保留 `ConfirmHost` 全局行为 — `src/renderer/src/App.tsx`

### Phase 2 设置页宽幅布局
- [x] SettingsPage.tsx 适配主区宽幅：分组卡片布局（内容 max-width 居中，分区标题层级），补全表单 label 关联与 aria，保存/失败反馈沿用现有 flash+error 机制 — `src/renderer/src/settings/SettingsPage.tsx`
- [x] global.css：`.settings-page` 由侧栏样式改写为主区布局（响应式两列 → 单列收窄，无横向滚动），进出场动效 150-300ms ease-out 并响应 `prefers-reduced-motion`；亮/暗主题下逐 token 校验 — `src/renderer/src/styles/global.css`

### Phase 3 验证
- [x] `pnpm typecheck` + `pnpm test` 回归通过 — 仓库根
- [x] `pnpm dev` 手动走查：开/关设置页往返、与插件侧栏面板共存、亮暗主题各一遍、纯键盘路径（Cmd+, → Tab 遍历 → Esc 返回） — 手动

## 结果
- 实际耗时: —
- 验证: tsc 双 tsconfig 全绿；vitest 基线 72/72 通过（chrome 变更 apply 前回归）
- 发布: 随 chrome 变更分支一并发布（PR #2，stack-wuh/wuh.site.desktop），本变更不单开 PR；合并后随 chrome 变更一同归档

## 知识评估
- **最终影响:** 新增（已完成）
- **卡片:** shadow-docs/knowledge/renderer-shell-routing.md（已创建，verified 2026-09-18）
- **menu:** 项目 menu.md「渲染层导航/壳层」路由已挂接
- **理由:** 首次引入 renderer 壳层「侧栏面板 `activePanel` + 主区视图 `mainView`」双层路由约定，后续 tab 化、插件主区页扩展均依赖该约定
