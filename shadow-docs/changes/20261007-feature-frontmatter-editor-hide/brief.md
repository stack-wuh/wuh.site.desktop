---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-feature-frontmatter-editor-hide",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20261007-feature-frontmatter-editor-hide",
  "files": [
    "components/editor/decorations.ts",
    "components/plugins/PluginFrameHost/frameServices.ts",
    "lib/editor-cm.ts",
    "plugins/frontmatter/view/fm-util.js",
    "plugins/frontmatter/view/fm.css",
    "plugins/frontmatter/view/view.js",
    "src/plugin-sdk/index.ts",
    "src/shared/frontmatter.ts",
    "tests/editor-live-preview-frontmatter.test.tsx",
    "tests/frame-services.test.tsx",
    "tests/frontmatter.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 148,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/148",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "75311629fa0fd2a54b4df959de39ecf386e89781",
    "verifiedAt": "2026-10-07T23:55:38.590Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:148",
    "planHash": "069703808cb185ed47f986b10280c82937e82339aa5f4f6ffa7041e8dd1c949f",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] Frontmatter 插件成为结构化信息唯一入口：编辑器渲染态隐藏文档头",
      "titleRaw": "Frontmatter 插件成为结构化信息唯一入口：编辑器渲染态隐藏文档头",
      "supplement": "编辑器即时渲染态完全隐藏 frontmatter 文档头（字节保真不破、光标触及浮现、纯源码态可见），展示与修改统一由 Frontmatter 助手插件承担；插件标准完善：帧新增 ui.locale 三语通道、空态引导一键创建、应用反馈。详见 shadow-docs/changes/20261007-feature-frontmatter-editor-hide/brief.md（L 级，完整 TDD + runtime 走查）。",
      "body": "## 动机\n文档头 frontmatter（标题/标签/摘要/封面/关键词）目前在编辑器里以 YAML 原文形态呈现——即时渲染态没有任何装饰处理（`lib/editor-cm.ts` 的 BlockKind 无 frontmatter 类型，`---` 按分隔线渲染、元数据行按正文显示），这正是用户看到的\"编辑器内的结构化信息文案\"。Frontmatter 助手插件（用户口中的 formatter 插件）有固定五字段表单，但功能粗糙：中文硬编码（插件帧无语言通道，SDK 无 locale 能力）、空态无引导、应用后无反馈。用户要求：编辑器内不再露出该文案，展示与修改统一由插件承担。\n\n## 引用规范\n- norms/tdd-verification.md\n  - 当前结论: L 级完整 TDD（先红→绿），验证强度与评级匹配不可议\n  - 适用 scope: 本变更全部\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 字节保真是硬约束（渲染层只改显示不改内容）；装饰重建条件必须含 `tr.reconfigured`；`atomicRanges` 只供 widget replace 子集（`atomicSubset`）；光标触及行保持源码态是设计语义；编辑器 UI 颜色只经主题语义 token\n  - 适用 scope: lib/editor-cm, components/editor\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 消息协议 kind（hello/ready/invoke/result/event/request/response）不变即可沿用帧通道；新增插件能力禁止为单插件开特例通道；`protocol.handle` scheme 无尾冒号等帧三层修复约束继续生效\n  - 适用 scope: components/plugins/PluginFrameHost, src/plugin-sdk, plugins/frontmatter\n- norms/code-style.md\n  - 当前结论: frontmatter 解析/序列化的唯一事实源是 `src/shared/frontmatter.ts`，渲染层与插件侧口径一致，不得另写一份\n  - 适用 scope: src/shared, plugins/frontmatter\n\n## 决策\n- **选型:** 编辑器隐藏走「livePreviewField 装饰管线新增 frontmatter 块类型」（方案 A）；插件三语走「帧服务 `ui.locale` invoke + `locale` 事件推送」（方案 A）。\n- **对比方案:** ①独立 `frontmatterField` StateField（仿 foldField）——更隔离但引入第三个装饰源，atomicRanges 与 livePreview 语义交叠风险更大，未选；②缓冲区层剥离头部（编辑只见正文、保存拼回）——违反字节保真契约、破坏 undo 与 pushedRef 防回环，editor.md 硬约束直接否决；③帧内 `navigator.language` 猜语言——应用三语（zh/en/ja）≠系统语言，不准确，否决。\n- **理由:** 方案 A 与既有「注释收成标注条」「折叠占位」先例同构，装饰逻辑集中一条管线，测试面复用现有 decorations/reconfigure/atomicSubset 契约；`ui.locale` 与既有 `ui.toast/confirm` 同层（svcUi 免权限只读能力，非敏感），不进主进程 CAPABILITY_METHODS broker 白名单，协议 kind 不变，后续插件可统一复用。\n- **待确认点:** 无——代码事实与 active Knowledge 无冲突。\n\n## 任务\n### Phase 1 · 编辑器纯逻辑：frontmatter 块识别\n\n- [ ] 块边界唯一事实源——`src/shared/frontmatter.ts` 补充纯函数 `frontmatterLineRange(raw)`（返回文档头 `---…---` 块的起止行或 null，口径与 `parseFrontmatter` 一致）— `tests/frontmatter.test.ts`（既有文件追加用例）\n\n### Phase 2 · 编辑器装饰层：渲染态完全隐藏\n\n- [ ] `lib/editor-cm.ts` parseBlocks 新 BlockKind `'frontmatter'`（仅文档起始块；未闭合回退源码态，同 comment 先例）+ 纯函数测试 — `lib/editor-cm.ts`\n- [ ] `components/editor/decorations.ts`：渲染态非光标行整块 replace 空 widget（完全隐藏，无占位条）；光标触及浮现源码；`atomicSubset` 仅供 widget replace 子集；重建条件覆盖 `tr.reconfigured` — `components/editor/decorations.ts` + 新测试（红→绿）\n- [ ] 边界行为测试：Home/ArrowUp 光标入隐形区自动浮现、纯源码态（⌘/）完整可见、无 frontmatter 文档零装饰 — `tests/editor-live-preview-frontmatter.test.tsx`\n\n### Phase 3 · 帧能力：ui.locale\n\n- [ ] `components/plugins/PluginFrameHost/frameServices.ts` svcUi 新增 `locale` 方法（返回 `storedLocale()`）；宿主语言切换时经既有 event 通道广播 `locale` 事件（对齐 theme 推送路径）— `components/plugins/PluginFrameHost/frameServices.ts`\n- [ ] SDK `src/plugin-sdk/index.ts` 暴露 `wuh.locale()` + `wuh.on('locale')`；同步 shared 帧类型 — `tests/frame-services.test.tsx`\n\n### Phase 4 · Frontmatter 插件标准完善\n\n- [ ] 三语文案：view.js/fm-util.js 内置 zh/en/ja 词表，初始语言取 `wuh.locale()`、监听 `locale` 事件热切换 — `plugins/frontmatter/view/view.js`\n- [ ] 空态引导：无 frontmatter 时显示「本文档暂无文档信息」+「创建」按钮，一键写入最小 frontmatter（title 取正文首个标题，兜底文件名——对齐主进程 `suggestFileStem` 清洗口径）— `plugins/frontmatter/view/view.js`\n- [ ] 应用反馈：`应用到文档` 经 `wuh.ui.toast` 成功/失败反馈；确认 document.set 后编辑器缓冲经双通道同步（不新增状态源）— `plugins/frontmatter/view/view.js`\n- [ ] 空态与反馈样式微调（token 化，禁硬编码色值）— `plugins/frontmatter/view/fm.css`\n\n### Phase 5 · 验证与知识\n\n- [ ] 全量测试 + typecheck（三 tsconfig）；`pnpm dev` 走查：渲染态文档头不可见/光标浮现/⌘/ 源码态、插件视图三语切换、空态创建、应用反馈、切文档刷新 — 见「验证方式」\n\n## 补充\n编辑器即时渲染态完全隐藏 frontmatter 文档头（字节保真不破、光标触及浮现、纯源码态可见），展示与修改统一由 Frontmatter 助手插件承担；插件标准完善：帧新增 ui.locale 三语通道、空态引导一键创建、应用反馈。详见 shadow-docs/changes/20261007-feature-frontmatter-editor-hide/brief.md（L 级，完整 TDD + runtime 走查）。\n\n完整 brief：shadow-docs/changes/20261007-feature-frontmatter-editor-hide/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261007-feature-frontmatter-editor-hide\",\"type\":\"feature\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261007-feature-frontmatter-editor-hide/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "release": {
      "files": [
        "components/editor/decorations.ts",
        "components/plugins/PluginFrameHost/frameServices.ts",
        "lib/editor-cm.ts",
        "lib/i18n/context.tsx",
        "lib/store.ts",
        "plugins/frontmatter/view/fm-util.js",
        "plugins/frontmatter/view/fm.css",
        "plugins/frontmatter/view/view.js",
        "shadow-docs/changes/20261007-feature-frontmatter-editor-hide",
        "shadow-docs/knowledge/editor.md",
        "shadow-docs/knowledge/plugin-architecture.md",
        "shadow-docs/menu.md",
        "src/plugin-sdk/index.ts",
        "src/shared/frontmatter.ts",
        "tests/editor-cm-live-preview.test.ts",
        "tests/editor-live-preview-frontmatter.test.tsx",
        "tests/frame-services.test.tsx",
        "tests/frontmatter-view.test.ts",
        "tests/frontmatter.test.ts",
        "tests/i18n-locale-broadcast.test.tsx",
        "tests/plugin-sdk.test.ts"
      ],
      "message": "feat(frontmatter): 编辑器渲染态隐藏文档头结构化信息 —— frontmatterLineRange 唯一事实源（YAML 合法才隐藏）、零尺寸块替换吞闭合行换行防残留空行、光标触及浮现与 atomicSubset/reconfigured 契约齐备；Frontmatter 插件成为唯一展示/修改入口 —— 帧服务 ui.locale + documentEvents('locale') 广播三语热切换、空态引导一键创建（suggestTitle 对齐主进程清洗口径）、应用 toast 反馈",
      "title": "feat(frontmatter): 编辑器渲染态隐藏文档头，Frontmatter 插件成为结构化信息唯一入口",
      "body": "Closes #148\n\n完整 brief：shadow-docs/changes/20261007-feature-frontmatter-editor-hide/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "新增长期事实：①编辑器渲染态 frontmatter 整块完全隐藏（零尺寸块替换、吞闭合行换行防残留空 view-line、光标触及浮现、边界唯一事实源 shared/frontmatter.frontmatterLineRange 含 YAML 合法性口径）→ 更新 knowledge/editor.md；②帧服务 ui.locale（invoke 只读 + documentEvents('locale') 透传广播，svcUi 免权限先例同族，DocEventName 扩 'locale'）→ 更新 knowledge/plugin-architecture.md。runtime 观察点：Electron 截图（渲染隐藏/源码态可见）+ 真实 EditorView DOM 断言；插件视图三语/空态/toast 三径实机走查因 dev 环境退化留待用户实例复核。验证强度对照：106 相关用例+全量 672+三 tsconfig 绿。"
  }
}
---

# Frontmatter 插件成为结构化信息唯一入口：编辑器渲染态隐藏文档头

## 动机

文档头 frontmatter（标题/标签/摘要/封面/关键词）目前在编辑器里以 YAML 原文形态呈现——即时渲染态没有任何装饰处理（`lib/editor-cm.ts` 的 BlockKind 无 frontmatter 类型，`---` 按分隔线渲染、元数据行按正文显示），这正是用户看到的"编辑器内的结构化信息文案"。Frontmatter 助手插件（用户口中的 formatter 插件）有固定五字段表单，但功能粗糙：中文硬编码（插件帧无语言通道，SDK 无 locale 能力）、空态无引导、应用后无反馈。用户要求：编辑器内不再露出该文案，展示与修改统一由插件承担。

## 复杂度评级

- **评级:** L
- **理由:** ①契约变更——插件帧服务面新增 `ui.locale`（帧服务方法 + SDK 字符串 + 宿主路由跨方同步）；②触及面——宿主编辑器核心装饰管线（livePreviewField、parseBlocks、atomicRanges 契约全部在风险面）；③可发现性——装饰重建条件或原子区子集改错要等特定运行时路径（渲染态切换、光标跨界）才炸。对照 norms/tdd-verification.md 三要素定 L。
- **期望验证深度:** runtime（完整 TDD 单测 + `pnpm dev` 手动走查边界行为）

## 引用规范

- norms/tdd-verification.md
  - 当前结论: L 级完整 TDD（先红→绿），验证强度与评级匹配不可议
  - 适用 scope: 本变更全部
- shadow-docs/knowledge/editor.md
  - 当前结论: 字节保真是硬约束（渲染层只改显示不改内容）；装饰重建条件必须含 `tr.reconfigured`；`atomicRanges` 只供 widget replace 子集（`atomicSubset`）；光标触及行保持源码态是设计语义；编辑器 UI 颜色只经主题语义 token
  - 适用 scope: lib/editor-cm, components/editor
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 消息协议 kind（hello/ready/invoke/result/event/request/response）不变即可沿用帧通道；新增插件能力禁止为单插件开特例通道；`protocol.handle` scheme 无尾冒号等帧三层修复约束继续生效
  - 适用 scope: components/plugins/PluginFrameHost, src/plugin-sdk, plugins/frontmatter
- norms/code-style.md
  - 当前结论: frontmatter 解析/序列化的唯一事实源是 `src/shared/frontmatter.ts`，渲染层与插件侧口径一致，不得另写一份
  - 适用 scope: src/shared, plugins/frontmatter

## 决策

- **选型:** 编辑器隐藏走「livePreviewField 装饰管线新增 frontmatter 块类型」（方案 A）；插件三语走「帧服务 `ui.locale` invoke + `locale` 事件推送」（方案 A）。
- **对比方案:** ①独立 `frontmatterField` StateField（仿 foldField）——更隔离但引入第三个装饰源，atomicRanges 与 livePreview 语义交叠风险更大，未选；②缓冲区层剥离头部（编辑只见正文、保存拼回）——违反字节保真契约、破坏 undo 与 pushedRef 防回环，editor.md 硬约束直接否决；③帧内 `navigator.language` 猜语言——应用三语（zh/en/ja）≠系统语言，不准确，否决。
- **理由:** 方案 A 与既有「注释收成标注条」「折叠占位」先例同构，装饰逻辑集中一条管线，测试面复用现有 decorations/reconfigure/atomicSubset 契约；`ui.locale` 与既有 `ui.toast/confirm` 同层（svcUi 免权限只读能力，非敏感），不进主进程 CAPABILITY_METHODS broker 白名单，协议 kind 不变，后续插件可统一复用。
- **待确认点:** 无——代码事实与 active Knowledge 无冲突。

## 任务

### Phase 1 · 编辑器纯逻辑：frontmatter 块识别

- [x] 块边界唯一事实源——`src/shared/frontmatter.ts` 补充纯函数 `frontmatterLineRange(raw)`（返回文档头 `---…---` 块的起止行或 null，口径与 `parseFrontmatter` 一致）— `tests/frontmatter.test.ts`（既有文件追加用例）

### Phase 2 · 编辑器装饰层：渲染态完全隐藏

- [x] `lib/editor-cm.ts` parseBlocks 新 BlockKind `'frontmatter'`（仅文档起始块；未闭合回退源码态，同 comment 先例）+ 纯函数测试 — `lib/editor-cm.ts`
- [x] `components/editor/decorations.ts`：渲染态非光标行整块 replace 空 widget（完全隐藏，无占位条）；光标触及浮现源码；`atomicSubset` 仅供 widget replace 子集；重建条件覆盖 `tr.reconfigured` — `components/editor/decorations.ts` + 新测试（红→绿）
- [x] 边界行为测试：Home/ArrowUp 光标入隐形区自动浮现、纯源码态（⌘/）完整可见、无 frontmatter 文档零装饰 — `tests/editor-live-preview-frontmatter.test.tsx`

### Phase 3 · 帧能力：ui.locale

- [x] `components/plugins/PluginFrameHost/frameServices.ts` svcUi 新增 `locale` 方法（返回 `storedLocale()`）；宿主语言切换时经既有 event 通道广播 `locale` 事件（对齐 theme 推送路径）— `components/plugins/PluginFrameHost/frameServices.ts`
- [x] SDK `src/plugin-sdk/index.ts` 暴露 `wuh.locale()` + `wuh.on('locale')`；同步 shared 帧类型 — `tests/frame-services.test.tsx`

### Phase 4 · Frontmatter 插件标准完善

- [x] 三语文案：view.js/fm-util.js 内置 zh/en/ja 词表，初始语言取 `wuh.locale()`、监听 `locale` 事件热切换 — `plugins/frontmatter/view/view.js`
- [x] 空态引导：无 frontmatter 时显示「本文档暂无文档信息」+「创建」按钮，一键写入最小 frontmatter（title 取正文首个标题，兜底文件名——对齐主进程 `suggestFileStem` 清洗口径）— `plugins/frontmatter/view/view.js`
- [x] 应用反馈：`应用到文档` 经 `wuh.ui.toast` 成功/失败反馈；确认 document.set 后编辑器缓冲经双通道同步（不新增状态源）— `plugins/frontmatter/view/view.js`
- [x] 空态与反馈样式微调（token 化，禁硬编码色值）— `plugins/frontmatter/view/fm.css`

### Phase 5 · 验证与知识

- [x] 全量测试 + typecheck（三 tsconfig）；`pnpm dev` 走查：渲染态文档头不可见/光标浮现/⌘/ 源码态、插件视图三语切换、空态创建、应用反馈、切文档刷新 — 见「验证方式」

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md；shadow-docs/knowledge/plugin-architecture.md
- **理由:** editor.md 需追加「frontmatter 渲染态完全隐藏、光标浮现、字节保真不破」新契约（verified-depth: runtime）；plugin-architecture.md 需追加帧服务 `ui.locale` 方法三方同步事实。均待 review 通过后经 shadow-dev-release 落卡。
