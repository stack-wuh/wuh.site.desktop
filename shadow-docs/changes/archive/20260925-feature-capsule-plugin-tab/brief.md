---
{
  "schema": "shadow-dev/v1",
  "name": "20260925-feature-capsule-plugin-tab",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260925-feature-capsule-plugin-tab",
  "files": [
    "components/capsule/CapsulePanel.tsx",
    "components/plugins/PluginFrameHost.tsx",
    "lib/capsule.ts",
    "lib/i18n/locales.ts",
    "plugins/git-history/logic/status.js",
    "plugins/git-history/plugin.json",
    "src/main/plugins/protocol.ts",
    "src/shared/plugin.ts",
    "tests/capsule-render.test.tsx",
    "tests/plugin-capsule.test.ts",
    "tests/plugin-manifest.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 99,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/99",
    "pullRequest": 103,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/103"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "6ee0078ec6fcaffaefdce3d9a6ff167034fd3fe1",
    "verifiedAt": "2026-09-26T14:00:20.148Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:103",
    "planHash": "93ed78e20c9741fe8dba351adc47b96e9e656e55fedde06904e694a303903ff0",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 胶囊插件 Tab 贡献点 + git-history 单开 Git Tab",
      "titleRaw": "胶囊插件 Tab 贡献点 + git-history 单开 Git Tab",
      "supplement": "需求与方案见 shadow-docs/changes/20260925-feature-capsule-plugin-tab/brief.md：manifest 声明制 tabs 贡献点（每插件 ≤1）+ capsule.updateTab/removeTab 帧服务（三方同步）+ CapsulePanel 动态插件 tab 通用渲染 + git-history 首个消费者（变更文件 ≤5 + 最近提交 ≤5）。",
      "body": "## 动机\n胶囊面板目前「任务|模块」双 tab，Git 插件只在「模块」tab 有一张 status 模板 tile（一行文本「分支 · N 未提交」），信息密度低。用户希望 Git 插件在胶囊单开一个 Tab，直接看到变更文件与最近提交。按壳层贡献点「声明制优先」约束，做通用 tabs 贡献点扩展而非壳层硬编码，github-issues 等后续插件可复用同一契约。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论： 贡献点扩展「声明制优先」——manifest schema + validateManifest + tests/plugin-manifest.test.ts 用例先行，运行时 API 只能操作声明过的资源（例外仅 tasks 动态创建与 events 总线）；消息协议变更须同步 shared/plugin.ts 类型、SDK 字符串（src/main/plugins/protocol.ts）与帧宿主（PluginFrameHost）三方；胶囊挂点契约（TitleBar 右侧、面板贴 chip 下弹）与「任务|模块」双 tab 现状；注册表同构模式（commit() 产新引用 + useSyncExternalStore + getServerSnapshot 第三参）；事件/tasks 护栏制数值上限先例（≤4KB、每插件 ≤8）\n  - 适用 scope: src/shared/plugin.ts, lib, components/capsule, src/main\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论： useSyncExternalStore 必须传第三参 getServerSnapshot（静态导出硬要求）；i18n 三语键集一致性测试硬约束\n  - 适用 scope: app, components, lib\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论： 插件数据单向上报、宿主按模板白名单渲染，插件帧不触 DOM；跨插件/未声明/模板不符的数据一律拒绝\n  - 适用 scope: apps/desktop\n\n## 决策\n- **选型：** manifest 新增可选顶层 `tabs` 段：`{ id, title, icon }[]`（id 限 `[a-z0-9][a-z0-9._-]*`、title 1-20 字符、icon 白名单、**每插件 ≤1**），validateManifest 校验 + manifest 测试先行。lib/capsule.ts 扩展 tab 注册表（与模块同构）：声明注册默认 hidden、运行时 `updateTab(tabId, payload)` / `removeTab(tabId)` 显隐与更新（未声明报错、跨插件拒绝）。payload = `sections[{ title?(≤20), rows[{ icon?(白名单), text(1-60 必填), detail?(≤80), tone?, viewId?(须为本插件已声明 view) }] }]`：严格 typeof 校验（帧消息禁 Number() 宽转）、≤3 sections × ≤8 rows、序列化 ≤4KB（护栏制数值上限，沿用 events/tasks 先例）。CapsulePanel 在「任务|模块」后按声明序动态追加插件 tab：hidden 不渲染按钮、当前 tab 被移除回落 tasks、面板内容用通用 sections/rows 渲染器（行含 viewId 则整行可点跳 /plugin/<id>/<view> 并关面板）、空态文案三语。SDK 增 `wuh.capsule.updateTab/removeTab` 走既有 capsule 帧服务（主进程 broker 不参与），三方同步。git-history 首个消费者：plugin.json 声明 `tabs:[{id:'git',title:'Git',icon:'git-branch'}]`；logic/status.js 扩展 report()——gitStatus 取变更文件（≤5，staged 前缀标记）+ gitLog 取最近提交（≤5，短哈希+主题；gitLog 能力已存在、权限 git.status.read 已具备，**无新增能力白名单项**），非 git 目录 removeTab 静默隐藏（沿用「失败不打扰」惯例），doc.saved/doc.opened/workspace 事件驱动刷新沿用。\n- **对比方案：** (a) 壳层特判 Git tab——实现快但壳层耦合单一插件，违反「主区禁止硬编码插件视图/贡献点通用性」执行约束，每个插件都要改壳层；(b) tab 内嵌 PluginView 沙箱帧——功能最全但重：iframe 生命周期与面板开合挂载策略复杂、与 main 视图完全重复。均否。\n- **理由：** 完全走声明制正道（知识卡执行约束），数值护栏沿用既有先例不新造机制；tab 标题来自 manifest（插件 manifest 标题不进 i18n 机制，与既有约定一致），壳层仅通用文案进三语字典。\n- **待确认点：** 无\n\n## 任务\n### Phase 1\n- [ ] 契约层：shared/plugin.ts 增 CapsuleTabDecl 类型 + validateManifest 校验 tabs 段（id 正则/title/icon 白名单/每插件 ≤1），tests/plugin-manifest.test.ts 用例 — src/shared/plugin.ts, tests/plugin-manifest.test.ts\n- [ ] 注册表：lib/capsule.ts 增 tab 声明注册（默认 hidden）+ updateTab/removeTab（严格 typeof 校验、sections/rows/体积上限、未声明报错、跨插件拒绝、viewId 归属校验），tests/plugin-capsule.test.ts 用例 — lib/capsule.ts, tests/plugin-capsule.test.ts\n### Phase 2\n- [ ] 面板渲染：CapsulePanel 动态插件 tab（声明序追加、hidden 不出按钮、失效回落 tasks）+ 通用 sections/rows 渲染器（tone 色点、viewId 行可点跳转并 onClose）+ 空态三语文案 — components/capsule/CapsulePanel.tsx, lib/i18n/locales.ts, tests/capsule-render.test.tsx\n### Phase 3\n- [ ] 帧链路：SDK 字符串增 updateTab/removeTab（capsule 服务方法扩展），PluginFrameHost handleFrameInvoke 裁决接线——三方同步核对（shared/plugin.ts 类型 ↔ SDK 字符串 ↔ 帧宿主） — src/main/plugins/protocol.ts, components/plugins/PluginFrameHost.tsx\n- [ ] git-history 接入：plugin.json 声明 tabs；logic/status.js 扩展上报（文件 ≤5 + 提交 ≤5 → updateTab，非 git 目录 removeTab 静默） — plugins/git-history/plugin.json, plugins/git-history/logic/status.js\n### Phase 4\n- [ ] runtime 验证：dev 起应用真机走查「打开 git 仓库 → 胶囊出现 Git tab → 渲染真实分支/变更文件/最近提交 → 行点击跳 /plugin/git-history/git；停用插件 tab 消失」；tsc 双侧 + vitest 全绿 — 全部\n\n## 补充\n需求与方案见 shadow-docs/changes/20260925-feature-capsule-plugin-tab/brief.md：manifest 声明制 tabs 贡献点（每插件 ≤1）+ capsule.updateTab/removeTab 帧服务（三方同步）+ CapsulePanel 动态插件 tab 通用渲染 + git-history 首个消费者（变更文件 ≤5 + 最近提交 ≤5）。\n\n完整 brief：shadow-docs/changes/20260925-feature-capsule-plugin-tab/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260925-feature-capsule-plugin-tab\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260925-feature-capsule-plugin-tab/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "release": {
      "files": [
        "components/capsule/CapsulePanel.tsx",
        "components/plugins/PluginFrameHost.tsx",
        "lib/capsule.ts",
        "lib/i18n/locales.ts",
        "plugins/git-history/logic/status.js",
        "plugins/git-history/plugin.json",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "src/plugin-sdk/index.ts",
        "src/shared/plugin.ts",
        "tests/capsule-render.test.tsx",
        "tests/plugin-capsule.test.ts",
        "tests/plugin-manifest.test.ts"
      ],
      "message": "feat(capsule): 胶囊插件 Tab 贡献点——manifest tabs 声明制（每插件 ≤1）+ capsule.updateTab/removeTab 帧服务（shared 类型/SDK 字符串/帧宿主三方同步）+ 面板「任务|模块|插件tab」动态结构与通用 sections/rows 渲染 + git-history 首个接入 Git Tab（变更文件/最近提交行点击直达视图）（Closes #99）",
      "title": "胶囊插件 Tab 贡献点 + git-history 单开 Git Tab",
      "body": "Closes #99\n\n完整 brief：shadow-docs/changes/20260925-feature-capsule-plugin-tab/brief.md"
    }
  },
  "knowledge": null
}
---

# 胶囊插件 Tab 贡献点 + git-history 单开 Git Tab

## 动机

胶囊面板目前「任务|模块」双 tab，Git 插件只在「模块」tab 有一张 status 模板 tile（一行文本「分支 · N 未提交」），信息密度低。用户希望 Git 插件在胶囊单开一个 Tab，直接看到变更文件与最近提交。按壳层贡献点「声明制优先」约束，做通用 tabs 贡献点扩展而非壳层硬编码，github-issues 等后续插件可复用同一契约。

## 复杂度评级

- **评级：** L
- **理由：** 契约变更=manifest schema 新增顶层 tabs 段 + 帧协议 capsule 服务新方法（updateTab/removeTab）+ SDK 字符串，三方同步均为对外契约；触及面=shared/plugin.ts + lib/capsule.ts + CapsulePanel + PluginFrameHost + src/main/plugins/protocol.ts + git-history 插件两文件 + i18n + 三处测试，约 11 文件；可发现性=契约错误只在插件帧内现场可见（知识卡 verified-depth 的 OOIF 盲区教训），必须 runtime 证据收口。
- **期望验证深度：** unit + runtime + field

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论： 贡献点扩展「声明制优先」——manifest schema + validateManifest + tests/plugin-manifest.test.ts 用例先行，运行时 API 只能操作声明过的资源（例外仅 tasks 动态创建与 events 总线）；消息协议变更须同步 shared/plugin.ts 类型、SDK 字符串（src/main/plugins/protocol.ts）与帧宿主（PluginFrameHost）三方；胶囊挂点契约（TitleBar 右侧、面板贴 chip 下弹）与「任务|模块」双 tab 现状；注册表同构模式（commit() 产新引用 + useSyncExternalStore + getServerSnapshot 第三参）；事件/tasks 护栏制数值上限先例（≤4KB、每插件 ≤8）
  - 适用 scope: src/shared/plugin.ts, lib, components/capsule, src/main
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论： useSyncExternalStore 必须传第三参 getServerSnapshot（静态导出硬要求）；i18n 三语键集一致性测试硬约束
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论： 插件数据单向上报、宿主按模板白名单渲染，插件帧不触 DOM；跨插件/未声明/模板不符的数据一律拒绝
  - 适用 scope: apps/desktop

## 决策

- **选型：** manifest 新增可选顶层 `tabs` 段：`{ id, title, icon }[]`（id 限 `[a-z0-9][a-z0-9._-]*`、title 1-20 字符、icon 白名单、**每插件 ≤1**），validateManifest 校验 + manifest 测试先行。lib/capsule.ts 扩展 tab 注册表（与模块同构）：声明注册默认 hidden、运行时 `updateTab(tabId, payload)` / `removeTab(tabId)` 显隐与更新（未声明报错、跨插件拒绝）。payload = `sections[{ title?(≤20), rows[{ icon?(白名单), text(1-60 必填), detail?(≤80), tone?, viewId?(须为本插件已声明 view) }] }]`：严格 typeof 校验（帧消息禁 Number() 宽转）、≤3 sections × ≤8 rows、序列化 ≤4KB（护栏制数值上限，沿用 events/tasks 先例）。CapsulePanel 在「任务|模块」后按声明序动态追加插件 tab：hidden 不渲染按钮、当前 tab 被移除回落 tasks、面板内容用通用 sections/rows 渲染器（行含 viewId 则整行可点跳 /plugin/<id>/<view> 并关面板）、空态文案三语。SDK 增 `wuh.capsule.updateTab/removeTab` 走既有 capsule 帧服务（主进程 broker 不参与），三方同步。git-history 首个消费者：plugin.json 声明 `tabs:[{id:'git',title:'Git',icon:'git-branch'}]`；logic/status.js 扩展 report()——gitStatus 取变更文件（≤5，staged 前缀标记）+ gitLog 取最近提交（≤5，短哈希+主题；gitLog 能力已存在、权限 git.status.read 已具备，**无新增能力白名单项**），非 git 目录 removeTab 静默隐藏（沿用「失败不打扰」惯例），doc.saved/doc.opened/workspace 事件驱动刷新沿用。
- **对比方案：** (a) 壳层特判 Git tab——实现快但壳层耦合单一插件，违反「主区禁止硬编码插件视图/贡献点通用性」执行约束，每个插件都要改壳层；(b) tab 内嵌 PluginView 沙箱帧——功能最全但重：iframe 生命周期与面板开合挂载策略复杂、与 main 视图完全重复。均否。
- **理由：** 完全走声明制正道（知识卡执行约束），数值护栏沿用既有先例不新造机制；tab 标题来自 manifest（插件 manifest 标题不进 i18n 机制，与既有约定一致），壳层仅通用文案进三语字典。
- **待确认点：** 无

## 任务

### Phase 1
- [x] 契约层：shared/plugin.ts 增 CapsuleTabDecl 类型 + validateManifest 校验 tabs 段（id 正则/title/icon 白名单/每插件 ≤1），tests/plugin-manifest.test.ts 用例 — src/shared/plugin.ts, tests/plugin-manifest.test.ts
- [x] 注册表：lib/capsule.ts 增 tab 声明注册（默认 hidden）+ updateTab/removeTab（严格 typeof 校验、sections/rows/体积上限、未声明报错、跨插件拒绝、viewId 归属校验），tests/plugin-capsule.test.ts 用例 — lib/capsule.ts, tests/plugin-capsule.test.ts
### Phase 2
- [x] 面板渲染：CapsulePanel 动态插件 tab（声明序追加、hidden 不出按钮、失效回落 tasks）+ 通用 sections/rows 渲染器（tone 色点、viewId 行可点跳转并 onClose）+ 空态三语文案 — components/capsule/CapsulePanel.tsx, lib/i18n/locales.ts, tests/capsule-render.test.tsx
### Phase 3
- [x] 帧链路：SDK 字符串增 updateTab/removeTab（capsule 服务方法扩展），PluginFrameHost handleFrameInvoke 裁决接线——三方同步核对（shared/plugin.ts 类型 ↔ SDK 字符串 ↔ 帧宿主） — src/main/plugins/protocol.ts, components/plugins/PluginFrameHost.tsx
- [x] git-history 接入：plugin.json 声明 tabs；logic/status.js 扩展上报（文件 ≤5 + 提交 ≤5 → updateTab，非 git 目录 removeTab 静默） — plugins/git-history/plugin.json, plugins/git-history/logic/status.js
### Phase 4
- [x] runtime 验证：dev 起应用真机走查「打开 git 仓库 → 胶囊出现 Git tab → 渲染真实分支/变更文件/最近提交 → 行点击跳 /plugin/git-history/git；停用插件 tab 消失」；tsc 双侧 + vitest 全绿 — 全部

## 结果

- 实际耗时： —
- 验证: —

## 知识评估

- **预期影响：** 更新
- **候选卡片：** shadow-docs/knowledge/shell-chrome-design.md（壳层胶囊段：新增 tabs 贡献点契约 + capsule.updateTab/removeTab 服务方法 + 「任务|模块|插件 tab」动态结构）
- **理由：** 新增了对外插件契约（manifest tabs 段 + 帧协议新方法），必须回写壳层 chrome 卡的贡献点清单与三方同步清单，否则插件开发者与后续变更无从得知。
