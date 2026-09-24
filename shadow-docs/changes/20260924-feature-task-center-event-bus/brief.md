---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-task-center-event-bus",
  "type": "feature",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-task-center-event-bus",
  "files": [
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel.tsx",
    "components/plugins/PluginFrameHost.tsx",
    "lib/events.ts",
    "lib/i18n/locales.ts",
    "lib/tasks.ts",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "src/plugin-sdk/index.ts",
    "src/shared/plugin.ts",
    "tests/events.test.ts",
    "tests/plugin-tasks.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 65,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/65",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "4799156e0263784e9e496696ba527e566b5f2b24",
    "verifiedAt": "2026-09-24T03:15:23.287Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "4799156e0263784e9e496696ba527e566b5f2b24",
    "planHash": "2e2bbfa97e2f486587cb2aa924a2d9b3c4846e3bae6d68d6d055c3f30e6f5e0a",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 胶囊升级任务中心：渲染层事件总线 + 任务事件溯源 + 时间线任务流",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n后期会有大量插件接入、并发运行大量任务，现有胶囊面板（380px 三段滚动弹层）与声明制任务契约无法承载「集散地」定位：任务必须先在 manifest 声明（标题/跳转不可变，运行时只能改状态），插件无法在运行时动态触发新任务展示。本次把胶囊升级为**任务中心**：通用事件总线让任意插件随时发布事件（任务事件是第一种消费者），UI 重构为近满高大面板 + 单流时间线，内部交互（筛选、聚合、完成态、tab）着重设计。\n\n用户已确认四项设计决策：① 通用事件总线一步到位（非双轨、非声明制槽位）；② 大面板控制中心形态（chip 右上常驻不变）；③ 任务流单流优先（编辑器/插件模块降级为「模块」tab）；④ 会话内生命周期 + 完成保留可一键清空（不落盘）。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 壳层胶囊挂点契约（main 容器右上常驻、宿主无 z-index 不建层叠上下文、pointer-events 穿透、面板 z70 浮于浮窗低于 Dialog、贴 chip 向下弹出）；tasks/capsule 声明制贡献点与 SDK 帧协议（渲染层裁决、主进程 broker 不参与）；快照注册表同构模式（commit() 产新引用 + useSyncExternalStore + getServerSnapshot 第三参）；浮层点外关 target 归属守卫（20260924-fix-capsule-self-close）；胶囊动效属持续状态指示、reduced-motion 静态降级；文案经 useT() 三语；构建期禁 toLocaleString（hydration）\n  - 适用 scope: components/capsule, components/plugins, lib, src/shared, src/plugin-sdk\n\n## 决策\n- **选型:** 方案一——渲染层事件总线（`lib/events.ts` 纯逻辑模块，与 tasks/statusItems/floats 同构）+ 任务事件溯源（tasks.upsert/remove 变为 `tasks:*` 事件语法糖，事件流折叠出任务状态，未声明 id 首次 upsert 即动态创建）+ 大面板时间线任务中心。\n- **对比方案:** ① 主进程 broker 总线——未来可接系统事件源，但违背「渲染层裁决、broker 不参与」先例，双份状态 + IPC 复杂度，本期无系统事件源，不选；② 双轨制（事件通知 + 声明制 upsert 并存）——改动最小但两条写路径让插件作者困惑，不选；③ 声明制 + 流式槽位——注入面最小但「任意插件随时触发」打折扣，不选。\n- **理由:** 事件总线信封按可泛化设计（`{ id, type, pluginId, payload, ts }`，pluginId 由宿主按帧身份盖章防冒名），后期可长成完整事件体系而本期改动面可控；护栏（type 字符集、payload ≤4KB、每插件并发可见任务 ≤8、环形缓冲 200 条、订阅数上限）承接原声明制的注入面收敛职责。**与 active Knowledge 的「声明制优先」冲突点：tasks 特例退役**（manifest `tasks` 保留为可选预置，seed 静态任务与 viewId 跳转；statusBar/capsule 模块声明制不变），已在 propose 阶段与用户确认，apply 时同步知识卡。\n\n### UI 设计规划（frontend-design）\n\n视觉语言沿用壳层既有 token 体系（四主题 × 亮暗），胆量集中一处：**时间线脊线**——任务流左缘 2px 脊线把状态标串成事件流（进行中段 primary 流动，reduced-motion 静态渐隐），传达「任务不是列表项，是正在发生的事」。\n\n- 面板 420px 宽、max-height 近满高（视口-40px 封顶），贴 chip 向下弹出；挂点/层叠契约原样（宿主无 z-index、面板 z70、pointer-events 穿透）。\n- 头部：标题「任务中心」+ 细进度条（done/total，primary 填充）+ mono 计数 + 「清空已完成」（仅在有 done 时出现，不弹确认，行淡出移除）。\n- 「任务 | 模块」双 tab（role=tablist）；模块 tab = EditorSection + 插件模块 tiles（现状保留）。\n- 任务流排序：in_progress（最近事件倒序）→ pending（创建倒序）→「最近完成」小节（完成倒序，置灰 65%）。\n- 行解剖：脊线状态标（pending 空心/in_progress 旋转环/done 对勾）+ 标题 + 来源插件徽标（图标+id 小 chip）+ 进度（n/m mono + 细条）+ detail 次行 + 相对时间（自算 s/m/h，禁 toLocaleString）；viewId 行整行可点跳转（「查看 ›」），无 viewId 纯展示。\n- 筛选：全部/进行中/已完成 chips（aria-pressed，会话内组件态）+ 插件 pill（≥2 插件有任务才出现，横向滚动）。\n- 交互细节：面板开着时新任务行 150ms 淡入（reduced-motion 关）；任务三态契约不变（失败原因走 detail，不加 failed 态）；空态分「等待插件任务」与「无匹配任务」两种；Esc/点外关沿用 target 归属守卫。\n- a11y：dialog 语义、筛选 aria-pressed、时间线 role=list、键盘遍历、reduced-motion 全静态；文案全部 useT() 三语新键。\n\n## 任务\n### Phase 1 事件总线核心\n- [ ] lib/events.ts：事件信封/发布（宿主盖章 pluginId）/订阅/环形缓冲 200 条/护栏校验（type 字符集 `[a-z0-9][a-z0-9._:*-]`、payload ≤4KB、订阅数上限），快照 + commit() 新引用同构 — `lib/events.ts` — 新建\n- [ ] tests/events.test.ts：盖章防冒名、护栏拒绝、缓冲截断、订阅/退订、getServerSnapshot — `tests/events.test.ts` — 新建\n- [ ] 帧协议 events 服务：ToHostMessage service 联合加 `'events'`（publish/subscribe/unsubscribe）— `src/shared/plugin.ts` — 修改\n- [ ] PluginFrameHost 接入：handleFrameInvoke events case（publish 入总线、subscribe/unsubscribe 登记）、总线派发经 pushToFrame 投递到订阅帧 — `components/plugins/PluginFrameHost.tsx` — 修改\n- [ ] SDK 扩展：wuh.events（publish/subscribe/unsubscribe），wuh.on 事件接收对齐信封 — `src/plugin-sdk/index.ts` — 修改\n\n### Phase 2 任务事件溯源\n- [ ] lib/tasks.ts 改造：未声明 id 首次 upsert 动态创建（首报必须带 title）、每插件并发可见任务 ≤8 护栏、保留 manifest 预置 seed 与 clearPluginTasks — `lib/tasks.ts` — 修改\n- [ ] tasks.upsert/remove 转为 tasks:upsert/tasks:remove 事件发布（host 内转，行为对插件透明）— `components/plugins/PluginFrameHost.tsx` — 修改\n- [ ] tests/plugin-tasks.test.ts：动态创建、title 首报校验、≤8 护栏、预置兼容用例 — `tests/plugin-tasks.test.ts` — 修改\n\n### Phase 3 任务中心 UI\n- [ ] CapsulePanel 重构：任务|模块双 tab 架构 + 头部聚合（进度条/计数/清空已完成）— `components/capsule/CapsulePanel.tsx` — 重构\n- [ ] 时间线任务流：脊线 + 状态标 + 来源徽标 + 进度 + 相对时间 + 筛选 chips + 插件 pill + 空态 — `components/capsule/CapsulePanel.tsx` — 新增\n- [ ] Capsule chip 聚合标签语义对齐（保持解剖与挂点契约不变）— `components/capsule/Capsule.tsx` — 微调\n- [ ] 三语文案新键（tab/筛选/清空/空态/时间线）— `lib/i18n/locales.ts` — 修改\n\n### Phase 4 知识与验证\n- [ ] 知识卡更新：事件总线扩展点段、tasks 声明制退役（保留为可选预置）、任务中心信息架构、挂点契约不变声明 — `shadow-docs/knowledge/shell-chrome-design.md` — 更新\n- [ ] pnpm test 全绿；真机走查（多插件并发任务、筛选、清空已完成、Esc/点外关、reduced-motion、四主题）— 用户手动验收\n\n完整 brief：shadow-docs/changes/20260924-feature-task-center-event-bus/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-feature-task-center-event-bus\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-feature-task-center-event-bus/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 胶囊升级任务中心：渲染层事件总线 + 任务事件溯源 + 时间线任务流

## 动机

后期会有大量插件接入、并发运行大量任务，现有胶囊面板（380px 三段滚动弹层）与声明制任务契约无法承载「集散地」定位：任务必须先在 manifest 声明（标题/跳转不可变，运行时只能改状态），插件无法在运行时动态触发新任务展示。本次把胶囊升级为**任务中心**：通用事件总线让任意插件随时发布事件（任务事件是第一种消费者），UI 重构为近满高大面板 + 单流时间线，内部交互（筛选、聚合、完成态、tab）着重设计。

用户已确认四项设计决策：① 通用事件总线一步到位（非双轨、非声明制槽位）；② 大面板控制中心形态（chip 右上常驻不变）；③ 任务流单流优先（编辑器/插件模块降级为「模块」tab）；④ 会话内生命周期 + 完成保留可一键清空（不落盘）。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 壳层胶囊挂点契约（main 容器右上常驻、宿主无 z-index 不建层叠上下文、pointer-events 穿透、面板 z70 浮于浮窗低于 Dialog、贴 chip 向下弹出）；tasks/capsule 声明制贡献点与 SDK 帧协议（渲染层裁决、主进程 broker 不参与）；快照注册表同构模式（commit() 产新引用 + useSyncExternalStore + getServerSnapshot 第三参）；浮层点外关 target 归属守卫（20260924-fix-capsule-self-close）；胶囊动效属持续状态指示、reduced-motion 静态降级；文案经 useT() 三语；构建期禁 toLocaleString（hydration）
  - 适用 scope: components/capsule, components/plugins, lib, src/shared, src/plugin-sdk

## 决策

- **选型:** 方案一——渲染层事件总线（`lib/events.ts` 纯逻辑模块，与 tasks/statusItems/floats 同构）+ 任务事件溯源（tasks.upsert/remove 变为 `tasks:*` 事件语法糖，事件流折叠出任务状态，未声明 id 首次 upsert 即动态创建）+ 大面板时间线任务中心。
- **对比方案:** ① 主进程 broker 总线——未来可接系统事件源，但违背「渲染层裁决、broker 不参与」先例，双份状态 + IPC 复杂度，本期无系统事件源，不选；② 双轨制（事件通知 + 声明制 upsert 并存）——改动最小但两条写路径让插件作者困惑，不选；③ 声明制 + 流式槽位——注入面最小但「任意插件随时触发」打折扣，不选。
- **理由:** 事件总线信封按可泛化设计（`{ id, type, pluginId, payload, ts }`，pluginId 由宿主按帧身份盖章防冒名），后期可长成完整事件体系而本期改动面可控；护栏（type 字符集、payload ≤4KB、每插件并发可见任务 ≤8、环形缓冲 200 条、订阅数上限）承接原声明制的注入面收敛职责。**与 active Knowledge 的「声明制优先」冲突点：tasks 特例退役**（manifest `tasks` 保留为可选预置，seed 静态任务与 viewId 跳转；statusBar/capsule 模块声明制不变），已在 propose 阶段与用户确认，apply 时同步知识卡。

### UI 设计规划（frontend-design）

视觉语言沿用壳层既有 token 体系（四主题 × 亮暗），胆量集中一处：**时间线脊线**——任务流左缘 2px 脊线把状态标串成事件流（进行中段 primary 流动，reduced-motion 静态渐隐），传达「任务不是列表项，是正在发生的事」。

- 面板 420px 宽、max-height 近满高（视口-40px 封顶），贴 chip 向下弹出；挂点/层叠契约原样（宿主无 z-index、面板 z70、pointer-events 穿透）。
- 头部：标题「任务中心」+ 细进度条（done/total，primary 填充）+ mono 计数 + 「清空已完成」（仅在有 done 时出现，不弹确认，行淡出移除）。
- 「任务 | 模块」双 tab（role=tablist）；模块 tab = EditorSection + 插件模块 tiles（现状保留）。
- 任务流排序：in_progress（最近事件倒序）→ pending（创建倒序）→「最近完成」小节（完成倒序，置灰 65%）。
- 行解剖：脊线状态标（pending 空心/in_progress 旋转环/done 对勾）+ 标题 + 来源插件徽标（图标+id 小 chip）+ 进度（n/m mono + 细条）+ detail 次行 + 相对时间（自算 s/m/h，禁 toLocaleString）；viewId 行整行可点跳转（「查看 ›」），无 viewId 纯展示。
- 筛选：全部/进行中/已完成 chips（aria-pressed，会话内组件态）+ 插件 pill（≥2 插件有任务才出现，横向滚动）。
- 交互细节：面板开着时新任务行 150ms 淡入（reduced-motion 关）；任务三态契约不变（失败原因走 detail，不加 failed 态）；空态分「等待插件任务」与「无匹配任务」两种；Esc/点外关沿用 target 归属守卫。
- a11y：dialog 语义、筛选 aria-pressed、时间线 role=list、键盘遍历、reduced-motion 全静态；文案全部 useT() 三语新键。

## 任务

### Phase 1 事件总线核心
- [x] lib/events.ts：事件信封/发布（宿主盖章 pluginId）/订阅/环形缓冲 200 条/护栏校验（type 字符集 `[a-z0-9][a-z0-9._:*-]`、payload ≤4KB、订阅数上限），快照 + commit() 新引用同构 — `lib/events.ts` — 新建
- [x] tests/events.test.ts：盖章防冒名、护栏拒绝、缓冲截断、订阅/退订、getServerSnapshot — `tests/events.test.ts` — 新建
- [x] 帧协议 events 服务：ToHostMessage service 联合加 `'events'`（publish/subscribe/unsubscribe）— `src/shared/plugin.ts` — 修改
- [x] PluginFrameHost 接入：handleFrameInvoke events case（publish 入总线、subscribe/unsubscribe 登记）、总线派发经 pushToFrame 投递到订阅帧 — `components/plugins/PluginFrameHost.tsx` — 修改
- [x] SDK 扩展：wuh.events（publish/subscribe/unsubscribe），wuh.on 事件接收对齐信封 — `src/plugin-sdk/index.ts` — 修改

### Phase 2 任务事件溯源
- [x] lib/tasks.ts 改造：未声明 id 首次 upsert 动态创建（首报必须带 title）、每插件并发可见任务 ≤8 护栏、保留 manifest 预置 seed 与 clearPluginTasks — `lib/tasks.ts` — 修改
- [x] tasks.upsert/remove 转为 tasks:upsert/tasks:remove 事件发布（host 内转，行为对插件透明）— `components/plugins/PluginFrameHost.tsx` — 修改
- [x] tests/plugin-tasks.test.ts：动态创建、title 首报校验、≤8 护栏、预置兼容用例 — `tests/plugin-tasks.test.ts` — 修改

### Phase 3 任务中心 UI
- [x] CapsulePanel 重构：任务|模块双 tab 架构 + 头部聚合（进度条/计数/清空已完成）— `components/capsule/CapsulePanel.tsx` — 重构
- [x] 时间线任务流：脊线 + 状态标 + 来源徽标 + 进度 + 相对时间 + 筛选 chips + 插件 pill + 空态 — `components/capsule/CapsulePanel.tsx` — 新增
- [x] Capsule chip 聚合标签语义对齐（保持解剖与挂点契约不变）— `components/capsule/Capsule.tsx` — 微调
- [x] 三语文案新键（tab/筛选/清空/空态/时间线）— `lib/i18n/locales.ts` — 修改

### Phase 4 知识与验证
- [x] 知识卡更新：事件总线扩展点段、tasks 声明制退役（保留为可选预置）、任务中心信息架构、挂点契约不变声明 — `shadow-docs/knowledge/shell-chrome-design.md` — 更新
- [x] pnpm test 全绿；真机走查（多插件并发任务、筛选、清空已完成、Esc/点外关、reduced-motion、四主题）— 用户手动验收

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** tasks 声明制契约退役（保留为可选预置）属契约级变更；新增 events 总线扩展点（信封/护栏/投递链路）需立卡；胶囊面板信息架构重写（任务流单流 + tab + 挂点契约不变）需整段同步。
