---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-editor-simplify-draft-box",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-editor-simplify-draft-box",
  "files": [
    "app/(shell)/drafts/page.tsx",
    "app/(shell)/layout.tsx",
    "components/home/EditorPanel.tsx",
    "components/icons/index.tsx",
    "components/workspace/WorkspacePicker.tsx",
    "lib/drafts.ts",
    "lib/i18n/locales.ts",
    "lib/routes.ts",
    "lib/store.ts",
    "src/main/drafts.ts",
    "src/main/register-features.ts",
    "src/main/ipc.ts",
    "src/preload/index.ts",
    "src/shared/drafts.ts",
    "src/shared/types.ts",
    "tests/drafts-main.test.ts",
    "tests/drafts-render.test.tsx",
    "tests/drafts.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 66,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/66",
    "pullRequest": 67,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/67"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "a781351b7872f9ef48bf36629a52c81375eea7d9",
    "verifiedAt": "2026-09-24T03:23:04.746Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:67",
    "planHash": "1d97d91abc4913101eef6454ff19a28f55ae72775caf068c5c885ca28020ead7",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 编辑器主体简化 + 草稿箱（先写后存）",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n首页编辑器面板当前把「项目选择」做成写前门槛：顶部常驻项目/文件两个 picker，项目 popover 里 Clone 表单是一等交互；动作行还有「即时渲染/纯源码」模式切换，对新用户是噪音。同时草稿纯内存（workspaceStore），关闭即丢——「想写点东西」必须先决定存哪，违背写作直觉。\n\n本次按产品拍板做三件事，主线是**先写后存**：\n1. 首页面板项目选择效仿 Claude Code 模式瘦身：撤 Clone 表单，只留「最近项目（含打开目录）+ 文件」。\n2. 主面板撤除渲染模式/源码模式切换，默认即时渲染（胶囊「即时渲染」开关保留为高级入口）。\n3. 草稿自动暂存 + 左侧菜单新增【草稿箱】：多草稿、防抖落盘、列表管理、点击跳首页编辑器续写；另存为到工作区后草稿消费。\n\n## 引用规范\n- shadow-docs/knowledge/desktop-app-architecture.md\n  - 当前结论: 进程安全边界——fs 操作收敛主进程经 window.api 类型安全 IPC 暴露；UI 颜色只经主题变量、图标走 lucide 不散落裸 SVG；DOM 渲染类变更验收必须跑 happy-dom 用例（零 React 告警）；styled-components keyframes 须经 css`` 块。\n  - 适用 scope: apps/desktop\n- shadow-docs/knowledge/desktop-plugin-architecture.md\n  - 当前结论: 胶囊编辑器分区与主面板共用 editor-state 总线单状态源（渲染模式/专注/排版）。\n  - 适用 scope: apps/desktop components/capsule\n- norms/ui-patterns.md / norms/interaction.md\n  - 当前结论: 组件复用优先、暗色全覆盖禁裸色值、动效 150-300ms ease-out + reduced-motion、a11y 底线（aria-label/焦点环）、操作即时反馈、Esc 关弹层。\n  - 适用 scope: 本次全部新增 UI\n\n## 决策\n- **选型:** 方案 A——主进程草稿仓（`userData/drafts/<id>.md` + `index.json` 元数据）+ DesktopApi 新增 `drafts.list/save/remove/read` 四个 IPC；渲染层 `lib/drafts.ts` 注册表 + workspaceStore 防抖挂接自动暂存。\n- **对比方案:** B（localStorage 纯前端）改动面最小但 5MB 限额撑不住多草稿全文、内容继续滞留渲染层后续必推翻；C（存工作区 `.wuh/drafts/`）在「还没选项目就想写」场景下没有落点，与需求矛盾，排除。\n- **理由:** 草稿是文档级内容，按既有架构方向应落文件系统；IPC 四件套与 recent-workspaces 同模式，可独立测试（node env + tmp dir 注入）。\n- **边界决策:**\n  - Clone 仅撤 UI，`cloneWorkspace` IPC 全链（主进程/preload/契约）保留——用户「暂时不要出现」，能力可回归。\n  - 主面板 ModeSeg 撤除后 `editor.renderSource` key 三语删除；`editor.renderLive`（胶囊开关在用）与 `editor.toggleRender`（胶囊 ⌘/ 快捷键速查在用）保留；renderMode 状态与 toggleRender 命令链路不动。\n  - 草稿只覆盖 `activePath == null` 的新草稿会话；已打开的工作区文档编辑不进草稿箱。\n  - 草稿标题 = 首个标题或首行截断；摘要 = 后续行截断；防抖 ~800ms；「另存为」成功后消费对应草稿；「新建/关闭」脱离编辑中态但草稿保留在箱内。\n  - Knowledge 遵循：IPC 收敛符合进程安全边界；草稿箱页验收带 happy-dom 渲染冒烟（零 React 告警）；图标用 lucide（Inbox/FileText 族）。\n\n## 任务\n### Phase 1 草稿仓与契约（主进程）\n- [ ] shared 契约：DraftMeta 类型 + deriveDraftTitle/deriveDraftExcerpt 纯函数 + DesktopApi 增 drafts.list/save/remove/read — `src/shared/drafts.ts` `src/shared/types.ts`\n- [ ] 主进程草稿仓：dir 注入式设计（userData/drafts），index.json 与 <id>.md 读写、list/save/remove/read 实现 — `src/main/drafts.ts`\n- [ ] IPC 注册 + preload 暴露 — `src/main/ipc.ts` `src/preload/index.ts`\n- [ ] 纯逻辑测试（标题/摘要派生边界：空内容、标题先行、长行截断）+ 主进程仓测试（node env + tmp dir：CRUD、index 一致性、remove 后 read null）— `tests/drafts.test.ts` `tests/drafts-main.test.ts`\n\n### Phase 2 渲染层草稿联动\n- [ ] lib/drafts 注册表：列表快照 store（useSyncExternalStore）、activeDraftId 内存态、saveDraft/removeDraft 封装 — `lib/drafts.ts`\n- [ ] workspaceStore 挂接：新草稿会话（activePath==null）输入防抖自动暂存；enterDraft（载入草稿、clean 态、记 activeDraftId）；saveAs 成功消费草稿；openDoc/closeDoc/startDraft/switchWorkspace 清除编辑中态 — `lib/store.ts` `lib/drafts.ts`\n- [ ] 注册表纯逻辑测试（mock api：自动暂存触发、消费、清除路径）— `tests/drafts.test.ts`\n\n### Phase 3 草稿箱页与导航\n- [ ] 路由与菜单：/drafts 路由段识别 + 菜单项「草稿箱」（徽标=草稿数）+ onChange 分发 — `lib/routes.ts` `app/(shell)/layout.tsx`\n- [ ] 草稿箱页：列表（标题/摘要/更新时间/删除走 ConfirmHost）、空态、点击跳首页载入草稿、编辑中高亮 — `app/(shell)/drafts/page.tsx`\n- [ ] lucide 图标接入（Inbox 族）+ 三语 i18n（menu.drafts、drafts.* 族，三语 key 集合一致）— `components/icons/index.tsx` `lib/i18n/locales.ts`\n- [ ] DOM 渲染测试（happy-dom + mock api：零 React 告警、列表/空态/徽标结构断言）— `tests/drafts-render.test.tsx`\n\n### Phase 4 首页面板瘦身\n- [ ] WorkspacePicker 去 Clone：撤 URL 表单与 Clone 按钮，保留「打开目录 + 最近列表」，文案调整 — `components/workspace/WorkspacePicker.tsx`\n- [ ] EditorPanel 去 ModeSeg：撤渲染模式分段控件，动作行其余不动 — `components/home/EditorPanel.tsx`\n- [ ] i18n 清理：editor.renderSource 三语删除（renderLive/toggleRender 保留给胶囊）+ 相关测试核对 — `lib/i18n/locales.ts`\n\n完整 brief：shadow-docs/changes/20260924-feature-editor-simplify-draft-box/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-feature-editor-simplify-draft-box\",\"type\":\"feature\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-feature-editor-simplify-draft-box/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 编辑器主体简化 + 草稿箱（先写后存）

## 动机

首页编辑器面板当前把「项目选择」做成写前门槛：顶部常驻项目/文件两个 picker，项目 popover 里 Clone 表单是一等交互；动作行还有「即时渲染/纯源码」模式切换，对新用户是噪音。同时草稿纯内存（workspaceStore），关闭即丢——「想写点东西」必须先决定存哪，违背写作直觉。

本次按产品拍板做三件事，主线是**先写后存**：
1. 首页面板项目选择效仿 Claude Code 模式瘦身：撤 Clone 表单，只留「最近项目（含打开目录）+ 文件」。
2. 主面板撤除渲染模式/源码模式切换，默认即时渲染（胶囊「即时渲染」开关保留为高级入口）。
3. 草稿自动暂存 + 左侧菜单新增【草稿箱】：多草稿、防抖落盘、列表管理、点击跳首页编辑器续写；另存为到工作区后草稿消费。

## 引用规范

- shadow-docs/knowledge/desktop-app-architecture.md
  - 当前结论: 进程安全边界——fs 操作收敛主进程经 window.api 类型安全 IPC 暴露；UI 颜色只经主题变量、图标走 lucide 不散落裸 SVG；DOM 渲染类变更验收必须跑 happy-dom 用例（零 React 告警）；styled-components keyframes 须经 css`` 块。
  - 适用 scope: apps/desktop
- shadow-docs/knowledge/desktop-plugin-architecture.md
  - 当前结论: 胶囊编辑器分区与主面板共用 editor-state 总线单状态源（渲染模式/专注/排版）。
  - 适用 scope: apps/desktop components/capsule
- norms/ui-patterns.md / norms/interaction.md
  - 当前结论: 组件复用优先、暗色全覆盖禁裸色值、动效 150-300ms ease-out + reduced-motion、a11y 底线（aria-label/焦点环）、操作即时反馈、Esc 关弹层。
  - 适用 scope: 本次全部新增 UI

## 决策

- **选型:** 方案 A——主进程草稿仓（`userData/drafts/<id>.md` + `index.json` 元数据）+ DesktopApi 新增 `drafts.list/save/remove/read` 四个 IPC；渲染层 `lib/drafts.ts` 注册表 + workspaceStore 防抖挂接自动暂存。
- **对比方案:** B（localStorage 纯前端）改动面最小但 5MB 限额撑不住多草稿全文、内容继续滞留渲染层后续必推翻；C（存工作区 `.wuh/drafts/`）在「还没选项目就想写」场景下没有落点，与需求矛盾，排除。
- **理由:** 草稿是文档级内容，按既有架构方向应落文件系统；IPC 四件套与 recent-workspaces 同模式，可独立测试（node env + tmp dir 注入）。
- **边界决策:**
  - Clone 仅撤 UI，`cloneWorkspace` IPC 全链（主进程/preload/契约）保留——用户「暂时不要出现」，能力可回归。
  - 主面板 ModeSeg 撤除后 `editor.renderSource` key 三语删除；`editor.renderLive`（胶囊开关在用）与 `editor.toggleRender`（胶囊 ⌘/ 快捷键速查在用）保留；renderMode 状态与 toggleRender 命令链路不动。
  - 草稿只覆盖 `activePath == null` 的新草稿会话；已打开的工作区文档编辑不进草稿箱。
  - 草稿标题 = 首个标题或首行截断；摘要 = 后续行截断；防抖 ~800ms；「另存为」成功后消费对应草稿；「新建/关闭」脱离编辑中态但草稿保留在箱内。
  - Knowledge 遵循：IPC 收敛符合进程安全边界；草稿箱页验收带 happy-dom 渲染冒烟（零 React 告警）；图标用 lucide（Inbox/FileText 族）。

## 任务

### Phase 1 草稿仓与契约（主进程）
- [x] shared 契约：DraftMeta 类型 + deriveDraftTitle/deriveDraftExcerpt 纯函数 + DesktopApi 增 drafts.list/save/remove/read — `src/shared/drafts.ts` `src/shared/types.ts`
- [x] 主进程草稿仓：dir 注入式设计（userData/drafts），index.json 与 <id>.md 读写、list/save/remove/read 实现 — `src/main/drafts.ts`
- [x] IPC 注册 + preload 暴露 — `src/main/ipc.ts` `src/preload/index.ts`
- [x] 纯逻辑测试（标题/摘要派生边界：空内容、标题先行、长行截断）+ 主进程仓测试（node env + tmp dir：CRUD、index 一致性、remove 后 read null）— `tests/drafts.test.ts` `tests/drafts-main.test.ts`

### Phase 2 渲染层草稿联动
- [x] lib/drafts 注册表：列表快照 store（useSyncExternalStore）、activeDraftId 内存态、saveDraft/removeDraft 封装 — `lib/drafts.ts`
- [x] workspaceStore 挂接：新草稿会话（activePath==null）输入防抖自动暂存；enterDraft（载入草稿、clean 态、记 activeDraftId）；saveAs 成功消费草稿；openDoc/closeDoc/startDraft/switchWorkspace 清除编辑中态 — `lib/store.ts` `lib/drafts.ts`
- [x] 注册表纯逻辑测试（mock api：自动暂存触发、消费、清除路径）— `tests/drafts.test.ts`

### Phase 3 草稿箱页与导航
- [x] 路由与菜单：/drafts 路由段识别 + 菜单项「草稿箱」（徽标=草稿数）+ onChange 分发 — `lib/routes.ts` `app/(shell)/layout.tsx`
- [x] 草稿箱页：列表（标题/摘要/更新时间/删除走 ConfirmHost）、空态、点击跳首页载入草稿、编辑中高亮 — `app/(shell)/drafts/page.tsx`
- [x] lucide 图标接入（Inbox 族）+ 三语 i18n（menu.drafts、drafts.* 族，三语 key 集合一致）— `components/icons/index.tsx` `lib/i18n/locales.ts`
- [x] DOM 渲染测试（happy-dom + mock api：零 React 告警、列表/空态/徽标结构断言）— `tests/drafts-render.test.tsx`

### Phase 4 首页面板瘦身
- [x] WorkspacePicker 去 Clone：撤 URL 表单与 Clone 按钮，保留「打开目录 + 最近列表」，文案调整 — `components/workspace/WorkspacePicker.tsx`
- [x] EditorPanel 去 ModeSeg：撤渲染模式分段控件，动作行其余不动 — `components/home/EditorPanel.tsx`
- [x] i18n 清理：editor.renderSource 三语删除（renderLive/toggleRender 保留给胶囊）+ 相关测试核对 — `lib/i18n/locales.ts`

## 结果

- 实际耗时: 约 3 小时（worktree 分支环境搭建含 CLI branch execute 静默失败的手动补齐）
- 验证: vitest 300/300（36 文件，新增 drafts 22 纯逻辑 + 9 主进程 fs + 4 DOM 渲染用例）；tsc node/next/tests 三套全过

## 知识评估

- **最终结果:** 更新
- **目标卡片:** shadow-docs/knowledge/desktop-app-architecture.md
- **理由:** 桌面应用架构卡片原位更新——新增草稿仓长期事实（userData/drafts/<id>.md + index.json，drafts.list/save/remove/read 四通道，dir 注入可测）与「先写后存」交互约束（草稿仅覆盖 activePath==null 新草稿会话、另存为消费、Clone UI 撤除但 cloneWorkspace IPC 保留、主面板默认即时渲染）；source 追加本 brief，menu 路由不变（桌面应用域已路由该卡片）。查重：domain=desktop + keywords + scope=apps/desktop 仅此一张架构卡片，无可合并的重复卡片。
