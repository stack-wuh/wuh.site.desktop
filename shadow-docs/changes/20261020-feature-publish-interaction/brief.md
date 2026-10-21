---
{
  "schema": "shadow-dev/v1",
  "name": "20261020-feature-publish-interaction",
  "type": "feature",
  "scope": "publish",
  "status": "published",
  "baseBranch": "main",
  "branch": "feature/20261020-feature-publish-interaction",
  "files": [
    "components/capsule/CapsulePanel/ControlSections.tsx",
    "components/capsule/CapsulePanel/index.tsx",
    "components/capsule/CapsulePanel/styles.ts",
    "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
    "components/icons/index.tsx",
    "components/plugins/PluginFrameHost/frameServices.ts",
    "lib/editor-commands.ts",
    "lib/i18n/locales.ts",
    "lib/publish.ts",
    "lib/store.ts",
    "plugins/frontmatter/view/fm.css",
    "plugins/frontmatter/view/view.js",
    "src/main/ipc.ts",
    "src/main/publishCli.ts",
    "src/main/register-features.ts",
    "src/plugin-sdk/index.ts",
    "src/preload/index.ts",
    "src/shared/frontmatter.ts",
    "src/shared/types.ts",
    "tests/capsule-render.test.tsx",
    "tests/frame-services.test.tsx",
    "tests/publish-cli.test.ts",
    "tests/publish-frontmatter.test.ts",
    "tests/publish-logic.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 162,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/162",
    "pullRequest": 163,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/163"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "5d6916088f90c80fb88c655bedee72ccca9b7830",
    "verifiedAt": "2026-10-21T00:39:34.202Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:163",
    "planHash": "9787eca7e0510d6170dfaf3a465ef00ec02954917d396e574a9749ddc982b913",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 胶囊发布磁贴：双通道发布（CLI 优先）与关联 Issue 闭环",
      "titleRaw": "胶囊发布磁贴：双通道发布（CLI 优先）与关联 Issue 闭环",
      "supplement": "博客发布交互升级：胶囊控制中心新增通栏发布磁贴，CLI（shadow-dev blog publish，v1.8.0 已具备）优先、内置 publisher 降级；frontmatter issue 号作为唯一更新身份并在发布后回写；Frontmatter 面板展示关联 Issue 只读链接。数据流保留原流程（GitHub Issues 为源）。详见 shadow-docs/changes/20261020-feature-publish-interaction/brief.md",
      "body": "## 动机\n博客发布链路现状（**保留不变**）：桌面端 → 主进程 publish → github-issues 插件逻辑帧 → GitHub Issue → webhook → server sync → MongoDB `blogs` → 站点 `/v2/content`。数据流方向经探索确认为「GitHub Issues 为数据源、数据库为镜像」；「DB 优先」需 server 发布 API + 同步反转 + schema 身份调整，属跨应用工程，经用户决策保留原流程。\n\n现状痛点：\n1. 编辑完成后发布需离开编辑面，切到右栏插件页「GitHub」点按钮——写作流被切断；\n2. 更新判定仅靠标题匹配（插件视图）：改名会建重复 Issue、重名可能误更新；\n3. 发布结果无持久可见性：无法回答「这篇发过没有、发到几号」，也无法从结构化数据面板直达 Issue。\n\n探索结论（已与用户对齐）：\n- **双通道共存，CLI 优先**：`shadow-dev blog publish plan|execute` 自 CLI v1.8.0 起已具备（frontmatter `issue` 号驱动 create-or-update、零依赖、结果契约含 `issue.number/url/created/sync`），**CLI 仓库无需任何变更**；内置 publisher 链保留为降级通道。\n- **身份模型 = frontmatter `issue` 字段**：身份跟文档走、跨机可移植、CLI 与 app 共用同一判定；发布成功后由桌面端回写。\n- **「安装 app 时下载注册 CLI」拆为后续变更**（自举下载/版本管理/降级引导独立立项，风险隔离）。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 编辑器功能入口一律收进壳层胶囊并经命令通道（`publishEditorCommand`）下发，EditorCommandHost 常驻壳层 layout 单实例认领；素笺显示层零字节改写\n  - 适用 scope: lib/editor-commands.ts, components/capsule/sections/EditorSection/EditorCommandHost.tsx\n  - 遵循方式: 词表新增 `{ kind: 'publishDoc' }`，磁贴只发布命令；frontmatter `issue` 回写是**经用户确认的显式例外**（发布身份模型），回写只动文档头、正文零改动，且经 store 外部注入链同步编辑器\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 宿主只读状态类帧能力走 svcUi 免权限通道 + documentEvents 广播（事件名先入 DocEventName），不进 CAPABILITY_METHODS；帧服务方法须 SDK 字符串与类型三方同步\n  - 适用 scope: src/plugin-sdk, components/plugins/PluginFrameHost\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 控制中心磁贴语言（方印 Tile + 语义 token + aria-pressed/aria-busy）；胶囊一切指令经总线/命令通道\n  - 适用 scope: components/capsule\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: Message 横幅承载带动作的反馈，toast 用于短提示\n  - 适用 scope: lib/feedback\n- 父仓库 shadow-docs/knowledge/desktop-app-architecture.md\n  - 当前结论: 凭证 safeStorage 加密存储；fs/网络操作收敛主进程；报错对 token 值兜底脱敏\n  - 适用 scope: src/main/publishCli.ts\n\n## 决策\n- **选型:** 胶囊通栏发布磁贴 → 命令通道（`publishDoc`）→ EditorCommandHost 编排：保存 → CLI（`publishViaCli`，优先）→ 不可用降级内置 `publish` → frontmatter `issue` 回写并保存 → Message 横幅；Frontmatter 面板经 `ui.publishState` 展示关联 Issue 行。\n- **对比方案:** ① DB-first 数据流改造——驳回（跨应用工程，与交互诉求不匹配，保留原流程）；② 本地发布映射——驳回（CLI 不可见、跨机失效，与 CLI 优先矛盾）；③ 仅标题匹配——驳回（重复 Issue 风险）；④ CLI 单通道——驳回（未安装/版本旧时发布不可用）；⑤ 自举下载并入本轮——驳回（拆独立变更，风险隔离）。\n- **理由:** 双通道统一以 frontmatter `issue` 收口身份；CLI 优先获得可脚本化与即时同步（CLI 侧尽力 ping 主站 sync），内置通道兜底可用性。子进程经 `ELECTRON_RUN_AS_NODE` 用 Electron 自带 Node 拉起（不依赖用户 node），cwd = 工作区根，token 仅经 env 注入、不落盘不进报错；`--repository` 传工作区 GitHub remote（缺省交 CLI 配置链），不传 `--sync-url`。执行阶段错误（鉴权/网络/标题）直接回显，不降级。\n- **隔离手段:** 共享 checkout（main 基线）内联分支执行；本轮不执行 `worktree bind execute`。\n\n## 任务\n### Phase 1 — 主进程 CLI 桥\n- [ ] task 1 — `src/main/publishCli.ts` — CLI 解析（`~/.local/share/shadow-dev-cli/CURRENT` 指针 → cli.mjs → `help blog` 能力断言）+ spawn plan→execute（ELECTRON_RUN_AS_NODE、cwd=工作区、token env 注入、stdout 单行 JSON 解析、stderr 人用层忽略、报错 token 脱敏）+ `implement('publishViaCli')`\n- [ ] task 2 — `src/main/register-features.ts` — 桥接模块注册接入（沿既有模块初始化约定）\n- [ ] task 3 — `src/shared/types.ts` + `src/preload/index.ts` — `PublishViaCliRequest/Result` 契约 + `DesktopApi.publishViaCli` 透传\n\n### Phase 2 — 渲染层编排与命令通道\n- [ ] task 4 — `src/shared/frontmatter.ts` — `setFrontmatterField(content, key, value)` 纯函数（有键替换/无键插入闭合栅栏前/无文档头不造头/幂等保序）\n- [ ] task 5 — `lib/publish.ts` — `buildPublishRequest`（title/labels/metadata/issue）+ 通道决策纯逻辑（CLI 可用性/降级规则/禁用原因）+ `publishStateOf(content)` 状态推导\n- [ ] task 6 — `lib/editor-commands.ts` — 词表新增 `{ kind: 'publishDoc' }`\n- [ ] task 7 — `components/capsule/sections/EditorSection/EditorCommandHost.tsx` — 认领 `publishDoc`：校验（activePath/title）→ 保存 → `publishViaCli` → 不可用降级 `publish` → 回写 `issue` + 保存 → Message 横幅（查看）+ `documentEvents.emit('publish')`；busy 互斥\n- [ ] task 8 — `lib/store.ts` — `DocEventName` 增 `'publish'`\n\n### Phase 3 — 控制中心发布磁贴\n- [ ] task 9 — `components/capsule/CapsulePanel/ControlSections.tsx` — `PublishTile`（状态机：未发布/已发布 #N/发布中/无文档/未保存/缺 title；通道徽标 CLI/内置；点击经命令通道；aria-busy）\n- [ ] task 10 — `components/capsule/CapsulePanel/index.tsx` + `styles.ts` — 挂载于 TilesGrid 下方（grid-column 1/-1 通栏磁贴样式，语义 token）\n- [ ] task 11 — `lib/i18n/locales.ts` — 三语键（capsule.publish*）\n\n### Phase 4 — Frontmatter 面板关联 Issue\n- [ ] task 12 — `components/plugins/PluginFrameHost/frameServices.ts` — svcUi 增 `publishState`（currentDocState + `getWorkspace` → `{issueNumber,url}|null`，免权限）\n- [ ] task 13 — `src/plugin-sdk/index.ts` — `wuh.ui.publishState` JS 实现 + TS 声明（三方同步）\n- [ ] task 14 — `plugins/frontmatter/view/view.js` + `fm.css` — 关联 Issue 只读行（有号 = 可点外开链接；无号 = 灰字；`wuh.on('publish')` 刷新；三语 LEX）\n\n### Phase 5 — 测试与验证\n- [ ] task 15 — `tests/publish-cli.test.ts` — 解析/参数组装/plan→execute 链/JSON 解析/脱敏（mock 子进程与 fs）\n- [ ] task 16 — `tests/publish-logic.test.ts` — 通道决策/请求构建/状态推导/禁用原因\n- [ ] task 17 — `tests/publish-frontmatter.test.ts` — `setFrontmatterField` 插入/替换/幂等/无头块\n- [ ] task 18 — `tests/capsule-render.test.tsx` — 发布磁贴状态渲染与点击（mock 命令通道）\n- [ ] task 19 — `tests/frame-services.test.tsx` — `ui.publishState` 路由\n- [ ] task 20 — 全量验证 — 三 tsconfig + 全量 vitest（SGN-1 分批）+ 真机走查（create→update→改标题仍 update→CLI 缺失降级→面板链接）\n\n## 补充\n博客发布交互升级：胶囊控制中心新增通栏发布磁贴，CLI（shadow-dev blog publish，v1.8.0 已具备）优先、内置 publisher 降级；frontmatter issue 号作为唯一更新身份并在发布后回写；Frontmatter 面板展示关联 Issue 只读链接。数据流保留原流程（GitHub Issues 为源）。详见 shadow-docs/changes/20261020-feature-publish-interaction/brief.md\n\n完整 brief：shadow-docs/changes/20261020-feature-publish-interaction/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261020-feature-publish-interaction\",\"type\":\"feature\",\"scope\":\"publish\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261020-feature-publish-interaction/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "worktree": "/Users/wuhong/shadow-desktop/worktrees/20261020-feature-publish-interaction",
    "release": {
      "files": [
        "components/capsule/CapsulePanel/ControlSections.tsx",
        "components/capsule/CapsulePanel/index.tsx",
        "components/capsule/CapsulePanel/styles.ts",
        "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
        "components/icons/index.tsx",
        "components/plugins/PluginFrameHost/frameServices.ts",
        "lib/editor-commands.ts",
        "lib/i18n/locales.ts",
        "lib/publish.ts",
        "lib/store.ts",
        "plugins/frontmatter/view/fm.css",
        "plugins/frontmatter/view/view.js",
        "shadow-docs/changes/20261020-feature-publish-interaction/brief.md",
        "shadow-docs/knowledge/editor.md",
        "shadow-docs/knowledge/plugin-architecture.md",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "shadow-docs/menu.md",
        "src/main/ipc.ts",
        "src/main/publishCli.ts",
        "src/main/register-features.ts",
        "src/plugin-sdk/index.ts",
        "src/preload/index.ts",
        "src/shared/frontmatter.ts",
        "src/shared/types.ts",
        "tests/capsule-render.test.tsx",
        "tests/frame-services.test.tsx",
        "tests/publish-cli.test.ts",
        "tests/publish-frontmatter.test.ts",
        "tests/publish-logic.test.ts"
      ],
      "message": "feat(publish): 胶囊发布磁贴——CLI 优先/内置降级的双通道发布，frontmatter issue 身份回写与 Frontmatter 面板关联 Issue",
      "title": "feat(publish): 胶囊发布磁贴：双通道发布（CLI 优先）与关联 Issue 闭环",
      "body": "Closes #162\n\n胶囊控制中心新增通栏发布磁贴：编辑完成即席发布/更新为 GitHub Issue——CLI（shadow-dev blog publish，v1.8.0+）优先、内置 publisher 降级；frontmatter `issue` 号作为唯一更新身份并在发布后回写（仅文档头、正文零改动、幂等）；Frontmatter 面板新增「关联 Issue」只读链接行。数据流保留原流程（GitHub Issues 为源）。\n\n验证：三 tsconfig 绿；五探针 68 用例绿；全量 88 套件/818 用例绿（review 修复前，修复点由目标探针覆盖）；真机走查 create → update → 改标题仍 update → 面板关联行外开，鉴权失效提示可读。\n\n完整 brief：shadow-docs/changes/20261020-feature-publish-interaction/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "publishDoc 命令词表新增与发布身份回写（显式例外）→ editor.md；ui.publishState 为 svcUi 免权限只读新样本 → plugin-architecture.md；控制中心新增通栏发布磁贴 → shell-chrome-design.md"
  }
}
---

# 胶囊发布磁贴：双通道发布（CLI 优先）与关联 Issue 闭环

## 动机

博客发布链路现状（**保留不变**）：桌面端 → 主进程 publish → github-issues 插件逻辑帧 → GitHub Issue → webhook → server sync → MongoDB `blogs` → 站点 `/v2/content`。数据流方向经探索确认为「GitHub Issues 为数据源、数据库为镜像」；「DB 优先」需 server 发布 API + 同步反转 + schema 身份调整，属跨应用工程，经用户决策保留原流程。

现状痛点：
1. 编辑完成后发布需离开编辑面，切到右栏插件页「GitHub」点按钮——写作流被切断；
2. 更新判定仅靠标题匹配（插件视图）：改名会建重复 Issue、重名可能误更新；
3. 发布结果无持久可见性：无法回答「这篇发过没有、发到几号」，也无法从结构化数据面板直达 Issue。

探索结论（已与用户对齐）：
- **双通道共存，CLI 优先**：`shadow-dev blog publish plan|execute` 自 CLI v1.8.0 起已具备（frontmatter `issue` 号驱动 create-or-update、零依赖、结果契约含 `issue.number/url/created/sync`），**CLI 仓库无需任何变更**；内置 publisher 链保留为降级通道。
- **身份模型 = frontmatter `issue` 字段**：身份跟文档走、跨机可移植、CLI 与 app 共用同一判定；发布成功后由桌面端回写。
- **「安装 app 时下载注册 CLI」拆为后续变更**（自举下载/版本管理/降级引导独立立项，风险隔离）。

## 复杂度评级
- **评级:** L
- **理由:** 契约变更——新增桌面 IPC（`publishViaCli`）、帧 svcUi 方法（`ui.publishState`，免权限同 `ui.locale` 先例）、`DocEventName`（`'publish'`）、编辑器命令词表（`publishDoc`）、SDK 面五处扩面；触及面——主进程子进程桥/预加载/渲染层命令通道/控制中心/插件帧/插件视图六个边界；可发现性——控制中心磁贴与 Frontmatter 面板行用户直接可见。子进程拉起、凭证注入、双通道降级与身份回写存在组合风险。
- **期望验证深度:** field（真机走查：create → 再发布 update → 改标题仍 update → CLI 缺失时自动降级内置通道 → 面板关联行可外开）；单元测试与三 tsconfig 为门禁。

## 领域模型

- **限界上下文:** 桌面端发布 — 把当前文档经 CLI 或内置通道发布/更新为 GitHub Issue，并把发布身份写回文档头。上游 = 编辑器文档状态（`workspaceStore` content/activePath）+ 本机 shadow-dev CLI（v1.8.0+ 的 blog 域）；下游 = CLI→GitHub API 或主进程 publisher 注册表→github-issues 逻辑帧→GitHub API。反腐边界：不改 CLI 仓库、不改 server/webhook/DB、不改插件视图既有发布路径。
- **统一语言增量:**
  - 发布磁贴（publish tile）：控制中心 4×2 网格下的通栏磁贴，单次点击 = 发布/更新当前文档为 Issue。
  - 发布通道（publish channel）：`cli`（shadow-dev blog publish，优先）| `builtin`（既有 publisher 链，降级）。
  - 关联 Issue（linked issue）：frontmatter `issue` 字段——发布身份的唯一事实源。
- **聚合与不变量:**
  - `当前文档`：发布前必须已落盘（CLI 读盘文件，且避免缓冲/磁盘双态）；回写 `issue` 只改 frontmatter 且有号幂等（重复回写不产生重复键）、正文零改动；回写后必须立即保存（否则下次发布重复 create）。
  - `发布通道`：CLI 不可用（未安装/版本缺 `blog` 能力）才降级内置；**执行阶段错误不降级**（避免同一文档双建 Issue）；同一时刻仅允许一次发布（busy 互斥）。
  - `发布身份`：frontmatter `issue` 为唯一判定；有号 = update、无号 = create；非法号在发起前拒绝。
- **领域事件:** 发布成功 → 回写 `issue` 并保存 → `documentEvents` 广播 `'publish'` → 磁贴状态刷新（已发布 #N）、Frontmatter 面板关联行可外开。

## 引用规范
- shadow-docs/knowledge/editor.md
  - 当前结论: 编辑器功能入口一律收进壳层胶囊并经命令通道（`publishEditorCommand`）下发，EditorCommandHost 常驻壳层 layout 单实例认领；素笺显示层零字节改写
  - 适用 scope: lib/editor-commands.ts, components/capsule/sections/EditorSection/EditorCommandHost.tsx
  - 遵循方式: 词表新增 `{ kind: 'publishDoc' }`，磁贴只发布命令；frontmatter `issue` 回写是**经用户确认的显式例外**（发布身份模型），回写只动文档头、正文零改动，且经 store 外部注入链同步编辑器
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 宿主只读状态类帧能力走 svcUi 免权限通道 + documentEvents 广播（事件名先入 DocEventName），不进 CAPABILITY_METHODS；帧服务方法须 SDK 字符串与类型三方同步
  - 适用 scope: src/plugin-sdk, components/plugins/PluginFrameHost
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 控制中心磁贴语言（方印 Tile + 语义 token + aria-pressed/aria-busy）；胶囊一切指令经总线/命令通道
  - 适用 scope: components/capsule
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: Message 横幅承载带动作的反馈，toast 用于短提示
  - 适用 scope: lib/feedback
- 父仓库 shadow-docs/knowledge/desktop-app-architecture.md
  - 当前结论: 凭证 safeStorage 加密存储；fs/网络操作收敛主进程；报错对 token 值兜底脱敏
  - 适用 scope: src/main/publishCli.ts

## 决策
- **选型:** 胶囊通栏发布磁贴 → 命令通道（`publishDoc`）→ EditorCommandHost 编排：保存 → CLI（`publishViaCli`，优先）→ 不可用降级内置 `publish` → frontmatter `issue` 回写并保存 → Message 横幅；Frontmatter 面板经 `ui.publishState` 展示关联 Issue 行。
- **对比方案:** ① DB-first 数据流改造——驳回（跨应用工程，与交互诉求不匹配，保留原流程）；② 本地发布映射——驳回（CLI 不可见、跨机失效，与 CLI 优先矛盾）；③ 仅标题匹配——驳回（重复 Issue 风险）；④ CLI 单通道——驳回（未安装/版本旧时发布不可用）；⑤ 自举下载并入本轮——驳回（拆独立变更，风险隔离）。
- **理由:** 双通道统一以 frontmatter `issue` 收口身份；CLI 优先获得可脚本化与即时同步（CLI 侧尽力 ping 主站 sync），内置通道兜底可用性。子进程经 `ELECTRON_RUN_AS_NODE` 用 Electron 自带 Node 拉起（不依赖用户 node），cwd = 工作区根，token 仅经 env 注入、不落盘不进报错；`--repository` 传工作区 GitHub remote（缺省交 CLI 配置链），不传 `--sync-url`。执行阶段错误（鉴权/网络/标题）直接回显，不降级。
- **隔离手段:** 共享 checkout（main 基线）内联分支执行；本轮不执行 `worktree bind execute`。

## 任务
### Phase 1 — 主进程 CLI 桥
- [x] task 1 — `src/main/publishCli.ts` — CLI 解析（`~/.local/share/shadow-dev-cli/CURRENT` 指针 → cli.mjs → `help blog` 能力断言）+ spawn plan→execute（ELECTRON_RUN_AS_NODE、cwd=工作区、token env 注入、stdout 单行 JSON 解析、stderr 人用层忽略、报错 token 脱敏）+ `implement('publishViaCli')`
- [x] task 2 — `src/main/register-features.ts` — 桥接模块注册接入（沿既有模块初始化约定）
- [x] task 3 — `src/shared/types.ts` + `src/preload/index.ts` — `PublishViaCliRequest/Result` 契约 + `DesktopApi.publishViaCli` 透传

### Phase 2 — 渲染层编排与命令通道
- [x] task 4 — `src/shared/frontmatter.ts` — `setFrontmatterField(content, key, value)` 纯函数（有键替换/无键插入闭合栅栏前/无文档头不造头/幂等保序）
- [x] task 5 — `lib/publish.ts` — `buildPublishRequest`（title/labels/metadata/issue）+ 通道决策纯逻辑（CLI 可用性/降级规则/禁用原因）+ `publishStateOf(content)` 状态推导
- [x] task 6 — `lib/editor-commands.ts` — 词表新增 `{ kind: 'publishDoc' }`
- [x] task 7 — `components/capsule/sections/EditorSection/EditorCommandHost.tsx` — 认领 `publishDoc`：校验（activePath/title）→ 保存 → `publishViaCli` → 不可用降级 `publish` → 回写 `issue` + 保存 → Message 横幅（查看）+ `documentEvents.emit('publish')`；busy 互斥
- [x] task 8 — `lib/store.ts` — `DocEventName` 增 `'publish'`

### Phase 3 — 控制中心发布磁贴
- [x] task 9 — `components/capsule/CapsulePanel/ControlSections.tsx` — `PublishTile`（状态机：未发布/已发布 #N/发布中/无文档/未保存/缺 title；通道徽标 CLI/内置；点击经命令通道；aria-busy）
- [x] task 10 — `components/capsule/CapsulePanel/index.tsx` + `styles.ts` — 挂载于 TilesGrid 下方（grid-column 1/-1 通栏磁贴样式，语义 token）
- [x] task 11 — `lib/i18n/locales.ts` — 三语键（capsule.publish*）

### Phase 4 — Frontmatter 面板关联 Issue
- [x] task 12 — `components/plugins/PluginFrameHost/frameServices.ts` — svcUi 增 `publishState`（currentDocState + `getWorkspace` → `{issueNumber,url}|null`，免权限）
- [x] task 13 — `src/plugin-sdk/index.ts` — `wuh.ui.publishState` JS 实现 + TS 声明（三方同步）
- [x] task 14 — `plugins/frontmatter/view/view.js` + `fm.css` — 关联 Issue 只读行（有号 = 可点外开链接；无号 = 灰字；`wuh.on('publish')` 刷新；三语 LEX）

### Phase 5 — 测试与验证
- [x] task 15 — `tests/publish-cli.test.ts` — 解析/参数组装/plan→execute 链/JSON 解析/脱敏（mock 子进程与 fs）
- [x] task 16 — `tests/publish-logic.test.ts` — 通道决策/请求构建/状态推导/禁用原因
- [x] task 17 — `tests/publish-frontmatter.test.ts` — `setFrontmatterField` 插入/替换/幂等/无头块
- [x] task 18 — `tests/capsule-render.test.tsx` — 发布磁贴状态渲染与点击（mock 命令通道）
- [x] task 19 — `tests/frame-services.test.tsx` — `ui.publishState` 路由
- [x] task 20 — 全量验证 — 三 tsconfig + 全量 vitest（SGN-1 分批）+ 真机走查（create→update→改标题仍 update→CLI 缺失降级→面板链接）

## 结果
- 实际耗时: 约 3 小时（含 SGN-1 多次重试与真机走查）
- 验证: L 级不变量逐条对账——
  - 发布前已落盘：EditorCommandHost 发布前 `saveActive`；真机走查发布成功且文档已保存
  - 回写只改头/幂等/正文零改动/回写即保存：`tests/publish-frontmatter.ts` 7 用例 + 真机走查（回写后磁贴「已发布 #N」、磁盘含 issue 号）
  - 仅不可用降级、执行错误不降级：`tests/publish-logic` shouldFallbackToBuiltin 3 用例；真机鉴权失败直接报可读错误、未降级
  - 单次发布互斥：publishBusy 单测 + 磁贴 busy 禁用
  - issue 唯一身份：parseIssueNumber/buildBuiltinRequest 单测 + 真机走查（二次发布 update、改标题仍 update）
- 证据: 三 tsconfig 绿；修复前全量 **88 套件/818 用例绿**；review 修复（回写竞态、键正则）后 5 个目标探针 **68/68 绿**——修复后未全量复跑（本机连续 SIGSEGV 139，证据缺口；修复点由目标探针全覆盖）；真机走查通过（create → update → 改标题仍 update → 面板关联行外开）。走查期间发现应用 GitHub 凭证失效（401，非本变更缺陷），已补鉴权错误可读映射（`isPublishAuthError` + 三语提示）

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md（publishDoc 词表 + issue 回写例外）、shadow-docs/knowledge/plugin-architecture.md（ui.publishState svcUi 样本）、shadow-docs/knowledge/shell-chrome-design.md（控制中心通栏磁贴）；父仓库 desktop-app-architecture.md（CLI 子进程桥，跨仓候选）
- **理由:** 均为既有卡片的机制沿袭/新样本，信息量不足以独立成卡。
