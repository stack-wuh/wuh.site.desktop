---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-feature-shell-capsule",
  "type": "feature",
  "scope": "renderer-ui",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260922-feature-shell-capsule",
  "files": [
    "app/(shell)/layout.tsx",
    "components/StatusBar.tsx",
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel.tsx",
    "components/capsule/sections/EditorSection.tsx",
    "components/tasks/EditorSection.tsx",
    "components/tasks/TaskCapsule.tsx",
    "components/tasks/TaskPopover.tsx",
    "lib/i18n/locales.ts",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "shadow-docs/menu.md"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 47,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/47",
    "pullRequest": 49,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/49"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "f8e784a4226d61f64bfe5f33a6897f46bb7fc8e0",
    "verifiedAt": "2026-09-22T16:26:06.801Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:49",
    "planHash": "1763f035acb5a62a00f6f31993ded33e6222a97a315ff6fc140d91ecfd833857",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "壳层胶囊 Capsule：固定命名正名迁移 + 主区右上常驻挂点",
      "body": "",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 壳层胶囊 Capsule：固定命名正名迁移 + 主区右上常驻挂点

## 动机
现有任务胶囊（TaskCapsule，StatusBar 左区）在真实使用中几乎不可见：空态（无可见任务且无活动文档）整体隐藏，而冷启动恰好总是该状态——用户感知为「根本没有生效」。且其形态与目标不符：需要的是 Claude Code / Codex / ZCode 等编辑器中的胶囊组件（参照 ZCode 会话头部「更改 +3 -3」chip）——紧凑、常驻有意义、点击看详情的一等壳层组件。本次为其**固定命名 Capsule**，完成正名迁移与挂点升级；后续在此命名下持续接入更多功能（更改统计、通知等均不在本次范围）。

## 引用规范
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 任务胶囊契约（manifest tasks 声明制 + SDK `wuh.tasks.upsert/remove` 单向上报、壳层只读、`lib/tasks.ts` 快照注册表）；StatusBar 左区=TaskCapsule+statusItems；styled-components+token、图标注册表、useSyncExternalStore 三参、spinner 属持续状态指示非过渡动效 + reduced-motion 静态降级、胶囊交互=用户快捷面板同族（Esc/点外关）
  - 适用 scope: components, lib, app
- norms/ui-patterns.md
  - 当前结论: 组件复用优先、主题 token 禁硬编码色、动效 150-300ms ease-out + reduced-motion、focus ring/aria 底线
  - 适用 scope: 全部 UI 变更
- norms/code-style.md
  - 当前结论: 不为未来场景提前抽象；渐进式治理；文件单一职责
  - 适用 scope: 全部

## 决策
- **选型:** 方案 A——单胶囊「分区制」正名迁移 + MainArea 右上常驻挂点。固定命名 **Capsule**（`components/capsule/`：`Capsule.tsx` chip + `CapsulePanel.tsx` 面板 + `sections/EditorSection.tsx`）；chip 恒显（空态中性「就绪」）；StatusBar 左区退回纯 statusItems；面板内分区即扩展点（任务区/编辑器区保留，未来更改统计等以分区接入）
- **对比方案:** B 胶囊槽位注册制（`lib/capsule.ts` 多 chip 并排、模块可注册）——v1 单租户属过早抽象，违反 code-style 禁止事项，若开放插件贡献还需扩 manifest/SDK 契约，范围爆炸；C statusItems 特殊渲染扩展——语义混淆（statusItems 是插件贡献点，Capsule 是壳层一等公民）且破坏 StatusBar 既定契约
- **理由:** 直接修复「没生效」根因（空态隐藏）+ 满足固定命名与「编辑器胶囊」形态诉求；复用已落地能力（tasks 契约零改动：注册表/SDK/manifest 不动；EditorSection 原样随迁），风险最小；i18n 命名空间已是 `capsule.*`，正名零迁移成本

## 任务
### Phase 1 正名迁移（纯移动改名，行为零变化）
- [x] 新建 Capsule chip——自 `components/tasks/TaskCapsule.tsx` 迁移：组件名改 `Capsule`、data-testid 改 `capsule`、面板引用改 CapsulePanel — `components/capsule/Capsule.tsx` — 迁移改名
- [x] 新建 CapsulePanel——自 `components/tasks/TaskPopover.tsx` 迁移改名：data-testid 改 `capsule-panel`、EditorSection import 路径更新 — `components/capsule/CapsulePanel.tsx` — 迁移改名
- [x] EditorSection 迁移至 `components/capsule/sections/`（`EditorCommandHost` 导出保持不变，供壳层常驻命令宿主消费） — `components/capsule/sections/EditorSection.tsx` — 迁移
- [x] 删除旧文件并更新引用方 import：`app/(shell)/layout.tsx`（EditorCommandHost）、`components/StatusBar.tsx`（Capsule 新路径；本阶段胶囊仍挂 StatusBar） — `app/(shell)/layout.tsx`, `components/StatusBar.tsx` — 引用更新
- [x] Phase 1 验证：jitless tsc 双工程 + vitest 全绿 + grep 确认无旧路径/旧名残留 — `tests/` — 回归验证

### Phase 2 挂点升级 + 常驻可见
- [x] `app/(shell)/layout.tsx`：Capsule 自 StatusBar 移入 MainArea 右上 absolute 挂点（宿主 `pointer-events: none` + chip 本体 `auto` 防遮挡页面点击；层级低于浮窗窗口与弹层、高于页面内容，具体 z-index 对照 FloatLayer/Dialog 现值钉死） — `app/(shell)/layout.tsx` — 挂点迁移
- [x] Capsule 常驻化：移除「无任务且无文档 return null」空态隐藏，空态渲染中性「就绪」（新 i18n key `capsule.ready` 三语同步——`tests/i18n.test.ts` 锁定三语 key 集合一致）；有任务仍显 `done/total`+spinner、有活动文档显编辑器态 — `components/capsule/Capsule.tsx`, `lib/i18n/locales.ts` — 空态恒显
- [x] `components/StatusBar.tsx`：移除 Capsule 挂载、头部注释更新，左区仅插件 statusItems — `components/StatusBar.tsx` — 挂载移除

### Phase 3 验证 + 知识写回
- [x] 全量验证：vitest 全绿 + jitless tsc（绕机器 V8 缺陷）+ `pnpm dev` 走查（chip 右上逐页遮挡检查：Home/设置/插件 main 视图/账户页；浮窗拖至右上与 chip 共存；Esc/点外关/reduced-motion 降级/键盘可达） — `tests/` — 验证
- [x] Knowledge 写回：`shell-chrome-design.md` 任务胶囊段改写为「壳层胶囊 Capsule」（固定命名/挂点/常驻策略/分区扩展点，StatusBar 段同步）+ `menu.md` 关键词行更新（补 胶囊/Capsule） — `shadow-docs/knowledge/shell-chrome-design.md`, `shadow-docs/menu.md` — 知识写回

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md（任务胶囊段重写为壳层胶囊 Capsule 段）；shadow-docs/menu.md（关键词行）
- **理由:** 命名/挂点/常驻策略属壳层 chrome 契约变化；tasks 贡献点契约本身不变，statusItems/floats 契约不变
