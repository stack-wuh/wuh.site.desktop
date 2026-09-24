---
title: 主编辑器（CodeMirror 6）、即时渲染与分栏预览
domain: renderer-ui
keywords: [主编辑器, MarkdownEditor, CodeMirror, CM6, 预览, PreviewPane, renderPipeline, 命令通道, editor-commands, 双通道, 防回环, 图片粘贴, 大纲, 字数, 主题桥接, HighlightStyle, 即时渲染, livePreview, 装饰层, reconfigure]
scope: [components/editor, components/home/EditorPanel, lib/editor-cm, lib/editor-commands, lib/editor-info]
status: active
source:
  - changes/archive/20260922-refactor-codemirror-editor/brief.md
  - changes/archive/20260922-feature-vditor-md-editor/brief.md
  - changes/archive/20260923-feature-cm-live-preview/brief.md
  - changes/20260924-fix-live-preview-toggle-rebuild/brief.md
verified: 2026-09-24
---

# 主编辑器（CodeMirror 6）与分栏预览

## 当前结论

主编辑器是首页编辑器面板内的 **CodeMirror 6 源码编辑器**（`components/editor/MarkdownEditor.tsx` 薄包装，20260922-refactor-codemirror-editor 起替换 Vditor IR；曾由 20260922-feature-vditor-md-editor 短暂引入 Vditor，因 11MB 资产与 IR 形态不合用整体退场）。面板中央为编辑/预览区，动作行承载文档状态 · 预览 toggle · 新建 · 保存。

**content 双通道与防回环**：编辑器自发输入与命令事务经 `EditorView.updateListener` 的 docChanged → `workspaceStore.setContent`（CM6 无 Vditor「命令突变不触发回调」问题，命令事务自动回同步）；store 侧外部注入（openDoc/startDraft/插件帧 doc.set）经 `lib/editor-cm.ts` 的 `cmExternalContent` 全量回写（原光标 head 越界钳制），组件侧 `pushedRef` 与 `store.content` 比对防回环，编辑中不做全量重置。

**命令通道**：`lib/editor-commands.ts` 的 `EditorCommand` 契约是壳层胶囊（EditorSection）与面板动作行和编辑器解耦的唯一桥梁——format/insert/scrollToHeading/insertClipboardImage/focus 由 MarkdownEditor 消费，`lib/editor-cm.ts` 做 CM6 TransactionSpec 纯逻辑适配（格式化位置计算唯一事实源是 `lib/store.ts` 的 `applyMarkdownInsert`）；save/saveAs/newDraft/closeDoc 归宿主（壳层命令宿主 + 面板动作行）认领。大纲跳转按 `parseOutline` 序号定位标题行行首并 scrollIntoView；字数/大纲数据从 store.content 派生（editor-info），不接触编辑器实例。

**分栏预览**：`components/editor/PreviewPane.tsx` 防抖 300ms 调 `lib/renderPipeline.ts` 的 `renderService.execute`（markdown-it `html:false` + frontmatter 剥离 + 插件 preprocess/postRender 规则 + 相对图片重写 local-resource://），与插件浮窗预览**同源**；未保存草稿（activePath null）也可预览，空 ctx 跳过图片重写。预览 toggle 在面板动作行（IconEye，`wd.editorPreview` localStorage 记忆），开启后面板容器内分栏，`@container (max-width: 700px)` 纵向堆叠。

**即时渲染（L3 装饰管线，20260923-feature-cm-live-preview）**：`livePreviewField`（StateField 直供 `EditorView.decorations` + `atomicRanges`——CM6 禁止插件函数式跨行 replace 装饰，块级 widget 替换只有直供合法）把纯逻辑装饰规则落成 DecorationSet：块结构 `parseBlocks` / 光标行集合 `selectionLineSet` / 行内标记 `scanInlineMarks` 在 `lib/editor-cm.ts`，装饰与 widget 在 `components/editor/decorations.ts` / `widgets.ts`。渲染模式偏好持久化 `wd.editorRenderMode`（默认 render），胶囊「即时渲染」开关与 ⌘/ 经 `toggleRender` 命令 + Compartment 热切换。**契约：装饰重建条件必须覆盖 `tr.reconfigured`**——reconfigure 事务无 docChanged 亦无 selection，缺了它切入渲染态后装饰集保持 `create()` 初值空集，画面直到下一次输入才变化（20260924-fix-live-preview-toggle-rebuild 修复的用户实测 bug）。光标触及的行一律保持源码态（符号浮现）是设计语义，不是渲染失效。

**图片粘贴**：CM6 `domEventHandlers` capture 拦截 image 文件 + 胶囊图片入口统一走 `savePastedImage` 落文档同名 `.assets/`（主进程 `src/main/images.ts`），插入相对引用；用户提示用面板内 notice 条（CM6 无 tip API），2.6s 自动消退。

**主题桥接**：`EditorView.theme` + `HighlightStyle` 只写 `var(--token)`（含 color-mix），明暗随 data 属性路由自动生效——无 Vditor 式 setTheme 重建步骤；语法配色只用语义 token（标题/强调/链接/标记符等）。

## 执行约束

- 内核与命令语义变更必须保持：双通道防回环（pushedRef 比对）、命令通道消费契约（EditorSection/TaskCapsule 只经 editor-commands 与编辑器交互）、面板紧凑形态（min 140px / max 45vh）。
- 新编辑器命令先入 `EditorCommand` 词表（或 `MarkdownInsertAction` 词表）再消费；位置计算进 `applyMarkdownInsert` 纯函数并配测试，不绕过。
- 预览渲染必须走 `renderPipeline`（禁自行 new MarkdownIt 绕过插件规则与相对图片重写）；预览 HTML 的安全边界等同插件预览（markdown-it html:false）。
- 编辑器与预览 UI 颜色只经主题语义 token；`HighlightStyle` 从 `@codemirror/language` 导入（`@lezer/highlight` 只有 `tags`）。
- 即时渲染装饰层的重建条件必须包含 `tr.reconfigured`；任何经 Compartment 重配切换渲染态的路径都依赖它即时生效，不得改回「仅 doc/selection」。
- 依赖只经 package.json 声明消费；禁止重新引入本地化大体积静态资产管线（如 copy-vditor 式 prepare 脚本）。

## 适用边界

适用于宿主首页编辑器面板与其分栏预览、胶囊/面板到编辑器的命令链路。不适用于插件沙箱帧内部编辑器（插件自 vendor 依赖）；`workspaceStore` 作为插件 doc 服务状态源的帧协议语义见 renderer-shell-routing 卡。

## 验证方式

- `vitest run tests/editor-codemirror.test.ts tests/home-editor-panel.test.ts tests/editor-live-preview-toggle.test.ts`（CM6 适配/双通道语义/命令契约/大纲/字数/即时渲染开关时序纯逻辑）。
- `grep -rn "vditor" --include="*.ts" --include="*.tsx" --include="*.mjs" .`（排除 node_modules/out/dist/shadow-docs）应为空。
- `pnpm dev` 手动路径：首页面板打字（明暗四主题）、胶囊格式化/插入命令、图片粘贴落盘 `.assets/`、预览 toggle 分栏与窄容器纵堆、Cmd/Ctrl+S 保存、outline 跳转。

## 关联知识

- [Renderer 壳层两栏布局与 App Router 路由约定](renderer-shell-routing.md)
- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)
