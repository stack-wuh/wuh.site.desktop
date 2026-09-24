---
title: 主编辑器（CodeMirror 6）、即时渲染与分栏预览
domain: renderer-ui
keywords: [主编辑器, MarkdownEditor, CodeMirror, CM6, 预览, PreviewPane, renderPipeline, 命令通道, editor-commands, 双通道, 防回环, 图片粘贴, 大纲, 字数, 主题桥接, HighlightStyle, 即时渲染, livePreview, 装饰层, reconfigure, 沉浸编辑页, /editor, 面包屑, breadcrumb, 改名, 迁移, 复制, docTransfer, transferDoc, renameDoc, assets]
scope: [components/editor, components/home/EditorPanel, app/(shell)/editor, lib/editor-cm, lib/editor-commands, lib/editor-info, src/shared/docTransfer]
status: active
source:
  - changes/archive/20260922-refactor-codemirror-editor/brief.md
  - changes/archive/20260922-feature-vditor-md-editor/brief.md
  - changes/archive/20260923-feature-cm-live-preview/brief.md
  - changes/20260924-fix-live-preview-toggle-rebuild/brief.md
  - changes/20260924-feature-projects-editor-page/brief.md
  - changes/20260924-fix-cm-selection-atomic/brief.md
  - changes/20260924-feature-editor-toolbar/brief.md
  - changes/20260924-feature-breadcrumb-doc-ops/brief.md
verified: 2026-09-24
---

# 主编辑器（CodeMirror 6）、即时渲染与分栏预览

## 当前结论

主编辑器是首页编辑器面板内的 **CodeMirror 6 源码编辑器**（`components/editor/MarkdownEditor.tsx` 薄包装，20260922-refactor-codemirror-editor 起替换 Vditor IR；曾由 20260922-feature-vditor-md-editor 短暂引入 Vditor，因 11MB 资产与 IR 形态不合用整体退场）。面板中央为编辑/预览区，动作行承载文档状态 · 预览 toggle · 新建 · 保存。

**第二个挂载点 `/editor`（统一编辑页，2026-09-24 起）**：窄栏沉浸布局（~760px 居中列）+ 极简顶栏（返回 · 面包屑 · 新建 · 保存）；与首页面板**共用同一 `workspaceStore` 与同一命令通道**——保存/新建经 `publishEditorCommand` 发布、由常驻壳层的 EditorCommandHost 认领，页内不直呼主进程；冷启动（无文档无草稿会话，`content == null`）自动 `startDraft()` 延续「先写后存」；页内不提供分栏预览（首页面板的预览 toggle 语义保留在首页）。两挂载点由**路由互斥**保证任一时刻仅一处挂载 CM6 实例（首页 EditorPanel 行为不变）。

**面包屑文档操作（20260924-feature-breadcrumb-doc-ops）**：`/editor` 顶栏面包屑为**完整相对路径**（项目名/目录段/文件名 + 脏点）且可交互——点文件名原地变输入框（Enter/失焦提交、Esc 取消、草稿态纯文本不可点）发布 `renameDoc`；点目录段发布 `transferDoc` 唤起宿主承载的**目标文件夹选择 Dialog**（readTree 收集目录、迁移/复制双动作内嵌；复制停留原文 + Toast）。词表新增 `{ kind: 'renameDoc'; newName }` 与 `{ kind: 'transferDoc' }`，认领、校验、IPC 与 store 同步全在 EditorCommandHost。**`<stem>.assets` 随迁契约**：blog 约定图片落文档同目录同名 `.assets/` 且正文相对引用——改名/迁移必须经主进程 `transferDoc(srcRel, destRel, mode)` IPC（safeJoin 守卫 + assets 目录随迁、文档落位失败回滚 + 改名场景正文引用改写）；路径校验/引用改写/目录枚举纯逻辑唯一事实源是 `src/shared/docTransfer.ts`（渲染层与主进程共用），不得各写一份。move 时脏缓冲跟随新路径并保持 dirty（引用改写同步作用于内存缓冲），copy 前「所见即所存」先落盘。

**content 双通道与防回环**：编辑器自发输入与命令事务经 `EditorView.updateListener` 的 docChanged → `workspaceStore.setContent`（CM6 无 Vditor「命令突变不触发回调」问题，命令事务自动回同步）；store 侧外部注入（openDoc/startDraft/插件帧 doc.set）经 `lib/editor-cm.ts` 的 `cmExternalContent` 全量回写（原光标 head 越界钳制），组件侧 `pushedRef` 与 `store.content` 比对防回环，编辑中不做全量重置。

**命令通道**：`lib/editor-commands.ts` 的 `EditorCommand` 契约是壳层胶囊（EditorSection）、首页面板动作行与编辑区工具条（`components/editor/Toolbar.tsx`——format×9/insert×3/insertClipboardImage 零新增词表，动作-图标-文案与 EditorSection 同构，挂首页面板上下文行下与 `/editor` 页顶栏下，20260924-feature-editor-toolbar）和编辑器解耦的唯一桥梁——format/insert/scrollToHeading/insertClipboardImage/focus 由 MarkdownEditor 消费，`lib/editor-cm.ts` 做 CM6 TransactionSpec 纯逻辑适配（格式化位置计算唯一事实源是 `lib/store.ts` 的 `applyMarkdownInsert`）；save/saveAs/newDraft/closeDoc 归宿主（壳层命令宿主 + 面板动作行）认领。大纲跳转按 `parseOutline` 序号定位标题行行首并 scrollIntoView；字数/大纲数据从 store.content 派生（editor-info），不接触编辑器实例。扩展自持边界：`highlightSelectionMatches` 已移除；CM 内联搜索面板保留至自建查找替换 UI 立项（后续候选 change），键盘行为层（defaultKeymap/history）不自持。

**分栏预览**：`components/editor/PreviewPane.tsx` 防抖 300ms 调 `lib/renderPipeline.ts` 的 `renderService.execute`（markdown-it `html:false` + frontmatter 剥离 + 插件 preprocess/postRender 规则 + 相对图片重写 local-resource://），与插件浮窗预览**同源**；未保存草稿（activePath null）也可预览，空 ctx 跳过图片重写。预览 toggle 在面板动作行（IconEye，`wd.editorPreview` localStorage 记忆），开启后面板容器内分栏，`@container (max-width: 700px)` 纵向堆叠。

**即时渲染（L3 装饰管线，20260923-feature-cm-live-preview）**：`livePreviewField`（StateField 直供 `EditorView.decorations` + `atomicRanges`——CM6 禁止插件函数式跨行 replace 装饰，块级 widget 替换只有直供合法；atomicRanges 经 `atomicSubset` **仅供 widget replace 子集**，整集供给会把 mark/hidden/line 装饰一并原子化，光标被挡在样式文本之外、点击吸附 span 边缘，20260924-fix-cm-selection-atomic）把纯逻辑装饰规则落成 DecorationSet：块结构 `parseBlocks` / 光标行集合 `selectionLineSet` / 行内标记 `scanInlineMarks` 在 `lib/editor-cm.ts`，装饰与 widget 在 `components/editor/decorations.ts` / `widgets.ts`。渲染模式偏好持久化 `wd.editorRenderMode`（默认 render），胶囊「即时渲染」开关与 ⌘/ 经 `toggleRender` 命令 + Compartment 热切换。**契约：装饰重建条件必须覆盖 `tr.reconfigured`**——reconfigure 事务无 docChanged 亦无 selection，缺了它切入渲染态后装饰集保持 `create()` 初值空集，画面直到下一次输入才变化（20260924-fix-live-preview-toggle-rebuild 修复的用户实测 bug）。光标触及的行一律保持源码态（符号浮现）是设计语义，不是渲染失效。

**图片粘贴**：CM6 `domEventHandlers` capture 拦截 image 文件 + 胶囊图片入口统一走 `savePastedImage` 落文档同名 `.assets/`（主进程 `src/main/images.ts`），插入相对引用；用户提示用面板内 notice 条（CM6 无 tip API），2.6s 自动消退。

**主题桥接**：`EditorView.theme` + `HighlightStyle` 只写 `var(--token)`（含 color-mix），明暗随 data 属性路由自动生效——无 Vditor 式 setTheme 重建步骤；语法配色只用语义 token（标题/强调/链接/标记符等）。

## 执行约束

- 内核与命令语义变更必须保持：双通道防回环（pushedRef 比对）、命令通道消费契约（EditorSection/TaskCapsule 只经 editor-commands 与编辑器交互）、面板紧凑形态（min 140px / max 45vh）。
- 编辑面挂载点收敛：新增编辑面必须复用 `MarkdownEditor` + `publishEditorCommand` 命令通道 + 同一 `workspaceStore`，并保持路由互斥（同一时刻仅一处挂载 CM6）；不得为某页另建状态源或直连主进程写盘。
- 新编辑器命令先入 `EditorCommand` 词表（或 `MarkdownInsertAction` 词表）再消费；位置计算进 `applyMarkdownInsert` 纯函数并配测试，不绕过。
- 文档改名/迁移/复制一律经 `transferDoc` IPC + `src/shared/docTransfer.ts` 纯逻辑（校验/assets 映射/引用改写），保持 `<stem>.assets` 与文档同迁同改；不得在渲染层直写盘或绕过命令通道自建入口。
- 预览渲染必须走 `renderPipeline`（禁自行 new MarkdownIt 绕过插件规则与相对图片重写）；预览 HTML 的安全边界等同插件预览（markdown-it html:false）。
- 编辑器与预览 UI 颜色只经主题语义 token；`HighlightStyle` 从 `@codemirror/language` 导入（`@lezer/highlight` 只有 `tags`）。
- 即时渲染装饰层的重建条件必须包含 `tr.reconfigured`；任何经 Compartment 重配切换渲染态的路径都依赖它即时生效，不得改回「仅 doc/selection」。
- `atomicRanges` 只供 widget replace 装饰子集（`components/editor/decorations.ts` 的 `atomicSubset`），禁止整集供给；扩展列表必带 `drawSelection()`——缺省时选区走浏览器原生渲染，主题 `.cm-selectionBackground` 不生效，且与 `display:none` 隐藏标记互相打架（选区高亮跳块）。
- 依赖只经 package.json 声明消费；禁止重新引入本地化大体积静态资产管线（如 copy-vditor 式 prepare 脚本）。

## 适用边界

适用于宿主首页编辑器面板与 `/editor` 统一编辑页、其分栏预览（仅首页）、胶囊/面板到编辑器的命令链路。不适用于插件沙箱帧内部编辑器（插件自 vendor 依赖）；`workspaceStore` 作为插件 doc 服务状态源的帧协议语义见 renderer-shell-routing 卡。

## 验证方式

- `vitest run tests/editor-codemirror.test.ts tests/home-editor-panel.test.ts tests/editor-live-preview-toggle.test.tsx tests/editor-live-preview-atomic.test.tsx tests/editor-toolbar.test.tsx tests/editor-page.test.tsx tests/doc-transfer.test.ts`（CM6 适配/双通道语义/命令契约/大纲/字数/即时渲染开关时序/原子区契约/工具条命令发布 + `/editor` 顶栏与冷启动草稿会话 + 面包屑完整路径与改名/迁移命令发布 + docTransfer 纯逻辑）。
- `grep -rn "vditor" --include="*.ts" --include="*.tsx" --include="*.mjs" .`（排除 node_modules/out/dist/shadow-docs）应无**代码级**引用（注释性历史提及除外，如 tests/editor-codemirror.test.ts 契约回归的来源注记）。
- `pnpm dev` 手动路径：首页面板打字（明暗四主题）、胶囊格式化/插入命令、图片粘贴落盘 `.assets/`、预览 toggle 分栏与窄容器纵堆、Cmd/Ctrl+S 保存、outline 跳转；`/editor`：左栏项目树或项目页点文件进入、脏点与保存、新建、返回、Esc 退专注、冷启动自动草稿。

## 关联知识

- [Renderer 壳层两栏布局与 App Router 路由约定](renderer-shell-routing.md)
- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)
