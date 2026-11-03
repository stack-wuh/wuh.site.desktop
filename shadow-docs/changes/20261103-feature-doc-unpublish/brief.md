---
{
  "schema": "shadow-dev/v1",
  "name": "20261103-feature-doc-unpublish",
  "type": "feature",
  "scope": "publish,capsule",
  "status": "published",
  "baseBranch": "main",
  "branch": "feature/20261103-feature-doc-unpublish",
  "files": [
    "components/capsule/CapsulePanel/ControlSections.tsx",
    "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
    "components/palette/index.tsx",
    "lib/editor-commands.ts",
    "lib/i18n/locales.ts",
    "lib/publish.ts",
    "src/main/github/issues.ts",
    "src/main/ipc.ts",
    "src/main/publishCli.ts",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "tests/publish-cli.test.ts",
    "tests/publish-unpublish.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 173,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/173",
    "pullRequest": 179,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/179"
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:179",
    "planHash": "e6b5f7be0c14fbd7bcf5595cad71fa9e084327e6a3463d9033ec46ca1523b21a",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 文章下架：命令通道 unpublishDoc（CLI 优先 + 内置降级）",
      "titleRaw": "文章下架：命令通道 unpublishDoc（CLI 优先 + 内置降级）",
      "supplement": "desktop 无法下架已发布文章。close=下架（站点过滤 open，DB 保留对账）。本变更接入命令通道：词表 unpublishDoc、CLI unpublish 优先/内置 githubSetIssueState 降级、磁贴右键+命令面板入口、frontmatter issue 号保留（重新上架=再发布）；依赖 shadow-dev-cli 20261103-feature-blog-unpublish（#75）发版；详见 shadow-docs/changes/20261103-feature-doc-unpublish/brief.md",
      "body": "## 动机\n发布生命周期在 desktop 只到 create/update，无法下架已发布文章。语义（已确认）：GitHub Issues 无删除，**close = 下架**——站点内容全量过滤 `state: 'open'`，close 后站点不可见、DB 保留对账；重新发布 = 重新上架（CLI update 路径补 `state:'open'`，companion：shadow-dev-cli `20261103-feature-blog-unpublish`，需其发版后联调）。本变更把下架接入 desktop 命令通道：命令面板 + 磁贴右键入口，CLI 优先、内置降级，结果进横幅与任务时间线。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 编辑器功能入口一律收进壳层胶囊并经命令通道（publishEditorCommand）下发，EditorCommandHost 常驻壳层单实例认领\n  - 适用 scope: lib/editor-commands.ts, components/capsule/sections/EditorSection/EditorCommandHost.tsx\n  - 遵循方式: 词表新增 `{ kind: 'unpublishDoc' }`；命令面板与磁贴右键都只发布命令，编排归命令宿主\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 磁贴语言（方印 Tile + aria 语义）；tasks 注册表任务承载进度/失败原因\n  - 适用 scope: components/capsule\n  - 遵循方式: 磁贴右键菜单走既有 MenuPopover 模式；下架任务 `host:unpublish`（若 20261103-feature-async-task-progress 已合入则时间线可见，注册表写入本身无硬依赖）\n- 父仓库 shadow-docs/knowledge/desktop-app-architecture.md\n  - 当前结论: 网络/凭证操作收敛主进程；凭证不进报错\n  - 适用 scope: src/main/github/issues.ts\n  - 遵循方式: 降级通道 `githubSetIssueState` 复用既有 Octokit client 与凭证链\n\n## 决策\n- **选型:** 方案 A——CLI 统一（`blog unpublish`），desktop 命令通道接入 + 内置降级；入口 = 命令面板「下架当前文章」+ 发布磁贴右键菜单。\n- **对比方案:** ①desktop 内置直 PATCH 无 CLI——用户已裁定通道统一，否决（内置仅降级）；②下架后清 frontmatter issue 号——身份灭失，重新发布会双建 issue，否决；③入口仅命令面板——磁贴右键成本低且贴近操作直觉，并列保留。\n- **理由:** 下架与发布共用身份/凭证/双通道框架，增量最小；issue 号保留使「下架→再发布」= 原文重新上架而非新建。\n- **待确认点:** 跨会话真实态查询（磁贴会话内缓存重启丢失）→ 后续变更扩 `ui.publishState` 按需查询 GitHub state；server webhook 对 closed 事件会 dispatch 无效 archive-change（博客 issue 号非 change 名，产生噪音红 run）→ server 仓后续修。\n\n## 任务\n### Phase 1 — 主进程\n- [ ] task 1 — `src/main/publishCli.ts` — unpublish 能力断言（help blog 输出含 unpublish）+ `unpublishViaCli(filePath)`（plan→execute 链、token env 注入、脱敏，载荷断言 INV-2）— 实现 + 单测\n- [ ] task 2 — `src/main/github/issues.ts` + `src/shared/types.ts` + `src/preload/index.ts` — `githubSetIssueState(issueNumber, 'open'|'closed')` 降级通道（复用 client()）+ 契约透传 — 实现\n### Phase 2 — 编排与入口\n- [ ] task 3 — `lib/editor-commands.ts` + `EditorCommandHost.tsx` — 词表 `unpublishDoc` + 认领：preflight（INV-1）→ CLI 优先/降级（INV-3）→ 横幅 + `publish` 事件负载扩展 state（INV-4）→ busy 互斥（INV-5）— 实现 + 单测\n- [ ] task 4 — `lib/publish.ts` + `ControlSections.tsx` — 磁贴已下架态（会话内缓存）+ 右键菜单「下架本文」（MenuPopover）+ 命令面板注册 — 实现 + DOM 测试\n### Phase 3 — 测试\n- [ ] task 5 — `tests/publish-unpublish.test.ts` 等 — preflight 拒绝/载荷断言/降级分流/状态呈现/事件负载 — 断言\n### Phase 4\n- [ ] task 6 — 真机走查（依赖 CLI 发版）— 下架→站点不可见→再发布→重新上架（同 issue 号不双建）→ CLI 缺失降级 — runtime 观察点\n\n## 补充\ndesktop 无法下架已发布文章。close=下架（站点过滤 open，DB 保留对账）。本变更接入命令通道：词表 unpublishDoc、CLI unpublish 优先/内置 githubSetIssueState 降级、磁贴右键+命令面板入口、frontmatter issue 号保留（重新上架=再发布）；依赖 shadow-dev-cli 20261103-feature-blog-unpublish（#75）发版；详见 shadow-docs/changes/20261103-feature-doc-unpublish/brief.md\n\n完整 brief：shadow-docs/changes/20261103-feature-doc-unpublish/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261103-feature-doc-unpublish\",\"type\":\"feature\",\"scope\":\"publish,capsule\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261103-feature-doc-unpublish/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "components/capsule/CapsulePanel/ControlSections.tsx",
        "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
        "components/palette/index.tsx",
        "lib/editor-commands.ts",
        "lib/i18n/locales.ts",
        "lib/publish.ts",
        "src/main/github/issues.ts",
        "src/main/ipc.ts",
        "src/main/publishCli.ts",
        "src/preload/index.ts",
        "src/shared/types.ts",
        "tests/publish-cli.test.ts",
        "tests/publish-unpublish.test.ts"
      ],
      "message": "feat(publish): 文章下架——unpublishDoc 命令通道，CLI 优先 + 内置降级 (#173)\n\n- publishCli：unpublish 能力断言（help blog 含 unpublish）+ unpublishViaCli plan→execute 链，参数组装按动词分流\n- 内置降级 githubSetIssueState（PATCH state，close=下架 open=重新上架）\n- 词表 unpublishDoc + EditorCommandHost 编排：无号拒绝、busy 互斥、下架后 issue 号保留（重新上架=再发布）、会话内下架态 + publish 事件负载扩 state\n- 磁贴下架态（灰显「已下架 #N · 点击重新发布」）+ MenuPopover 下拉「下架本文」+ 命令面板入口\n- 三语键 9 枚；定向测试 68 绿、三 tsc 绿"
    }
  }
}
---

# 文章下架：命令通道 unpublishDoc（CLI 优先 + 内置降级）

## 动机

发布生命周期在 desktop 只到 create/update，无法下架已发布文章。语义（已确认）：GitHub Issues 无删除，**close = 下架**——站点内容全量过滤 `state: 'open'`，close 后站点不可见、DB 保留对账；重新发布 = 重新上架（CLI update 路径补 `state:'open'`，companion：shadow-dev-cli `20261103-feature-blog-unpublish`，需其发版后联调）。本变更把下架接入 desktop 命令通道：命令面板 + 磁贴右键入口，CLI 优先、内置降级，结果进横幅与任务时间线。

## 复杂度评级

- **评级:** L
- **理由:** ①契约变更——命令词表新增 `unpublishDoc`、DesktopApi 新增 `githubSetIssueState`（降级通道）；②跨模块数据流——入口（命令面板/磁贴）→ 命令通道 → EditorCommandHost → CLI/内置双通道 → 状态呈现（磁贴/时间线）；③外向副作用（关线上 issue），误操作直接影响站点可见性。
- **期望验证深度:** unit + runtime
- **取证策略:** assert-first（preflight 拒绝路径、双通道分流、载荷断言、状态呈现、重试语义）

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: 编辑器功能入口一律收进壳层胶囊并经命令通道（publishEditorCommand）下发，EditorCommandHost 常驻壳层单实例认领
  - 适用 scope: lib/editor-commands.ts, components/capsule/sections/EditorSection/EditorCommandHost.tsx
  - 遵循方式: 词表新增 `{ kind: 'unpublishDoc' }`；命令面板与磁贴右键都只发布命令，编排归命令宿主
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 磁贴语言（方印 Tile + aria 语义）；tasks 注册表任务承载进度/失败原因
  - 适用 scope: components/capsule
  - 遵循方式: 磁贴右键菜单走既有 MenuPopover 模式；下架任务 `host:unpublish`（若 20261103-feature-async-task-progress 已合入则时间线可见，注册表写入本身无硬依赖）
- 父仓库 shadow-docs/knowledge/desktop-app-architecture.md
  - 当前结论: 网络/凭证操作收敛主进程；凭证不进报错
  - 适用 scope: src/main/github/issues.ts
  - 遵循方式: 降级通道 `githubSetIssueState` 复用既有 Octokit client 与凭证链

## 领域模型

- **限界上下文:** 桌面端文章生命周期——发布（已上线）/下架（本变更）。上游 = 文档 frontmatter `issue` 号（唯一身份）；下游 = CLI blog unpublish 或主进程 Octokit PATCH state。反腐边界：不改 CLI 仓、不改 server。
- **统一语言增量:** 下架（unpublish）：close 关联 issue 并同步站点 DB；已下架态（unpublished）：frontmatter `issue` 号保留（身份不灭），呈现层标记。
- **聚合与不变量:**
  - **INV-1** frontmatter 无 `issue` 号 → 不可下架（未发布态），入口禁用/拒绝并提示（拒绝路径）
  - **INV-2** 下架请求载荷只含 `state:'closed'`（绝不携带 title/body/labels——防下架误改内容）
  - **INV-3** CLI 不可用（available:false）才降级 `githubSetIssueState`；执行阶段错误原样上抛不降级
  - **INV-4** 下架成功后 frontmatter `issue` 号**保留不动**（重新上架=再发布 update），呈现层（磁贴会话内缓存）转「已下架 #N」；横幅明示
  - **INV-5** 下架操作 busy 互斥（与发布共用 publishBusy 信号源，同时刻仅一个生命周期操作）
- **领域事件:** 下架成功广播 `documentEvents.emit('publish', {path, issueNumber, state:'closed'})`（事件负载扩展 state）→ Frontmatter 面板与磁贴刷新。

## 决策

- **选型:** 方案 A——CLI 统一（`blog unpublish`），desktop 命令通道接入 + 内置降级；入口 = 命令面板「下架当前文章」+ 发布磁贴右键菜单。
- **对比方案:** ①desktop 内置直 PATCH 无 CLI——用户已裁定通道统一，否决（内置仅降级）；②下架后清 frontmatter issue 号——身份灭失，重新发布会双建 issue，否决；③入口仅命令面板——磁贴右键成本低且贴近操作直觉，并列保留。
- **理由:** 下架与发布共用身份/凭证/双通道框架，增量最小；issue 号保留使「下架→再发布」= 原文重新上架而非新建。
- **待确认点:** 跨会话真实态查询（磁贴会话内缓存重启丢失）→ 后续变更扩 `ui.publishState` 按需查询 GitHub state；server webhook 对 closed 事件会 dispatch 无效 archive-change（博客 issue 号非 change 名，产生噪音红 run）→ server 仓后续修。

## 任务

### Phase 1 — 主进程
- [x] task 1 — `src/main/publishCli.ts` — unpublish 能力断言（help blog 输出含 unpublish）+ `unpublishViaCli(filePath)`（plan→execute 链、token env 注入、脱敏，载荷断言 INV-2）— 实现 + 单测
- [x] task 2 — `src/main/github/issues.ts` + `src/shared/types.ts` + `src/preload/index.ts` — `githubSetIssueState(issueNumber, 'open'|'closed')` 降级通道（复用 client()）+ 契约透传 — 实现
### Phase 2 — 编排与入口
- [x] task 3 — `lib/editor-commands.ts` + `EditorCommandHost.tsx` — 词表 `unpublishDoc` + 认领：preflight（INV-1）→ CLI 优先/降级（INV-3）→ 横幅 + `publish` 事件负载扩展 state（INV-4）→ busy 互斥（INV-5）— 实现 + 单测
- [x] task 4 — `lib/publish.ts` + `ControlSections.tsx` — 磁贴已下架态（会话内缓存）+ 右键菜单「下架本文」（MenuPopover）+ 命令面板注册 — 实现 + DOM 测试
### Phase 3 — 测试
- [x] task 5 — `tests/publish-unpublish.test.ts` 等 — preflight 拒绝/载荷断言/降级分流/状态呈现/事件负载 — 断言
### Phase 4
- [ ] task 6 — 真机走查（依赖 CLI 发版）— 下架→站点不可见→再发布→重新上架（同 issue 号不双建）→ CLI 缺失降级 — runtime 观察点

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md（词表 +unpublishDoc）；shadow-docs/knowledge/publish-site-sync.md（若已建，生命周期事件负载扩展）
- **理由:** 命令词表与发布事件契约面随本变更扩容，卡片需回填
