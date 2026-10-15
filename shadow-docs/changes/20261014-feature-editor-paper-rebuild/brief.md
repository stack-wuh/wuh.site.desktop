---
{
  "schema": "shadow-dev/v1",
  "name": "20261014-feature-editor-paper-rebuild",
  "type": "feature",
  "scope": "editor",
  "status": "branched",
  "baseBranch": "main",
  "branch": "feature/20261014-feature-editor-paper-rebuild",
  "files": [
    "components/editor/MarkdownEditor/index.tsx",
    "components/editor/PreviewPane.tsx",
    "components/editor/Toolbar.tsx",
    "components/editor/decorations.ts",
    "components/editor/widgets.ts",
    "components/home/EditorPanel/index.tsx",
    "components/home/HomePage.tsx",
    "components/theme/tokens.ts",
    "lib/editor-cm.ts",
    "lib/editor-commands.ts",
    "lib/editor-state.ts",
    "lib/i18n/locales.ts",
    "src/main/ipc.ts",
    "src/main/linkMeta.ts",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "tests/editor-codemirror.test.ts",
    "tests/editor-page.test.tsx",
    "tests/home-editor-panel.test.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "c5487d2515668ef7c3d9e5c3ad63188c73a932b14f366fd3b9d867521cbeab87",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 编辑器 2.0 素笺手记：沉浸纸面 + 书口刻度 + 笺条卡片体系",
      "titleRaw": "[feature] 编辑器 2.0 素笺手记：沉浸纸面 + 书口刻度 + 笺条卡片体系",
      "supplement": "用户对编辑器 UI/交互/体验四维不满，期望 Typora 级体验与自定义卡片。方案 A（CM6 体系内原地重建渲染层）定稿：首页退出编辑（/editor 唯一沉浸纸面）、衬线题阶排版、书口刻度、呼墨（斜杠菜单）、笔帘（选区浮动条）、签名元素「笺条」链接卡片体系（CardProvider 注册表，B 站/音乐为后继 provider）。设计三件套与 INV-1..7 不变量见 shadow-docs/changes/20261014-feature-editor-paper-rebuild/brief.md",
      "body": "## 动机\n用户对现有编辑器的 UI/交互/体验明确不满（四个维度全中：渲染观感不像书、交互手感生硬、形态/布局、富内容能力缺失），期望 Typora 级的写作体验与自定义卡片（链接→带图标卡片，未来 B 站视频、音乐等嵌入）。经 propose 对齐与设计大师多构提案，定稿方向：**CM6 体系内原地重建渲染层**（方案 A），设计定稿为**构 B「素笺手记 · 书口刻度」**——沉浸纸面（/editor 唯一编辑面，首页退出编辑）、衬线题阶排版、右缘书口刻度、呼墨（斜杠菜单）、笔帘（选区浮动工具条）、签名元素「笺条」链接卡片体系（CardProvider 注册表，B 站/音乐为后继 provider）。\n\n设计三件套：视觉稿 `design-mockups/20261014-editor-paper/index.html`（常驻 `http://localhost:4649`，场景 `?scene=desktop|b|slash|sel|card`）；截图留档 `design-mockups/20261014-editor-paper/shots/01–05`；设计决策清单 D1–D10 见「决策」。\n\n**非目标**：B 站视频卡与音乐卡 provider（本 change 只落 CardProvider 注册表地基与通用链接卡）；renderPipeline 插件预览的卡片规则（preview-markdown 插件下游，后继对齐）；编辑器插件化（后继架构 change）；导出 PDF/HTML；首页信息架构重设计（只做「移除编辑面板」这一件事）。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: CM6 源码编辑 + L3 即时渲染装饰管线（livePreviewField/atomicRanges/tr.reconfigured 契约）；渲染态交互改写必须经 `lib/editor-cm.ts` 纯函数；新命令先入词表；下拉统一 MenuPopover；颜色只写语义 token；编辑引擎必须字节保真（Milkdown/Vditor 类已 PoC 否决）；frontmatter 装饰层隐藏口径\n  - 适用 scope: components/editor, lib/editor-cm, lib/editor-commands, lib/editor-state, app/(shell)/editor\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 两栏布局持久化于 `app/(shell)/layout.tsx`；右栏页面 PageTopbar 范式（页头固定滚动流之外、内容独立滚动容器）；内容宽度两档栅格（760/900）禁止第三档；域内文件夹化组件落位；i18n 三语 parity + 源码键覆盖测试；Node 22.23.2 钉定与 V8 绕行配方\n  - 适用 scope: app/(shell), components/home, lib/i18n\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 壳层 chrome（SideMenu/StatusBar/胶囊）声明制与语义 token 纪律；浮层点外关 target 归属守卫、Esc 分治（`[data-dialog-overlay]` 让位）\n  - 适用 scope: components/editor（浮层件）、components/ui/MenuPopover\n- norms/ui-patterns.md：设计规范先行（本 change 以定稿视觉稿为规范源）；暗黑全覆盖；禁裸 hex；动效 150–300ms ease-out；focus ring\n- norms/interaction.md：即时反馈；Esc 关闭浮层；焦点移入/归还；禁用态置灰不隐藏\n- norms/code-style.md：渐进式治理（只动与本 change 直接相关的代码）；禁 `any`；不提前抽象\n- norms/verification.md：L 级 assert-first——先红后绿，无失败测试记录视为未开始；完成证据是「不变量 × 观察点」\n- 设计三件套（propose/design 阶段产物，实现 = 视觉稿的无损移植）：`design-mockups/20261014-editor-paper/index.html` + `shots/01–05` + 决策清单 D1–D10\n\n## 决策\n- **选型:** 方案 A——CM6 体系内原地重建渲染层，四层一次落：①形态收敛（首页退出编辑、沉浸纸面）②排版系统（衬线题阶）③交互层（书口/呼墨/笔帘）④卡片体系（CardProvider + 笺条）。视觉定稿构 B「书口刻度」，决策清单 D1–D10 随视觉稿留档。\n- **对比方案:**\n  - B（平行新建 editor-v2 + 偏好开关灰度）否决：用户已明确否定旧体系，灰度无价值；双轨维护 + 收尾删旧码使总工程量更大，且违背「编辑面挂载点收敛」既有约束。\n  - C（编辑器独立成插件）本次否决、记为后继架构 change：帧协议能力面工程量（saveAs/图片/docTransfer/命令通道/主题/i18n 全部要变成白名单能力）大于重画 UI 本身；沙箱 iframe 的 IME/快捷键/延迟风险可能恶化手感；插件化不解决体验问题。渲染层按 D1–D10 保持高内聚（widgets/纯函数/新组件自包含），为未来插件化留缝。\n- **理由:** 字节保真铁律不随位置转移，CM6 是该约束下业界验证过的最优路线（Obsidian Live Preview 同构）；既有 547+ 用例与命令通道/图片链/迁移链全部复用；分 Phase 交付、每 Phase 结束编辑器可用。视觉语言延续项目既有「纸墨」token（wine/plain × 明暗四主题），签名元素唯一（笺条），符合 ui-patterns「设计规范先行」（视觉稿即规格）。\n- **关键权衡:** 分栏预览退役是体验目标（即时渲染即最终态）与既有能力的取舍——预览语义仍由 renderPipeline 服务插件浮窗，编辑器侧不再维护第二渲染面；`--font-serif` 用系统衬线栈（零捆绑资产，遵守「禁止本地化大体积静态资产管线」约束）。\n\n## 任务\n### Phase 1 形态收敛（首页退出编辑）\n- [ ] HomePage 移除 EditorPanel 挂载与预览 toggle，动作行/预览相关 i18n 键退役 — `components/home/HomePage.tsx`、`components/home/EditorPanel/`、`lib/i18n/locales.ts`、`tests/home-editor-panel.test.ts`\n- [ ] `PreviewPane.tsx`、`Toolbar.tsx` 退役（`components/ui/MenuPopover.tsx` 等共享件保留）；编辑页测试改写为「首页无编辑面」守卫 — `components/editor/PreviewPane.tsx`、`components/editor/Toolbar.tsx`、`tests/editor-page.test.tsx`\n- [ ] /editor 顶栏 hover 显影（0.28→1）+ 面包屑溢出手卷徐展策略 — `app/(shell)/editor`\n\n### Phase 2 排版系统（衬线题阶）\n- [ ] `--font-serif` 系统衬线栈入 token 层（注明提案出处与四主题核对） — `components/theme/tokens.ts`\n- [ ] 编辑器 typography 与装饰样式对齐视觉稿：题名 30px 衬线 + 渐隐墨线 60%、h2 22px 朱线 22%、h3 18px、正文 15/1.9 justified、引用/行内码/链接墨水语义复核 — `lib/editor-state.ts`、`components/editor/decorations.ts`、editor styles\n- [ ] 四主题 × 明暗走查截图对照视觉稿 — 走查记录留 brief\n\n### Phase 3 书口刻度\n- [ ] Spine 组件：`parseOutline` 大纲 + `editor-state` 总线（scroll/cursorLine）驱动；当前章朱竖线、距离渐隐 62%/34%、cap 24 点密度自适应纯逻辑、点击跳章（复用 scrollToHeading 链）+ bloom 400ms、底端字数/读时悬停显影 — `components/editor/`（新 Spine）、`lib/editor-cm.ts`\n- [ ] 密度自适应与当前章判定纯函数单测（先红） — `tests/`\n\n### Phase 4 笔帘与呼墨\n- [ ] SelectionToolbar：选区稳定 300ms 浮现，format 词表复用（粗/斜/删/行内码/链接）+「转为笺条」；Esc/点外收、焦点归还 — `components/editor/`（新）\n- [ ] SlashMenu：行首 `/` 唤出、键入筛选、↑↓/Enter/Esc 键盘链；条目 = 既有 insert/format 动作集 + `insertCard`；`EditorCommand` 词表增量 — `lib/editor-commands.ts`、`components/editor/`（新）\n- [ ] 装饰契约回归：reconfigured 重建、atomicSubset、光标行源码态在书口/呼墨/笔帘共存下全绿 — `tests/`\n\n### Phase 5 笺条卡片体系\n- [ ] `CardProvider` 注册表 + 通用 provider（链接→卡片判定/区间纯函数，先红）— `lib/editor-cm.ts`\n- [ ] 笺条 BlockWidget：折角 + 站印 + 笺题（衬线）+ 摘语 clamp2 + 域名 mono；加载骨架 / 失败虚笺 / hover 微浮（reduced-motion 降级）；进 atomicSubset — `components/editor/widgets.ts`、`components/editor/decorations.ts`\n- [ ] `linkMeta` IPC：http/https 守卫、og:title/description/favicon 解析、`userData` 缓存、失败回退契约；preload/DesktopApi 暴露（宿主专用，不进 CAPABILITY_METHODS） — `src/main/linkMeta.ts`、`src/main/ipc.ts`、`src/preload/index.ts`、`src/shared/types.ts`\n- [ ] 空文档「落笔」印 + 三语引导键 — `app/(shell)/editor`、`lib/i18n/locales.ts`、`tests/i18n.test.ts`\n- [ ] widget 行为测试（三态/点击 openExternal 仅 http/https/光标进入回源码态） — `tests/`\n\n### Phase 6 验证与走查\n- [ ] vitest 全量 + 三 tsconfig typecheck + `electron-vite build`（node 22.23.2 钉定 + V8 绕行配方）\n- [ ] 实机走查（runtime 观察点）：整壳形态（首页无编辑面、/editor 素笺居中、左栏开合纸面平移）；书口跳章/bloom/密度收缩；呼墨键盘全链；笔帘显隐与动作；笺条三态 + 失败回退 + 点击外开；四主题明暗；IME 中文输入回归；reduced-motion；字节保真抽查（GitHub 渲染对照）\n\n## 补充\n用户对编辑器 UI/交互/体验四维不满，期望 Typora 级体验与自定义卡片。方案 A（CM6 体系内原地重建渲染层）定稿：首页退出编辑（/editor 唯一沉浸纸面）、衬线题阶排版、书口刻度、呼墨（斜杠菜单）、笔帘（选区浮动条）、签名元素「笺条」链接卡片体系（CardProvider 注册表，B 站/音乐为后继 provider）。设计三件套与 INV-1..7 不变量见 shadow-docs/changes/20261014-feature-editor-paper-rebuild/brief.md\n\n完整 brief：shadow-docs/changes/20261014-feature-editor-paper-rebuild/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261014-feature-editor-paper-rebuild\",\"type\":\"feature\",\"scope\":\"editor\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261014-feature-editor-paper-rebuild/brief.md\",\"cliVersion\":\"1.5.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "worktree": "/Users/wuhong/shadow-desktop/worktrees/20261014-editor-paper-rebuild",
    "commit": {
      "files": [
        "app/(shell)/editor/page.tsx",
        "components/editor/MarkdownEditor/index.tsx",
        "components/editor/MarkdownEditor/renderTheme.ts",
        "components/editor/PreviewPane.tsx",
        "components/editor/SelectionToolbar",
        "components/editor/SlashMenu",
        "components/editor/Spine",
        "components/editor/Toolbar.tsx",
        "components/editor/decorations.ts",
        "components/editor/widgets.ts",
        "components/home/EditorPanel/FilePicker.tsx",
        "components/home/EditorPanel/WorkspacePicker.tsx",
        "components/home/EditorPanel/index.tsx",
        "components/home/EditorPanel/styles.ts",
        "components/home/HomePage.tsx",
        "components/icons/index.tsx",
        "components/theme/tokens.ts",
        "lib/editor-cm.ts",
        "lib/editor-commands.ts",
        "lib/editor-info.ts",
        "lib/editor-state.ts",
        "lib/i18n/locales.ts",
        "lib/store.ts",
        "shadow-docs/changes/20261014-feature-editor-paper-rebuild",
        "src/main/ipc.ts",
        "src/main/linkMeta.ts",
        "src/main/register-features.ts",
        "src/preload/index.ts",
        "src/shared/types.ts",
        "tests/drafts-editor-dom.test.tsx",
        "tests/editor-codemirror.test.ts",
        "tests/editor-interactions-widgets.test.tsx",
        "tests/editor-page.test.tsx",
        "tests/editor-toolbar.test.tsx",
        "tests/home-editor-panel.test.ts",
        "tests/oss-upload.test.ts"
      ],
      "message": "feat(editor): 编辑器 2.0 素笺手记——首页退出编辑（/editor 唯一沉浸纸面、顶栏三件制 hover 显影、预览分栏与常驻工具条退役）、衬线题阶排版（--font-serif）、书口刻度（大纲跳章+bloom+密度自适应 cap24）、笔帘选区工具条（format 词表复用+del 增量）、呼墨斜杠菜单（词表增 insertCard）、笺条链接卡片（CardWidget 三态+linkMeta IPC userData 缓存+失败回退虚笺）、空文档落笔印、i18n 三语 25 键；brief 结果段记 INV-1..7 对账与打包链 139 证据缺口"
    }
  }
}
---

# 编辑器 2.0 · 素笺手记：沉浸纸面、书口刻度与笺条卡片体系

## 动机

用户对现有编辑器的 UI/交互/体验明确不满（四个维度全中：渲染观感不像书、交互手感生硬、形态/布局、富内容能力缺失），期望 Typora 级的写作体验与自定义卡片（链接→带图标卡片，未来 B 站视频、音乐等嵌入）。经 propose 对齐与设计大师多构提案，定稿方向：**CM6 体系内原地重建渲染层**（方案 A），设计定稿为**构 B「素笺手记 · 书口刻度」**——沉浸纸面（/editor 唯一编辑面，首页退出编辑）、衬线题阶排版、右缘书口刻度、呼墨（斜杠菜单）、笔帘（选区浮动工具条）、签名元素「笺条」链接卡片体系（CardProvider 注册表，B 站/音乐为后继 provider）。

设计三件套：视觉稿 `design-mockups/20261014-editor-paper/index.html`（常驻 `http://localhost:4649`，场景 `?scene=desktop|b|slash|sel|card`）；截图留档 `design-mockups/20261014-editor-paper/shots/01–05`；设计决策清单 D1–D10 见「决策」。

**非目标**：B 站视频卡与音乐卡 provider（本 change 只落 CardProvider 注册表地基与通用链接卡）；renderPipeline 插件预览的卡片规则（preview-markdown 插件下游，后继对齐）；编辑器插件化（后继架构 change）；导出 PDF/HTML；首页信息架构重设计（只做「移除编辑面板」这一件事）。

## 复杂度评级

- **评级:** L
- **理由:** 三要素均命中——契约变更（`EditorCommand` 词表增量 `insertCard` 等、DesktopApi 新增 `linkMeta` IPC、`--font-serif` 新 token、首页移除编辑面板属信息架构变更）；触及宿主核心（编辑器渲染层全量、首页、主进程新 IPC、i18n、既有测试群改写）；可发现性（交互细节密集，四主题 × 明暗、reduced-motion、IME 输入，改坏不易即时可见）。
- **期望验证深度:** runtime（vitest 全量绿 + 三 tsconfig typecheck + `electron-vite build` + 实机走查，观察点见 Phase 6）
- **取证策略:** assert-first

## 领域模型

- **限界上下文:** renderer-ui · 主编辑器子域 — 承载文档的沉浸编辑面与即时渲染管线。上游 workspace 文件域（IPC 读写/图片/迁移），下游插件预览（renderPipeline，本 change 不动）。反腐边界：不进 plugin 沙箱上下文（不新增帧协议能力）；不改 `src/main/images.ts` 既有上传链。
- **统一语言增量:** **素笺**（/editor 沉浸纸面画芯）、**书口**（右缘大纲+进度刻度柱）、**笺条**（链接卡片，`CardProvider` 注册表条目的呈现形态）、**呼墨**（斜杠菜单 SlashMenu）、**笔帘**（选区浮动工具条 SelectionToolbar）、**落笔印**（空文档态）。均只在主编辑器上下文内使用，不进入壳层/插件词表。
- **聚合与不变量:**
  - `workspaceStore 文档内容链`：INV-1 字节保真——书口/呼墨/笔帘/笺条全部是纯显示层，正文 markdown 链接语法是唯一事实源，卡片与书口交互零字节改写；一切改写源码的交互（任务点选、转为笺条的语法升格、跳章定位）必须经 `lib/editor-cm.ts` 纯函数计算再 dispatch；INV-2 双通道防回环（`pushedRef` 比对）语义不变。
  - `编辑面挂载`：INV-3 编辑面唯一挂载点收敛为 `/editor`——首页不再挂载编辑面板；仍复用 `MarkdownEditor` + `publishEditorCommand` + 同一 `workspaceStore`，不得另立状态源或直连主进程写盘。
  - `命令通道`：INV-4 新命令先入 `EditorCommand`（或 `MarkdownInsertAction`）词表再消费；位置计算进 `applyMarkdownInsert`/`lib/editor-cm.ts` 纯函数并配测试，不绕过。
  - `装饰层契约`：INV-5 即时渲染装饰重建条件必须覆盖 `tr.reconfigured`；`atomicRanges` 只供 widget replace 子集（`atomicSubset`）；「光标行源码态（墨迹未干）」设计语义保持。
  - `链接元数据抓取`：INV-6 `linkMeta` IPC 只放行 http/https，只做元数据解析（不执行远程代码），缓存落 `userData`，抓取失败回退虚线纯文字笺——正文内容永不因抓取失败丢失或改写。
  - `壳层 chrome`：INV-7 首页移除编辑面板后，HomePage 的项目入口/活动图/问候语结构与 SideMenu/StatusBar/FloatLayer 语义不变；`wd.editorPreview` 预览 toggle 与分栏预览随本 change 退役。

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: CM6 源码编辑 + L3 即时渲染装饰管线（livePreviewField/atomicRanges/tr.reconfigured 契约）；渲染态交互改写必须经 `lib/editor-cm.ts` 纯函数；新命令先入词表；下拉统一 MenuPopover；颜色只写语义 token；编辑引擎必须字节保真（Milkdown/Vditor 类已 PoC 否决）；frontmatter 装饰层隐藏口径
  - 适用 scope: components/editor, lib/editor-cm, lib/editor-commands, lib/editor-state, app/(shell)/editor
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 两栏布局持久化于 `app/(shell)/layout.tsx`；右栏页面 PageTopbar 范式（页头固定滚动流之外、内容独立滚动容器）；内容宽度两档栅格（760/900）禁止第三档；域内文件夹化组件落位；i18n 三语 parity + 源码键覆盖测试；Node 22.23.2 钉定与 V8 绕行配方
  - 适用 scope: app/(shell), components/home, lib/i18n
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 壳层 chrome（SideMenu/StatusBar/胶囊）声明制与语义 token 纪律；浮层点外关 target 归属守卫、Esc 分治（`[data-dialog-overlay]` 让位）
  - 适用 scope: components/editor（浮层件）、components/ui/MenuPopover
- norms/ui-patterns.md：设计规范先行（本 change 以定稿视觉稿为规范源）；暗黑全覆盖；禁裸 hex；动效 150–300ms ease-out；focus ring
- norms/interaction.md：即时反馈；Esc 关闭浮层；焦点移入/归还；禁用态置灰不隐藏
- norms/code-style.md：渐进式治理（只动与本 change 直接相关的代码）；禁 `any`；不提前抽象
- norms/verification.md：L 级 assert-first——先红后绿，无失败测试记录视为未开始；完成证据是「不变量 × 观察点」
- 设计三件套（propose/design 阶段产物，实现 = 视觉稿的无损移植）：`design-mockups/20261014-editor-paper/index.html` + `shots/01–05` + 决策清单 D1–D10

## 决策

- **选型:** 方案 A——CM6 体系内原地重建渲染层，四层一次落：①形态收敛（首页退出编辑、沉浸纸面）②排版系统（衬线题阶）③交互层（书口/呼墨/笔帘）④卡片体系（CardProvider + 笺条）。视觉定稿构 B「书口刻度」，决策清单 D1–D10 随视觉稿留档。
- **对比方案:**
  - B（平行新建 editor-v2 + 偏好开关灰度）否决：用户已明确否定旧体系，灰度无价值；双轨维护 + 收尾删旧码使总工程量更大，且违背「编辑面挂载点收敛」既有约束。
  - C（编辑器独立成插件）本次否决、记为后继架构 change：帧协议能力面工程量（saveAs/图片/docTransfer/命令通道/主题/i18n 全部要变成白名单能力）大于重画 UI 本身；沙箱 iframe 的 IME/快捷键/延迟风险可能恶化手感；插件化不解决体验问题。渲染层按 D1–D10 保持高内聚（widgets/纯函数/新组件自包含），为未来插件化留缝。
- **理由:** 字节保真铁律不随位置转移，CM6 是该约束下业界验证过的最优路线（Obsidian Live Preview 同构）；既有 547+ 用例与命令通道/图片链/迁移链全部复用；分 Phase 交付、每 Phase 结束编辑器可用。视觉语言延续项目既有「纸墨」token（wine/plain × 明暗四主题），签名元素唯一（笺条），符合 ui-patterns「设计规范先行」（视觉稿即规格）。
- **关键权衡:** 分栏预览退役是体验目标（即时渲染即最终态）与既有能力的取舍——预览语义仍由 renderPipeline 服务插件浮窗，编辑器侧不再维护第二渲染面；`--font-serif` 用系统衬线栈（零捆绑资产，遵守「禁止本地化大体积静态资产管线」约束）。

## 任务

### Phase 1 形态收敛（首页退出编辑）
- [x] HomePage 移除 EditorPanel 挂载与预览 toggle，动作行/预览相关 i18n 键退役 — `components/home/HomePage.tsx`、`components/home/EditorPanel/`、`lib/i18n/locales.ts`、`tests/home-editor-panel.test.ts`
- [x] `PreviewPane.tsx`、`Toolbar.tsx` 退役（`components/ui/MenuPopover.tsx` 等共享件保留）；编辑页测试改写为「首页无编辑面」守卫 — `components/editor/PreviewPane.tsx`、`components/editor/Toolbar.tsx`、`tests/editor-page.test.tsx`
- [x] /editor 顶栏 hover 显影（0.28→1）+ 面包屑溢出手卷徐展策略 — `app/(shell)/editor`

### Phase 2 排版系统（衬线题阶）
- [x] `--font-serif` 系统衬线栈入 token 层（注明提案出处与四主题核对） — `components/theme/tokens.ts`
- [x] 编辑器 typography 与装饰样式对齐视觉稿：题名 30px 衬线 + 渐隐墨线 60%、h2 22px 朱线 22%、h3 18px、正文 15/1.9 justified、引用/行内码/链接墨水语义复核 — `lib/editor-state.ts`、`components/editor/decorations.ts`、editor styles
- [ ] 四主题 × 明暗走查截图对照视觉稿 — 走查记录留 brief

### Phase 3 书口刻度
- [x] Spine 组件：`parseOutline` 大纲 + `editor-state` 总线（scroll/cursorLine）驱动；当前章朱竖线、距离渐隐 62%/34%、cap 24 点密度自适应纯逻辑、点击跳章（复用 scrollToHeading 链）+ bloom 400ms、底端字数/读时悬停显影 — `components/editor/`（新 Spine）、`lib/editor-cm.ts`
- [x] 密度自适应与当前章判定纯函数单测（先红） — `tests/`

### Phase 4 笔帘与呼墨
- [x] SelectionToolbar：选区稳定 300ms 浮现，format 词表复用（粗/斜/删/行内码/链接）+「转为笺条」；Esc/点外收、焦点归还 — `components/editor/`（新）
- [x] SlashMenu：行首 `/` 唤出、键入筛选、↑↓/Enter/Esc 键盘链；条目 = 既有 insert/format 动作集 + `insertCard`；`EditorCommand` 词表增量 — `lib/editor-commands.ts`、`components/editor/`（新）
- [x] 装饰契约回归：reconfigured 重建、atomicSubset、光标行源码态在书口/呼墨/笔帘共存下全绿 — `tests/`

### Phase 5 笺条卡片体系
- [x] `CardProvider` 注册表 + 通用 provider（链接→卡片判定/区间纯函数，先红）— `lib/editor-cm.ts`
- [x] 笺条 BlockWidget：折角 + 站印 + 笺题（衬线）+ 摘语 clamp2 + 域名 mono；加载骨架 / 失败虚笺 / hover 微浮（reduced-motion 降级）；进 atomicSubset — `components/editor/widgets.ts`、`components/editor/decorations.ts`
- [x] `linkMeta` IPC：http/https 守卫、og:title/description/favicon 解析、`userData` 缓存、失败回退契约；preload/DesktopApi 暴露（宿主专用，不进 CAPABILITY_METHODS） — `src/main/linkMeta.ts`、`src/main/ipc.ts`、`src/preload/index.ts`、`src/shared/types.ts`
- [x] 空文档「落笔」印 + 三语引导键 — `app/(shell)/editor`、`lib/i18n/locales.ts`、`tests/i18n.test.ts`
- [x] widget 行为测试（三态/点击 openExternal 仅 http/https/光标进入回源码态） — `tests/`

### Phase 6 验证与走查
- [ ] vitest 全量 + 三 tsconfig typecheck + `electron-vite build`（node 22.23.2 钉定 + V8 绕行配方）
- [ ] 实机走查（runtime 观察点）：整壳形态（首页无编辑面、/editor 素笺居中、左栏开合纸面平移）；书口跳章/bloom/密度收缩；呼墨键盘全链；笔帘显隐与动作；笺条三态 + 失败回退 + 点击外开；四主题明暗；IME 中文输入回归；reduced-motion；字节保真抽查（GitHub 渲染对照）

## 结果

- 实际耗时: —（apply 阶段进行中，release 补记）
- 验证（apply 阶段机器探针，2026-10-15）:
  - vitest 全量 **75 文件 / 707 用例全绿**（node 22.23.2 + `--v8-pool-size=0 --no-concurrent-marking --no-concurrent-sweeping --no-file-parallelism` 配方；本机 vitest 5 随机 SIGSEGV 频发，按 SGN-1 分 4 批次执行：235+140+161+171，全部绿；含新增 spineTicks/spineDistance/findCardLine/selectionUrl/cmInsertCard/cmConsumeSlashLine/applyMarkdownInsert-del/linkMeta 纯逻辑与笺条三态行为用例，全程先红后绿 assert-first）
  - 三 tsconfig `--noEmit` 全绿（node/tests 走 `--jitless --single-threaded`，next 走 `--jitless --single-threaded --v8-pool-size=0`）
  - **证据缺口**：`electron-vite build` 本机确定性 SIGSEGV（3 次复现，vite transform 段；`--jitless` 因 undici 不可用）——归因本机打包链 V8 家族不稳（renderer-shell-routing 卡「Node 工具链钉定」与 20261008 brief 均有同类在案记录，当时同样委托用户侧交付），非代码归因（代码缺陷产生 exit 1 构建诊断而非段错误；三 tsc 已覆盖 main/preload/renderer 类型契约）。替代观察点：release 阶段 CI/用户机构建冒烟。
  - brief 契约门：本 change 过门（评级=L，INV-1..7 齐；门内另 8 个红为 20260928/20261007 未归档历史 brief 的欠账，与本 change 无关，已提示单独归档收口）
  - 实机走查（runtime 观察点）：待用户协作执行（任务 18 清单：整壳形态/书口跳章与 bloom/呼墨键盘链/笔帘显隐/笺条三态与失败回退/四主题明暗/IME 中文输入/reduced-motion/字节保真抽查）
- 文件清单修正案（执行必需的越清单改动，release 对账时报备）:
  - `lib/store.ts`（MarkdownInsertAction 增 `del`，笔帘删除线动作的词表落点——applyMarkdownInsert 是位置计算唯一事实源）
  - `components/icons/index.tsx`（注册表增 IconStrikethrough——「新图标先进注册表」约束要求）
  - `src/main/register-features.ts`（linkMeta 模块挂载点，side-effect import 惯例）
  - `tests/oss-upload.test.ts`（linkMeta 纯逻辑探针挂靠；「不新增测试文件」纪律下的既有套件扩展）
  - `tests/drafts-editor-dom.test.tsx`（EditorPanel 退役后改挂 MarkdownEditor，探针维护）
  - `tests/editor-toolbar.test.tsx` 随 `components/editor/Toolbar.tsx` 一并退役（删除）
  - 任务 3 偏差记录：brief 原文「面包屑手卷徐展」按定稿视觉稿实现为**限宽省略（max-width 180px）**——视觉稿即规格（设计纪律：稿子错漏先修稿；此处修任务书措辞而非稿）
  - 书口进度填充（视觉稿脊柱上的 34% 段）v1 简化：脊柱发丝 + 当前章朱竖线承担进度语义，滚动填充需新增 editor-state 总线字段（scrollFraction），为避免全订阅者滚动帧重渲染而暂缓——走查后由用户裁决是否补
- 逐不变量对账（INV-n → 观察点，release 前须逐条闭合）:
  - INV-1 字节保真：✅ 笺条三态用例断言 doc.toString() 恒不变（editor-interactions-widgets）+ 全量 707 用例绿（含既有字节保真回归）；实机 GitHub 渲染抽查留走查
  - INV-2 双通道防回环：✅ drafts-editor-dom（真 CM6 双通道链）+ editor-codemirror 全绿
  - INV-3 编辑面唯一挂载：✅ editor-page「首页退出编辑」守卫用例（无 .cm-content / 无编辑器挂载点）
  - INV-4 命令词表：✅ insertCard 入 EditorCommand 后消费（editor-commands.ts）+ del 入 MarkdownInsertAction（applyMarkdownInsert 用例）；无绕行
  - INV-5 装饰契约：✅ editor-live-preview-{toggle,atomic,frontmatter} 全绿（reconfigured/atomicSubset/光标行源码态），笺条 widget replace 天然进 atomicSubset 子集
  - INV-6 linkMeta 守卫：✅ isFetchableUrl/parseLinkMeta 纯逻辑用例（仅 http/https、失败回退虚笺用例）；实机真实 URL 抓取 + 断网回退留走查
  - INV-7 壳层结构：✅ editor-page 守卫（问候/热力图仍在、无编辑面）+ SideMenu/StatusBar/FloatLayer 未触碰（相关套件全绿）

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md（形态/排版/书口/笺条/呼墨/笔帘结论整段换代 + 首页编辑面退役）；shadow-docs/knowledge/renderer-shell-routing.md（首页段：编辑面板移除、`wd.editorPreview` 退役）；shadow-docs/menu.md（路由词表补「书口/笺条/呼墨/笔帘」）
- **理由:** 主编辑器子域的执行真相整体换代，既有 editor.md 多段结论被本 change 有意取代（分栏预览/工具条退役），release 时须以 verified-depth 复核落卡；不新增卡片——笺条/书口仍属主编辑器卡范畴。
