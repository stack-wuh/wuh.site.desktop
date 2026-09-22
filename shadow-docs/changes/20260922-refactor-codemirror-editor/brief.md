---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-refactor-codemirror-editor",
  "type": "refactor",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "refactor/20260922-refactor-codemirror-editor",
  "files": [
    ".gitignore",
    "components/editor/MarkdownEditor.tsx",
    "components/editor/PreviewPane.tsx",
    "components/home/EditorPanel.tsx",
    "lib/i18n/locales.ts",
    "package.json",
    "scripts/copy-vditor.mjs",
    "tests/editor-codemirror.test.ts",
    "tests/home-editor-panel.test.ts",
    "tests/vditor-editor.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 48,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/48",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "d8445268153d5584b5fc1e0f852bbb80f36b47e9",
    "verifiedAt": "2026-09-22T17:15:25.275Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:48",
    "planHash": "2405c5af76cd0bb511e507d3e869bf88a953d0d229be2e1dde1994576f55a865",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "主编辑器引擎替换：Vditor → CodeMirror 6 + markdown-it 预览",
      "body": "# 主编辑器引擎替换：Vditor → CodeMirror 6 + markdown-it 预览\n\n## 动机\n上一期（20260922-feature-vditor-md-editor）引入的 Vditor IR 引擎与产品错配，用户确认三点痛点：① 体积大——`public/vditor` 本地化资产 11MB 全量进安装包（lute 内核 3.6MB 每次编辑器挂载必载），mermaid/katex/highlight 共 6.9MB 在紧凑卡片形态下几乎用不到；② IR 所见即所得形态不合用（光标/粘贴等交互不适应），期望回归源码编辑；③ 挂载与输入性能受 lute 解析拖累。站点端代码高亮已切 Shiki（20260830-P-shiki-highlighting），编辑器内 highlight.js 与发布渲染亦不同源。本期整体换 CodeMirror 6（约 300KB、无 wasm、增量解析）做源码编辑，预览复用既有 markdown-it 渲染管线（已在核心 bundle，零边际体积），体积、形态、性能三收益。\n\n## 引用规范\n- `shadow-docs/knowledge/renderer-shell-routing.md`\n  - 当前结论: 首页为两栏壳层 + 卡片式编辑器面板（自动增高 min 140px / max 45vh）；content 双通道——store 侧注入（openDoc/startDraft/插件帧 doc.set）与编辑器自发输入以 pushedRef 区分，编辑中不全量重置。\n  - 适用 scope: components/editor、components/home/EditorPanel —— 新内核必须保持双通道语义与面板紧凑形态。\n- `shadow-docs/knowledge/shell-chrome-design.md`\n  - 当前结论: 颜色只经主题语义 token；图标一律走 components/icons 注册表；动效 150-300ms ease-out + prefers-reduced-motion。\n  - 适用 scope: CM6 主题桥接（EditorView.theme + HighlightStyle）只允许 var(--token)，预览 toggle 按钮图标走注册表。\n- `x.wuh.site/shadow-docs/knowledge/design-system.md`\n  - 当前结论: UI 颜色只经主题语义 token 变量，明暗经 data 属性切换。\n  - 适用 scope: 同上；明暗跟随经 CSS 变量自动生效（不再需要 Vditor 式 setTheme）。\n- `shadow-dev-workflow/norms/code-style.md`\n  - 当前结论: 依赖只经 package.json 声明入口消费；文件单一职责；不吞异常。\n  - 适用 scope: 新增 @codemirror/* 依赖、退场 vditor 与 copy-vditor 资产管线。\n\n## 决策\n- **选型:** CodeMirror 6（@codemirror/state、view、commands、language + @codemirror/lang-markdown）源码编辑 + 面板内置预览分栏；预览渲染复用 `lib/renderPipeline.ts` 的 `renderService`（markdown-it + 相对图片重写 + 插件规则派发），与插件浮窗预览同源。MarkdownEditor 重写为 CM6 薄包装，胶囊命令通道契约（lib/editor-commands 的 EditorCommand）保持不变，EditorSection/TaskCapsule 零改动。\n- **对比方案:** A 瘦身保留 Vditor——lute 3.6MB 不可省、IR 形态痛点不解决，否；B 纯 textarea + 预览——undo 粒度/选区操作/大文档性能差，胶囊命令退回手工维护，否；C Milkdown 轻量 WYSIWYG——用户已明确放弃 WYSIWYG 形态，否。\n- **理由:** 用户确认「整体换轻量引擎 + 放弃 IR 形态 + 性能优先」。CM6 是源码编辑事实标准：增量解析大文档不卡、undo/选区/行操作 API 完备、主题经 CSS 变量映射明暗自动跟随、约 300KB 无 wasm。预览开关放编辑器面板文档状态行（icons 注册表图标 button，选择记忆 localStorage），默认纯编辑；开启后面板容器内分栏、按容器宽度左右/上下自适应。公式/mermaid 本期不内置（紧凑卡片用不满，后续需要时按 renderPipeline 插件规则扩展）。\n- **待确认点:** ① 已归档 brief `20260922-feature-vditor-md-editor` 引用的父仓卡片 `desktop-plugin-architecture.md` 不存在（父仓现仅 `desktop-app-architecture.md`），本期知识闭环落地为 desktop 仓新卡、不追溯改档；② 工作区有未提交的 `package.json` electron `^44.3.0 → ^44.4.3` 局部升级与 `next-env.d.ts` 生成漂移，非本期范围，release 提交时只暂存本期 hunk；③ 在途 change `20260922-feature-shell-capsule`（issue #47，未建分支）与本期共用 `lib/i18n/locales.ts`，后合并者负责适配。\n\n## 任务\n### Phase 1 引擎替换基础\n- [ ] 依赖与资产退场：新增 @codemirror/state、view、commands、language、lang-markdown，移除 vditor；dev/build/dist 脚本去掉 prepare:vditor；删 `scripts/copy-vditor.mjs` 与 `.gitignore` 的 public/vditor 条目 — `package.json`, `scripts/copy-vditor.mjs`, `.gitignore`\n- [ ] MarkdownEditor 重写为 CM6 骨架：EditorView 挂载/销毁、lineWrapping、placeholder、updateListener→workspaceStore.setContent、外部注入 dispatch 防回环（pushedRef 语义平移）、Cmd/Ctrl+S 保存 — `components/editor/MarkdownEditor.tsx`\n- [ ] 主题桥接：EditorView.theme + HighlightStyle 全量 var(--token)（编辑区背景/文字/选区/光标 + 标题/强调/代码/链接语法配色），明暗自动跟随免重建 — `components/editor/MarkdownEditor.tsx`\n### Phase 2 命令通道与预览\n- [ ] 胶囊命令消费移植：wrap/行前缀/插入 snippet/scrollToHeading（语法树定位标题）/focus 走 CM6 dispatch；剪贴板图片入口与 paste 拦截落盘（savePastedImage）保留 — `components/editor/MarkdownEditor.tsx`\n- [ ] PreviewPane 组件：防抖调 renderService 渲染，HTML 呈现方式与既有插件浮窗预览一致；EditorPanel 文档状态行加预览 toggle（localStorage 记忆），开启后容器内分栏自适应 — `components/editor/PreviewPane.tsx`, `components/home/EditorPanel.tsx`\n### Phase 3 收尾回归\n- [ ] i18n 三语 key 增删一致（新增预览开关等，退役 vditor 遗留 key） — `lib/i18n/locales.ts`\n- [ ] 测试重建与全量回归：CM6 命令映射/防回环语义纯逻辑用例，删 vditor 专属用例，面板/预览回归；vitest + 双侧 tsc + next build + electron-vite build — `tests/editor-codemirror.test.ts`, `tests/vditor-editor.test.ts`, `tests/home-editor-panel.test.ts`\n\n## 结果\n- 实际耗时: —\n- 验证: —\n\n## 知识评估\n- **预期影响:** 新增\n- **候选卡片:** `shadow-docs/knowledge/editor.md`（新卡：编辑器内核契约——CM6 生命周期、双通道防回环、命令通道消费、主题桥接只经 token、预览走 renderPipeline）+ `shadow-docs/menu.md` 增编辑器路由行\n- **理由:** 项目菜单无编辑器路由，上期 vditor 的知识评估（父仓 desktop-plugin-architecture 卡）未落地且该卡已不存在；本期沉淀编辑器专属契约并修复路由缺口。\n\n完整 brief：shadow-docs/changes/20260922-refactor-codemirror-editor/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-refactor-codemirror-editor\",\"type\":\"refactor\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-refactor-codemirror-editor/brief.md\",\"cliVersion\":\"1.1.0\",\"prUrl\":null,\"issueNumber\":null} -->",
      "labels": [
        "refactor"
      ]
    }
  },
  "knowledge": null
}
---

# 主编辑器引擎替换：Vditor → CodeMirror 6 + markdown-it 预览

## 动机
上一期（20260922-feature-vditor-md-editor）引入的 Vditor IR 引擎与产品错配，用户确认三点痛点：① 体积大——`public/vditor` 本地化资产 11MB 全量进安装包（lute 内核 3.6MB 每次编辑器挂载必载），mermaid/katex/highlight 共 6.9MB 在紧凑卡片形态下几乎用不到；② IR 所见即所得形态不合用（光标/粘贴等交互不适应），期望回归源码编辑；③ 挂载与输入性能受 lute 解析拖累。站点端代码高亮已切 Shiki（20260830-P-shiki-highlighting），编辑器内 highlight.js 与发布渲染亦不同源。本期整体换 CodeMirror 6（约 300KB、无 wasm、增量解析）做源码编辑，预览复用既有 markdown-it 渲染管线（已在核心 bundle，零边际体积），体积、形态、性能三收益。

## 引用规范
- `shadow-docs/knowledge/renderer-shell-routing.md`
  - 当前结论: 首页为两栏壳层 + 卡片式编辑器面板（自动增高 min 140px / max 45vh）；content 双通道——store 侧注入（openDoc/startDraft/插件帧 doc.set）与编辑器自发输入以 pushedRef 区分，编辑中不全量重置。
  - 适用 scope: components/editor、components/home/EditorPanel —— 新内核必须保持双通道语义与面板紧凑形态。
- `shadow-docs/knowledge/shell-chrome-design.md`
  - 当前结论: 颜色只经主题语义 token；图标一律走 components/icons 注册表；动效 150-300ms ease-out + prefers-reduced-motion。
  - 适用 scope: CM6 主题桥接（EditorView.theme + HighlightStyle）只允许 var(--token)，预览 toggle 按钮图标走注册表。
- `x.wuh.site/shadow-docs/knowledge/design-system.md`
  - 当前结论: UI 颜色只经主题语义 token 变量，明暗经 data 属性切换。
  - 适用 scope: 同上；明暗跟随经 CSS 变量自动生效（不再需要 Vditor 式 setTheme）。
- `shadow-dev-workflow/norms/code-style.md`
  - 当前结论: 依赖只经 package.json 声明入口消费；文件单一职责；不吞异常。
  - 适用 scope: 新增 @codemirror/* 依赖、退场 vditor 与 copy-vditor 资产管线。

## 决策
- **选型:** CodeMirror 6（@codemirror/state、view、commands、language + @codemirror/lang-markdown）源码编辑 + 面板内置预览分栏；预览渲染复用 `lib/renderPipeline.ts` 的 `renderService`（markdown-it + 相对图片重写 + 插件规则派发），与插件浮窗预览同源。MarkdownEditor 重写为 CM6 薄包装，胶囊命令通道契约（lib/editor-commands 的 EditorCommand）保持不变，EditorSection/TaskCapsule 零改动。
- **对比方案:** A 瘦身保留 Vditor——lute 3.6MB 不可省、IR 形态痛点不解决，否；B 纯 textarea + 预览——undo 粒度/选区操作/大文档性能差，胶囊命令退回手工维护，否；C Milkdown 轻量 WYSIWYG——用户已明确放弃 WYSIWYG 形态，否。
- **理由:** 用户确认「整体换轻量引擎 + 放弃 IR 形态 + 性能优先」。CM6 是源码编辑事实标准：增量解析大文档不卡、undo/选区/行操作 API 完备、主题经 CSS 变量映射明暗自动跟随、约 300KB 无 wasm。预览开关放编辑器面板文档状态行（icons 注册表图标 button，选择记忆 localStorage），默认纯编辑；开启后面板容器内分栏、按容器宽度左右/上下自适应。公式/mermaid 本期不内置（紧凑卡片用不满，后续需要时按 renderPipeline 插件规则扩展）。
- **待确认点:** ① 已归档 brief `20260922-feature-vditor-md-editor` 引用的父仓卡片 `desktop-plugin-architecture.md` 不存在（父仓现仅 `desktop-app-architecture.md`），本期知识闭环落地为 desktop 仓新卡、不追溯改档；② 工作区有未提交的 `package.json` electron `^44.3.0 → ^44.4.3` 局部升级与 `next-env.d.ts` 生成漂移，非本期范围，release 提交时只暂存本期 hunk；③ 在途 change `20260922-feature-shell-capsule`（issue #47，未建分支）与本期共用 `lib/i18n/locales.ts`，后合并者负责适配。

## 任务
### Phase 1 引擎替换基础
- [x] 依赖与资产退场：新增 @codemirror/state、view、commands、language、lang-markdown，移除 vditor；dev/build/dist 脚本去掉 prepare:vditor；删 `scripts/copy-vditor.mjs` 与 `.gitignore` 的 public/vditor 条目 — `package.json`, `scripts/copy-vditor.mjs`, `.gitignore`
- [x] MarkdownEditor 重写为 CM6 骨架：EditorView 挂载/销毁、lineWrapping、placeholder、updateListener→workspaceStore.setContent、外部注入 dispatch 防回环（pushedRef 语义平移）、Cmd/Ctrl+S 保存 — `components/editor/MarkdownEditor.tsx`
- [x] 主题桥接：EditorView.theme + HighlightStyle 全量 var(--token)（编辑区背景/文字/选区/光标 + 标题/强调/代码/链接语法配色），明暗自动跟随免重建 — `components/editor/MarkdownEditor.tsx`
### Phase 2 命令通道与预览
- [x] 胶囊命令消费移植：wrap/行前缀/插入 snippet/scrollToHeading（语法树定位标题）/focus 走 CM6 dispatch；剪贴板图片入口与 paste 拦截落盘（savePastedImage）保留 — `components/editor/MarkdownEditor.tsx`
- [x] PreviewPane 组件：防抖调 renderService 渲染，HTML 呈现方式与既有插件浮窗预览一致；EditorPanel 文档状态行加预览 toggle（localStorage 记忆），开启后容器内分栏自适应 — `components/editor/PreviewPane.tsx`, `components/home/EditorPanel.tsx`
### Phase 3 收尾回归
- [x] i18n 三语 key 增删一致（新增预览开关等，退役 vditor 遗留 key） — `lib/i18n/locales.ts`
- [x] 测试重建与全量回归：CM6 命令映射/防回环语义纯逻辑用例，删 vditor 专属用例，面板/预览回归；vitest + 双侧 tsc + next build + electron-vite build — `tests/editor-codemirror.test.ts`, `tests/vditor-editor.test.ts`, `tests/home-editor-panel.test.ts`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 新增
- **候选卡片:** `shadow-docs/knowledge/editor.md`（新卡：编辑器内核契约——CM6 生命周期、双通道防回环、命令通道消费、主题桥接只经 token、预览走 renderPipeline）+ `shadow-docs/menu.md` 增编辑器路由行
- **理由:** 项目菜单无编辑器路由，上期 vditor 的知识评估（父仓 desktop-plugin-architecture 卡）未落地且该卡已不存在；本期沉淀编辑器专属契约并修复路由缺口。
