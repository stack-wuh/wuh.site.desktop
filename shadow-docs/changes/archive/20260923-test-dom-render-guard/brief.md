---
{
  "schema": "shadow-dev/v1",
  "name": "20260923-test-dom-render-guard",
  "type": "test",
  "scope": "tests",
  "status": "archived",
  "baseBranch": "main",
  "branch": "test/20260923-test-dom-render-guard",
  "files": [
    "package.json",
    "tests/capsule-render.test.tsx",
    "tests/helpers/dom-env.tsx",
    "vitest.config.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 59,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/59",
    "pullRequest": 60,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/60"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "c69ff704e4bc413ff5ee7fd4cd0df857c90b2762",
    "verifiedAt": "2026-09-23T13:08:08.054Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:60",
    "planHash": "c829e0297f2b8d65b14a35f2cf57f66e093fe57e5b71b7e7d2e25b7eb6a57ebc",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[test] 引入 DOM 渲染测试环境，堵住渲染期结构缺陷的验证缺口",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n20260923-fix-capsule-doc-card-nesting 的 button 嵌套 hydration 报错能穿过完整验证链（vitest 252 项 + 双侧 tsc + build 全绿）直达用户控制台，根因是仓库无 DOM 测试环境：vitest 跑 node 环境，React 渲染期校验（非法 DOM 嵌套、无效 props、缺失 key）与真实挂载行为全部不可见，仅有源码级正则扫描（capsule-nesting.test.ts）能兜一部分。本次引入 DOM 环境并把「渲染零 React 告警 + DOM 结构约束」变成可执行的回归守卫，进 `npm test`（review 每次必跑的本地验证门禁）。\n\n## 引用规范\n- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）\n  - 当前结论: 模块卡二分（交互型 `ModuleCard`/button 与内容型 `ModulePanel`/div，内容型禁嵌交互卡），已由 `tests/capsule-nesting.test.ts` 源码级守卫锁定\n  - 适用 scope: DOM 测试作为该约束的运行时补强（源码扫描只能覆盖胶囊面且是启发式），二者并存不互相替代\n- shadow-docs/knowledge/build-config.md（build）\n  - 当前结论: 仓库 CI quality-gate 仅覆盖站点侧 typecheck/lint，`apps/desktop` 不在流水线内\n  - 适用 scope: 本变更的价值落点是 `apps/desktop` 的本地验证门禁（`npm test`），不改 CI 配置\n\n## 决策\n- **选型:** 引入 happy-dom + @testing-library/react（+ @testing-library/dom 显式 peer），以 vitest docblock（`// @vitest-environment happy-dom`）按文件启用 DOM 环境（node 测试保持原速），新增渲染冒烟测试：spy `console.error` 断言渲染期零 React 告警 + DOM 结构断言（`button button` 计数为 0、控制中心三区 role 齐备、文档卡为内容容器且含动作钮）\n- **对比方案:** (a) 只保留源码级正则守卫——启发式、覆盖面窄、无法覆盖渲染期校验，否决；(b) 制品渲染冒烟（静态导出 + window.api stub + 浏览器断言）——保真度最高但需浏览器依赖、慢且脆，且 desktop 无 CI 时仅是一条手动脚本，列非目标（该手法本会话已验证可行，需要时按需重跑）\n- **理由:** 进程内渲染毫秒级、无浏览器依赖、直接命中本次缺陷的检出机制（React dev 版 validateDOMNesting 经 console.error 报出）；DOM 环境按文件启用不拖慢既有 252 项 node 测试\n\n## 任务\n### Phase 1\n- [ ] 依赖与 DOM 环境：装 happy-dom/@testing-library/react/@testing-library/dom，vitest include 扩到 tsx — `package.json` `vitest.config.ts` — 修改\n- [ ] DOM 测试助手：window.api/localStorage/next-navigation 最小 stub + console.error 采集断言工具 — `tests/helpers/dom-env.tsx` — 新增\n- [ ] 渲染冒烟测试：CapsulePanel 与 EditorSection 渲染零 React 告警 + 结构断言（无 button 嵌套、三区 role、文档卡容器与动作钮） — `tests/capsule-render.test.tsx` — 新增\n- [ ] 反向验证守卫有效性：临时还原 button 嵌套结构 → 测试必须失败（红证据）→ 还原修复 → 绿 — — 验证\n- [ ] 全量验证：vitest（node + DOM 双环境）、双侧 tsc、build — — 验证\n\n完整 brief：shadow-docs/changes/20260923-test-dom-render-guard/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260923-test-dom-render-guard\",\"type\":\"test\",\"scope\":\"tests\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260923-test-dom-render-guard/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "test"
      ]
    }
  },
  "knowledge": null
}
---

# 引入 DOM 渲染测试环境，堵住渲染期结构缺陷的验证缺口

## 动机

20260923-fix-capsule-doc-card-nesting 的 button 嵌套 hydration 报错能穿过完整验证链（vitest 252 项 + 双侧 tsc + build 全绿）直达用户控制台，根因是仓库无 DOM 测试环境：vitest 跑 node 环境，React 渲染期校验（非法 DOM 嵌套、无效 props、缺失 key）与真实挂载行为全部不可见，仅有源码级正则扫描（capsule-nesting.test.ts）能兜一部分。本次引入 DOM 环境并把「渲染零 React 告警 + DOM 结构约束」变成可执行的回归守卫，进 `npm test`（review 每次必跑的本地验证门禁）。

## 引用规范

- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）
  - 当前结论: 模块卡二分（交互型 `ModuleCard`/button 与内容型 `ModulePanel`/div，内容型禁嵌交互卡），已由 `tests/capsule-nesting.test.ts` 源码级守卫锁定
  - 适用 scope: DOM 测试作为该约束的运行时补强（源码扫描只能覆盖胶囊面且是启发式），二者并存不互相替代
- shadow-docs/knowledge/build-config.md（build）
  - 当前结论: 仓库 CI quality-gate 仅覆盖站点侧 typecheck/lint，`apps/desktop` 不在流水线内
  - 适用 scope: 本变更的价值落点是 `apps/desktop` 的本地验证门禁（`npm test`），不改 CI 配置

## 决策

- **选型:** 引入 happy-dom + @testing-library/react（+ @testing-library/dom 显式 peer），以 vitest docblock（`// @vitest-environment happy-dom`）按文件启用 DOM 环境（node 测试保持原速），新增渲染冒烟测试：spy `console.error` 断言渲染期零 React 告警 + DOM 结构断言（`button button` 计数为 0、控制中心三区 role 齐备、文档卡为内容容器且含动作钮）
- **对比方案:** (a) 只保留源码级正则守卫——启发式、覆盖面窄、无法覆盖渲染期校验，否决；(b) 制品渲染冒烟（静态导出 + window.api stub + 浏览器断言）——保真度最高但需浏览器依赖、慢且脆，且 desktop 无 CI 时仅是一条手动脚本，列非目标（该手法本会话已验证可行，需要时按需重跑）
- **理由:** 进程内渲染毫秒级、无浏览器依赖、直接命中本次缺陷的检出机制（React dev 版 validateDOMNesting 经 console.error 报出）；DOM 环境按文件启用不拖慢既有 252 项 node 测试

## 任务

### Phase 1
- [x] 依赖与 DOM 环境：装 happy-dom/@testing-library/react/@testing-library/dom，vitest include 扩到 tsx — `package.json` `vitest.config.ts` — 修改
- [x] DOM 测试助手：window.api/localStorage/next-navigation 最小 stub + console.error 采集断言工具 — `tests/helpers/dom-env.tsx` — 新增
- [x] 渲染冒烟测试：CapsulePanel 与 EditorSection 渲染零 React 告警 + 结构断言（无 button 嵌套、三区 role、文档卡容器与动作钮） — `tests/capsule-render.test.tsx` — 新增
- [x] 反向验证守卫有效性：临时还原 button 嵌套结构 → 测试必须失败（红证据）→ 还原修复 → 绿 — — 验证
- [x] 全量验证：vitest（node + DOM 双环境）、双侧 tsc、build — — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/desktop-app-architecture.md
- **理由:** 该卡的「验证方式」段需补入 DOM 渲染测试能力（happy-dom + RTL、per-file 环境、渲染期告警断言进 npm test）——这是 desktop 应用验证手段的长期有效事实，后续渲染类缺陷审查看这一条即可
