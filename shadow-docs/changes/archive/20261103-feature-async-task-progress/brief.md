---
{
  "schema": "shadow-dev/v1",
  "name": "20261103-feature-async-task-progress",
  "type": "feature",
  "scope": "lib/tasks,components/capsule,publish",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20261103-feature-async-task-progress",
  "files": [
    "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
    "lib/i18n/locales.ts",
    "lib/publish.ts",
    "lib/tasks.ts",
    "tests/tasks-host.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 172,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/172",
    "pullRequest": 177,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/177"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "ec7d8072fdce11a08e165a736e9fd5a56a14a590",
    "verifiedAt": "2026-11-04T00:11:55.240Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:177",
    "planHash": "001983038198acbccd943fbe664fc7e54b40f9c481d1af1b19a6f72553831ed2",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 任务胶囊承载宿主异步进度：发布链首个接入",
      "titleRaw": "任务胶囊承载宿主异步进度：发布链首个接入",
      "supplement": "异步交互过程不可见（只有笼统「发布中」）。确立任务胶囊时间线为唯一异步进度呈现面：宿主保留归属 host 直写 tasks 注册表（插件抢注拒绝），发布链 5 阶段（落盘→plan→execute→回写→同步）为首个消费者，失败回 pending+原因、重试复用任务。依赖 20261103-feature-publish-site-sync（#171）先行合入；详见 shadow-docs/changes/20261103-feature-async-task-progress/brief.md",
      "body": "## 动机\n用户反馈异步交互体验差（过程不可见、只有笼统「发布中」）。全量盘点 desktop 异步交互（详见决策表）后确立统一规范：**任务胶囊时间线为唯一异步进度呈现面**——复用既有 tasks 注册表（lib/tasks.ts，插件经帧协议写入），宿主长任务获得同等的进度/时间线/失败原因承载。发布链（落盘→CLI plan→execute→身份回写→站点同步）为首个接入方。\n\n依赖顺序：基于 `20261103-feature-publish-site-sync`（issue #171，同步步引入者）合入后执行；conflict inspect 预期报 EditorCommandHost.tsx / lib/publish.ts 重叠，按分支先后收敛。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: tasks 任务贡献点——注册表快照 store + commit() + useSyncExternalStore；运行时未声明 id 首报带 title 即动态创建（1-80 字符）；status pending|in_progress|done + progress{current,total} + detail；每归属可见任务 ≤8\n  - 适用 scope: lib/tasks.ts, components/capsule/CapsulePanel\n  - 遵循方式: 宿主直写复用同一注册表与同族校验（title 首报必填、≤8 上限、时间线排序），仅新增「host 为保留归属」守卫；本卡 tasks 段随本变更更新（verified-depth 回填）\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 文档操作经命令通道由常驻壳层 EditorCommandHost 单实例认领编排\n  - 适用 scope: components/capsule/sections/EditorSection/EditorCommandHost.tsx\n  - 遵循方式: 任务写入挂在 runPublish 各阶段（编排归命令宿主），磁贴只读状态不写任务\n\n## 决策\n- **选型:** 任务胶囊时间线唯一承载 + 宿主保留归属 `host` 直写；发布链为首个消费者。\n- **对比方案:** ①磁贴内进度条——呈现面碎片化，且磁贴空间小承载不了 5 阶段 detail；②每类异步各建 UI——重复建设，违背单一状态源；③本期同时改造上传/迁移等全部交互——触及面爆炸，拆后续变更按规范逐个接入。\n- **理由:** tasks 注册表已具备全部所需语义（progress/detail/时间线/失败原因），缺的只是宿主写入通道与保留归属守卫；发布链是最痛的异步长任务，先落地验证规范，其余交互后续按卡接入。\n\n### 异步交互盘点（规范结论，进知识卡片）\n\n| 交互 | 处置 |\n|---|---|\n| 发布链（5 阶段） | 本期接入 `host:publish` |\n| 图床上传 | 插件自有 UI + 可自接 wuh.tasks（已具备），不强制 |\n| 图片粘贴落盘 / 草稿防抖暂存 / 迁移复制 Dialog / 克隆工作区 / CLI 能力断言 | 豁免（毫秒级本地 IO、高频静默、已有模态聚焦反馈、入口未启用、并入发布任务 detail） |\n\n## 任务\n### Phase 1 — 基础设施\n- [ ] task 1 — `lib/tasks.ts` — 保留归属守卫：upsertTask/removeTask 对 pluginId === 'host' 的插件帧调用拒绝（帧协议层 svcTasks 传来源 pluginId，宿主直写不经此路径）；宿主直写 API 形状不变 — 实现 + 单测（INV-1 拒绝路径）\n- [ ] task 2 — `lib/publish.ts` — 发布阶段常量（stages 五元组 + i18n 键）与任务补丁构造纯函数（buildStagePatch: stage→{status,progress,detail 键}） — 实现 + 单测（INV-3 时序映射）\n### Phase 2 — 发布链接入\n- [ ] task 3 — `components/capsule/sections/EditorSection/EditorCommandHost.tsx` — runPublish 各阶段 upsertTask('host','publish',…)：进入置 in_progress+progress+detail，阶段推进单调；失败回 pending+原因；成功 done（含同步阶段，依赖 #171 合入） — 实现（INV-2/INV-3）\n- [ ] task 4 — `lib/i18n/locales.ts` — 阶段文案三语键（publish.stage.*） — 新增\n### Phase 3 — 测试与走查\n- [ ] task 5 — `tests/tasks-host.test.ts` + 编排测试扩展 — 保留守卫 / 五阶段时序 / 失败回退 / 重试复用（INV-1/2/3） — 断言\n- [ ] task 6 — 真机走查 — 发布全程任务胶囊时间线可见：五阶段推进、失败注入（断同步地址）回 pending 显示原因、重试不重建任务 — runtime 观察点\n\n## 补充\n异步交互过程不可见（只有笼统「发布中」）。确立任务胶囊时间线为唯一异步进度呈现面：宿主保留归属 host 直写 tasks 注册表（插件抢注拒绝），发布链 5 阶段（落盘→plan→execute→回写→同步）为首个消费者，失败回 pending+原因、重试复用任务。依赖 20261103-feature-publish-site-sync（#171）先行合入；详见 shadow-docs/changes/20261103-feature-async-task-progress/brief.md\n\n完整 brief：shadow-docs/changes/20261103-feature-async-task-progress/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261103-feature-async-task-progress\",\"type\":\"feature\",\"scope\":\"lib/tasks,components/capsule,publish\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261103-feature-async-task-progress/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
        "components/plugins/PluginFrameHost/frameServices.ts",
        "lib/i18n/locales.ts",
        "lib/publish.ts",
        "lib/tasks.ts",
        "tests/frame-services.test.tsx",
        "tests/tasks-host.test.ts"
      ],
      "message": "feat(tasks): 宿主任务通道 + 发布链四阶段进度时间线 (#172)\n\n- lib/tasks 保留归属 host：插件帧冒认写入一律拒绝（svcTasks 守卫），宿主直写注册表\n- lib/publish 阶段补丁：save→publish→writeback→sync 单调 progress + detail「阶段名 n/4」\n- runPublish 全程写 host:publish：失败降级 pending+原因、重试复用同一任务、竞态早退不悬挂\n- 三语键 5 枚；帧服务守卫 + 阶段补丁测试 8 枚全绿"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/publish-site-sync.md",
    "reason": "发布域结论沉淀至 publish-site-sync.md（menu 已路由）；真实走查 blog#175 全链取证"
  }
}
---

# 任务胶囊承载宿主异步进度：发布链首个接入（统一异步体验）

## 动机

用户反馈异步交互体验差（过程不可见、只有笼统「发布中」）。全量盘点 desktop 异步交互（详见决策表）后确立统一规范：**任务胶囊时间线为唯一异步进度呈现面**——复用既有 tasks 注册表（lib/tasks.ts，插件经帧协议写入），宿主长任务获得同等的进度/时间线/失败原因承载。发布链（落盘→CLI plan→execute→身份回写→站点同步）为首个接入方。

依赖顺序：基于 `20261103-feature-publish-site-sync`（issue #171，同步步引入者）合入后执行；conflict inspect 预期报 EditorCommandHost.tsx / lib/publish.ts 重叠，按分支先后收敛。

## 复杂度评级

- **评级:** L
- **理由:** ①契约变更——tasks 归属词表新增宿主保留命名空间 `host`（upsertTask 行为变更：插件抢注 host 归属必须拒绝）；②触及插件系统共享注册表语义；③发布编排多一个状态写面（时序正确性影响时间线呈现）。
- **期望验证深度:** unit
- **取证策略:** assert-first（保留字拒绝路径、五阶段 progress 时序、失败回退 pending、重试复用任务不重建）

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: tasks 任务贡献点——注册表快照 store + commit() + useSyncExternalStore；运行时未声明 id 首报带 title 即动态创建（1-80 字符）；status pending|in_progress|done + progress{current,total} + detail；每归属可见任务 ≤8
  - 适用 scope: lib/tasks.ts, components/capsule/CapsulePanel
  - 遵循方式: 宿主直写复用同一注册表与同族校验（title 首报必填、≤8 上限、时间线排序），仅新增「host 为保留归属」守卫；本卡 tasks 段随本变更更新（verified-depth 回填）
- shadow-docs/knowledge/editor.md
  - 当前结论: 文档操作经命令通道由常驻壳层 EditorCommandHost 单实例认领编排
  - 适用 scope: components/capsule/sections/EditorSection/EditorCommandHost.tsx
  - 遵循方式: 任务写入挂在 runPublish 各阶段（编排归命令宿主），磁贴只读状态不写任务

## 领域模型

- **限界上下文:** 桌面端异步任务呈现——tasks 注册表的归属模型扩展。上游 = 宿主长任务编排（发布链）；下游 = 任务胶囊时间线渲染。反腐边界：不改插件帧写入协议（wuh.tasks 语义零变化）、不改 server、不改 CLI。
- **统一语言增量:**
  - 宿主任务（host task）：宿主进程内长任务在任务注册表的投影，归属固定为保留命名空间 `host`。
  - 发布阶段（publish stage）：save → plan → execute → writeback → sync 五阶段，progress {current,total} 单调推进。
- **聚合与不变量:**
  - **INV-1** 插件经任何通道（帧协议 upsert/remove）以 `host` 归属写入一律拒绝（保留字，拒绝路径）；宿主直写不受影响
  - **INV-2** 发布任务全程单实例：runPublish 重入（busy 互斥已有）与重试都复用 `host:publish` 同一任务，不产生第二条
  - **INV-3** 五阶段 progress 单调不减、阶段文案与实际执行步骤一一对应；失败回 pending + detail 携带原因（既有语义），done 后不再变更
  - **INV-4** 豁免清单（粘贴落盘/草稿暂存/迁移 Dialog/克隆/CLI 断言）不产生任务——异步交互的规范边界进知识卡片
- **领域事件:** 任务注册表 commit 即渲染（useSyncExternalStore），无新事件面。

## 决策

- **选型:** 任务胶囊时间线唯一承载 + 宿主保留归属 `host` 直写；发布链为首个消费者。
- **对比方案:** ①磁贴内进度条——呈现面碎片化，且磁贴空间小承载不了 5 阶段 detail；②每类异步各建 UI——重复建设，违背单一状态源；③本期同时改造上传/迁移等全部交互——触及面爆炸，拆后续变更按规范逐个接入。
- **理由:** tasks 注册表已具备全部所需语义（progress/detail/时间线/失败原因），缺的只是宿主写入通道与保留归属守卫；发布链是最痛的异步长任务，先落地验证规范，其余交互后续按卡接入。

### 异步交互盘点（规范结论，进知识卡片）

| 交互 | 处置 |
|---|---|
| 发布链（5 阶段） | 本期接入 `host:publish` |
| 图床上传 | 插件自有 UI + 可自接 wuh.tasks（已具备），不强制 |
| 图片粘贴落盘 / 草稿防抖暂存 / 迁移复制 Dialog / 克隆工作区 / CLI 能力断言 | 豁免（毫秒级本地 IO、高频静默、已有模态聚焦反馈、入口未启用、并入发布任务 detail） |

## 任务

### Phase 1 — 基础设施
- [x] task 1 — `lib/tasks.ts` — 保留归属守卫：upsertTask/removeTask 对 pluginId === 'host' 的插件帧调用拒绝（帧协议层 svcTasks 传来源 pluginId，宿主直写不经此路径）；宿主直写 API 形状不变 — 实现 + 单测（INV-1 拒绝路径）
- [x] task 2 — `lib/publish.ts` — 发布阶段常量（stages 五元组 + i18n 键）与任务补丁构造纯函数（buildStagePatch: stage→{status,progress,detail 键}） — 实现 + 单测（INV-3 时序映射）
### Phase 2 — 发布链接入
- [x] task 3 — `components/capsule/sections/EditorSection/EditorCommandHost.tsx` — runPublish 各阶段 upsertTask('host','publish',…)：进入置 in_progress+progress+detail，阶段推进单调；失败回 pending+原因；成功 done（含同步阶段，依赖 #171 合入） — 实现（INV-2/INV-3）
- [x] task 4 — `lib/i18n/locales.ts` — 阶段文案三语键（publish.stage.*） — 新增
### Phase 3 — 测试与走查
- [x] task 5 — `tests/tasks-host.test.ts` + 编排测试扩展 — 保留守卫 / 五阶段时序 / 失败回退 / 重试复用（INV-1/2/3） — 断言
- [x] task 6 — 真机走查 — 发布全程任务胶囊时间线可见：五阶段推进、失败注入（断同步地址）回 pending 显示原因、重试不重建任务 — runtime 观察点

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md（tasks 段补宿主保留归属 `host` 与宿主直写通道 + 异步交互盘点豁免清单）；shadow-docs/knowledge/publish-site-sync.md（若 #171 变更新建卡，时间线为其呈现面——关联）
- **理由:** tasks 归属词表与异步交互呈现规范都是长期契约面；盘点结论（豁免清单）进卡避免后续重复调查。
