---
title: 主编辑器（CodeMirror 6）、素笺即时渲染与书口/呼墨/笔帘/笺条
domain: renderer-ui
keywords: [主编辑器, MarkdownEditor, CodeMirror, CM6, 预览, renderPipeline, 命令通道, editor-commands, 双通道, 防回环, 图片粘贴, 图片上传, 远程链接, 本地链接, 切换图片链接形态, MenuPopover, 大纲, 字数, 主题桥接, HighlightStyle, 即时渲染, livePreview, 装饰层, reconfigure, 沉浸编辑页, /editor, 面包屑, breadcrumb, 改名, 迁移, 复制, docTransfer, transferDoc, renameDoc, assets, frontmatter, 文档头隐藏, 素笺, 书口, Spine, 笺条, CardWidget, 呼墨, SlashMenu, 斜杠菜单, 笔帘, SelectionToolbar, 落笔印, 空态, linkMeta, 衬线题阶, font-serif, findCardLine, spineTicks, cmInsertCard]
scope: [components/editor, components/editor/Spine, components/editor/SlashMenu, components/editor/SelectionToolbar, app/(shell)/editor, lib/editor-cm, lib/editor-commands, lib/editor-info, lib/editor-image-mapping, lib/editor-state, components/ui/MenuPopover, src/main/linkMeta, src/shared/docTransfer, src/shared/frontmatter]
status: active
source:
  - changes/archive/20260922-refactor-codemirror-editor/brief.md
  - changes/archive/20260922-feature-vditor-md-editor/brief.md
  - changes/archive/20260923-feature-cm-live-preview/brief.md
  - changes/archive/20260924-fix-live-preview-toggle-rebuild/brief.md
  - changes/archive/20260924-feature-projects-editor-page/brief.md
  - changes/archive/20260924-fix-cm-selection-atomic/brief.md
  - changes/archive/20260924-feature-editor-toolbar/brief.md
  - changes/archive/20260924-feature-breadcrumb-doc-ops/brief.md
  - changes/archive/20260924-feature-native-save-dialog/brief.md
  - changes/archive/20260925-feature-draft-crumb-save/brief.md
  - changes/archive/20260925-chore-milkdown-editor-poc/brief.md
  - changes/archive/20260927-style-editor-render-language/brief.md
  - changes/archive/20260927-feature-editor-interactions/brief.md
  - changes/archive/20261007-feature-frontmatter-editor-hide/brief.md
  - changes/archive/20261008-feature-image-upload-choice/brief.md
  - changes/archive/20261015-feature-workbench-shell/brief.md
  - changes/archive/20261014-feature-editor-paper-rebuild/brief.md
verified: 2026-10-17
verified-depth: runtime
verified-scope: 20261014 素笺手记（随 v1.0.0 合入，PR #156）：合并后 86 套件/925 用例逐批全绿 + 三 tsconfig 绿 + assert-first 新增纯逻辑（spineTicks/spineDistance/findCardLine/selectionUrl/cmInsertCard/cmConsumeSlashLine/applyMarkdownInsert-del/linkMeta）与笺条三态行为用例先红后绿 + 用户实机走查（发现并修复：悬浮顶栏压书耳页签、CM 聚焦虚线框显形）；20261015 工作台：editor-center/focus-mode/editor-context-sidebar/settings-appearance 套件绿（单挂载拓扑/专注 chrome 退场 data-chrome/侧栏三页签/外观三控件写穿）+ drafts-editor-dom 迁移到 /editor 页真 CM6 链路绿；历史：editor-page + i18n + saveas-flow 用例绿（草稿态 saveAs、三语 key 锁定、原生保存链共存）；20260927-feature-editor-interactions：L 级完整 TDD（先红 23 失败→绿，交互纯逻辑 26 + 组件行为用例，真实 EditorView 驱动点击）+ 全量 66 文件/581 用例 + 三 tsconfig 绿；20261007-feature-frontmatter-editor-hide：frontmatter 隐藏 11 用例 + 装饰族回归 80 绿 + 全量 74 文件/672 用例 + Electron 实机截图；20261008-feature-image-upload-choice：完整 TDD（19 新用例先红后绿）+ 全量 75 文件/687 用例 + electron-vite build + 用户实机走查
---

# 主编辑器（CodeMirror 6）、素笺即时渲染与书口/呼墨/笔帘/笺条

## 当前结论

主编辑器是 **CodeMirror 6 源码编辑器**（`components/editor/MarkdownEditor.tsx` 薄包装，20260922-refactor-codemirror-editor 起替换 Vditor IR；曾由 20260922-feature-vditor-md-editor 短暂引入 Vditor，因 11MB 资产与 IR 形态不合用整体退场）。**20261015-feature-workbench-shell 起为中央单挂载**：首页 EditorPanel 已退役（同日 `tests/home-editor-panel.test.ts` 删除、`tests/drafts-editor-dom.test.tsx` 迁移到 /editor 页），`/editor` 是唯一编辑面。**20261014-feature-editor-paper-rebuild「素笺手记」（随 v1.0.0 发布）完成编辑器 2.0 四层重建**：①形态（素笺画芯 + hover 显影顶栏 + 落笔印空态 + 预览分栏/常驻工具条退役）②排版（衬线题阶，见下）③交互（书口/呼墨/笔帘）④笺条卡片体系。

**素笺排版系统（20261014，视觉稿无损移植）**：新 token `--font-serif`（`'Noto Serif SC','Songti SC','STSong','SimSun',Georgia,serif` 系统衬线栈，零捆绑资产，`components/theme/tokens.ts`）；题名 h1 30px 衬线 + 渐隐墨线（18% 墨、收点 60%）、h2 22px + 朱线（22% 墨、收点 70%）、h3 18px（全部背景图实现——CM 行元素禁伪元素）；正文 15px/1.9 **两端对齐**、内容测宽默认 690px≈46em（`DEFAULT_TYPOGRAPHY`，用户仍可调）；引用 2px 朱线 + 5% 墨晕渐隐；链接改**墨色**下划（35% → hover 满墨，弃主题色）。词表增量：`MarkdownInsertAction` 增 `del`（笔帘删除线，`~~` 包裹走 `applyMarkdownInsert` 同一位置计算源）。

**书口刻度（`components/editor/Spine/`）**：/editor 右缘大纲柱——旧书页缘的索引墨口。点集 = `parseOutline` 密度自适应（`spineTicks`：≤cap24 全量、超 cap 均匀采样首尾必含，纯逻辑在 `lib/editor-info` 与胶囊大纲同源）；当前章由 editor-state 总线 `activeHeading` 驱动、距离档位 `spineDistance`（0=当前朱竖线 18px / 1=相邻 62% 墨 / 2=更远 34% 墨）；点击发布既有 `scrollToHeading`（复用跳章链，零字节改写）+ bloom 晕开 400ms；底端字数/读时复用 `editor.wordStat/readingTime` 键、悬停显影。纯显示层：不接触编辑器实例、不写 store。**与 SidePane 的关系**：书口=常驻墨口导航，SidePane=深度上下文工具（侧栏展开时书口让位）。

**呼墨（`components/editor/SlashMenu/`）**：行首 `/` 查询行（`^\/\S*$`）唤出的插入工具匣——条目=既有 insert/format 词表动作集 + `insertCard`（新词表项：读剪贴板 http(s) URL 经 `cmInsertCard` 插独立笺条行）；键入筛选、↑↓ 高亮（焦点恒留编辑器）、Enter 落墨、Esc 收匣并抑制重开（直到行不再匹配）；落墨前经 `cmConsumeSlashLine` 纯函数整行消费查询行。

**笔帘（`components/editor/SelectionToolbar/`）**：非空选区稳定 300ms 浮现的格式工具条——format 词表复用（粗/斜/删/行内码/链接）+「转为笺条」（`selectionUrl` 判定选区恰为 http(s) URL 时可用，动作=format link 包裹成整行链接、渲染态即成笺条）；Esc/选区消失即收，按钮 mousedown 阻断默认保住编辑器选区。

**笺条卡片（`components/editor/widgets.ts` CardWidget，签名元素）**：独立链接行/裸 URL 行（`findCardLine` 纯函数：整行恰为一个 http(s) 链接或裸 URL，列表/引用前缀与行内夹杂不算）整行替换为折角+站印+笺题（衬线）+摘语（clamp2）+域名卡片。元数据经 `fetchLinkMeta` IPC（`src/main/linkMeta.ts`：**只放行 http/https**、og:title/description/favicon 解析、`userData/link-meta.json` 持久缓存 TTL 7 天 cap 256、抓取失败回退过期缓存、无缓存抛错）——渲染层会话缓存命中即显，加载骨架、失败回退**虚线纯文字笺+重试**（正文永不因抓取失败丢失）。点击 `openExternal` 外开（仅 http/https）；编辑经键盘光标进入该行（光标行源码态）。widget replace 天然进 atomicSubset 子集。空文档呈现「落笔」朱印 + 三语引导（`editor.blankHint`）。

**统一编辑页 `/editor`（2026-09-24 起；20261015 起中央一等化；20261014 素笺形态）**：沉浸布局（760px 列、素笺画芯顶部呼吸 `clamp(72px,10vh,120px)`）+ **hover 显影顶栏**（常态 opacity .28、hover/focus-within 1、渐隐纸罩；按钮组=返回/面包屑/上下文侧栏开关/新建/保存——20261016 走查修复：顶栏 absolute 于画芯列内（Column relative 承载），不压右侧栏页签）；经 `publishEditorCommand` 走命令通道、由常驻壳层的 EditorCommandHost 认领，页内不直呼主进程；冷启动（`content == null`）自动 `startDraft()`；页内无分栏预览。**右缘上下文侧栏（20261015 task-9）**：`components/editor/SidePane/`——大纲/元数据（只读展示 + 跳 Frontmatter 插件编辑）/图床 + 插件 `area=context` 页签（`lib/panelTabs` 声明制）；顶栏按钮开合（默认展开）。**单挂载守卫**：任一时刻仅一处挂载 CM6 实例（新增编辑面必须复用 MarkdownEditor + 命令通道 + 同一 store 并维持互斥）。**写作面无焦点环**：`renderTheme` 关闭 CM6 默认 `.cm-focused` 虚线框（20261016 走查修复），光标即焦点指示。

**面包屑文档操作（20260924-feature-breadcrumb-doc-ops）**：`/editor` 顶栏面包屑为**完整相对路径**（项目名/目录段/文件名 + 脏点）且可交互——点文件名原地变输入框（Enter/失焦提交、Esc 取消）发布 `renameDoc`；点目录段发布 `transferDoc` 唤起宿主承载的**目标文件夹选择 Dialog**（readTree 收集目录、迁移/复制双动作内嵌；复制停留原文 + Toast）。词表新增 `{ kind: 'renameDoc'; newName }` 与 `{ kind: 'transferDoc' }`，认领、校验、IPC 与 store 同步全在 EditorCommandHost。**草稿态入口（20260925-feature-draft-crumb-save）**：有内容时「新草稿」可点、发布**既有 `saveAs`** 走原生保存面板落盘（合规「凡选位置一律原生弹窗」约束，不自建位置 UI；`canSave` 复用保证与保存按钮禁用态一致），空内容纯文本；落盘后面包屑自动变完整路径交互态。**`<stem>.assets` 随迁契约**：blog 约定图片落文档同目录同名 `.assets/` 且正文相对引用——改名/迁移必须经主进程 `transferDoc(srcRel, destRel, mode)` IPC（safeJoin 守卫 + assets 目录随迁、文档落位失败回滚 + 改名场景正文引用改写）；路径校验/引用改写/目录枚举纯逻辑唯一事实源是 `src/shared/docTransfer.ts`（渲染层与主进程共用），不得各写一份。move 时脏缓冲跟随新路径并保持 dirty（引用改写同步作用于内存缓冲），copy 前「所见即所存」先落盘。

**content 双通道与防回环**：编辑器自发输入与命令事务经 `EditorView.updateListener` 的 docChanged → `workspaceStore.setContent`（CM6 无 Vditor「命令突变不触发回调」问题，命令事务自动回同步）；store 侧外部注入（openDoc/startDraft/插件帧 doc.set）经 `lib/editor-cm.ts` 的 `cmExternalContent` 全量回写（原光标 head 越界钳制），组件侧 `pushedRef` 与 `store.content` 比对防回环，编辑中不做全量重置。

**saveAs 原生保存面板（20260924-feature-native-save-dialog）**：EditorCommandHost 的 save（无路径有内容）/saveAs 走 `window.api.pickSaveLocation`（主进程 `dialog.showSaveDialog`，`src/main/saveDialog.ts`）——目录+文件名一次选定，上次保存目录持久化 `userData/save-dialog.json` 作缺省（defaultPath 显式传入优先），建议文件名取正文首个标题（主进程 `suggestFileStem` 清洗非法字符、截断 80、兜底「未命名」后补 `.md`）。无工作区时先 `openWorkspace()` 原生目录选择引导（取消=整个保存终止）；**`applyWorkspaceSwitch` 会清空文档状态——内容与草稿归属必须先捕获再切**。确认路径经 shared 纯函数 `workspaceRelativePath` 定边界：工作区外 feedback Message 拒绝、会话保留（v1 不自动切工作区）；工作区内走既有 `writeFile → openDoc → consumeDraft` 转正链。自绘保存 Dialog 与相对路径输入已退役（`editor.fileNameLabel/Placeholder` 键删除）。与「打开项目」的原生 `showOpenDialog` 统一为**凡选文件系统位置一律系统原生弹窗**。

**命令通道**：`lib/editor-commands.ts` 的 `EditorCommand` 契约是壳层胶囊（EditorSection）、呼墨/笔帘与编辑器解耦的唯一桥梁——format/insert/scrollToHeading/insertClipboardImage/focus/**insertCard**（素笺新增：呼墨「链接笺条」读剪贴板 URL）由 MarkdownEditor 消费，`lib/editor-cm.ts` 做 CM6 TransactionSpec 纯逻辑适配（格式化位置计算唯一事实源是 `lib/store.ts` 的 `applyMarkdownInsert`——素笺增 `del` 动作）；save/saveAs/newDraft/closeDoc 归宿主（壳层命令宿主）认领。大纲跳转按 `parseOutline` 序号定位标题行行首并 scrollIntoView；字数/大纲数据从 store.content 派生（editor-info），不接触编辑器实例。扩展自持边界：`highlightSelectionMatches` 已移除；CM 内联搜索面板保留至自建查找替换 UI 立项（后续候选 change），键盘行为层（defaultKeymap/history）不自持。**常驻工具条已退役**（20261014：`components/editor/Toolbar.tsx` 删除，格式化入口=笔帘/呼墨/胶囊 EditorSection；`tests/editor-toolbar.test.tsx` 一并退役）。

**分栏预览已退役（20261014）**：`components/editor/PreviewPane.tsx` 删除、`wd.editorPreview` 键退役——即时渲染即最终态（素笺形态决策）；`renderPipeline` 仍服务插件浮窗预览（preview-markdown）与 `lib/editor-export.ts` 导出，编辑器侧不再维护第二渲染面。

**即时渲染（L3 装饰管线，20260923-feature-cm-live-preview）**：`livePreviewField`（StateField 直供 `EditorView.decorations` + `atomicRanges`——CM6 禁止插件函数式跨行 replace 装饰，块级 widget 替换只有直供合法；atomicRanges 经 `atomicSubset` **仅供 widget replace 子集**，整集供给会把 mark/hidden/line 装饰一并原子化，光标被挡在样式文本之外、点击吸附 span 边缘，20260924-fix-cm-selection-atomic）把纯逻辑装饰规则落成 DecorationSet：块结构 `parseBlocks` / 光标行集合 `selectionLineSet` / 行内标记 `scanInlineMarks` 在 `lib/editor-cm.ts`，装饰与 widget 在 `components/editor/decorations.ts` / `widgets.ts`。渲染模式偏好持久化 `wd.editorRenderMode`（默认 render），胶囊「即时渲染」开关与 ⌘/ 经 `toggleRender` 命令 + Compartment 热切换。**契约：装饰重建条件必须覆盖 `tr.reconfigured`**——reconfigure 事务无 docChanged 亦无 selection，缺了它切入渲染态后装饰集保持 `create()` 初值空集，画面直到下一次输入才变化（20260924-fix-live-preview-toggle-rebuild 修复的用户实测 bug）。光标触及的行一律保持源码态（符号浮现）是设计语义，不是渲染失效。

**图片粘贴与上传选择（20261008-feature-image-upload-choice 定稿，有意反转 20261007「成功换远程 URL」决策）**：CM6 `domEventHandlers` capture 拦截 image 文件 + 胶囊/工具条入口统一走 `savePastedImage` 落文档同名 `.assets/`（主进程 `src/main/images.ts`）。**双链回传契约**：`SavedImage.markdownRef` 恒为本地相对引用（所见即所存、字节保真），上传成功只回传 `remoteUrl`——`uploadMode=oss|command` 不再静默改链，拿到 `remoteUrl` 后登记会话映射并经 **Message 横幅**「使用远程链接 / 保持本地」（`lib/feedback.ts` message，resolve 按钮 id；关闭 = 保持本地），选择远程才以 `rewriteImageRef` 纯函数替换正文；失败 `uploaded:false` 保持本地 + warning 横幅。工具条与胶囊的图片钮为共享 **`components/ui/MenuPopover.tsx`** 下拉（粘贴剪贴板图 / 选择本地图片上传 / 切换图片链接形态——可用性由 `imageSwitchAvailable` 纯逻辑按 `workspaceStore.content` + `editor-state` 总线新留存的 `cursorLine` 判定，置灰而非隐藏）。反切：本地→远程先查会话映射，未命中经 `uploadExistingAsset(docRelPath, refRelPath)`（主进程 `isAssetsRefOfDoc` 守卫 + safeJoin，只许本文件档同名 `.assets/`，复用 `composePasteResult` 同一路由链）；远程→本地依赖 `lib/editor-image-mapping.ts` 会话内存映射（docRelPath 作用域键，跨会话不持久化，丢失提示「本地文件仍在 .assets」并禁用）。选图入口走既有 `window.api.pickImages` 原生弹窗，导入链 `saveImageFromPickedPath` 仍受 picker 会话白名单钳制。用户即时提示仍用面板内 notice 条（CM6 无 tip API），2.6s 自动消退。

**主题桥接**：`EditorView.theme` + `HighlightStyle` 只写 `var(--token)`（含 color-mix），明暗随 data 属性路由自动生效——无 Vditor 式 setTheme 重建步骤；语法配色只用语义 token（标题/强调/链接/标记符等）。**渲染语言「墨水层次」（20260927 定稿；20261014 素笺升格）**：非光标行 = 沉淀排版、光标行 = 源码浮现（「墨迹未干」）——素笺版衬线题阶 h1 30px（渐隐墨线 18% 墨/收点 60%）/h2 22px（朱线 22% 墨）/h3 18px、正文两端对齐、引用 2px 朱线 + 5% 墨晕渐隐（去斜体）、行内代码纸面凹槽（inset 阴影 + 描边）、链接**墨色**下划（35% → hover 满墨）、列表几何圆点（BulletWidget 5px 圆）、图片自然尺寸大图内联（hover 浮起；点击 lightbox）；标题下缘线一律**背景图**实现（CM 行元素禁 ::after 伪元素，干扰文本测量）；交互过渡统一 `var(--motion-dur-quick)` + `var(--motion-ease-out-soft)` 且仅颜色类属性（禁布局位移），`prefers-reduced-motion` 由挂载容器 styles.ts 统一关停；焦点可见性按壳层规范（围栏复制钮/查找面板），**写作面本体无焦点环**（`.cm-focused{outline:none}`，光标即指示）。正文默认排版 15px/1.9 + 测宽 690（`lib/editor-state.ts` DEFAULT_TYPOGRAPHY，用户仍可调）。

**编辑引擎选型评估（20260925-chore-milkdown-editor-poc，PoC 实测）**：Milkdown（ProseMirror+remark，Typora 式 WYSIWYG）替换 CM6 的议题经用户硬性判据「`.md` 在 GitHub 上保持原状（字节保真）」+ `@milkdown/kit@7.22.2` 真实 transformer 实测**否决**：headless 默认 preset（commonmark+gfm）下 frontmatter 笔记头被毁（`---`→`***`、元数据降级为段落、`tags: [随笔]`→`tags: \[随笔]`，证实上游 #1712 OPEN）、图片行 round-trip 整行丢失（`<stem>.assets` 相对引用约定数据丢失，中/英路径同现）、`-` 列表/`---` 分隔线/setext 标题/`1)` 有序列表/行尾两空格硬换行首次保存即被翻写（翻写率明细见 `changes/archive/20260925-chore-milkdown-editor-poc/report.md`）；规范化为一次性（17 样例二次保存零差异），#2349 autolink 转义翻倍在 7.22.2 未能复现。结论：问题不是上游工程质量（MIT、双周发版、健康度优秀）而是架构目标错配——它优化「编辑体验的语义模型」，本产品要求「磁盘字节即事实源」。

**L4 渲染态交互（20260927-feature-editor-interactions，L 级完整 TDD）**：五项交互的位置/改写计算唯一事实源在 `lib/editor-cm.ts` 纯函数层（字节保真：UI 只消费纯函数结果 dispatch）。①**链接**：Ctrl/Cmd+点击 `findLinkTargetAt` → `window.api.openExternal` 直达 IPC（不进 EditorCommand 词表，同图片粘贴先例），仅放行 http/https，相对链接静默忽略；②**任务列表**：GFM `- [ ]` 渲染态 checkbox widget，点击经 `toggleTaskLine` 改写整行（MathWidget 先例），光标行保持源码态；③**标题折叠**：独立 `foldField`（StateField<Set>，与渲染开关无关、纯源码态可用）直供占位 replace + 自有 atomicRanges（全 widget replace，契约天然满足），光标进入折叠区自动展开、docChanged 清空折叠（v1：不持久化、跨挂载点不记忆）；④**注释**：parseBlocks 新 BlockKind `comment`（多行未闭合回退源码态），渲染态收成标注条，预览/导出不渲染（html:false 语义一致）；⑤**脚注** v1 仅样式（引用上标 + 定义行分节），不做跳转（预览面板无 footnote 插件，不单方面超前）。**lightbox**：ImageWidget 点击经 `wd-editor-lightbox` CustomEvent → MarkdownEditor React portal，复用 `data-dialog-overlay` 属性使浮窗层 Esc 让位（z130 > Dialog 100），焦点移入归还、reduced-motion 关停。widget 文案三语经 `translateText` + `storedLocale()`（locales.ts 纯函数，非 React 环境）。正文默认排版 15px/1.8（`lib/editor-state.ts` DEFAULT_TYPOGRAPHY，用户仍可调）。

**文档头 frontmatter 渲染态隐藏（20261007-feature-frontmatter-editor-hide）**：编辑器即时渲染态把闭合的 frontmatter 块**整块完全隐藏**（`FrontmatterHiddenWidget` 零尺寸块替换，无占位条），展示与修改由 Frontmatter 助手插件视图承担。边界唯一事实源是 `src/shared/frontmatter.ts` 的 `frontmatterLineRange`（口径与 `parseFrontmatter` 严格同源：剥 BOM、首行恰为 `---`、闭合取首个 `\n---`、**YAML 不合法不隐藏**——与 renderPipeline 剥离口径一致）；parseBlocks 新 BlockKind `'frontmatter'` 仅认文档起始块，未闭合/中部 `---` 一律回退源码态（中部仍按 hr）。替换区间必须**吞掉闭合行的换行符**（`Math.min(last.to + 1, doc.length)`）——不吞则残留空 view-line 成视觉空行；纯装饰零字节改动（字节保真不破），光标触及头部行浮现源码（「光标行源码态」设计语义）、纯源码态（⌘/）完整可见、widget replace 进 atomicSubset 子集。

## 执行约束

- 内核与命令语义变更必须保持：双通道防回环（pushedRef 比对）、命令通道消费契约（EditorSection/呼墨/笔帘只经 editor-commands 与编辑器交互）。
- saveAs 一律走原生保存面板（`pickSaveLocation`），渲染层不得再造位置选择 UI；新增「选文件系统位置」场景统一原生弹窗心智（`workspaceRelativePath` 定工作区边界，主进程 `safeJoin` 兜底）。
- 编辑面挂载点收敛：新增编辑面必须复用 `MarkdownEditor` + `publishEditorCommand` 命令通道 + 同一 `workspaceStore`，并保持路由互斥（同一时刻仅一处挂载 CM6）；不得为某页另建状态源或直连主进程写盘。
- 新编辑器命令先入 `EditorCommand` 词表（或 `MarkdownInsertAction` 词表）再消费；位置计算进 `applyMarkdownInsert`/`lib/editor-cm.ts` 纯函数并配测试，不绕过。
- **素笺显示层不变量（20261014）**：书口/呼墨/笔帘/笺条全部是纯显示层——正文 markdown 语法是唯一事实源，笺条与书口交互零字节改写；一切改写（任务点选、转为笺条、呼墨查询行消费 `cmConsumeSlashLine`、插卡 `cmInsertCard`、笺条判定 `findCardLine`、选区 URL 判定 `selectionUrl`、书口密度 `spineTicks`/`spineDistance`）必须经 `lib/editor-cm.ts`/`lib/editor-info.ts` 纯函数计算再 dispatch，禁止 widget/handler 内手拼。
- **linkMeta 守卫（INV）**：`src/main/linkMeta.ts` 只放行 http/https（`isFetchableUrl`）、只做文本解析不执行远程内容、缓存落 `userData/link-meta.json`（TTL 7 天 cap 256、失败回退过期缓存）；抓取失败渲染层回退虚线纯文字笺——正文永不因抓取失败丢失或改写；宿主专用，不进 `CAPABILITY_METHODS`。
- 图片插入三入口（粘贴/拖拽、胶囊、工具条菜单）一律双链回传：正文先插本地 `.assets` 引用，远程链接只经 Message 横幅用户选择后替换——禁止恢复「上传成功静默改链」；上传路由唯一事实源 `src/main/images.ts`（`composePasteResult`/`routeUpload`，粘贴与面板批量共用一条链，文件字节与凭证不出主进程）。本地→远程反切只经 `uploadExistingAsset`（`isAssetsRefOfDoc` + safeJoin 钳制本文件档同名 `.assets/`；不得为刚落盘路径豁免 picker 白名单去调 `uploadImages`）；远程→本地只认 `lib/editor-image-mapping.ts` 会话映射（docRelPath 作用域键，禁止跨会话持久化与 URL 启发式匹配文件）。
- 下拉菜单（含未来 chrome 菜单场景）统一消费 `components/ui/MenuPopover.tsx`：点外关 target 归属守卫（根 ref contains 豁免）、Esc capture 分治一次只关一层、焦点移入首项并归还触发钮、颜色只写语义 token；菜单可用性判定（如图片链接切换）用 `imageSwitchAvailable` 纯逻辑，输入 `workspaceStore.content` + `editor-state` 总线的 `cursorLine`（20261008 起留存），不得回读编辑器实例。
- 文档改名/迁移/复制一律经 `transferDoc` IPC + `src/shared/docTransfer.ts` 纯逻辑（校验/assets 映射/引用改写），保持 `<stem>.assets` 与文档同迁同改；不得在渲染层直写盘或绕过命令通道自建入口。
- 导出/插件预览渲染必须走 `renderPipeline`（禁自行 new MarkdownIt 绕过插件规则与相对图片重写）；预览 HTML 的安全边界等同插件预览（markdown-it html:false）。编辑器侧分栏预览已退役（20261014），不得为编辑器重建第二渲染面。
- 编辑器与预览 UI 颜色只经主题语义 token；`HighlightStyle` 从 `@codemirror/language` 导入（`@lezer/highlight` 只有 `tags`）；衬线只走 `--font-serif`（系统衬线栈，禁止捆绑字体资产）。
- 即时渲染装饰层的重建条件必须包含 `tr.reconfigured`；任何经 Compartment 重配切换渲染态的路径都依赖它即时生效，不得改回「仅 doc/selection」。
- frontmatter 隐藏只走装饰层（零字节改动）；块边界一律经 `frontmatterLineRange` 判定，禁止在编辑器侧另写 `---` 识别口径；隐藏替换必须吞闭合行换行、未闭合/YAML 不合法必须回退源码态；结构化信息的展示与修改入口在 Frontmatter 插件视图，不得在编辑器内重建元数据表单。
- `atomicRanges` 只供 widget replace 装饰子集（`components/editor/decorations.ts` 的 `atomicSubset`），禁止整集供给；扩展列表必带 `drawSelection()`——缺省时选区走浏览器原生渲染，主题 `.cm-selectionBackground` 不生效，且与 `display:none` 隐藏标记互相打架（选区高亮跳块）。
- 依赖只经 package.json 声明消费；禁止重新引入本地化大体积静态资产管线（如 copy-vditor 式 prepare 脚本）。
- 编辑器引擎选型必须满足**字节保真**（缓冲区/磁盘字节即事实源，渲染层只改显示不改内容）；禁止引入 parse→re-serialize 型引擎（Milkdown/Vditor 类）作为可保存编辑面。实证与翻写率见 `changes/archive/20260925-chore-milkdown-editor-poc/report.md`（上游行为观察哨测试与 devDep 已于 20260927-style-editor-render-language 经用户批准移除——本约束本身即护栏，如再议 Milkdown 须重跑 PoC）。
- 渲染态交互改写源码（任务点选、图片链接远程↔本地切换、呼墨查询行消费、插卡）必须经 `lib/editor-cm.ts` 纯函数计算再 dispatch，禁止在 widget/handler 内手拼事务；位置反查（链接定位/折叠区间/卡片判定）同层实现同层测试。折叠域与 livePreview 域各自的 atomicRanges 都只供 widget replace 子集（20260924-fix-cm-selection-atomic 契约）。链接/笺条打开仅 http/https 经 `window.api.openExternal`；浮层类交互（lightbox）必须复用 `data-dialog-overlay` 让位机制并尊重 reduced-motion。
- **浮层件纪律（20261014）**：呼墨/笔帘/书口的状态机与 live state 同源驱动（doc/selection 事务），呼墨 Esc 后须抑制重开直到查询行形态解除；笔帘动作经 format 词表发布、按钮 mousedown 阻断默认保选区；书口点击跳章只经 `scrollToHeading` 词表。

## 适用边界

适用于 `/editor` 统一编辑页（唯一编辑面，20261015 起首页 EditorPanel 已退役）、其右缘上下文侧栏、胶囊/面板到编辑器的命令链路。不适用于插件沙箱帧内部编辑器（插件自 vendor 依赖）；`workspaceStore` 作为插件 doc 服务状态源的帧协议语义见 renderer-shell-routing 卡。

## 验证方式

- `vitest run tests/editor-codemirror.test.ts tests/editor-live-preview-toggle.test.tsx tests/editor-live-preview-atomic.test.tsx tests/editor-live-preview-frontmatter.test.tsx tests/editor-page.test.tsx tests/editor-center.test.tsx tests/editor-context-sidebar.test.tsx tests/focus-mode.test.tsx tests/doc-transfer.test.ts tests/editor-interactions.test.ts tests/editor-interactions-widgets.test.tsx tests/drafts-editor-dom.test.tsx`（CM6 适配/双通道语义/命令契约/大纲/字数/书口密度与距离档位/笺条判定与插卡/呼墨消费/即时渲染开关时序/原子区契约 + `/editor` hover 顶栏五件与冷启动草稿会话 + 首页退出编辑守卫（INV-3）+ 面包屑改名迁移命令发布 + docTransfer 纯逻辑 + L4 交互纯逻辑与 widget 行为 + 笺条三态（元数据填充/失败虚笺/光标进入回源码态、doc 字节不变）+ del 词表回归 + 20261015 单挂载拓扑/专注 chrome 退场/侧栏三页签）；`vitest run tests/save-dialog.test.ts tests/saveas-flow.test.tsx`（原生保存面板）；`vitest run tests/oss-upload.test.ts tests/ui-menu-popover.test.tsx`（图片上传选择链 + linkMeta 纯逻辑：isFetchableUrl/parseLinkMeta）；`vitest run tests/i18n.test.ts`（三语 parity + 源码键覆盖，含素笺新增 25 键）。
- 全量回归（20261014 归档时点）：合并 workbench-shell 后 86 套件/925 用例逐批全绿 + 三 tsconfig 绿（本机 V8 不稳按 SGN-1 单文件小批 + 重试消化）。
- `pnpm dev` 手动路径（L4 交互走查）：渲染态点任务 checkbox（源码改写 + 明暗核对）、标题 hover 箭头折叠/点击占位条展开/光标进入自动展开、`<!-- -->` 注释收成标注条/点击展开、脚注上标与定义行分节、图片点击 lightbox（Esc 关闭且浮窗层让位、焦点归还）、Ctrl/Cmd+点击 http(s) 链接直达浏览器（相对链接无动作）。
- `pnpm dev` 手动路径（素笺 2.0 走查，20261016 用户实机执行）：整壳形态（首页无编辑面、/editor 素笺居中、hover 顶栏显影）、书口跳章/bloom/悬停章名/底端字数读时、呼墨键盘全链（/ 筛选 ↑↓ Enter Esc）、笔帘显隐与动作、笺条三态 + 失败回退 + 点击外开、空文档落笔印、四主题明暗、IME 中文输入、reduced-motion、字节保真抽查（GitHub 渲染对照）；走查发现两缺陷（顶栏压书耳页签/聚焦虚线框）当轮修复并回归。
- `grep -rn "vditor\|PreviewPane\|EditorToolbar\|EditorPanel" --include="*.ts" --include="*.tsx" components app lib tests`（排除 node_modules/out/dist/shadow-docs 与注释性历史提及）应无代码级引用。
- `pnpm dev` 手动路径（图片上传选择，20261008）：oss 模式粘贴→本地引用先插→Message 横幅「使用远程链接/保持本地」两选各自生效、关横幅=保持本地；胶囊图片菜单三动作；反切远程↔本地；local 模式无横幅静默；image-host 面板批量上传 + 任务胶囊进度。

## 关联知识

- [Renderer 壳层两栏布局与 App Router 路由约定](renderer-shell-routing.md)
- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)
