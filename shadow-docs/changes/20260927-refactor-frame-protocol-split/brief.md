---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-refactor-frame-protocol-split",
  "type": "refactor",
  "scope": "components,tests",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "refactor/20260927-refactor-frame-protocol-split",
  "files": [
    "components/plugins/PluginFrameHost/frameProtocol.ts",
    "components/plugins/PluginFrameHost/frameServices.ts",
    "tests/frame-services.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 119,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/119",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "368857ffecc75a13c1d92bd7008f4822c00797d0",
    "verifiedAt": "2026-09-27T08:24:06.417Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:119",
    "planHash": "887a394437dc4f7a8071494550b8e39d793167242c22b742e28f500aa6fd2c1b",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[refactor] refactor(plugin-frame): frameProtocol 服务分流独立成帧服务层（协议词表零变化）",
      "titleRaw": "refactor(plugin-frame): frameProtocol 服务分流独立成帧服务层（协议词表零变化）",
      "supplement": "frameProtocol.ts（662 行）分层：协议层（帧生命周期/握手/接线）+ 新建 frameServices.ts 服务层（handleFrameInvoke 与七个 service 处理函数，权限裁决/方法路由/参数钳制）并补单测；对插件帧协议 kind/service 词表与 host 导出面零变化，plugin-* 最强测试网护航。方案见 shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md",
      "body": "## 动机\nframeProtocol.ts（662 行）在巨型拆分中被判定为「协议+模块级状态拓扑的单一职责整体」整块保留，但其中 `handleFrameInvoke` 的 8 个 service 分流（cap/doc/render/ui/statusBar/tasks/capsule/events，约 210 行）与帧生命周期/握手/接线（openFrame/closeFrame/wireHostOnce）性质不同——前者是权限裁决 + 方法路由 + 参数钳制的**服务层**，后者才是协议层。测试网补齐（前置 change）落地后，本变更把服务层独立出来并补单测，协议层降到 ~450 行。\n\n## 引用规范\n- shadow-docs/knowledge/plugin-architecture.md：协议 kind 词表三方同步、CAPABILITY_METHODS 白名单、单写方语义——服务层搬移必须逐字保留权限词与注释\n- norms/code-style.md：单一职责（服务层与协议层是两个可独立理解/验证的职责）\n- norms/tdd-verification.md：M 级=绿灯测试\n\n## 决策\n- **选型:** 新建 `components/plugins/PluginFrameHost/frameServices.ts`：导出 `handleFrameInvoke`（签名不变），内部按 service 拆 `svcDoc/svcRender/svcUi/svcStatusBar/svcTasks/svcCapsule/svcEvents` 私有处理函数；frameProtocol 保留状态拓扑（records/sessions/frames/hostWorkspace）并以内部访问器（sessionOf/requirePermission/currentDocState 等最小导出，不经 index 汇出）供服务层消费；index.tsx 对外导出面零变化。新增 `tests/frame-services.test.ts`：权限拒绝、未知方法/服务、参数钳制（toast 必填 text）、tasks 写穿事件信封、频率护栏额度。\n- **对比方案:** ①8 个 service 各自独立文件——粒度过细、共享状态穿参噪音大，弃；②维持现状——服务层可测性诉求（权限/钳制/路由矩阵）无法落单测，弃。\n- **理由:** 一层一职责（协议层管帧生命周期，服务层管能力调用），共享状态以访问器单向流动，全量绿灯 + 新增单测双重护航。\n\n## 任务\n### Phase 1\n- [ ] 新建 frameServices.ts：handleFrameInvoke + 七个 service 处理函数迁入，frameProtocol 保留协议层——`components/plugins/PluginFrameHost/`\n- [ ] 服务层单测（权限/路由/钳制/护栏/事件信封）——`tests/frame-services.test.ts`\n### Phase 2\n- [ ] 插件域全量回归：plugin-* 九件 + 全量 vitest——`tests/`\n- [ ] 三 tsconfig typecheck + brief 结果回填——`shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md`\n\n## 补充\nframeProtocol.ts（662 行）分层：协议层（帧生命周期/握手/接线）+ 新建 frameServices.ts 服务层（handleFrameInvoke 与七个 service 处理函数，权限裁决/方法路由/参数钳制）并补单测；对插件帧协议 kind/service 词表与 host 导出面零变化，plugin-* 最强测试网护航。方案见 shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md\n\n完整 brief：shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-refactor-frame-protocol-split\",\"type\":\"refactor\",\"scope\":\"components,tests\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "refactor"
      ]
    },
    "release": {
      "files": [
        "components/plugins/PluginFrameHost/frameProtocol.ts",
        "components/plugins/PluginFrameHost/frameServices.ts",
        "shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md",
        "tests/frame-services.test.tsx"
      ],
      "message": "refactor(plugin-frame): frameProtocol 服务分流独立成帧服务层 frameServices——八 service 权限裁决/方法路由/参数钳制 + 10 用例单测（路由/权限拒绝/钳制/频率护栏/tasks 事件信封）；协议 kind/service 词表与对外导出面零变化，插件域 56 用例 + 全量 59 文件/511 用例单次全绿，三 tsconfig PASS（Closes #119）",
      "title": "refactor(plugin-frame): 帧宿主分层——服务分流独立成 frameServices（协议词表零变化）",
      "body": "Closes #119\n\n完整 brief：shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/plugin-architecture.md",
    "reason": "帧宿主分层为协议层（frameProtocol：帧生命周期/握手/接线）与服务层（frameServices：八 service 权限裁决/方法路由/参数钳制），对外协议词表与导出面零变化；frame-services 10 用例 + 插件域 56 用例 + 全量 59 文件/511 用例单次全绿 + 三 tsconfig PASS。卡片增补分层边界一句，release 时补 verified-depth: unit 与 verified-scope"
  }
}
---

# frameProtocol 再拆：service 分流独立成帧服务层

## 动机
frameProtocol.ts（662 行）在巨型拆分中被判定为「协议+模块级状态拓扑的单一职责整体」整块保留，但其中 `handleFrameInvoke` 的 8 个 service 分流（cap/doc/render/ui/statusBar/tasks/capsule/events，约 210 行）与帧生命周期/握手/接线（openFrame/closeFrame/wireHostOnce）性质不同——前者是权限裁决 + 方法路由 + 参数钳制的**服务层**，后者才是协议层。测试网补齐（前置 change）落地后，本变更把服务层独立出来并补单测，协议层降到 ~450 行。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更=无（对插件帧的消息协议 kind/service 词表、host 导出面零变化，纯内部重组）；触及面=插件帧宿主核心单文件域；可发现性=中高（plugin-broker/protocol/capsule 等 9 个测试文件是全仓最强测试网，另补服务层单测）。
- **期望验证深度:** unit

## 引用规范
- shadow-docs/knowledge/plugin-architecture.md：协议 kind 词表三方同步、CAPABILITY_METHODS 白名单、单写方语义——服务层搬移必须逐字保留权限词与注释
- norms/code-style.md：单一职责（服务层与协议层是两个可独立理解/验证的职责）
- norms/tdd-verification.md：M 级=绿灯测试

## 决策
- **选型:** 新建 `components/plugins/PluginFrameHost/frameServices.ts`：导出 `handleFrameInvoke`（签名不变），内部按 service 拆 `svcDoc/svcRender/svcUi/svcStatusBar/svcTasks/svcCapsule/svcEvents` 私有处理函数；frameProtocol 保留状态拓扑（records/sessions/frames/hostWorkspace）并以内部访问器（sessionOf/requirePermission/currentDocState 等最小导出，不经 index 汇出）供服务层消费；index.tsx 对外导出面零变化。新增 `tests/frame-services.test.ts`：权限拒绝、未知方法/服务、参数钳制（toast 必填 text）、tasks 写穿事件信封、频率护栏额度。
- **对比方案:** ①8 个 service 各自独立文件——粒度过细、共享状态穿参噪音大，弃；②维持现状——服务层可测性诉求（权限/钳制/路由矩阵）无法落单测，弃。
- **理由:** 一层一职责（协议层管帧生命周期，服务层管能力调用），共享状态以访问器单向流动，全量绿灯 + 新增单测双重护航。

## 任务
### Phase 1
- [x] 新建 frameServices.ts：handleFrameInvoke + 七个 service 处理函数迁入，frameProtocol 保留协议层——`components/plugins/PluginFrameHost/`
- [x] 服务层单测（权限/路由/钳制/护栏/事件信封）——`tests/frame-services.test.ts`
### Phase 2
- [x] 插件域全量回归：plugin-* 九件 + 全量 vitest——`tests/`
- [x] 三 tsconfig typecheck + brief 结果回填——`shadow-docs/changes/20260927-refactor-frame-protocol-split/brief.md`

## 结果
- 实际耗时: 约 1.5h（含三 tsconfig/node 段错误重试与两轮测试断言语义修正）
- 验证: frame-services 单测 10/10 绿（路由/权限拒绝/参数钳制/频率护栏/tasks 事件信封）；插件域回归 5 文件 56 用例绿；三 tsconfig typecheck 全 PASS；全量确认跑 **59 文件 / 511 用例单次全绿**（基线 58/501 + 本变更新增 frame-services 10 用例；负载 13→5 回落后一次通过，此前 3+3 连续段错误系另一会话并发测试造成的负载堆积）
- 偏差与发现:
  1. **测试文件后缀按 node tsconfig 惯例落 .tsx**: node 侧程序 exclude `tests/**/*.tsx`（DOM 测试不进无 DOM lib 的主程序）；frame-services 测试引用 DOM 型 frameProtocol，故为 `frame-services.test.tsx`。
  2. **statusBar/capsule 的声明制守卫是「抛错」而非静默**（未声明条目 update/remove 均 rejects 未声明）——初版测试误设「返回 null 不抛」，已改为断言拒绝本身，契约更清晰。
  3. **频率护栏为模块级共享实例**（无 reset API）：护栏用例改为「循环至拒绝、断言拒绝文案」的配额无关写法，避免用例间顺序耦合。
  4. frameProtocol 由 662 行降至约 460 行；frameServices 约 230 行；对外导出面（index）零变化。

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/plugin-architecture.md
- **理由:** 增补「帧宿主分层：协议层（frameProtocol）/服务层（frameServices）」一句与各自边界；release 时按 verified-depth: unit 复评写入。
