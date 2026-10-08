---
{
  "schema": "shadow-dev/v1",
  "name": "20261008-feature-image-upload-choice",
  "type": "feature",
  "scope": "image-host",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20261008-feature-image-upload-choice",
  "files": [
    "components/capsule/sections/EditorSection/FormatGrid.tsx",
    "components/capsule/sections/EditorSection/index.tsx",
    "components/editor/MarkdownEditor/index.tsx",
    "components/editor/Toolbar.tsx",
    "components/settings/ImageHostSection.tsx",
    "components/ui/MenuPopover.tsx",
    "lib/editor-cm.ts",
    "lib/editor-commands.ts",
    "lib/editor-image-mapping.ts",
    "lib/i18n/locales.ts",
    "plugins/image-host/logic/upload.js",
    "plugins/image-host/view/view.css",
    "plugins/image-host/view/view.js",
    "src/main/images.ts",
    "src/main/ipc.ts",
    "src/main/pickers.ts",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "tests/editor-codemirror.test.ts",
    "tests/image-host-plugin.test.ts",
    "tests/oss-upload.test.ts",
    "tests/ui-menu-popover.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 151,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/151",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "5b02d6c0c93d485aecf7001452f790a66e826803",
    "verifiedAt": "2026-10-08T13:43:46.116Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:151",
    "planHash": "337bcb12022a3c452d4d8329a26893bba8654349fe6e1e942a0041d2248aa3b2",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 图床上传选择交互：下拉菜单入口 + 上传完成后远程/本地链接选择",
      "titleRaw": "[feature] 图床上传选择交互：下拉菜单入口 + 上传完成后远程/本地链接选择",
      "supplement": "编辑器粘贴/导入图片不再静默替换远程链接：一律先落本地 .assets 插入相对引用，上传完成后经 Message 横幅选择「用远程链接 / 保持本地」；工具条与壳层胶囊图片钮升级为下拉菜单（粘贴剪贴板图 / 选本地图片上传 / 切换当前图片链接形态）；image-host 面板前缀下拉 + 批量进度上报任务胶囊；SavedImage 契约增 remoteUrl（markdownRef 恒本地）。方案与任务清单见 shadow-docs/changes/20261008-feature-image-upload-choice/brief.md",
      "body": "## 动机\n用户实测反馈「图床插件有问题：编辑器中出现了图片的链接，但没有下拉列表让我选择上传图片；上传完成后需要让我选择远程链接还是本地链接」。按 bug-investigation 单一上下文读码定位根因：**不是控件渲染缺失，而是原交互设计缺位**——粘贴/拖拽/工具条与胶囊的图片钮全部单路径直通 `savePastedImage`，`uploadMode=oss` 时主进程**静默**把 `markdownRef` 换成远程 URL（`src/main/images.ts` `composePasteResult`），用户全程无选择环节；image-host 面板只有按钮与自由文本前缀输入，无任何下拉；宿主也无「上传后询问链接形态」的链路。经两轮需求澄清确认目标：**所有场景**（粘贴/插入、工具条与胶囊入口、插入后反切、插件面板）提供选择，上传完成后必须把「远程 vs 本地」的决定权交还用户，且快速操作合理落位壳层胶囊。\n\n**非目标**：远程↔本地映射的跨会话持久化（仅会话内映射表）；其他图床 provider；上传历史/相册/远端对象管理；多图批量粘贴的横幅聚合编辑。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 图片粘贴统一走 `savePastedImage` 落 `<stem>.assets/` + 相对引用；渲染态交互的位置反查与改写计算唯一事实源在 `lib/editor-cm.ts` 纯函数层（字节保真，UI 只消费纯函数结果 dispatch）；新命令先入 `EditorCommand` 词表；凡选文件系统位置一律系统原生弹窗\n  - 适用 scope: components/editor, lib/editor-cm, lib/editor-commands, src/main/images.ts\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 新增插件能力必须先进 `CAPABILITY_METHODS` 白名单并绑定权限词表、禁止为单插件开特例通道；宿主只读状态走 svcUi + documentEvents；本变更插件侧只消费既有 SDK 面（tasks.upsert / events / cap.call），不新增协议 kind\n  - 适用 scope: plugins/image-host, src/main/plugins\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: 反馈三档 Toast/Message/Alert，「影响用户操作的提示」用 Message 档（常驻横幅、≤3 操作按钮、resolve 按钮 id、上限 3 条）；新增反馈入口一律经 `lib/feedback.ts` 命令式 API\n  - 适用 scope: lib/feedback.ts\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 胶囊面板 SubPanel/`aria-expanded` 展开态心智；浮层「点外关」必须用 target 归属守卫（根元素 ref + contains 豁免），禁依赖事件冒泡时序；Esc 分治（`[data-dialog-overlay]`/`[data-capsule-panel]` 让位）；插件可经 `wuh.tasks.upsert` 运行时上报任务中心（首报带 title，进度 `{current,total}` 严格 number）\n  - 适用 scope: components/capsule, components/ui, plugins/image-host\n- norms/code-style.md：类型安全（不新增 any，`remoteUrl` 用可选字段收窄）、不吞异常、禁止 TODO 注释\n- norms/ui-patterns.md：下拉菜单先查组件库（现无通用 Menu/Popover，需新建 `components/ui/MenuPopover.tsx` 共享件供工具条与胶囊两处复用）；颜色只用语义 token；暗黑全覆盖\n- norms/interaction.md：Escape 关闭下拉；Tab 可遍历；操作即时反馈；异步显示加载态\n- norms/tdd-verification.md：L 级完整 TDD——先红后绿，无失败测试记录视为未开始\n- knowledge/bug-investigation.md（通用）：根因链已在 propose 阶段单一上下文内完成（读码证据见动机段），修复按本 brief 执行\n\n## 决策\n- **选型:** 方案 A——主进程「双链回传」契约 + feedback Message 横幅选择 + 工具条/胶囊下拉菜单入口\n- **对比方案:**\n  - B（主进程契约不动、渲染层编排二段上传）否决：上传编排逻辑进渲染层，违背 20261007-feature-image-host-plugin 已定「粘贴与批量共用同一条上传链路、文件字节不出主进程」的决策；且刚落盘的 `.assets` 路径需豁免 picker 会话白名单，安全钳制被削弱。\n  - C（仅加完成询问、不做下拉与胶囊入口）否决：不满足用户明确的「下拉列表选择上传 + 快速操作进胶囊」诉求，且「先静默插远程再问」的顺序与决定权交还用户的初衷相悖。\n- **理由:** 关键权衡：\n  - **字节保真与所见即所存**：编辑器永远先插入本地 `.assets` 相对引用，远程 URL 只在用户明确选择后替换——`uploadMode=oss` 不再自动改链。这是对 20261007 原 brief「成功 markdownRef 换远程 URL」决策的**有意反转**（用户诉求驱动），review/release 时须同步 editor.md 图片粘贴段结论，此为待确认点。\n  - **选择交互归位既有体系**：完成后询问用 Message 档（常驻可操作、恰好为「影响用户操作的提示」设计），不新增第四种模态；关闭横幅 = 保持本地。\n  - **反切的可判定性**：`uploadImages` 白名单只认 picker 路径，故本地→远程反切走新增 `uploadExistingAsset(docRelPath, refRelPath)`，主进程 safeJoin 钳制「只许当前文档同名 `.assets/` 内文件」复用上传路由；远程→本地反切依赖会话内 `relPath↔remoteUrl` 映射表（渲染层内存态），映射丢失时提示「本地文件仍在 .assets」并禁用，不做跨会话持久化（v2 候选）。\n  - **入口复用声明制扩展点**：胶囊图片钮走既有 `SubPanelKind` 手风琴心智；插件批量上传进度经既有 `wuh.tasks.upsert` 上报任务中心，manifest 与协议零变更。\n\n## 任务\n### Phase 1 主进程契约与上传链（TDD 先红）\n- [ ] `SavedImage` 契约迁移：`markdownRef` 恒为本地相对引用，新增可选 `remoteUrl`，`uploaded` 收敛为「上传尝试成功」标记；`composePasteResult` 重写（不再换 markdownRef） — `src/shared/types.ts`、`src/main/images.ts`、`tests/oss-upload.test.ts`\n- [ ] `uploadExistingAsset(docRelPath, refRelPath)`：safeJoin 校验 ref 位于当前文档同名 `.assets/` 内 → 按 uploadMode 路由上传，返回 `UploadResult` — `src/main/images.ts`、`src/main/ipc.ts`\n- [ ] 本地文件导入链：主进程读 picker 白名单内图片路径 → 复制进文档 `.assets/` → 上传路由，返回 `SavedImage`（粘贴同形） — `src/main/images.ts`、`src/main/pickers.ts`（复用白名单校验）、`src/main/ipc.ts`\n- [ ] DesktopApi/preload 暴露上述两方法（宿主专用，不进 CAPABILITY_METHODS） — `src/shared/types.ts`、`src/preload/index.ts`\n\n### Phase 2 编辑器纯逻辑与命令词表（TDD 先红）\n- [ ] `findImageAtPos`（光标行图片 ref 定位与区间反查）+ `rewriteImageRef`（区间替换事务构造）纯函数与单测（`findLinkTargetAt` 先例同层） — `lib/editor-cm.ts`、`tests/editor-codemirror.test.ts`\n- [ ] `EditorCommand` 词表新增：`insertImageFromFile` / `switchImageLinkForm`（方向由光标图片现状判定）；会话内 `relPath↔remoteUrl` 映射表模块（纯内存、可测、丢失降级提示） — `lib/editor-commands.ts`、`lib/editor-image-mapping.ts`（新）\n- [ ] 粘贴/导入完成后选择链：`savePastedImage` 返回 `remoteUrl` 时经 `message()` 横幅「用远程链接 / 保持本地」（resolve 按钮 id，关闭=保持本地；选远程 → `rewriteImageRef` 改写并写映射表）；粘贴等待语义保持现状（上传含在 IPC 内） — `components/editor/MarkdownEditor/index.tsx`\n\n### Phase 3 入口下拉菜单（工具条 + 胶囊）\n- [ ] 新建共享轻量菜单 `MenuPopover`（点外关 target 归属守卫、Esc 关闭、焦点移入/归还触发钮、语义 token、aria 规范）+ 组件用例 — `components/ui/MenuPopover.tsx`、`tests/ui-menu-popover.test.tsx`\n- [ ] 工具条图片钮带菜单：粘贴剪贴板图 / 选本地图片上传 / 切换当前图片链接形态（按光标可用性置灰） — `components/editor/Toolbar.tsx`\n- [ ] 胶囊 FormatGrid 图片钮同款动作集：`SubPanelKind` 增 `'image'` 手风琴子面板 — `components/capsule/sections/EditorSection/FormatGrid.tsx`、`index.tsx`\n- [ ] MarkdownEditor 消费新命令：`insertImageFromFile` 走 `window.api.pickImages`（原生弹窗心智）→ 导入链；`switchImageLinkForm` 经映射表 + `uploadExistingAsset` — `components/editor/MarkdownEditor/index.tsx`\n\n### Phase 4 插件面板与任务胶囊\n- [ ] 面板前缀输入配常用前缀下拉（帧内会话历史 + 设置模板默认值置首），保持输入框可自由覆盖 — `plugins/image-host/view/view.js`、`view.css`\n- [ ] 批量上传进度上报任务中心：logic 帧 `wuh.tasks.upsert`（in_progress + `{current,total}` + detail，完成转 done），无 manifest 变更 — `plugins/image-host/logic/upload.js`、`tests/image-host-plugin.test.ts`\n- [ ] 设置页 `uploadMode` 语义文案三语修订（「粘贴/导入后尝试上传，完成时由你选择链接形态」）— `components/settings/ImageHostSection.tsx`\n- [ ] 本变更全部新 UI 键三语文案 — `lib/i18n/locales.ts`\n\n### Phase 5 验证与走查\n- [ ] vitest 全量 + 三 tsconfig typecheck + `electron-vite build`\n- [ ] 实机走查（runtime 观察点）：oss 模式粘贴→本地引用先行插入→横幅两选各自生效；关闭横幅=保持本地；反切（远程↔本地、会话内、映射丢失提示）；工具条与胶囊下拉四态；command 模式同链路；local 模式无横幅静默；面板批量上传 + 前缀下拉 + 任务胶囊进度可见；Esc/点外关/Tab/焦点归还键盘走查；明暗主题核对\n\n## 补充\n编辑器粘贴/导入图片不再静默替换远程链接：一律先落本地 .assets 插入相对引用，上传完成后经 Message 横幅选择「用远程链接 / 保持本地」；工具条与壳层胶囊图片钮升级为下拉菜单（粘贴剪贴板图 / 选本地图片上传 / 切换当前图片链接形态）；image-host 面板前缀下拉 + 批量进度上报任务胶囊；SavedImage 契约增 remoteUrl（markdownRef 恒本地）。方案与任务清单见 shadow-docs/changes/20261008-feature-image-upload-choice/brief.md\n\n完整 brief：shadow-docs/changes/20261008-feature-image-upload-choice/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261008-feature-image-upload-choice\",\"type\":\"feature\",\"scope\":\"image-host\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261008-feature-image-upload-choice/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "release": {
      "files": [
        "components/capsule/sections/EditorSection/FormatGrid.tsx",
        "components/editor/MarkdownEditor/index.tsx",
        "components/editor/Toolbar.tsx",
        "components/ui/MenuPopover.tsx",
        "lib/editor-cm.ts",
        "lib/editor-commands.ts",
        "lib/editor-image-mapping.ts",
        "lib/editor-state.ts",
        "lib/i18n/locales.ts",
        "plugins/image-host/logic/upload.js",
        "plugins/image-host/view/view.js",
        "shadow-docs/changes/20261008-feature-image-upload-choice",
        "shadow-docs/knowledge/editor.md",
        "shadow-docs/menu.md",
        "src/main/images.ts",
        "src/main/ipc.ts",
        "src/preload/index.ts",
        "src/shared/types.ts",
        "tests/editor-codemirror.test.ts",
        "tests/editor-toolbar.test.tsx",
        "tests/image-host-plugin.test.ts",
        "tests/oss-upload.test.ts",
        "tests/ui-menu-popover.test.tsx"
      ],
      "message": "feat(image-host): 图床上传选择交互 —— 双链回传契约（markdownRef 恒本地 + remoteUrl）、上传完成 Message 横幅选择远程/本地链接、工具条与胶囊图片钮 MenuPopover 下拉（粘贴剪贴板图/选本地图片上传/切换链接形态按光标置灰）、uploadExistingAsset .assets 守卫反切 + 会话映射、image-host 面板前缀 datalist 与批量进度上报任务胶囊；editor.md/menu 同步",
      "title": "[feature] 图床上传选择交互：下拉菜单入口 + 上传完成后远程/本地链接选择",
      "body": "Closes #151\n\n完整 brief：shadow-docs/changes/20261008-feature-image-upload-choice/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "图片粘贴段现行结论被本变更扩展改写：savePastedImage 双链回传（markdownRef 恒本地 + remoteUrl），上传成功经 Message 横幅由用户选择远程/本地链接；新增 EditorCommand 词表项 insertImageFromFile/switchImageLinkForm、lib/editor-image-mapping.ts 会话映射与 imageSwitchAvailable 纯逻辑、components/ui/MenuPopover.tsx 共享下拉件（工具条与胶囊图片入口）——均为 editor.md scope（components/editor, lib/editor-cm, lib/editor-commands, src/main/images.ts）内长期有效事实，卡片须同步（含对 20261007「成功换远程 URL」旧决策的有意反转声明）"
  }
}
---

# 图床上传选择交互：下拉菜单入口 + 上传完成后远程/本地链接选择

## 动机

用户实测反馈「图床插件有问题：编辑器中出现了图片的链接，但没有下拉列表让我选择上传图片；上传完成后需要让我选择远程链接还是本地链接」。按 bug-investigation 单一上下文读码定位根因：**不是控件渲染缺失，而是原交互设计缺位**——粘贴/拖拽/工具条与胶囊的图片钮全部单路径直通 `savePastedImage`，`uploadMode=oss` 时主进程**静默**把 `markdownRef` 换成远程 URL（`src/main/images.ts` `composePasteResult`），用户全程无选择环节；image-host 面板只有按钮与自由文本前缀输入，无任何下拉；宿主也无「上传后询问链接形态」的链路。经两轮需求澄清确认目标：**所有场景**（粘贴/插入、工具条与胶囊入口、插入后反切、插件面板）提供选择，上传完成后必须把「远程 vs 本地」的决定权交还用户，且快速操作合理落位壳层胶囊。

**非目标**：远程↔本地映射的跨会话持久化（仅会话内映射表）；其他图床 provider；上传历史/相册/远端对象管理；多图批量粘贴的横幅聚合编辑。

## 复杂度评级

- **评级:** L
- **理由:** 三要素均命中——契约变更（`SavedImage.markdownRef` 语义改为恒本地引用 + 新增 `remoteUrl`、`EditorCommand` 词表新增、DesktopApi 新增主进程方法）；触及宿主核心（`src/main/images.ts` 上传链、编辑器粘贴链、壳层胶囊/工具条、插件帧）；跨模块数据流（主进程 ↔ 渲染层 feedback/message ↔ 插件 logic 帧任务上报）。可发现性：静默替换行为在特定 uploadMode 路径才触发，改坏不易即时可见。
- **期望验证深度:** runtime（vitest 全量绿 + 三 tsconfig typecheck + `electron-vite build` + 实机粘贴/横幅选择/反切/胶囊与面板走查，观察点见 Phase 5）

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: 图片粘贴统一走 `savePastedImage` 落 `<stem>.assets/` + 相对引用；渲染态交互的位置反查与改写计算唯一事实源在 `lib/editor-cm.ts` 纯函数层（字节保真，UI 只消费纯函数结果 dispatch）；新命令先入 `EditorCommand` 词表；凡选文件系统位置一律系统原生弹窗
  - 适用 scope: components/editor, lib/editor-cm, lib/editor-commands, src/main/images.ts
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 新增插件能力必须先进 `CAPABILITY_METHODS` 白名单并绑定权限词表、禁止为单插件开特例通道；宿主只读状态走 svcUi + documentEvents；本变更插件侧只消费既有 SDK 面（tasks.upsert / events / cap.call），不新增协议 kind
  - 适用 scope: plugins/image-host, src/main/plugins
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: 反馈三档 Toast/Message/Alert，「影响用户操作的提示」用 Message 档（常驻横幅、≤3 操作按钮、resolve 按钮 id、上限 3 条）；新增反馈入口一律经 `lib/feedback.ts` 命令式 API
  - 适用 scope: lib/feedback.ts
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 胶囊面板 SubPanel/`aria-expanded` 展开态心智；浮层「点外关」必须用 target 归属守卫（根元素 ref + contains 豁免），禁依赖事件冒泡时序；Esc 分治（`[data-dialog-overlay]`/`[data-capsule-panel]` 让位）；插件可经 `wuh.tasks.upsert` 运行时上报任务中心（首报带 title，进度 `{current,total}` 严格 number）
  - 适用 scope: components/capsule, components/ui, plugins/image-host
- norms/code-style.md：类型安全（不新增 any，`remoteUrl` 用可选字段收窄）、不吞异常、禁止 TODO 注释
- norms/ui-patterns.md：下拉菜单先查组件库（现无通用 Menu/Popover，需新建 `components/ui/MenuPopover.tsx` 共享件供工具条与胶囊两处复用）；颜色只用语义 token；暗黑全覆盖
- norms/interaction.md：Escape 关闭下拉；Tab 可遍历；操作即时反馈；异步显示加载态
- norms/tdd-verification.md：L 级完整 TDD——先红后绿，无失败测试记录视为未开始
- knowledge/bug-investigation.md（通用）：根因链已在 propose 阶段单一上下文内完成（读码证据见动机段），修复按本 brief 执行

## 决策

- **选型:** 方案 A——主进程「双链回传」契约 + feedback Message 横幅选择 + 工具条/胶囊下拉菜单入口
- **对比方案:**
  - B（主进程契约不动、渲染层编排二段上传）否决：上传编排逻辑进渲染层，违背 20261007-feature-image-host-plugin 已定「粘贴与批量共用同一条上传链路、文件字节不出主进程」的决策；且刚落盘的 `.assets` 路径需豁免 picker 会话白名单，安全钳制被削弱。
  - C（仅加完成询问、不做下拉与胶囊入口）否决：不满足用户明确的「下拉列表选择上传 + 快速操作进胶囊」诉求，且「先静默插远程再问」的顺序与决定权交还用户的初衷相悖。
- **理由:** 关键权衡：
  - **字节保真与所见即所存**：编辑器永远先插入本地 `.assets` 相对引用，远程 URL 只在用户明确选择后替换——`uploadMode=oss` 不再自动改链。这是对 20261007 原 brief「成功 markdownRef 换远程 URL」决策的**有意反转**（用户诉求驱动），review/release 时须同步 editor.md 图片粘贴段结论，此为待确认点。
  - **选择交互归位既有体系**：完成后询问用 Message 档（常驻可操作、恰好为「影响用户操作的提示」设计），不新增第四种模态；关闭横幅 = 保持本地。
  - **反切的可判定性**：`uploadImages` 白名单只认 picker 路径，故本地→远程反切走新增 `uploadExistingAsset(docRelPath, refRelPath)`，主进程 safeJoin 钳制「只许当前文档同名 `.assets/` 内文件」复用上传路由；远程→本地反切依赖会话内 `relPath↔remoteUrl` 映射表（渲染层内存态），映射丢失时提示「本地文件仍在 .assets」并禁用，不做跨会话持久化（v2 候选）。
  - **入口复用声明制扩展点**：胶囊图片钮走既有 `SubPanelKind` 手风琴心智；插件批量上传进度经既有 `wuh.tasks.upsert` 上报任务中心，manifest 与协议零变更。

## 任务

### Phase 1 主进程契约与上传链（TDD 先红）
- [x] `SavedImage` 契约迁移：`markdownRef` 恒为本地相对引用，新增可选 `remoteUrl`，`uploaded` 收敛为「上传尝试成功」标记；`composePasteResult` 重写（不再换 markdownRef） — `src/shared/types.ts`、`src/main/images.ts`、`tests/oss-upload.test.ts`
- [x] `uploadExistingAsset(docRelPath, refRelPath)`：safeJoin 校验 ref 位于当前文档同名 `.assets/` 内 → 按 uploadMode 路由上传，返回 `UploadResult` — `src/main/images.ts`、`src/main/ipc.ts`
- [x] 本地文件导入链：主进程读 picker 白名单内图片路径 → 复制进文档 `.assets/` → 上传路由，返回 `SavedImage`（粘贴同形） — `src/main/images.ts`、`src/main/pickers.ts`（复用白名单校验）、`src/main/ipc.ts`
- [x] DesktopApi/preload 暴露上述两方法（宿主专用，不进 CAPABILITY_METHODS） — `src/shared/types.ts`、`src/preload/index.ts`

### Phase 2 编辑器纯逻辑与命令词表（TDD 先红）
- [x] `findImageAtPos`（光标行图片 ref 定位与区间反查）+ `rewriteImageRef`（区间替换事务构造）纯函数与单测（`findLinkTargetAt` 先例同层） — `lib/editor-cm.ts`、`tests/editor-codemirror.test.ts`
- [x] `EditorCommand` 词表新增：`insertImageFromFile` / `switchImageLinkForm`（方向由光标图片现状判定）；会话内 `relPath↔remoteUrl` 映射表模块（纯内存、可测、丢失降级提示） — `lib/editor-commands.ts`、`lib/editor-image-mapping.ts`（新）
- [x] 粘贴/导入完成后选择链：`savePastedImage` 返回 `remoteUrl` 时经 `message()` 横幅「用远程链接 / 保持本地」（resolve 按钮 id，关闭=保持本地；选远程 → `rewriteImageRef` 改写并写映射表）；粘贴等待语义保持现状（上传含在 IPC 内） — `components/editor/MarkdownEditor/index.tsx`

### Phase 3 入口下拉菜单（工具条 + 胶囊）
- [x] 新建共享轻量菜单 `MenuPopover`（点外关 target 归属守卫、Esc 关闭、焦点移入/归还触发钮、语义 token、aria 规范）+ 组件用例 — `components/ui/MenuPopover.tsx`、`tests/ui-menu-popover.test.tsx`
- [x] 工具条图片钮带菜单：粘贴剪贴板图 / 选本地图片上传 / 切换当前图片链接形态（按光标可用性置灰） — `components/editor/Toolbar.tsx`
- [x] 胶囊 FormatGrid 图片钮同款动作集：`SubPanelKind` 增 `'image'` 手风琴子面板 — `components/capsule/sections/EditorSection/FormatGrid.tsx`、`index.tsx`
- [x] MarkdownEditor 消费新命令：`insertImageFromFile` 走 `window.api.pickImages`（原生弹窗心智）→ 导入链；`switchImageLinkForm` 经映射表 + `uploadExistingAsset` — `components/editor/MarkdownEditor/index.tsx`

### Phase 4 插件面板与任务胶囊
- [x] 面板前缀输入配常用前缀下拉（帧内会话历史 + 设置模板默认值置首），保持输入框可自由覆盖 — `plugins/image-host/view/view.js`、`view.css`
- [x] 批量上传进度上报任务中心：logic 帧 `wuh.tasks.upsert`（in_progress + `{current,total}` + detail，完成转 done），无 manifest 变更 — `plugins/image-host/logic/upload.js`、`tests/image-host-plugin.test.ts`
- [x] 设置页 `uploadMode` 语义文案三语修订（「粘贴/导入后尝试上传，完成时由你选择链接形态」）— `components/settings/ImageHostSection.tsx`
- [x] 本变更全部新 UI 键三语文案 — `lib/i18n/locales.ts`

### Phase 5 验证与走查
- [x] vitest 全量 + 三 tsconfig typecheck + `electron-vite build`
- [x] 实机走查（runtime 观察点）：oss 模式粘贴→本地引用先行插入→横幅两选各自生效；关闭横幅=保持本地；反切（远程↔本地、会话内、映射丢失提示）；工具条与胶囊下拉四态；command 模式同链路；local 模式无横幅静默；面板批量上传 + 前缀下拉 + 任务胶囊进度可见；Esc/点外关/Tab/焦点归还键盘走查；明暗主题核对

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md（图片粘贴段结论重写：本地引用先行 + Message 选择远程/本地 + 反切契约）；shadow-docs/knowledge/shell-chrome-design.md（如 MenuPopover 沉淀为壳层通用件则追加一行）
- **理由:** `SavedImage` 语义与粘贴链是本卡「图片粘贴」段与执行约束的直接反转（对 20261007-feature-image-host-plugin 已定「成功换远程 URL」决策的用户驱动 supersede，brief 决策段已声明待确认点）；update 时标 verified-depth。不新增卡片——选择交互复用 feedback/Message 既有档位，无新模式沉淀前不建冗余卡
