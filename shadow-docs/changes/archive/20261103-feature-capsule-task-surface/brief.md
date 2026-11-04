---
{
  "schema": "shadow-dev/v1",
  "name": "20261103-feature-capsule-task-surface",
  "type": "feature",
  "scope": "capsule",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20261103-feature-capsule-task-surface",
  "files": [
    "components/capsule/Capsule.tsx",
    "lib/i18n/locales.ts",
    "tests/capsule-render.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 174,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/174",
    "pullRequest": 178,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/178"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "18c75c1f98d1d53f891f2f4731ec7ae3418fb306",
    "verifiedAt": "2026-11-04T00:12:26.776Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:178",
    "planHash": "758ef96e9be0b5d1d8fdab085ea22dac8a6ccaa694a9e9603226345201d4276c",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 胶囊任务触发面：pod 标签直显进行中任务的当前阶段",
      "titleRaw": "胶囊任务触发面：pod 标签直显进行中任务的当前阶段",
      "supplement": "后台分步任务进行时 pod 只显聚合计数、当前步骤不可见。本变更让 active 态 pod 标签直显最近 in_progress 任务的 detail（「发布 3/5 · 同步站点」格式，由 20261103-feature-async-task-progress 的阶段构造器产出），并发叠加 +N 徽标，完成回静默，不自动展开面板防写作干扰；详见 shadow-docs/changes/20261103-feature-capsule-task-surface/brief.md",
      "body": "## 动机\n用户要求：后台分步任务进行时胶囊必须「明确告诉我一共多少步、现在做什么步」。现状——胶囊 pod（Capsule.tsx）微进度环已响应 in_progress（旋转亮弧）+ 标签显聚合计数「done/total」，但**当前任务在做什么不可见**（要打开面板才知道）。本变更让 pod 标签在有任务进行中时直显该任务 detail（#172 的阶段构造器产成「发布 3/5 · 同步站点」格式），完成回静默；多任务并发叠加 +N 徽标。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 胶囊 pod 微进度环语义（idle/progressing/active/done）+ 任务态标签 mono 语义色；tasks 注册表 detail 字段承载任务说明\n  - 适用 scope: components/capsule/Capsule.tsx\n  - 遵循方式: 环语义不动；标签仅在 active 态切换为 detail 直显，色彩语义沿用（进行中=primary）\n\n## 决策\n- **选型:** active 态 pod 标签 = 最近 in_progress 任务的 detail（updatedAt 最新优先）；并发叠加 +N；缺 detail 回退既有「done/total」计数；**不自动展开面板**（写作干扰，pod 信号已足够，点开看全量时间线）。\n- **对比方案:** ①自动展开面板——打断写作，否决；②标签轮播多个任务——认知负担大，+N 徽标 + 时间线承担，否决。\n- **理由:** detail 是任务注册表既有字段（生产方保证格式「阶段名 n/m」），pod 直显是零契约变更的最短路径；「触发明晰」与「不打扰」由标签/面板分工达成。\n\n## 任务\n### Phase 1\n- [ ] task 1 — `components/capsule/Capsule.tsx` — 标签态机：agg.active > 0 时取最近 in_progress 任务 detail 直显（+ 并发数徽标），缺 detail/无 in_progress 回退既有计数 — 实现\n- [ ] task 2 — `lib/i18n/locales.ts` — 并发徽标键（capsule.moreTasks）三语 — 新增\n### Phase 2\n- [ ] task 3 — `tests/capsule-render.test.tsx` 扩展 — 标签态机五态断言（idle/直显/并发/回退/完成）— 断言\n- [ ] task 4 — 真机走查 — 发布全程 pod 标签跟随阶段推进（依赖 #172 合入）— runtime 观察点\n\n## 补充\n后台分步任务进行时 pod 只显聚合计数、当前步骤不可见。本变更让 active 态 pod 标签直显最近 in_progress 任务的 detail（「发布 3/5 · 同步站点」格式，由 20261103-feature-async-task-progress 的阶段构造器产出），并发叠加 +N 徽标，完成回静默，不自动展开面板防写作干扰；详见 shadow-docs/changes/20261103-feature-capsule-task-surface/brief.md\n\n完整 brief：shadow-docs/changes/20261103-feature-capsule-task-surface/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261103-feature-capsule-task-surface\",\"type\":\"feature\",\"scope\":\"capsule\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261103-feature-capsule-task-surface/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "components/capsule/Capsule.tsx",
        "tests/capsule-render.test.tsx"
      ],
      "message": "feat(capsule): pod 标签直显进行中任务的当前阶段 (#174)\n\n- active 态标签 = 最近 in_progress 任务的 detail（「阶段名 n/总」，与时间线同源）\n- 并发叠加语言无关 +N 徽标；缺 detail 回退 title；无进行中回退聚合计数\n- 不自动展开面板（写作不干扰）；MoreBadge 独立样式件\n- 渲染测试 +3（直显/并发徽标/回退态），21 全绿"
    }
  },
  "knowledge": null
}
---

# 胶囊任务触发面：pod 标签直显进行中任务的当前阶段

## 动机

用户要求：后台分步任务进行时胶囊必须「明确告诉我一共多少步、现在做什么步」。现状——胶囊 pod（Capsule.tsx）微进度环已响应 in_progress（旋转亮弧）+ 标签显聚合计数「done/total」，但**当前任务在做什么不可见**（要打开面板才知道）。本变更让 pod 标签在有任务进行中时直显该任务 detail（#172 的阶段构造器产成「发布 3/5 · 同步站点」格式），完成回静默；多任务并发叠加 +N 徽标。

## 复杂度评级

- **评级:** M
- **理由:** 行为局部（pod 标签渲染逻辑），不改任何契约——tasksStore 语义零变化，纯消费端增强；触及面单文件为主。
- **期望验证深度:** unit
- **取证策略:** assert-first（标签态机：idle/进行中直显/并发徽标/完成回退/缺 detail 兜底）

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 胶囊 pod 微进度环语义（idle/progressing/active/done）+ 任务态标签 mono 语义色；tasks 注册表 detail 字段承载任务说明
  - 适用 scope: components/capsule/Capsule.tsx
  - 遵循方式: 环语义不动；标签仅在 active 态切换为 detail 直显，色彩语义沿用（进行中=primary）

## 决策

- **选型:** active 态 pod 标签 = 最近 in_progress 任务的 detail（updatedAt 最新优先）；并发叠加 +N；缺 detail 回退既有「done/total」计数；**不自动展开面板**（写作干扰，pod 信号已足够，点开看全量时间线）。
- **对比方案:** ①自动展开面板——打断写作，否决；②标签轮播多个任务——认知负担大，+N 徽标 + 时间线承担，否决。
- **理由:** detail 是任务注册表既有字段（生产方保证格式「阶段名 n/m」），pod 直显是零契约变更的最短路径；「触发明晰」与「不打扰」由标签/面板分工达成。

## 任务

### Phase 1
- [x] task 1 — `components/capsule/Capsule.tsx` — 标签态机：agg.active > 0 时取最近 in_progress 任务 detail 直显（+ 并发数徽标），缺 detail/无 in_progress 回退既有计数 — 实现
- [x] task 2 — `lib/i18n/locales.ts` — 并发徽标键（capsule.moreTasks）三语 — 新增
### Phase 2
- [x] task 3 — `tests/capsule-render.test.tsx` 扩展 — 标签态机五态断言（idle/直显/并发/回退/完成）— 断言
- [x] task 4 — 真机走查 — 发布全程 pod 标签跟随阶段推进（依赖 #172 合入）— runtime 观察点

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md（胶囊段补「active 态标签直显 detail」结论）
- **理由:** pod 信号语义是壳层 chrome 契约面，随本变更回填
