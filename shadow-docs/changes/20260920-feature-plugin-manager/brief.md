---
{
  "schema": "shadow-dev/v1",
  "name": "20260920-feature-plugin-manager",
  "type": "feature",
  "scope": "plugin-manager",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260920-feature-plugin-manager",
  "files": [
    "src/main/plugins/loader.ts",
    "src/preload/index.ts",
    "src/renderer/src/App.tsx",
    "src/renderer/src/components/PluginManagerSection.tsx",
    "src/renderer/src/plugins/PluginFrameHost.tsx",
    "src/renderer/src/plugins/floats.ts",
    "src/renderer/src/settings/SettingsPage.tsx",
    "src/renderer/src/styles/global.css",
    "src/shared/plugin.ts",
    "tests/plugin-approval.test.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "512d245a0093c55c1fd4106b65e6b375ffd007fc",
    "verifiedAt": "2026-09-21T05:21:40.590Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "82af234ca69cd49c1dd187aee78c9dcaff8eabb16d741fd4480ea29a0c13ee29",
    "updatedAt": null,
    "lastError": null
  },
  "knowledge": null
}
---

# 插件管理 UX —— 设置页插件区块与首次启用权限批准

> 2026-09-21 基线对齐：基于双栏布局（PR #8，views.area 收敛 main|float、SideMenu/rightRoute、设置页为右栏页面）与 CSP 修复（PR #9，运行时前置）之后的主线；revealDir 经 window.pluginApi 通道（不扩 DesktopApi）。

## 动机
「一切皆插件」路线图变更 1.5（2026-09-20 确认插在浮窗化之后、编辑器插件化之前）。当前插件机制的启停底层已齐（`plugin:setEnabled` IPC、`disabled` 持久化、渲染层 `togglePlugin`），但没有任何管理界面；权限批准维持「manifest 声明即生效」，是 `desktop-plugin-architecture` 知识卡片记名的后置项。本变更补齐两者：设置页提供插件区块（列表/启停/权限摘要/打开目录/重载），并以「首次启用整体批准」模型转正权限批准。

## 引用规范
- shadow-docs/knowledge/desktop-plugin-architecture.md（父仓库）
  - 当前结论: 能力白名单默认拒绝；权限批准目前 manifest 声明即生效（确认弹窗后置）；第三方插件放 userData/plugins/，状态持久化 userData/plugin-state.json
  - 适用 scope: apps/desktop
  - 遵循: 批准记录落在 plugin-state.json，不新增第二状态源；插件帧不得接触凭证；新增能力不走特例通道
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 声明制优先（契约→validateManifest→tests 先行）；UI 全 token；statusItems/floats 快照注册表模式
  - 适用 scope: src/shared/plugin.ts, src/renderer/src
  - 遵循: 契约与批准判定的纯函数先测后实现；设置页 UI 复用 ui/Button、ui/Dialog、token 化样式
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 设置页是 mainView 全屏视图（prevView 关闭语义）；页内新增区块不动路由
  - 适用 scope: src/renderer/src/settings
  - 遵循: 插件区块是设置页内 section，不新建 mainView、不进侧栏
- norms/ui-patterns.md（通用）: 组件复用优先、暗色全覆盖、动效 150-300ms + reduced-motion、图标按钮 aria-label、focus ring

## 决策
- **选型:** 方案 A——批准态持久化，「有效启用 = 未禁用且批准有效」。`plugin-state.json` 扩展 `approvals: Record<pluginId, permissions[]>`（批准时 manifest 权限快照）；loader 扫描时以纯函数 `resolveApproval(manifest, approvals)` 计算每插件 `approval: 'approved' | 'pending' | 'changed'`，`PluginRecord.enabled = 未禁用 && approval === 'approved'`。broker/protocol/publisher/渲染层 views 过滤全部自动继承「未批准不运行」。
- **对比方案:** 启动时集中弹批（打断启动、主进程原生框与主题割裂，且启停路径仍需第二套批准时机，否决）；不持久化每次启动重批（个人工具不可接受，否决）。
- **批准时机与粒度:** 按插件整体批准。启用 `pending`（未批准）或 `changed`（manifest 权限与快照不一致）的插件时，弹 uiConfirm 列出 manifest 全部权限；确认则以当前 manifest.permissions 写入 approvals 并启用，拒绝则保持现状。禁用不撤销批准记录（重新启用不再弹窗，除非权限又变了）。
- **管理操作:** 设置页「插件」区块——列表卡片（名称/版本/来源目录/权限词表摘要/启用开关/批准状态提示）、打开插件目录（新 IPC `plugin:revealDir`，主进程 `shell.openPath(record.dir)`，只接受 records 内 id 不接受任意路径）、重载（新 IPC `plugin:reload`：主进程重扫双目录重建 records，渲染层复位 bootPromise 重建全部会话与帧，浮窗/侧栏插件面板选中态回退 files）、problems（manifest 校验失败目录）展示。
- **理由:** 批准与禁用共用 plugin-state.json 单一状态源，语义收敛在 loader 一处（可纯函数测试）；「changed 自动失效」让权限升级必须重批，符合默认拒绝原则；UI 全部复用现有原语。
- **非目标:** 逐权限勾选、市场/分发/签名、本地目录安装与卸载（后续变更）、批准过期时间。

## 任务
### Phase 1 契约与批准判定（声明制 + TDD 先行）
- [x] `PluginRecord` 增加 `approval: 'approved' | 'pending' | 'changed'`；`PluginHostApi.setEnabled(pluginId, enabled, approved?: string[])` 扩展第三参；新增 `reload(): Promise<PluginListResult>`；新增 `revealDir(pluginId)` — `src/shared/plugin.ts` `src/preload/index.ts` — 修改
- [x] 批准判定纯函数 `resolveApproval` + 状态文件读写 + 一致性校验用例（approved/pending/changed/批准参数与 manifest 不一致被拒） — `tests/plugin-approval.test.ts` `src/main/plugins/loader.ts` — 新增
### Phase 2 主进程
- [x] loader 实现：approvals 读写、resolveApproval 接入 records.enabled 计算、`plugin:setEnabled` 三参校验（enabled=true 必须携带与 manifest 完全一致的权限数组，否则拒绝）、`plugin:reload`（幂等重跑 bootstrap）、`plugin:revealDir` — `src/main/plugins/loader.ts` — 修改
### Phase 3 渲染层
- [x] 帧宿主：`togglePlugin` 携带批准参数（启用建会话+开逻辑帧，停用反向清理）、`rebootstrap()`（重载后关全部帧、renderService.reset、重建会话与逻辑帧、宿主代际 +1） — `src/renderer/src/plugins/PluginFrameHost.tsx` `src/preload/index.ts` — 修改
- [x] 浮窗与菜单联动：停用插件关闭其全部浮窗；App 订阅宿主代际刷新 mainViews/floatViews，失效路由回退 home — `src/renderer/src/plugins/floats.ts` `src/renderer/src/App.tsx` — 修改
- [x] 插件管理区块组件：列表卡片/启停（含批准弹窗流）/权限摘要/打开目录/重载按钮/pending·changed·problems 提示 — `src/renderer/src/components/PluginManagerSection.tsx` `src/renderer/src/settings/SettingsPage.tsx` `src/renderer/src/styles/global.css` — 新增/修改
### Phase 4 验证
- [x] 回归：`tsc` 双侧 + `vitest` + `electron-vite build` — 仓库根 — 验证
- [x] 手动走查：启用未批准插件弹权限确认（拒绝保持禁用/批准后启用）；改动 manifest 权限后重载显示 changed 并要求重批；打开目录、重载后浮窗与侧栏状态回退正常；四主题亮暗 — 手动 — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新 + 新增
- **候选卡片:** 父仓库 `desktop-plugin-architecture.md`（权限批准模型落地：approvals 快照 + changed 自动失效 + 有效启用语义，删除「确认弹窗后置」表述）；桌面仓库首建 `knowledge/plugin-architecture.md`（menu.md 已预留路由——loader 双目录扫描、plugin-state 单一状态源、批准/重载/reveal 通道、验证方式）
- **理由:** 权限批准从后置项转为落地事实，属稳定结论变化；桌面 menu 预留的 plugin-architecture.md 路由由本次变更首建，避免卡片长期缺位

## 后续规划（本变更不含）
- 变更 2 `editors` 贡献点 + 编辑器插件化（CodeMirror 进沙箱帧）
- 变更 3 内置归属迁移（FileTree 插件化、StatusBar 收敛）
- 本地目录安装/卸载第三方插件
