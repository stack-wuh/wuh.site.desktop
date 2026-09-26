---
{
  "schema": "shadow-dev/v1",
  "name": "20260925-refactor-lib-create-store",
  "type": "refactor",
  "scope": "lib,tests",
  "status": "archived",
  "baseBranch": "main",
  "branch": "refactor/20260925-refactor-lib-create-store",
  "files": [
    "lib/capsule.ts",
    "lib/createStore.ts",
    "lib/drafts.ts",
    "lib/events.ts",
    "lib/feedback.ts",
    "lib/floats.ts",
    "lib/identity.ts",
    "lib/statusItems.ts",
    "lib/store.ts",
    "lib/tasks.ts",
    "tests/create-store.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 104,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/104",
    "pullRequest": 105,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/105"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "55e50429880d62380485457235341da858147a07",
    "verifiedAt": "2026-09-26T15:37:10.969Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:105",
    "planHash": "220000ac87f11e032391e805c42e94b8676bc960daefdbd1e12c1143d682a163",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[refactor] refactor(lib): 抽取 createStore 收敛九处微 store 重复样板",
      "titleRaw": "refactor(lib): 抽取 createStore 收敛九处微 store 重复样板",
      "supplement": "lib/ 下 capsule/tasks/floats/statusItems/feedback/identity/drafts/store/events 约九处逐字重复的微 store 三件套收敛为 lib/createStore.ts；对外契约不变，全量绿灯测试护航。方案见 shadow-docs/changes/20260925-refactor-lib-create-store/brief.md",
      "body": "## 动机\nlib/ 下 capsule/tasks/floats/statusItems/feedback/identity/drafts/store/events 约九个模块各自手写同一套微 store 样板：模块级 `let state` + `Set<listeners>` + `emit()` + `subscribe`（供 useSyncExternalStore 消费），三件套逐字重复且随 store 域增加持续复制扩散，是全仓唯一成规模的重复实现。收敛到 lib/createStore.ts 后，既有九处单点维护、新增 store 域零样板。按渐进式治理，本轮只做这一件事，不顺手处理巨型组件与 lint（另立变更）。\n\n## 引用规范\n- norms/code-style.md\n  - 当前结论: 渐进式治理——收敛既存重复是合法抽象，禁为未来场景提前抽象；单一职责（300 行为信号）\n  - 适用 scope: 全仓\n- norms/tdd-verification.md\n  - 当前结论: M 级=绿灯测试，验证强度与评级匹配\n  - 适用 scope: 全仓\n- shadow-docs/knowledge/renderer-shell-routing.md、shell-chrome-design.md\n  - 当前结论: 渲染层 app/components/lib 既有约定；本次不改任何路由/chrome 行为，仅内部实现收敛\n  - 适用 scope: app, components, lib\n- shadow-docs/knowledge/ui-feedback.md、plugin-architecture.md\n  - 当前结论: feedback 与插件帧宿主消费相关 store；迁移后行为必须不变，列为回归关注面\n  - 适用 scope: lib/feedback.ts、components/plugins/PluginFrameHost.tsx 等\n\n## 决策\n- **选型:** 新建 lib/createStore.ts：`createStore<S>(initial)` 返回 `{ get, subscribe, commit(next | (cur) => S) }`；各模块持私有实例、内部保留各自 commit 包装，对外仍导出原 `{ get, subscribe }` 形状的 store 对象。函数式 commit 覆盖各模块快照差异（capsule 浅拷贝数组、tasks 排序拷贝、store.ts patch 合并）；reset*ForTests 等对外行为保持不变。\n- **对比方案:** ①引入 zustand 等状态库——新增依赖、迁移面失控，弃；②只迁移 shape 一致的子集——函数式 commit 已能覆盖差异，留下半吊子不一致毫无意义，弃；③连带巨型组件拆分——一次变更一个主题，另立变更，弃。\n- **理由:** 零依赖、零契约变化、全量绿灯测试可护航；shape 确有差异的模块（events/feedback 以实读为准）不强收，偏差记入结果段。\n\n## 任务\n### Phase 1 公共件与首批迁移\n- [ ] 新建 lib/createStore.ts（get/subscribe/commit，函数式快照）— `lib/createStore.ts`\n- [ ] createStore 专项单测：订阅/退订、commit 新引用广播、函数式快照 — `tests/create-store.test.ts`\n- [ ] 迁移首批三处 — `lib/capsule.ts`、`lib/tasks.ts`、`lib/store.ts`\n### Phase 2 其余迁移\n- [ ] 迁移四处 — `lib/floats.ts`、`lib/statusItems.ts`、`lib/identity.ts`、`lib/drafts.ts`\n- [ ] 迁移收尾两处（shape 有差异则记录不强收）— `lib/events.ts`、`lib/feedback.ts`\n### Phase 3 验证闭环\n- [ ] 全量 vitest 绿 + typecheck（三个 tsconfig）— `package.json`\n- [ ] 结果回填与知识影响复评 — `shadow-docs/changes/20260925-refactor-lib-create-store/brief.md`\n\n## 补充\nlib/ 下 capsule/tasks/floats/statusItems/feedback/identity/drafts/store/events 约九处逐字重复的微 store 三件套收敛为 lib/createStore.ts；对外契约不变，全量绿灯测试护航。方案见 shadow-docs/changes/20260925-refactor-lib-create-store/brief.md\n\n完整 brief：shadow-docs/changes/20260925-refactor-lib-create-store/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260925-refactor-lib-create-store\",\"type\":\"refactor\",\"scope\":\"lib,tests\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260925-refactor-lib-create-store/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "refactor"
      ]
    },
    "release": {
      "files": [
        "lib/capsule.ts",
        "lib/createStore.ts",
        "lib/drafts.ts",
        "lib/events.ts",
        "lib/feedback.ts",
        "lib/floats.ts",
        "lib/identity.ts",
        "lib/statusItems.ts",
        "lib/store.ts",
        "lib/tasks.ts",
        "shadow-docs/changes/20260925-refactor-lib-create-store/brief.md",
        "tests/create-store.test.ts"
      ],
      "message": "refactor(lib): 抽取 createStore 微 store 公共件——九处手写 state/listeners/emit/subscribe 三件套收敛（8/9 迁移；feedback 逐监听器异常隔离为语义特例按预案保留）；对外导出面零变化，全量 58 文件/501 用例 + 三 tsconfig typecheck 绿（Closes #104）",
      "title": "lib 微 store 三件套收敛为 createStore 公共件",
      "body": "Closes #104\n\n完整 brief：shadow-docs/changes/20260925-refactor-lib-create-store/brief.md"
    }
  },
  "knowledge": null
}
---

# lib 微 store 三件套收敛为 createStore 公共件

## 动机
lib/ 下 capsule/tasks/floats/statusItems/feedback/identity/drafts/store/events 约九个模块各自手写同一套微 store 样板：模块级 `let state` + `Set<listeners>` + `emit()` + `subscribe`（供 useSyncExternalStore 消费），三件套逐字重复且随 store 域增加持续复制扩散，是全仓唯一成规模的重复实现。收敛到 lib/createStore.ts 后，既有九处单点维护、新增 store 域零样板。按渐进式治理，本轮只做这一件事，不顺手处理巨型组件与 lint（另立变更）。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更=无（各模块导出的 store 名与形状不变，纯内部实现收敛）；触及面=lib 九文件+新增一文件，机械替换、无 UI/主进程改动；可发现性=中（store 模式遍布渲染层，但行为由既有测试锁定，另补 createStore 专项单测）。
- **期望验证深度:** unit

## 引用规范
- norms/code-style.md
  - 当前结论: 渐进式治理——收敛既存重复是合法抽象，禁为未来场景提前抽象；单一职责（300 行为信号）
  - 适用 scope: 全仓
- norms/tdd-verification.md
  - 当前结论: M 级=绿灯测试，验证强度与评级匹配
  - 适用 scope: 全仓
- shadow-docs/knowledge/renderer-shell-routing.md、shell-chrome-design.md
  - 当前结论: 渲染层 app/components/lib 既有约定；本次不改任何路由/chrome 行为，仅内部实现收敛
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/ui-feedback.md、plugin-architecture.md
  - 当前结论: feedback 与插件帧宿主消费相关 store；迁移后行为必须不变，列为回归关注面
  - 适用 scope: lib/feedback.ts、components/plugins/PluginFrameHost.tsx 等

## 决策
- **选型:** 新建 lib/createStore.ts：`createStore<S>(initial)` 返回 `{ get, subscribe, commit(next | (cur) => S) }`；各模块持私有实例、内部保留各自 commit 包装，对外仍导出原 `{ get, subscribe }` 形状的 store 对象。函数式 commit 覆盖各模块快照差异（capsule 浅拷贝数组、tasks 排序拷贝、store.ts patch 合并）；reset*ForTests 等对外行为保持不变。
- **对比方案:** ①引入 zustand 等状态库——新增依赖、迁移面失控，弃；②只迁移 shape 一致的子集——函数式 commit 已能覆盖差异，留下半吊子不一致毫无意义，弃；③连带巨型组件拆分——一次变更一个主题，另立变更，弃。
- **理由:** 零依赖、零契约变化、全量绿灯测试可护航；shape 确有差异的模块（events/feedback 以实读为准）不强收，偏差记入结果段。

## 任务
### Phase 1 公共件与首批迁移
- [x] 新建 lib/createStore.ts（get/subscribe/commit，函数式快照）— `lib/createStore.ts`
- [x] createStore 专项单测：订阅/退订、commit 新引用广播、函数式快照 — `tests/create-store.test.ts`
- [x] 迁移首批三处 — `lib/capsule.ts`、`lib/tasks.ts`、`lib/store.ts`
### Phase 2 其余迁移
- [x] 迁移四处 — `lib/floats.ts`、`lib/statusItems.ts`、`lib/identity.ts`、`lib/drafts.ts`
- [x] 迁移收尾两处（shape 有差异则记录不强收）— `lib/events.ts`、`lib/feedback.ts`
### Phase 3 验证闭环
- [x] 全量 vitest 绿 + typecheck（三个 tsconfig）— `package.json`
- [x] 结果回填与知识影响复评 — `shadow-docs/changes/20260925-refactor-lib-create-store/brief.md`

## 结果
- 实际耗时: 约 1.5h（含 worktree/node_modules 准备与机器 V8 段错误重试）
- 验证: 全量 vitest **58 文件 / 501 用例全绿**（基线 57/496 + createStore 专项 5 用例，先红后绿）；typecheck 三个 tsconfig（node/next/tests）全绿；分批回归 89（capsule/tasks/drafts 面）+ 55（identity/statusItems/drafts 面）+ 58（events/feedback 面）均先于全量通过
- 偏差与发现:
  1. **feedback.ts 未收敛**（预案内）：其 commit 需逐监听器 try/catch 隔离（console.error、不上抛），与 createStore「监听器异常原样上抛」的广播语义不同，强收即改变对外行为；已在 lib/feedback.ts 的 commit 处留约束注释。实际收敛 **8/9**。
  2. **drafts.ts reset 语义微调**：resetDraftsForTests 原有的 `subscribers.clear()` 移除——createStore 不暴露清空订阅者集合（既有 events reset 亦不清 store 监听者）；tests/drafts.test.ts 无直接订阅依赖，组件订阅经各自 effect 退订，行为等价。
  3. **floats.ts 无测试网**（盘点期已知）：全仓无直接引用 floats 的测试文件；迁移为与其余七处逐字同构的机械替换，靠 tsc 全绿与同构模式兜底，测试补齐归入后续「主进程与 lib 测试补齐」候选变更。
  4. 迁移模式：模块持私有 `createStore` 实例，函数体经 `const state = store.get()` 别名保持逐字等价；对外导出（store 名与形状、全部函数签名、reset*ForTests 行为）零变化。

## 知识评估
- **预期影响:** 无需变更（复评确认：createStore 为 lib 内部实现细节，消费侧约定——useSyncExternalStore 快照订阅 + get 兼任 server 快照第三参——已由 renderer-shell-routing.md 覆盖，不补记）
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（备选，未动）
- **理由:** 纯内部实现收敛，不改变任何已沉淀结论；store 消费方（组件/插件宿主）行为不变，全量回归佐证。
