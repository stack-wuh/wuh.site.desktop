---
{
  "schema": "shadow-dev/v1",
  "name": "20261021-docs-domain-map",
  "type": "docs",
  "scope": "shadow-docs",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": null,
  "files": [
    "shadow-docs/changes/20261021-docs-domain-map/brief.md",
    "shadow-docs/domain.md"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 166,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/166",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "a54e92fb64cff0107d1971070c165c1891cb8f3b",
    "verifiedAt": "2026-10-21T15:36:09.460Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:166",
    "planHash": "3a079ead5385d2f2f537bfaf91d66593521aa8c35c574c08b9e76aaf99b8dba7",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[docs] 建立 apps/desktop 上下文地图",
      "titleRaw": "建立 apps/desktop 上下文地图",
      "supplement": "新增 shadow-docs/domain.md：登记 main-process / renderer-ui / plugin 三个限界上下文的职责、上下游、主目录与术语表增量；只写文档，不改代码与知识卡结论。详见 brief。",
      "body": "## 动机\n`apps/desktop` 已有 renderer-ui、plugin、main-process 等多个限界上下文，但缺 `shadow-docs/domain.md`；`norms/domain-model.md` 要求多上下文项目维护上下文地图，并规定知识卡 `domain:` 取值必须来自地图登记名。20261021-fix-workbench-entry-return 只在 brief 写了候选归属 renderer-ui，不能顺手补地图，故单独立项。\n\n本变更只登记上下文归属、上下游、主目录与项目术语；不写实现过程，不新增知识卡，不改写现有 active 结论。\n\n## 引用规范\n- shadow-dev-workflow `norms/domain-model.md`\n  - 当前结论: 多上下文项目每项目一份 `shadow-docs/domain.md`；登记上下文归属与上下游；卡片 `domain` 取值必须来自地图登记名；地图不写实现过程。\n  - 适用 scope: `shadow-docs/`\n- `shadow-docs/knowledge/editor.md`\n  - 当前结论: 素笺/书口/呼墨/笔帘/笺条/书耳/单挂载等编辑器显示层术语与不变量。\n  - 适用 scope: `components/editor`, `lib/editor-*`, `app/(shell)/editor`\n- `shadow-docs/knowledge/renderer-shell-routing.md`\n  - 当前结论: 工作台壳层、App Router 路由、目次浮笺、项目文件打开流单点收口。\n  - 适用 scope: `app`, `components`, `lib`\n- `shadow-docs/knowledge/shell-chrome-design.md`\n  - 当前结论: 书脊/案面/浮笺/控制中心/壳层胶囊/贡献点与 z 分带。\n  - 适用 scope: `app`, `components`, `lib`, `src/shared/plugin.ts`, `src/plugin-sdk`\n- `shadow-docs/knowledge/plugin-architecture.md`\n  - 当前结论: manifest/loader/broker/沙箱帧/SDK/贡献点/批准快照与帧服务。\n  - 适用 scope: `src/main/plugins`, `src/shared/plugin.ts`, `src/plugin-sdk`, `components/plugins`, `plugins`\n- `shadow-docs/knowledge/ui-feedback.md`、`shadow-docs/knowledge/renderer-virtual-list.md`\n  - 当前结论: 反馈分层与固定行高虚拟列表；地图只登记归属，不复制结论。\n  - 适用 scope: `lib/feedback.ts`, `components/ui/FeedbackHost.tsx`, `components`, `src/main/systemNotify.ts`\n- 父仓库 `shadow-docs/knowledge/desktop-app-architecture.md`\n  - 当前结论: `DesktopApi` IPC 全量面、safeStorage 凭证、fs/网络收敛主进程、草稿仓、revert-only。\n  - 适用 scope: `apps/desktop`\n\n## 决策\n- **选型:** 登记三个限界上下文——`main-process`（Electron 宿主/工作区/文件 IO/集成）、`renderer-ui`（壳层与编辑器显示层）、`plugin`（声明/装载/沙箱帧/SDK）。`src/shared` 作为共享内核、Git/GitHub/OSS 作为 main-process 的外部适配，不单独登记为上下文。术语表按壳层与工作台、主进程与写作数据、插件、跨上下文契约四组给出唯一含义。\n- **对比方案:**\n  1. 只登记现有卡片域名 `renderer-ui` / `plugin`——驳回：main-process 是实际存在的宿主上下文，漏登记会让 `DesktopApi`、工作区、发布桥无处归属。\n  2. 把 workspace、editor 拆成独立上下文——驳回：workspace 是 main-process 与 renderer-ui 经共享契约协作的核心概念，editor 是 renderer-ui 的显示层；二者没有跨边界含义冲突，拆分会制造假边界。\n  3. 把 `src/shared` 登记为上下文——驳回：共享内核是上下文关系，不是独立语义边界。\n- **理由:** 地图只写长期事实（归属、上下游、主目录、术语），实现细节与验证输出来自各 change brief；现有知识卡 `domain` 值（renderer-ui / plugin）可直接在地图中找到，不产生迁移。\n- **隔离手段:** 在当前会话 worktree（分支 `claude/xenodochial-bun-90bbb3`）内联执行；不执行 worktree bind/switch。\n\n## 任务\n### Phase 1 — 结构勘察\n- [x] task 1 — 读 `shadow-docs/menu.md`、`shadow-docs/knowledge/*.md`、`src/main`、`src/shared`、`src/preload`、`src/plugin-sdk`、`components`、`app`、`lib`、`plugins` — 识别上下文、职责、上下游与术语。\n\n### Phase 2 — 地图落地\n- [x] task 2 — `shadow-docs/domain.md` — 写上下文表（限界上下文/职责/上下游/主目录/关键术语）+ 上下文关系 + 术语表增量。\n- [x] task 3 — 对照 `shadow-docs/knowledge/*.md` 的 `domain` 与 `scope` — 确认 `renderer-ui` / `plugin` 两个既有域名在地图中登记，scope 目录被主目录覆盖；不新增知识卡、不改 active 结论。\n\n### Phase 3 — 验证\n- [x] task 4 — 结构/引用扫描 — 表格列数一致、文中路径存在、无代码改动（`git status` 仅 `shadow-docs/`）。\n\n## 补充\n新增 shadow-docs/domain.md：登记 main-process / renderer-ui / plugin 三个限界上下文的职责、上下游、主目录与术语表增量；只写文档，不改代码与知识卡结论。详见 brief。\n\n完整 brief：shadow-docs/changes/20261021-docs-domain-map/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261021-docs-domain-map\",\"type\":\"docs\",\"scope\":\"shadow-docs\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261021-docs-domain-map/brief.md\",\"cliVersion\":\"1.8.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "docs"
      ]
    },
    "release": {
      "files": [
        "shadow-docs/changes/20261021-docs-domain-map/brief.md",
        "shadow-docs/domain.md"
      ],
      "message": "docs: 建立 apps/desktop 上下文地图",
      "title": "docs: 建立 apps/desktop 上下文地图",
      "body": "## 变更\n- 新增 `shadow-docs/domain.md`：登记 main-process / renderer-ui / plugin 三个限界上下文的职责、上下游、主目录与关键术语。\n- 补充上下文关系（DesktopApi IPC、宿主/插件伙伴关系、共享内核）与术语表增量（书脊/案面/浮笺/控制中心/素笺/书耳/写作入口等）。\n- 新增本 change brief；不修改应用代码、不新增或改写知识卡。\n\n## 影响\n- 行为/触发面变化：无；纯文档变更，不影响运行时行为、IPC 契约、插件 manifest 或构建。\n- 明确不受影响的范围：`app/`、`components/`、`lib/`、`src/`、`plugins/`、`shadow-docs/knowledge/` 均未改动。\n\n## 验证\n- 命令与结果：`git status --porcelain` 仅显示 `shadow-docs/domain.md` 与本 change brief；`git diff --name-only` 为空（无已跟踪文件改动）。\n- 结构扫描：上下文表 5 列一致；文中引用的 `src/shared/types.ts`、`src/shared/plugin.ts`、`src/main/plugins/loader.ts`、`src/plugin-sdk/`、`components/plugins/PluginFrameHost` 等路径均存在。\n- 未覆盖项：无运行时验证（纯文档变更，无行为契约）。\n\n## 关联\n- Closes #166\n- brief: shadow-docs/changes/20261021-docs-domain-map/brief.md"
    }
  },
  "knowledge": {
    "action": "无需变更",
    "target": null,
    "reason": "仅建立上下文地图与术语表，不新增或改写知识卡结论"
  }
}
---

# 建立 apps/desktop 上下文地图

## 动机

`apps/desktop` 已有 renderer-ui、plugin、main-process 等多个限界上下文，但缺 `shadow-docs/domain.md`；`norms/domain-model.md` 要求多上下文项目维护上下文地图，并规定知识卡 `domain:` 取值必须来自地图登记名。20261021-fix-workbench-entry-return 只在 brief 写了候选归属 renderer-ui，不能顺手补地图，故单独立项。

本变更只登记上下文归属、上下游、主目录与项目术语；不写实现过程，不新增知识卡，不改写现有 active 结论。

## 复杂度评级

- **评级:** S
- **理由:** 零行为契约变更；只新增一份文档，不触碰应用代码、IPC 契约、插件 manifest 或知识卡；错误影响限于文档路由与术语查找，可被 diff 走查发现。
- **期望验证深度:** code-read

按 `norms/domain-model.md`，S 级免填「## 领域模型」段。

## 引用规范

- shadow-dev-workflow `norms/domain-model.md`
  - 当前结论: 多上下文项目每项目一份 `shadow-docs/domain.md`；登记上下文归属与上下游；卡片 `domain` 取值必须来自地图登记名；地图不写实现过程。
  - 适用 scope: `shadow-docs/`
- `shadow-docs/knowledge/editor.md`
  - 当前结论: 素笺/书口/呼墨/笔帘/笺条/书耳/单挂载等编辑器显示层术语与不变量。
  - 适用 scope: `components/editor`, `lib/editor-*`, `app/(shell)/editor`
- `shadow-docs/knowledge/renderer-shell-routing.md`
  - 当前结论: 工作台壳层、App Router 路由、目次浮笺、项目文件打开流单点收口。
  - 适用 scope: `app`, `components`, `lib`
- `shadow-docs/knowledge/shell-chrome-design.md`
  - 当前结论: 书脊/案面/浮笺/控制中心/壳层胶囊/贡献点与 z 分带。
  - 适用 scope: `app`, `components`, `lib`, `src/shared/plugin.ts`, `src/plugin-sdk`
- `shadow-docs/knowledge/plugin-architecture.md`
  - 当前结论: manifest/loader/broker/沙箱帧/SDK/贡献点/批准快照与帧服务。
  - 适用 scope: `src/main/plugins`, `src/shared/plugin.ts`, `src/plugin-sdk`, `components/plugins`, `plugins`
- `shadow-docs/knowledge/ui-feedback.md`、`shadow-docs/knowledge/renderer-virtual-list.md`
  - 当前结论: 反馈分层与固定行高虚拟列表；地图只登记归属，不复制结论。
  - 适用 scope: `lib/feedback.ts`, `components/ui/FeedbackHost.tsx`, `components`, `src/main/systemNotify.ts`
- 父仓库 `shadow-docs/knowledge/desktop-app-architecture.md`
  - 当前结论: `DesktopApi` IPC 全量面、safeStorage 凭证、fs/网络收敛主进程、草稿仓、revert-only。
  - 适用 scope: `apps/desktop`

## 决策

- **选型:** 登记三个限界上下文——`main-process`（Electron 宿主/工作区/文件 IO/集成）、`renderer-ui`（壳层与编辑器显示层）、`plugin`（声明/装载/沙箱帧/SDK）。`src/shared` 作为共享内核、Git/GitHub/OSS 作为 main-process 的外部适配，不单独登记为上下文。术语表按壳层与工作台、主进程与写作数据、插件、跨上下文契约四组给出唯一含义。
- **对比方案:**
  1. 只登记现有卡片域名 `renderer-ui` / `plugin`——驳回：main-process 是实际存在的宿主上下文，漏登记会让 `DesktopApi`、工作区、发布桥无处归属。
  2. 把 workspace、editor 拆成独立上下文——驳回：workspace 是 main-process 与 renderer-ui 经共享契约协作的核心概念，editor 是 renderer-ui 的显示层；二者没有跨边界含义冲突，拆分会制造假边界。
  3. 把 `src/shared` 登记为上下文——驳回：共享内核是上下文关系，不是独立语义边界。
- **理由:** 地图只写长期事实（归属、上下游、主目录、术语），实现细节与验证输出来自各 change brief；现有知识卡 `domain` 值（renderer-ui / plugin）可直接在地图中找到，不产生迁移。
- **隔离手段:** 在当前会话 worktree（分支 `claude/xenodochial-bun-90bbb3`）内联执行；不执行 worktree bind/switch。

## 任务

### Phase 1 — 结构勘察
- [x] task 1 — 读 `shadow-docs/menu.md`、`shadow-docs/knowledge/*.md`、`src/main`、`src/shared`、`src/preload`、`src/plugin-sdk`、`components`、`app`、`lib`、`plugins` — 识别上下文、职责、上下游与术语。

### Phase 2 — 地图落地
- [x] task 2 — `shadow-docs/domain.md` — 写上下文表（限界上下文/职责/上下游/主目录/关键术语）+ 上下文关系 + 术语表增量。
- [x] task 3 — 对照 `shadow-docs/knowledge/*.md` 的 `domain` 与 `scope` — 确认 `renderer-ui` / `plugin` 两个既有域名在地图中登记，scope 目录被主目录覆盖；不新增知识卡、不改 active 结论。

### Phase 3 — 验证
- [x] task 4 — 结构/引用扫描 — 表格列数一致、文中路径存在、无代码改动（`git status` 仅 `shadow-docs/`）。

## 结果

- 实际耗时: —
- 验证: S 级 diff 走查 + 结构/引用扫描，无行为契约变更，不新增测试。
  - 表格列数：上下文表 5 列一致。
  - 路径引用：`src/shared/types.ts`、`src/shared/plugin.ts`、`src/main/plugins/loader.ts`、`src/plugin-sdk/`、`components/plugins/PluginFrameHost`、`lib/editor-commands.ts` 等均存在。
  - 工作树：仅新增 `shadow-docs/domain.md` 与本 change 的 brief，无代码改动。

## 知识评估

- **预期影响:** 无需变更
- **候选卡片:** 无
- **理由:** 本变更只建立上下文地图，属于知识路由基础设施；不新增/改写卡片结论。`main-process` 尚无独立 active 卡片，后续有需要时按实际变更另行立项，不在本轮补卡。
