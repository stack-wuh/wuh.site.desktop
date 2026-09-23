---
{
  "schema": "shadow-dev/v1",
  "name": "20260923-feature-cm-live-preview",
  "type": "feature",
  "scope": "editor",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260923-feature-cm-live-preview",
  "files": [
    "components/capsule/sections/EditorSection.tsx",
    "components/editor/MarkdownEditor.tsx",
    "components/editor/decorations.ts",
    "components/editor/widgets.ts",
    "components/home/EditorPanel.tsx",
    "lib/editor-cm.ts",
    "lib/editor-commands.ts",
    "lib/editor-info.ts",
    "package.json",
    "scripts/copy-editor-assets.mjs",
    "tests/editor-cm-live-preview.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 53,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/53",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "86e0d9182fef8f16957cd36b5c3eaf97237c95ea",
    "verifiedAt": "2026-09-23T04:44:37.882Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:53",
    "planHash": "8798cb07c351e664305cd6e1f58789215482df79c534b4fe380a62cf005568b5",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] CodeMirror Live Preview —— L3 即时渲染引擎",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n#52 已把主编辑器从 Vditor 换成 CodeMirror 6 + markdown-it 分栏预览，但编辑区退回纯源码形态：`**粗体**` 只是字面星号，Vditor 时代的即时渲染体验与公式（KaTeX）、mermaid 图表能力全部丢失。CM6 的 decorations 体系（按行计算、无全量重建）尚未利用——正是实现类 Obsidian Live Preview 的正确地基。本变更把编辑区升级为 L3 深度渲染（样式化 + 符号隐藏 + 块级特殊化 + 图片内联 + 公式/mermaid 编辑区内渲染），视觉语言以已拍板的设计稿为实施规范（design-mockups/20260923-capsule-control-center）。\n\n## 引用规范\n- shadow-docs/knowledge/design-system.md（frontend）\n  - 当前结论: 双维度主题（wine/plain × light/dark）+ 三层 CSS 变量；组件样式一律引用语义 token（--primary-color/--text-*/--chrome-*），字体只用三个字体 token，禁平台字体名\n  - 适用 scope: 渲染层全部颜色/圆角/动效时长取自语义 token，禁硬编码色值\n- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）\n  - 当前结论: 编辑器功能入口一律经 lib/editor-commands 命令通道下发；命令突变后必须同步 store；图片粘贴复用 savePastedImage 能力链\n  - 适用 scope: 新增渲染开关/查找替换/撤销重做/标题跟随全部走命令通道；图片内联不改变落盘链路\n\n## 决策\n- **选型:** CM6 decorations 自建 L3 渲染层——行内装饰（标题/粗斜体/行内码/链接/删除线）、符号隐藏（光标行整行回落源码态，150ms 浮现）、块级装饰（引用竖线/代码块+语言标/列表 bullet/hr/表格）、图片内联 widget、公式 KaTeX 与 mermaid 本地化渲染 widget（渲染态↔源码态切换，失败回退源码）\n- **对比方案:** (a) 引第三方 live-preview 插件——CM6 生态无成熟 markdown live-preview，公式/mermaid 集成仍需自建，且样式不受应用 token 控制；(b) 回退 Vditor——与 #48 引擎决策冲突，体积与定制性问题依旧，否决\n- **理由:** decorations 按行增量计算不重建文档；底层始终是纯 markdown 文本，content 双通道架构与命令通道契约不动；渲染语言完全由设计稿规范（token 化），四主题自动跟随。预览分栏保留但降级（ghosted，仅导出对照场景）。渲染开关持久化 `wd.editorRenderMode`，快捷键 Mod-/\n\n## 任务\n### Phase 1 · 渲染地基\n- [ ] editor-cm 装饰纯逻辑：块级区间解析、光标行集合计算、装饰 spec 生成（无 DOM 依赖可独立测试） — `lib/editor-cm.ts` `tests/editor-cm-live-preview.test.ts` — 新增\n- [ ] MarkdownEditor 挂载 decorations ViewPlugin + toggleRender 命令（Compartment 热切换，持久化 wd.editorRenderMode） — `components/editor/MarkdownEditor.tsx` `lib/editor-commands.ts` — 修改\n\n### Phase 2 · L3 渲染语言（设计稿 ①—④）\n- [ ] 行内装饰 + 符号隐藏：标题字级/粗斜体/行内码 pill/链接/删除线，光标行浮现 — `components/editor/decorations.ts` — 新增\n- [ ] 块级装饰：引用竖线 55%/底色 6%、代码块底色+语言标、列表 bullet 主题色、hr 渐变线、表格 — `components/editor/decorations.ts` — 扩展\n- [ ] 图片内联 widget：圆角缩略图 + elevation-soft + hover 尺寸角标，点击回源码 — `components/editor/widgets.ts` — 新增\n- [ ] KaTeX/mermaid 本地化资产脚本（对齐 copy-vditor 先例，按需再生） — `scripts/copy-editor-assets.mjs` `package.json` — 新增\n- [ ] 公式 widget（$$..$$ 渲染态、块级点击切源码）与 mermaid widget（SVG 渲染、失败回退源码提示） — `components/editor/widgets.ts` — 扩展\n\n### Phase 3 · 命令通道配套\n- [ ] findReplace/undo/redo 命令扩展 + Mod-F 查找条（@codemirror/search 内联条） — `lib/editor-commands.ts` `components/editor/MarkdownEditor.tsx` — 修改\n- [ ] 大纲标题跟随：光标所在章节解析 + 编辑器状态回推事件（单状态源供胶囊/面板消费） — `lib/editor-info.ts` `lib/editor-cm.ts` — 修改\n- [ ] 胶囊编辑器分区与面板动作行新入口：渲染分段开关/查找/撤销重做 — `components/capsule/sections/EditorSection.tsx` `components/home/EditorPanel.tsx` — 修改\n\n### Phase 4 · 预览降级与验证\n- [ ] 预览按钮 ghosted 降级态（title 注明导出对照场景） — `components/home/EditorPanel.tsx` — 修改\n- [ ] 全量验证：vitest、双侧 tsc、electron-vite build、四主题走查与 reduced-motion 降级检查 — — 验证\n\n完整 brief：shadow-docs/changes/20260923-feature-cm-live-preview/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260923-feature-cm-live-preview\",\"type\":\"feature\",\"scope\":\"editor\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260923-feature-cm-live-preview/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# CodeMirror Live Preview —— L3 即时渲染引擎

## 动机

#52 已把主编辑器从 Vditor 换成 CodeMirror 6 + markdown-it 分栏预览，但编辑区退回纯源码形态：`**粗体**` 只是字面星号，Vditor 时代的即时渲染体验与公式（KaTeX）、mermaid 图表能力全部丢失。CM6 的 decorations 体系（按行计算、无全量重建）尚未利用——正是实现类 Obsidian Live Preview 的正确地基。本变更把编辑区升级为 L3 深度渲染（样式化 + 符号隐藏 + 块级特殊化 + 图片内联 + 公式/mermaid 编辑区内渲染），视觉语言以已拍板的设计稿为实施规范（design-mockups/20260923-capsule-control-center）。

## 引用规范

- shadow-docs/knowledge/design-system.md（frontend）
  - 当前结论: 双维度主题（wine/plain × light/dark）+ 三层 CSS 变量；组件样式一律引用语义 token（--primary-color/--text-*/--chrome-*），字体只用三个字体 token，禁平台字体名
  - 适用 scope: 渲染层全部颜色/圆角/动效时长取自语义 token，禁硬编码色值
- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）
  - 当前结论: 编辑器功能入口一律经 lib/editor-commands 命令通道下发；命令突变后必须同步 store；图片粘贴复用 savePastedImage 能力链
  - 适用 scope: 新增渲染开关/查找替换/撤销重做/标题跟随全部走命令通道；图片内联不改变落盘链路

## 决策

- **选型:** CM6 decorations 自建 L3 渲染层——行内装饰（标题/粗斜体/行内码/链接/删除线）、符号隐藏（光标行整行回落源码态，150ms 浮现）、块级装饰（引用竖线/代码块+语言标/列表 bullet/hr/表格）、图片内联 widget、公式 KaTeX 与 mermaid 本地化渲染 widget（渲染态↔源码态切换，失败回退源码）
- **对比方案:** (a) 引第三方 live-preview 插件——CM6 生态无成熟 markdown live-preview，公式/mermaid 集成仍需自建，且样式不受应用 token 控制；(b) 回退 Vditor——与 #48 引擎决策冲突，体积与定制性问题依旧，否决
- **理由:** decorations 按行增量计算不重建文档；底层始终是纯 markdown 文本，content 双通道架构与命令通道契约不动；渲染语言完全由设计稿规范（token 化），四主题自动跟随。预览分栏保留但降级（ghosted，仅导出对照场景）。渲染开关持久化 `wd.editorRenderMode`，快捷键 Mod-/

## 任务

### Phase 1 · 渲染地基
- [x] editor-cm 装饰纯逻辑：块级区间解析、光标行集合计算、装饰 spec 生成（无 DOM 依赖可独立测试） — `lib/editor-cm.ts` `tests/editor-cm-live-preview.test.ts` — 新增
- [x] MarkdownEditor 挂载 decorations ViewPlugin + toggleRender 命令（Compartment 热切换，持久化 wd.editorRenderMode） — `components/editor/MarkdownEditor.tsx` `lib/editor-commands.ts` — 修改

### Phase 2 · L3 渲染语言（设计稿 ①—④）
- [x] 行内装饰 + 符号隐藏：标题字级/粗斜体/行内码 pill/链接/删除线，光标行浮现 — `components/editor/decorations.ts` — 新增
- [x] 块级装饰：引用竖线 55%/底色 6%、代码块底色+语言标、列表 bullet 主题色、hr 渐变线、表格 — `components/editor/decorations.ts` — 扩展
- [x] 图片内联 widget：圆角缩略图 + elevation-soft + hover 尺寸角标，点击回源码 — `components/editor/widgets.ts` — 新增
- [x] KaTeX/mermaid 本地化资产脚本（对齐 copy-vditor 先例，按需再生） — `scripts/copy-editor-assets.mjs` `package.json` — 新增
- [x] 公式 widget（$$..$$ 渲染态、块级点击切源码）与 mermaid widget（SVG 渲染、失败回退源码提示） — `components/editor/widgets.ts` — 扩展

### Phase 3 · 命令通道配套
- [x] findReplace/undo/redo 命令扩展 + Mod-F 查找条（@codemirror/search 内联条） — `lib/editor-commands.ts` `components/editor/MarkdownEditor.tsx` — 修改
- [x] 大纲标题跟随：光标所在章节解析 + 编辑器状态回推事件（单状态源供胶囊/面板消费） — `lib/editor-info.ts` `lib/editor-cm.ts` — 修改
- [x] 胶囊编辑器分区与面板动作行新入口：渲染分段开关/查找/撤销重做 — `components/capsule/sections/EditorSection.tsx` `components/home/EditorPanel.tsx` — 修改

### Phase 4 · 预览降级与验证
- [x] 预览按钮 ghosted 降级态（title 注明导出对照场景） — `components/home/EditorPanel.tsx` — 修改
- [x] 全量验证：vitest、双侧 tsc、electron-vite build、四主题走查与 reduced-motion 降级检查 — — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md
- **理由:** 「编辑核心引擎」段仍是 Vditor 4 IR 结论（#52 换 CM6 后未回写，已知冲突待确认点）——本变更落地后一并更新为 CM6 + Live Preview 渲染体系事实，并补充本地化资产脚本约定
