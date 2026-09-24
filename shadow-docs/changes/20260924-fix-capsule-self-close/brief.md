---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-fix-capsule-self-close",
  "type": "fix",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "fix/20260924-fix-capsule-self-close",
  "files": [
    "components/capsule/Capsule.tsx",
    "tests/capsule-render.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 63,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/63",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "4d70b6100af7027af89d47d5c00180a7416dc587",
    "verifiedAt": "2026-09-23T23:59:16.685Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:63",
    "planHash": "933f639751cec673deabce8938cedae88ec4c668206de1f818edae978eb0d383",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "修复胶囊 chip 点击即闭：React 18 离散事件时序导致点外关误伤",
      "body": "# 胶囊 chip 点击即闭修复：点外关监听器的 React 18 时序误伤\n\n## 动机\n用户实测（今日全新 dev 环境 + 最新 main，构建时间戳 20260923-1625Z 已确认非旧页面）：胶囊 chip 点击后面板弹不出，自 20260922-feature-shell-capsule（#49）引入该模式起一直如此。取证链：① happy-dom 组件测试中 chip 点击→面板挂载→再点关闭全部通过（逻辑层无恙）；② 真实 Chromium（dev 渲染器 + api shim）中 elementFromPoint 于 chip 中心返回 chip 自身，命中测试无任何遮挡；③ 真实坐标点击与程序化 click 对照——事件完整到达 chip（capture/bubble 全链路记录在案）但前者面板不开、后者正常。根因：**React 18 对离散事件（真实点击）同步刷新 passive effects**——chip 的 useEffect（注册 window 点外关监听）在同一次 click 冒泡抵达 window 之前执行完毕，于是\"打开面板的那次点击\"随即触发\"点外关\"，面板开而即闭。act() 语义与命中测试对此类时序 bug 均为盲区，这是四轮胶囊迭代未被发现的原因。\n\n## 引用规范\n- `shadow-docs/knowledge/shell-chrome-design.md`\n  - 当前结论: 胶囊面板 Esc/点外关由胶囊侧统一处理，面板内点击不冒泡；挂点/层级契约（pointer-events 链、z-index 参与规则）。\n  - 适用 scope: components/capsule —— 修复不得破坏点外关/Esc/面板内交互既有语义。\n- `shadow-docs/knowledge/editor.md`\n  - 当前结论: 胶囊与编辑器仅经 editor-commands 解耦。\n  - 适用 scope: chip 开合是纯本地 state，不涉及命令通道，零改动。\n\n## 决策\n- **选型:** 点外关 handler 增加 target 归属守卫——`Wrap` 挂 ref，handler 内 `wrapRef.current.contains(e.target)` 命中时直接忽略；其余逻辑不动。\n- **对比方案:** chip onClick 内 `e.stopPropagation()`——可行但把正确性寄托于传播顺序（React 根容器代理监听的 stopPropagation 恰好能截停后续冒泡），语义重且对\"未来在 chip 上再叠监听\"脆弱；effect 注册改 `setTimeout(0)` 延迟——时序 hack，测试与推理成本高，否。\n- **理由:** 归属守卫语义自明（\"胶囊内的点击不是外部点击\"）、与事件时序解耦、可直接用行为用例锁定；同时保住全部既有交互（chip 再点 = toggle 关闭、点面板内不关、点面板外关、Esc 关）。\n- **测试策略说明:** React 18 时序行为在 happy-dom（act 语义）下不可复现，故回归用例锁定**行为语义**（外关/内不关/toggle/Esc），真机点击验证走 Electron 手动路径。\n\n## 任务\n### Phase 1 修复与回归\n- [ ] Wrap 挂 ref，点外关 handler 增加 contains(target) 守卫 — `components/capsule/Capsule.tsx`\n- [ ] 行为回归用例：面板打开后 ① 点面板内不关闭 ② 点胶囊外区域关闭 ③ chip 再点 toggle 关闭 ④ Esc 关闭 — `tests/capsule-render.test.tsx`\n### Phase 2 真机验证与回归\n- [ ] Electron 手动路径：点 chip 弹出 → 点面板内按钮/空白不关 → 点面板外关 → Esc 关 → 再点 chip 复开；vitest 全量 + 双侧 tsc — 全仓\n\n## 结果\n- 实际耗时: —\n- 验证: —\n\n## 知识评估\n- **预期影响:** 更新\n- **候选卡片:** `shadow-docs/knowledge/shell-chrome-design.md`（胶囊交互段执行约束追加：浮层\"点外关\"一律用 target 归属守卫，禁止依赖 effect 注册与事件冒泡的时序关系——React 18 离散事件同步刷 passive effects 是长期平台事实）\n- **理由:** 点外关是壳层多处复用的交互模式（胶囊/快捷面板/子菜单），此次时序误伤是可复发的通用陷阱，须固化为约束。\n\n完整 brief：shadow-docs/changes/20260924-fix-capsule-self-close/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-fix-capsule-self-close\",\"type\":\"fix\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-fix-capsule-self-close/brief.md\",\"cliVersion\":\"1.1.0\",\"prUrl\":null,\"issueNumber\":null} -->",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 胶囊 chip 点击即闭修复：点外关监听器的 React 18 时序误伤

## 动机
用户实测（今日全新 dev 环境 + 最新 main，构建时间戳 20260923-1625Z 已确认非旧页面）：胶囊 chip 点击后面板弹不出，自 20260922-feature-shell-capsule（#49）引入该模式起一直如此。取证链：① happy-dom 组件测试中 chip 点击→面板挂载→再点关闭全部通过（逻辑层无恙）；② 真实 Chromium（dev 渲染器 + api shim）中 elementFromPoint 于 chip 中心返回 chip 自身，命中测试无任何遮挡；③ 真实坐标点击与程序化 click 对照——事件完整到达 chip（capture/bubble 全链路记录在案）但前者面板不开、后者正常。根因：**React 18 对离散事件（真实点击）同步刷新 passive effects**——chip 的 useEffect（注册 window 点外关监听）在同一次 click 冒泡抵达 window 之前执行完毕，于是"打开面板的那次点击"随即触发"点外关"，面板开而即闭。act() 语义与命中测试对此类时序 bug 均为盲区，这是四轮胶囊迭代未被发现的原因。

## 引用规范
- `shadow-docs/knowledge/shell-chrome-design.md`
  - 当前结论: 胶囊面板 Esc/点外关由胶囊侧统一处理，面板内点击不冒泡；挂点/层级契约（pointer-events 链、z-index 参与规则）。
  - 适用 scope: components/capsule —— 修复不得破坏点外关/Esc/面板内交互既有语义。
- `shadow-docs/knowledge/editor.md`
  - 当前结论: 胶囊与编辑器仅经 editor-commands 解耦。
  - 适用 scope: chip 开合是纯本地 state，不涉及命令通道，零改动。

## 决策
- **选型:** 点外关 handler 增加 target 归属守卫——`Wrap` 挂 ref，handler 内 `wrapRef.current.contains(e.target)` 命中时直接忽略；其余逻辑不动。
- **对比方案:** chip onClick 内 `e.stopPropagation()`——可行但把正确性寄托于传播顺序（React 根容器代理监听的 stopPropagation 恰好能截停后续冒泡），语义重且对"未来在 chip 上再叠监听"脆弱；effect 注册改 `setTimeout(0)` 延迟——时序 hack，测试与推理成本高，否。
- **理由:** 归属守卫语义自明（"胶囊内的点击不是外部点击"）、与事件时序解耦、可直接用行为用例锁定；同时保住全部既有交互（chip 再点 = toggle 关闭、点面板内不关、点面板外关、Esc 关）。
- **测试策略说明:** React 18 时序行为在 happy-dom（act 语义）下不可复现，故回归用例锁定**行为语义**（外关/内不关/toggle/Esc），真机点击验证走 Electron 手动路径。

## 任务
### Phase 1 修复与回归
- [x] Wrap 挂 ref，点外关 handler 增加 contains(target) 守卫 — `components/capsule/Capsule.tsx`
- [x] 行为回归用例：面板打开后 ① 点面板内不关闭 ② 点胶囊外区域关闭 ③ chip 再点 toggle 关闭 ④ Esc 关闭 — `tests/capsule-render.test.tsx`
### Phase 2 真机验证与回归
- [x] Electron 手动路径：点 chip 弹出 → 点面板内按钮/空白不关 → 点面板外关 → Esc 关 → 再点 chip 复开；vitest 全量 + 双侧 tsc — 全仓

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/shell-chrome-design.md`（胶囊交互段执行约束追加：浮层"点外关"一律用 target 归属守卫，禁止依赖 effect 注册与事件冒泡的时序关系——React 18 离散事件同步刷 passive effects 是长期平台事实）
- **理由:** 点外关是壳层多处复用的交互模式（胶囊/快捷面板/子菜单），此次时序误伤是可复发的通用陷阱，须固化为约束。
