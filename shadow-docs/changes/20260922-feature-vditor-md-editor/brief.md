---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-feature-vditor-md-editor",
  "type": "feature",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260922-feature-vditor-md-editor",
  "files": [
    "components/editor/MarkdownEditor.tsx",
    "components/home/EditorPanel.tsx",
    "components/home/FormatToolbar.tsx",
    "components/home/PreviewCapsule.tsx",
    "components/home/ProjectSection.tsx",
    "components/workspace/WorkspacePicker.tsx",
    "components/workspace/FilePicker.tsx",
    "components/workspace/PickerShell.tsx",
    "components/tasks/TaskCapsule.tsx",
    "components/tasks/TaskPopover.tsx",
    "components/tasks/EditorSection.tsx",
    "lib/editor-commands.ts",
    "lib/editor-info.ts",
    "lib/store.ts",
    "lib/i18n/locales.ts",
    "components/icons/index.tsx",
    "scripts/copy-vditor.mjs",
    ".gitignore",
    "package.json",
    "tests/vditor-editor.test.ts",
    "tests/home-editor-panel.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 41,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/41",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "b77fe968b9d62847575f589c7cf8f3d95c3eab69",
    "verifiedAt": "2026-09-22T12:12:04.642Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:41",
    "planHash": "874aaee14588312851bcd61c4ee683168a6e082c947930e68ac67ae286c99bde",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 首页主编辑器升级 Vditor IR 引擎",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n桌面端定位是博客写作工具，主编辑器是产品核心，但当前 `components/home/EditorPanel.tsx` 只是纯 textarea + 自研格式化工具栏：无实时渲染、无结构感知、无公式/图表能力，与「重中之重」的写作体验目标差距大。本期引入成熟开源引擎 Vditor 的 IR（即时渲染，类 Typora）模式替换自研编辑区，获得所见即所得写作体验与公式/mermaid/大纲/字数统计全家桶能力；同时把编辑器封装为可复用组件，为下期全屏写作页（独立变更）打底。\n\n## 引用规范\n- `shadow-docs/knowledge/desktop-plugin-architecture.md`（父仓库）\n  - 当前结论: 宿主首页持有主编辑器面板、直写 workspaceStore（openDoc/setContent/saveActive），content 双通道（宿主写入 + 插件帧 doc.set）汇聚同一状态源，documentHooks 广播对两者一致生效；插件不消费宿主组件、依赖自 vendor。\n  - 适用 scope: apps/desktop —— 本变更延续双通道与保存链路，编辑器留在宿主渲染层（不插件化），新剪贴板 IPC 为宿主自用能力、不进 CAPABILITY_METHODS 插件白名单。\n- `shadow-docs/knowledge/design-system.md`（父仓库）\n  - 当前结论: UI 颜色只经主题语义 token 变量，明暗经 data 属性切换。\n  - 适用 scope: Vditor 主题桥接层只允许写 `var(--token)`，禁硬编码色值；明暗自动跟随。\n\n## 决策\n- **选型:** 方案 A —— Vditor 直嵌宿主渲染层：`components/editor/MarkdownEditor.tsx` 薄包装（IR 模式、实例生命周期、主题跟随），静态资源（lute/katex/mermaid/高亮）落 `public/vditor/` 本地化离线可用。\n- **对比方案:** B 编辑器插件化（iframe 沙箱）——违背插件不消费宿主组件约束、需为剪贴板/文件写入开一串新能力通道，否；C Milkdown 自搭——headless 契合度最好但公式/mermaid/表格需逐个插件搭建，到功能齐全周期长，否。\n- **理由:** 用户确认类 Typora 即时渲染形态 + Vditor 引擎；复用 content 双通道与 Cmd+S 保存链路，改动集中在渲染层与一个主进程新能力；最小暴露原则（隐藏导出、不做工具栏用户配置、不开多标签）。\n- **关键约束:** IR 模式 `setValue` 会重置光标——仅在 openDoc/外部变更时回写，编辑中不回写（区分用户输入 vs 程序注入）。\n\n## 任务\n### Phase 1 引擎接入基础\n- [ ] 引入 vditor 依赖并本地化静态资源（public/vditor/，cdn 选项指向本地，验证 dev 与打包后路径） — `package.json`, `public/vditor/`\n- [ ] 新建 MarkdownEditor 组件骨架：IR 模式、挂载创建/卸载销毁、明暗主题跟随、主题 token 覆盖层（仅 var(--token)） — `components/editor/MarkdownEditor.tsx`\n### Phase 2 首页面板集成\n- [ ] EditorPanel 编辑区替换：简洁=无工具栏、全量=Vditor 工具栏、字数统计两档常开、大纲面板仅全量档 — `components/home/EditorPanel.tsx`\n- [ ] content 双通道联动：onChange→setContent、openDoc→setValue（防光标重置）、Cmd+S→saveActive，回归 documentHooks 广播与 preview-markdown 浮窗联动 — `components/editor/MarkdownEditor.tsx`\n### Phase 3 图片粘贴落盘\n- [ ] 主进程剪贴板图片落盘能力：clipboard.readImage → 当前文档同级 assets/日期-hash.png，DesktopApi/preload/shared types 扩展 — `src/main/clipboard-assets.ts`, `src/main/ipc.ts`, `src/preload/index.ts`, `src/shared/types.ts`\n- [ ] 编辑器 paste 接入：截图→落盘→插入相对路径 Markdown，失败三语提示 — `components/editor/MarkdownEditor.tsx`, `lib/i18n/locales.ts`\n- [ ] 纯逻辑测试：图片文件名/相对路径拼接、模式→toolbar 配置映射、双通道联动语义 — `tests/vditor-editor.test.ts`\n### Phase 4 收尾\n- [ ] 退役 FormatToolbar/PreviewCapsule 及 editor.fmt* 等三语 key（中/英/日集合一致），全量回归：vitest + 双侧 tsc + next build + electron-vite build — `components/home/FormatToolbar.tsx`, `components/home/PreviewCapsule.tsx`, `lib/i18n/locales.ts`\n\n完整 brief：shadow-docs/changes/20260922-feature-vditor-md-editor/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-feature-vditor-md-editor\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-feature-vditor-md-editor/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 首页主编辑器升级 Vditor IR 引擎 · 功能入口全局胶囊化

## 动机

桌面端定位是博客写作工具，主编辑器是产品核心，但当前 `components/home/EditorPanel.tsx` 只是纯 textarea + 自研格式化工具栏：无实时渲染、无结构感知、无公式/图表能力，与「重中之重」的写作体验目标差距大。本期做两件事：① 引入成熟开源引擎 Vditor 的 IR（即时渲染，类 Typora）模式替换自研编辑区，获得所见即所得写作体验与公式/mermaid/大纲/字数统计全家桶能力；② 落实「全部交给胶囊」的交互收敛——编辑器功能入口全部收进壳层全局胶囊（TaskCapsule/TaskPopover 扩展），面板内部只留文档状态行 + 编辑区。**首页定位不变：综合活动散点图 + 极简编辑器面板的卡片式布局——编辑器是页面中的一个紧凑面板（自动增高，min 140px / max 45vh），不是整页编辑器**；全屏写作形态是下期的独立路由（另立变更），与首页无关。同时把编辑器封装为可复用组件，为下期全屏写作页打底。

## 引用规范

- `shadow-docs/knowledge/desktop-plugin-architecture.md`（父仓库）
  - 当前结论: 宿主首页持有主编辑器面板、直写 workspaceStore（openDoc/setContent/saveActive），content 双通道（宿主写入 + 插件帧 doc.set）汇聚同一状态源，documentHooks 广播对两者一致生效；插件不消费宿主组件、依赖自 vendor。
  - 适用 scope: apps/desktop —— 本变更延续双通道与保存链路，编辑器留在宿主渲染层（不插件化），新剪贴板 IPC 为宿主自用能力、不进 CAPABILITY_METHODS 插件白名单。
- `shadow-docs/knowledge/design-system.md`（父仓库）
  - 当前结论: UI 颜色只经主题语义 token 变量，明暗经 data 属性切换。
  - 适用 scope: Vditor 主题桥接层只允许写 `var(--token)`，禁硬编码色值；明暗自动跟随。

## 决策

- **选型:** 方案 A —— Vditor 直嵌宿主渲染层 + 功能入口全局胶囊化：
  - `components/editor/MarkdownEditor.tsx` 薄包装 Vditor IR（**不渲染内置工具栏**），静态资源（lute/katex/mermaid/高亮）落 `public/vditor/` 本地化离线可用。
  - 壳层胶囊 TaskCapsule 扩展为「任务 + 编辑器」复合入口：TaskPopover 新增编辑器分区 `components/tasks/EditorSection.tsx`，承载格式化命令组（标题/加粗/斜体/列表/引用/代码/链接）、插入类（图片/表格/代码块/分隔线）、文档操作（保存/另存为/新建/关闭，SaveAs Dialog 迁入）、信息与视图（字数统计/大纲跳转/工作区与文件选择入口）。
  - 命令通道 `lib/editor-commands.ts` 事件总线：胶囊发布命令、MarkdownEditor 订阅执行；执行优先 Vditor 增量 API（insertValue/focus），`applyMarkdownInsert` 纯逻辑保留用于位置计算与测试。`lib/editor-info.ts` 纯函数 parseOutline/countWords 从 workspaceStore.content 派生大纲与字数。
  - EditorPanel 精简为「文档状态行 + 纯编辑区」：废除简洁/全量模式切换（无工具栏后两档无差异）、移除保存/新建按钮（胶囊承载）；**首页布局不变（问候语 → 散点图卡片 → 编辑器面板卡片），编辑器面板保持卡片式紧凑尺寸与自动增高约束（min 140px / max 45vh）**；WorkspacePicker/FilePicker 拆迁 `components/workspace/` 供胶囊面板使用。
- **对比方案:** B 编辑器插件化（iframe 沙箱）——违背插件不消费宿主组件约束、需为剪贴板/文件写入开一串新能力通道，否；C Milkdown 自搭——headless 契合度最好但公式/mermaid/表格需逐个插件搭建，到功能齐全周期长，否；D 胶囊与 Vditor 精简工具栏并存——用户确认完全胶囊化以获得最纯粹编辑体验，否。
- **理由:** 用户确认类 Typora 即时渲染形态 + Vditor 引擎 + 功能全部进胶囊；复用 content 双通道与 Cmd/Ctrl+S 保存链路；改动集中在渲染层、壳层胶囊与一个主进程新能力；最小暴露原则（隐藏导出、不做工具栏用户配置、不开多标签）。
- **关键约束:** IR 模式 `setValue` 会重置光标——仅在 openDoc/外部变更时回写，编辑中命令走增量 API（区分用户输入 vs 程序注入）。图片粘贴落盘约定：复用既有 blog 约定与 `savePastedImage` 能力链（src/main/images.ts + @shared/imagePlan）——文档同名 `<stem>.assets/` 目录、时间戳防冲突命名、插入相对引用 markdownRef；无活动文档时不落盘、提示先保存。本期未新增主进程能力（规划中的 clipboard-assets.ts/ipc/preload/types 改动经核实全部已有，files 清单随之收窄）。

## 任务

### Phase 1 引擎与命令通道基础
- [x] 引入 vditor 依赖并本地化静态资源（public/vditor/，cdn 选项指向本地，验证 dev 与打包后路径） — `package.json`
- [x] 命令通道与信息纯函数：lib/editor-commands.ts（类型化发布/订阅，无订阅者时 no-op）、lib/editor-info.ts（parseOutline/countWords）+ 测试 — `lib/editor-commands.ts`, `lib/editor-info.ts`, `tests/vditor-editor.test.ts`
- [x] MarkdownEditor 组件：IR 模式无工具栏、挂载创建/卸载销毁、明暗主题 token 覆盖层（仅 var(--token)）、双通道联动（onChange→setContent、openDoc→setValue 防光标重置、Cmd/Ctrl+S 保存）、命令订阅执行（Vditor 增量 API） — `components/editor/MarkdownEditor.tsx`
### Phase 2 胶囊编辑器功能区
- [x] WorkspacePicker/FilePicker 拆迁至 components/workspace/（逻辑不变），ProjectSection.tsx 退役 — `components/workspace/WorkspacePicker.tsx`, `components/workspace/FilePicker.tsx`, `components/home/ProjectSection.tsx`
- [x] TaskPopover 编辑器分区 EditorSection：格式化/插入命令组（经命令通道）、文档操作（保存/另存为/新建/关闭，SaveAs Dialog 迁入）、字数统计与大纲跳转、工作区与文件选择入口；TaskCapsule 显示条件（任务>0 或有活动文档）与 aria 调整 — `components/tasks/EditorSection.tsx`, `components/tasks/TaskPopover.tsx`, `components/tasks/TaskCapsule.tsx`
### Phase 3 面板精简与图片落盘
- [x] EditorPanel 精简为「文档状态行 + 纯编辑区」，退役 ModeSwitch/FormatToolbar/PreviewCapsule，lib/store 移除 parseEditorMode/EDITOR_MODE_STORAGE_KEY（applyMarkdownInsert 保留） — `components/home/EditorPanel.tsx`, `components/home/FormatToolbar.tsx`, `components/home/PreviewCapsule.tsx`, `lib/store.ts`
- [x] 主进程剪贴板图片落盘能力（clipboard.readImage → 当前文档同级 assets/日期-hash.png，DesktopApi/preload/shared types 扩展）+ 编辑器 paste 与胶囊图片入口接入（含失败三语提示） — `src/main/clipboard-assets.ts`, `src/main/ipc.ts`, `src/preload/index.ts`, `src/shared/types.ts`, `components/editor/MarkdownEditor.tsx`
### Phase 4 收尾
- [x] i18n 三语 key 增删一致（退役 editor.mode*/preview 相关，新增胶囊分区/大纲/字数/插入组），旧测试去 mode 断言、补纯函数用例，全量回归：vitest + 双侧 tsc + next build + electron-vite build — `lib/i18n/locales.ts`, `tests/home-editor-panel.test.ts`, `tests/vditor-editor.test.ts`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/desktop-plugin-architecture.md`
- **理由:** 「宿主写入 UI」结论的技术栈从自研 textarea 演进为 Vditor IR 引擎；壳层胶囊从纯任务聚合演进为「任务 + 编辑器功能」复合入口；content 双通道与广播语义不变；落盘 assets 约定（文档同级 assets/、日期-hash.png）与编辑器命令通道是新增长期约定，需回写卡片。
