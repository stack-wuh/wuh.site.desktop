---
{
  "schema": "shadow-dev/v1",
  "name": "20261103-refactor-shared-hooks-sweep",
  "type": "refactor",
  "scope": "lib,components",
  "status": "published",
  "baseBranch": "main",
  "branch": "refactor/20261103-refactor-shared-hooks-sweep",
  "files": [
    "components/capsule/Capsule.tsx",
    "components/ui/Dialog.tsx",
    "components/ui/MenuPopover.tsx",
    "lib/drafts.ts",
    "lib/feedback.ts",
    "lib/hooks/useDismissable.ts",
    "lib/hooks/useStore.ts",
    "tests/use-dismissable.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 175,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/175",
    "pullRequest": 180,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/180"
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:180",
    "planHash": "d4654321916fc4dd54cdcba9ae0fae33a205c9bac38b55b1009405b77d07f287",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[refactor] 共享 hooks 收敛：useDismissable + useStore 示范迁移",
      "titleRaw": "共享 hooks 收敛：useDismissable + useStore 示范迁移",
      "supplement": "证据化扫描发现 Esc/点外关守卫逻辑在 Dialog/MenuPopover/Capsule 三处重复（各带 React 18 离散事件时序防御），useSyncExternalStore 三参样板散布 20 文件。本变更新建 lib/hooks（desktop 自持，不跨仓引包）并做行为等价迁移；其余内联监听盘点后按需 amend 扩面；排在五个功能变更之后执行；详见 shadow-docs/changes/20261103-refactor-shared-hooks-sweep/brief.md",
      "body": "## 动机\n代码规范治理（用户要求单独立项）。证据化扫描（2026-11-03）发现两类真实重复：\n\n1. **Esc/点外关守卫逻辑 ×3**：`Dialog.tsx`、`MenuPopover.tsx`、`Capsule.tsx` 各自实现 window keydown(Esc) + click(点外) 双监听与 target 归属守卫——其中 Capsule 版本携带 `20260924-fix-capsule-self-close` 实证坑（React 18 离散事件同步刷 passive effects，打开那次点击仍冒泡到 window），同样的防御逻辑三处各自维护，下一处新浮层还会再抄一遍。\n2. **useSyncExternalStore 三参样板 ×20 文件**：`createStore` 产物形状统一（subscribe/get），消费端 `useSyncExternalStore(s, s.get, s.get)` 三元组样板散布 20 处，未收敛单参封装。\n\n扫描豁免（证据不足不成模式）：createStore 重复（已统一单实现）、超时包装重复（仅 2 处）、desktop 测试助手重复（未发现）。剩余 17 处内联 addEventListener 中非弹层类（快捷键/滚动监听等）本次不动，盘点结论随知识卡沉淀，后续按需扩面（change amend）。\n\n## 引用规范\n- 父仓库 norms 或 shared-hooks 知识（useEventListener/useClickOutside 族）\n  - 当前结论: 父仓共享 hooks 规范要求事件监听收敛 hook、副作用清理统一\n  - 适用 scope: lib/hooks, components/ui, components/capsule\n  - 遵循方式: desktop 设计同源自持（不跨仓引组件），按同等语义在 desktop 落 `lib/hooks/`\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: 弹层（Dialog/Popover）交互语义\n  - 适用 scope: components/ui\n  - 遵循方式: 迁移行为等价，Esc/点外关时序与守卫语义不变\n\n## 决策\n- **选型:** desktop 自持 `lib/hooks/useDismissable.ts` + `lib/hooks/useStore.ts`；本期迁移 Dialog/MenuPopover/Capsule 三处 + useStore 示范 2-3 点；其余内联监听盘点结论进知识卡，按需后续 amend。\n- **对比方案:** ①一次性收敛全部 17 处监听——触及面爆炸且多数不成模式，否决；②引父仓 hooks 包——违反设计同源策略（desktop 不消费站点组件库），否决。\n- **理由:** 三处弹层是同一坑位的三份防御副本，抽象收益最高；useStore 样板量最大但风险最低，示范迁移验证后再扩。\n\n## 任务\n### Phase 1\n- [ ] task 1 — `lib/hooks/useDismissable.ts` + `lib/hooks/useStore.ts` — 实现 + 单测（INV-1 时序坑用例钉住、INV-2 SSR 快照）— 新增\n### Phase 2\n- [ ] task 2 — `components/ui/Dialog.tsx` + `components/ui/MenuPopover.tsx` + `components/capsule/Capsule.tsx` — 迁移 useDismissable（行为等价）— 重构\n- [ ] task 3 — `lib/feedback.ts` + `lib/drafts.ts` — useStore 示范迁移（useFeedback/useDrafts 内部）— 重构\n### Phase 3\n- [ ] task 4 — 既有交互/DOM 测试回归（dialog/popover/capsule 相关套件）+ 新 hook 单测 — 验证\n- [ ] task 5 — 盘点结论落知识卡（剩余内联监听清单 + hook 使用规范）— 治理\n\n## 补充\n证据化扫描发现 Esc/点外关守卫逻辑在 Dialog/MenuPopover/Capsule 三处重复（各带 React 18 离散事件时序防御），useSyncExternalStore 三参样板散布 20 文件。本变更新建 lib/hooks（desktop 自持，不跨仓引包）并做行为等价迁移；其余内联监听盘点后按需 amend 扩面；排在五个功能变更之后执行；详见 shadow-docs/changes/20261103-refactor-shared-hooks-sweep/brief.md\n\n完整 brief：shadow-docs/changes/20261103-refactor-shared-hooks-sweep/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261103-refactor-shared-hooks-sweep\",\"type\":\"refactor\",\"scope\":\"lib,components\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261103-refactor-shared-hooks-sweep/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "refactor"
      ]
    },
    "commit": {
      "files": [
        "components/capsule/Capsule.tsx",
        "components/ui/Dialog.tsx",
        "components/ui/MenuPopover.tsx",
        "lib/drafts.ts",
        "lib/feedback.ts",
        "lib/hooks/useDismissable.ts",
        "lib/hooks/useStore.ts",
        "tests/use-dismissable.test.tsx"
      ],
      "message": "refactor(hooks): useDismissable + useStore 收敛三处弹层监听与三参样板 (#175)\n\n- 新建 lib/hooks/useDismissable：Esc+点外关统一承载（pointerEvent/escCapture/escStopPropagation 选项化），归属豁免与同帧时序坑（20260924-fix-capsule-self-close）单一实现\n- 新建 lib/hooks/useStore：useSyncExternalStore 三参样板收敛\n- 迁移：Dialog（Esc）/MenuPopover（mousedown+capture）/Capsule（click+豁免）+ useFeedback/useDrafts 示范\n- 行为等价：四套受影响渲染套件 35 绿 ×2 连跑；测试 4 枚（Esc/点外/豁免/变体透传）"
    }
  }
}
---

# 共享 hooks 收敛：useDismissable + useStore 示范迁移

## 动机

代码规范治理（用户要求单独立项）。证据化扫描（2026-11-03）发现两类真实重复：

1. **Esc/点外关守卫逻辑 ×3**：`Dialog.tsx`、`MenuPopover.tsx`、`Capsule.tsx` 各自实现 window keydown(Esc) + click(点外) 双监听与 target 归属守卫——其中 Capsule 版本携带 `20260924-fix-capsule-self-close` 实证坑（React 18 离散事件同步刷 passive effects，打开那次点击仍冒泡到 window），同样的防御逻辑三处各自维护，下一处新浮层还会再抄一遍。
2. **useSyncExternalStore 三参样板 ×20 文件**：`createStore` 产物形状统一（subscribe/get），消费端 `useSyncExternalStore(s, s.get, s.get)` 三元组样板散布 20 处，未收敛单参封装。

扫描豁免（证据不足不成模式）：createStore 重复（已统一单实现）、超时包装重复（仅 2 处）、desktop 测试助手重复（未发现）。剩余 17 处内联 addEventListener 中非弹层类（快捷键/滚动监听等）本次不动，盘点结论随知识卡沉淀，后续按需扩面（change amend）。

## 复杂度评级

- **评级:** M
- **理由:** 行为等价重构、不改契约（新 hook 是纯新增导出，迁移点消费签名不变）；有既有 DOM 渲染测试与交互测试护栏。
- **期望验证深度:** unit
- **取证策略:** assert-first（hook 单测：Esc 关闭/点内豁免/点外触发/reduced-motion 无关；迁移点既有测试全绿）

## 引用规范

- 父仓库 norms 或 shared-hooks 知识（useEventListener/useClickOutside 族）
  - 当前结论: 父仓共享 hooks 规范要求事件监听收敛 hook、副作用清理统一
  - 适用 scope: lib/hooks, components/ui, components/capsule
  - 遵循方式: desktop 设计同源自持（不跨仓引组件），按同等语义在 desktop 落 `lib/hooks/`
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: 弹层（Dialog/Popover）交互语义
  - 适用 scope: components/ui
  - 遵循方式: 迁移行为等价，Esc/点外关时序与守卫语义不变

## 领域模型

- **限界上下文:** 桌面端渲染层共享原语。反腐边界：不引入跨仓依赖、不改弹层业务语义、不动弹层样式。
- **统一语言增量:** 可关闭面（dismissable surface）：Esc + 点外双通道关闭、target 归属守卫豁免内部点击的浮层原语。
- **聚合与不变量:**
  - **INV-1** `useDismissable` 迁移后三处行为等价：Esc 关闭、面板内部点击不关闭（target 豁免）、点外关闭——含 React 18 离散事件时序坑（打开那次点击不误关）
  - **INV-2** `useStore(store)` 与直接三参 useSyncExternalStore 在 SSR 快照（getServerSnapshot 第三参）行为等价
  - **INV-3** 迁移不改动组件 DOM 结构与样式（diff 仅逻辑层）
- **领域事件:** 无。

## 决策

- **选型:** desktop 自持 `lib/hooks/useDismissable.ts` + `lib/hooks/useStore.ts`；本期迁移 Dialog/MenuPopover/Capsule 三处 + useStore 示范 2-3 点；其余内联监听盘点结论进知识卡，按需后续 amend。
- **对比方案:** ①一次性收敛全部 17 处监听——触及面爆炸且多数不成模式，否决；②引父仓 hooks 包——违反设计同源策略（desktop 不消费站点组件库），否决。
- **理由:** 三处弹层是同一坑位的三份防御副本，抽象收益最高；useStore 样板量最大但风险最低，示范迁移验证后再扩。

## 任务

### Phase 1
- [x] task 1 — `lib/hooks/useDismissable.ts` + `lib/hooks/useStore.ts` — 实现 + 单测（INV-1 时序坑用例钉住、INV-2 SSR 快照）— 新增
### Phase 2
- [x] task 2 — `components/ui/Dialog.tsx` + `components/ui/MenuPopover.tsx` + `components/capsule/Capsule.tsx` — 迁移 useDismissable（行为等价）— 重构
- [x] task 3 — `lib/feedback.ts` + `lib/drafts.ts` — useStore 示范迁移（useFeedback/useDrafts 内部）— 重构
### Phase 3
- [x] task 4 — 既有交互/DOM 测试回归（dialog/popover/capsule 相关套件）+ 新 hook 单测 — 验证
- [ ] task 5 — 盘点结论落知识卡（剩余内联监听清单 + hook 使用规范）— 治理

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 新增
- **候选卡片:** shadow-docs/knowledge/shared-hooks.md（desktop 自持 hooks 规范：useDismissable/useStore + 剩余内联监听盘点清单与豁免理由）
- **理由:** desktop 此前无 hooks 规范卡；本变更建立原语并钉住「何时必须抽 hook」的判定边界
