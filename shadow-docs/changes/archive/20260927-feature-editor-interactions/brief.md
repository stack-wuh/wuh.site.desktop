---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-feature-editor-interactions",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260927-feature-editor-interactions",
  "files": [
    "components/editor/MarkdownEditor/index.tsx",
    "components/editor/decorations.ts",
    "components/editor/widgets.ts",
    "lib/editor-cm.ts",
    "lib/editor-state.ts",
    "lib/i18n/locales.ts",
    "tests/editor-interactions.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 134,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/134",
    "pullRequest": 135,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/135"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "8d6bdf561b47671691d6da3784bb48a97b58f5de",
    "verifiedAt": "2026-09-27T14:44:10.388Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:135",
    "planHash": "d3bd54041ea23b9851462b5201a8665439ff94111f4264ea57369f2ee5677a42",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 编辑器五项交互：lightbox 图片放大 / 链接 ⌘+点击打开 / 任务列表点选 / 标题折叠 / 注释脚注渲染 + 默认排版 15px 提级",
      "titleRaw": "编辑器五项交互：lightbox 图片放大 / 链接 ⌘+点击打开 / 任务列表点选 / 标题折叠 / 注释脚注渲染 + 默认排版 15px 提级",
      "supplement": "在「墨水层次」渲染语言上落地五项交互：图片点击放大 lightbox（Esc 分治+焦点管理）、链接 Ctrl/Cmd+点击 openExternal（仅 http/https）、GFM 任务列表渲染态 checkbox 点选改写源码（纯函数+TDD）、标题折叠/展开（StateField+光标自动展开）、HTML 注释标注条与脚注样式；正文默认排版 14px/1.7→15px/1.8。L 级完整 TDD，方案与任务见 shadow-docs/changes/20260927-feature-editor-interactions/brief.md",
      "body": "## 动机\nchange 1（20260927-style-editor-render-language，PR #133）完成渲染语言「墨水层次」翻新时，五项新交互按用户选定的方案 B 拆出本 change：①图片点击放大 lightbox（Typora 心智第二层）、②链接 Ctrl/Cmd+点击打开浏览器、③GFM 任务列表渲染态可点选、④标题折叠/展开、⑤HTML 注释标注条与脚注样式。四者交互形态均已在已验收原型中呈现并获用户确认。顺带落地 change 1 顺延的正文默认排版提级（14px/1.7 → 15px/1.8，落点 lib/editor-state.ts，当时不在该 change 文件清单内）。\n\n设计语言沿用已定稿的「墨水层次」token 体系，不二次翻新。全部交互遵守字节保真底线：装饰只改显示；凡改写源码（任务点选）必须经纯函数计算并配测试。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 字节保真硬约束（改写源码须纯函数+测试；MathWidget 点击直接 view.dispatch 是 widget 内交互先例）；atomicRanges 仅供 widget replace 子集、装饰重建条件必含 tr.reconfigured、扩展列表必带 drawSelection；墨水层次 token 语言（20260927-style-editor-render-language 定稿）；新命令先入词表——但渲染态 widget 内交互（同 MathWidget）与编辑器内直达 IPC（同图片粘贴 savePastedImage）不进 EditorCommand\n  - 适用 scope: components/editor, lib/editor-cm, lib/editor-state\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 动效 150-300ms ease-out 并响应 prefers-reduced-motion；键盘焦点统一 outline: 2px solid var(--primary-color) offset -2px；浮层「点外关」用 target 归属守卫；Esc 分治先例（20260927-fix-shell-ux-defects，data 稳定属性判定）\n  - 适用 scope: components/editor（lightbox 浮层与折叠控件同属渲染层 UI）\n- norms/ui-patterns.md + norms/interaction.md\n  - 当前结论: 可交互元素 visible focus ring；图标按钮 aria-label；Esc 关浮层；键盘可达；reduced-motion\n  - 适用 scope: lightbox、checkbox、折叠按钮、链接 hover 提示\n\n## 决策\n- **选型:** 方案 A 单 change 五项全做（L 级 · 完整 TDD · 3 Phase），正文默认排版提级并入。\n- **对比方案:** B 再拆「轻交互四件（M）+ 标题折叠（单独）」两 change——风险进一步隔离但两轮生命周期成本；管线与设计语言已定稿、五项形态原型已验收，拆分收益不再成立，用户选定 A。\n- **理由:** 实现要点——①链接打开经 `window.api.openExternal` 直达 IPC 不进 EditorCommand 词表（编辑器内交互直达主进程，同图片粘贴先例；命令通道语义是面板/胶囊→编辑器方向），仅放行 http/https，相对链接 v1 静默忽略；②任务点选：checkbox widget 点击 → 纯函数 `toggleTaskLine` → view.dispatch（MathWidget 先例），支持 `- [ ]`/`- [x]`/`- [X]` 与缩进；③折叠：独立 StateField 直供 replace({block:true}) 装饰 + 自有 atomicRanges（与 livePreviewField 的 atomicSubset 并存），光标进入折叠区自动展开（复用 selection 重建条件语义），折叠状态 v1 仅视图内存活不持久化（非目标记录）；④注释块：parseBlocks 新 BlockKind `comment`（多行 `<!-- -->`，未闭合回退源码态），渲染态收成标注条 widget，光标进入展开；预览/导出不渲染注释（markdown-it html:false 语义一致）；⑤脚注 v1 仅样式（引用上标墨色 + 定义行 hairline 分节），不做点击跳转（预览面板 markdown-it 无 footnote 插件，编辑器不单方面超前）；⑥lightbox：MarkdownEditor 内 React state + portal 承载，ImageWidget 点击经 CustomEvent 上报，Esc 分治（`data-lightbox` 稳定属性，面板/浮窗让位规则沿用 20260927-fix 先例）、点外关（target 归属守卫）、焦点移入归还、reduced-motion 关停过渡；⑦widget 文案（注释/折叠占位）三语化：经 locales 纯函数 + localStorage `wd.locale` 读取（非 React 环境），新增 `wd.editor.*` 三语键。\n\n## 任务\n### Phase 1 纯逻辑（完整 TDD：先红后绿）\n\n- [ ] 测试先行：链接定位纯函数（渲染态/源码态、http/https 命中、相对链接与图片排除）+ 任务行改写纯函数（`- [ ]`↔`- [x]`/`- [X]`、缩进保留、非任务行返回 null）——先确认失败 — `tests/editor-interactions.test.ts`\n- [ ] 测试先行：parseBlocks 注释块（单行/多行/未闭合回退）+ scanInlineMarks 脚注引用与定义行扫描——先确认失败 — `tests/editor-interactions.test.ts`\n- [ ] 测试先行 + 实现：标题折叠区间计算（至下一同级/更高级标题、嵌套列表不越界、文件尾闭合）+ 链接/任务/注释/脚注纯函数全部转绿 — `lib/editor-cm.ts`, `tests/editor-interactions.test.ts`\n\n### Phase 2 交互层\n\n- [ ] 任务 checkbox widget（role=checkbox + aria-checked + aria-label 三语）+ 点击 dispatch 改写源码 + 组件测试 — `components/editor/widgets.ts`, `components/editor/decorations.ts`\n- [ ] 链接 Ctrl/Cmd+点击打开（domEventHandlers mousedown capture + findLinkAt + window.api.openExternal，仅 http/https；hover cursor pointer 已具备）+ 组件测试 — `components/editor/MarkdownEditor/index.tsx`\n- [ ] 标题折叠：fold StateField + 占位 widget（「N 行已折叠」三语，点击展开）+ selection 触碰自动展开 + 自有 atomicRanges 与 atomicSubset 交叉验证 + 组件测试 — `components/editor/decorations.ts`, `components/editor/widgets.ts`\n- [ ] 注释标注条 widget + 脚注上标/定义行样式 + i18n 三语键（注释/折叠占位）+ 装饰接线 + 组件测试 — `components/editor/decorations.ts`, `components/editor/widgets.ts`, `lib/i18n/locales.ts`\n- [ ] lightbox：ImageWidget 点击 CustomEvent 上报（ignoreEvent 调整）+ MarkdownEditor portal（Esc 分治 data-lightbox、点外关、焦点管理、hover zoom-in、reduced-motion）+ 组件测试 — `components/editor/widgets.ts`, `components/editor/MarkdownEditor/index.tsx`\n\n### Phase 3 收尾\n\n- [ ] 默认排版提级 15px/1.8（DEFAULT_TYPOGRAPHY）+ 受影响测试/快照更新 — `lib/editor-state.ts`, `tests/`\n- [ ] 全量回归（绕行配方：tsc `--jitless --single-threaded`、vitest `--single-threaded`）+ 四主题 × 五交互 dev 走查（含键盘：Tab 到 checkbox/折叠钮可 Enter 触发、lightbox Esc）+ reduced-motion 核对 — `tests/`\n\n## 补充\n在「墨水层次」渲染语言上落地五项交互：图片点击放大 lightbox（Esc 分治+焦点管理）、链接 Ctrl/Cmd+点击 openExternal（仅 http/https）、GFM 任务列表渲染态 checkbox 点选改写源码（纯函数+TDD）、标题折叠/展开（StateField+光标自动展开）、HTML 注释标注条与脚注样式；正文默认排版 14px/1.7→15px/1.8。L 级完整 TDD，方案与任务见 shadow-docs/changes/20260927-feature-editor-interactions/brief.md\n\n完整 brief：shadow-docs/changes/20260927-feature-editor-interactions/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-feature-editor-interactions\",\"type\":\"feature\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-feature-editor-interactions/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "release": {
      "files": [
        "components/editor/MarkdownEditor/index.tsx",
        "components/editor/MarkdownEditor/renderTheme.ts",
        "components/editor/MarkdownEditor/styles.ts",
        "components/editor/decorations.ts",
        "components/editor/widgets.ts",
        "lib/editor-cm.ts",
        "lib/editor-state.ts",
        "lib/i18n/locales.ts",
        "shadow-docs/knowledge/editor.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "tests/editor-interactions-widgets.test.tsx",
        "tests/editor-interactions.test.ts"
      ],
      "message": "feat(editor): 五项渲染态交互——图片点击放大 lightbox（data-dialog-overlay Esc 分治+焦点归还）、链接 Ctrl/Cmd+点击 openExternal（仅 http/https）、GFM 任务列表 checkbox 点选改写源码（toggleTaskLine 纯函数）、标题折叠/展开（foldField+光标自动展开）、HTML 注释标注条+脚注样式；正文默认排版 15px/1.8；i18n 三语键；工具链绕行配方二次修订（v8-pool-size=0）回写知识（Closes #134）",
      "title": "[feature] 编辑器五项交互：lightbox / 链接 ⌘+点开 / 任务点选 / 标题折叠 / 注释脚注 + 默认排版 15px 提级",
      "body": "Closes #134\n\n完整 brief：shadow-docs/changes/20260927-feature-editor-interactions/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "合并后新 HEAD 重录（PR #135 已合并，bd0c3e8）：知识动作已在发布提交落地（editor.md L4 交互契约段+验证方式+verified 刷新，renderer-shell-routing 工具链配方二次修订）"
  }
}
---

# 编辑器五项交互（lightbox / 链接打开 / 任务点选 / 标题折叠 / 注释脚注）+ 默认排版提级

## 动机

change 1（20260927-style-editor-render-language，PR #133）完成渲染语言「墨水层次」翻新时，五项新交互按用户选定的方案 B 拆出本 change：①图片点击放大 lightbox（Typora 心智第二层）、②链接 Ctrl/Cmd+点击打开浏览器、③GFM 任务列表渲染态可点选、④标题折叠/展开、⑤HTML 注释标注条与脚注样式。四者交互形态均已在已验收原型中呈现并获用户确认。顺带落地 change 1 顺延的正文默认排版提级（14px/1.7 → 15px/1.8，落点 lib/editor-state.ts，当时不在该 change 文件清单内）。

设计语言沿用已定稿的「墨水层次」token 体系，不二次翻新。全部交互遵守字节保真底线：装饰只改显示；凡改写源码（任务点选）必须经纯函数计算并配测试。

## 复杂度评级

- **评级:** L
- **理由:** 三要素对照——①契约变更：任务点选新增「渲染态交互改写源码」路径、parseBlocks 新增 comment 块类型、默认排版值变更（影响全部文档首屏）；②触及面：lib 纯逻辑层 + decorations/widgets + MarkdownEditor 组件 + editor-state 默认值，跨模块数据流；③可发现性：中高（纯逻辑有 TDD 护航，视觉/交互直接可见）。按 norms/tdd-verification.md 本级执行完整 TDD：先写失败测试确认失败，再最小实现。
- **期望验证深度:** unit（完整 TDD）+ runtime（pnpm dev 四主题 × 五交互走查，观察点见任务）

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: 字节保真硬约束（改写源码须纯函数+测试；MathWidget 点击直接 view.dispatch 是 widget 内交互先例）；atomicRanges 仅供 widget replace 子集、装饰重建条件必含 tr.reconfigured、扩展列表必带 drawSelection；墨水层次 token 语言（20260927-style-editor-render-language 定稿）；新命令先入词表——但渲染态 widget 内交互（同 MathWidget）与编辑器内直达 IPC（同图片粘贴 savePastedImage）不进 EditorCommand
  - 适用 scope: components/editor, lib/editor-cm, lib/editor-state
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 动效 150-300ms ease-out 并响应 prefers-reduced-motion；键盘焦点统一 outline: 2px solid var(--primary-color) offset -2px；浮层「点外关」用 target 归属守卫；Esc 分治先例（20260927-fix-shell-ux-defects，data 稳定属性判定）
  - 适用 scope: components/editor（lightbox 浮层与折叠控件同属渲染层 UI）
- norms/ui-patterns.md + norms/interaction.md
  - 当前结论: 可交互元素 visible focus ring；图标按钮 aria-label；Esc 关浮层；键盘可达；reduced-motion
  - 适用 scope: lightbox、checkbox、折叠按钮、链接 hover 提示

## 决策

- **选型:** 方案 A 单 change 五项全做（L 级 · 完整 TDD · 3 Phase），正文默认排版提级并入。
- **对比方案:** B 再拆「轻交互四件（M）+ 标题折叠（单独）」两 change——风险进一步隔离但两轮生命周期成本；管线与设计语言已定稿、五项形态原型已验收，拆分收益不再成立，用户选定 A。
- **理由:** 实现要点——①链接打开经 `window.api.openExternal` 直达 IPC 不进 EditorCommand 词表（编辑器内交互直达主进程，同图片粘贴先例；命令通道语义是面板/胶囊→编辑器方向），仅放行 http/https，相对链接 v1 静默忽略；②任务点选：checkbox widget 点击 → 纯函数 `toggleTaskLine` → view.dispatch（MathWidget 先例），支持 `- [ ]`/`- [x]`/`- [X]` 与缩进；③折叠：独立 StateField 直供 replace({block:true}) 装饰 + 自有 atomicRanges（与 livePreviewField 的 atomicSubset 并存），光标进入折叠区自动展开（复用 selection 重建条件语义），折叠状态 v1 仅视图内存活不持久化（非目标记录）；④注释块：parseBlocks 新 BlockKind `comment`（多行 `<!-- -->`，未闭合回退源码态），渲染态收成标注条 widget，光标进入展开；预览/导出不渲染注释（markdown-it html:false 语义一致）；⑤脚注 v1 仅样式（引用上标墨色 + 定义行 hairline 分节），不做点击跳转（预览面板 markdown-it 无 footnote 插件，编辑器不单方面超前）；⑥lightbox：MarkdownEditor 内 React state + portal 承载，ImageWidget 点击经 CustomEvent 上报，Esc 分治（`data-lightbox` 稳定属性，面板/浮窗让位规则沿用 20260927-fix 先例）、点外关（target 归属守卫）、焦点移入归还、reduced-motion 关停过渡；⑦widget 文案（注释/折叠占位）三语化：经 locales 纯函数 + localStorage `wd.locale` 读取（非 React 环境），新增 `wd.editor.*` 三语键。

## 任务

### Phase 1 纯逻辑（完整 TDD：先红后绿）

- [x] 测试先行：链接定位纯函数（渲染态/源码态、http/https 命中、相对链接与图片排除）+ 任务行改写纯函数（`- [ ]`↔`- [x]`/`- [X]`、缩进保留、非任务行返回 null）——先确认失败 — `tests/editor-interactions.test.ts`
- [x] 测试先行：parseBlocks 注释块（单行/多行/未闭合回退）+ scanInlineMarks 脚注引用与定义行扫描——先确认失败 — `tests/editor-interactions.test.ts`
- [x] 测试先行 + 实现：标题折叠区间计算（至下一同级/更高级标题、嵌套列表不越界、文件尾闭合）+ 链接/任务/注释/脚注纯函数全部转绿 — `lib/editor-cm.ts`, `tests/editor-interactions.test.ts`

### Phase 2 交互层

- [x] 任务 checkbox widget（role=checkbox + aria-checked + aria-label 三语）+ 点击 dispatch 改写源码 + 组件测试 — `components/editor/widgets.ts`, `components/editor/decorations.ts`
- [x] 链接 Ctrl/Cmd+点击打开（domEventHandlers mousedown capture + findLinkAt + window.api.openExternal，仅 http/https；hover cursor pointer 已具备）+ 组件测试 — `components/editor/MarkdownEditor/index.tsx`
- [x] 标题折叠：fold StateField + 占位 widget（「N 行已折叠」三语，点击展开）+ selection 触碰自动展开 + 自有 atomicRanges 与 atomicSubset 交叉验证 + 组件测试 — `components/editor/decorations.ts`, `components/editor/widgets.ts`
- [x] 注释标注条 widget + 脚注上标/定义行样式 + i18n 三语键（注释/折叠占位）+ 装饰接线 + 组件测试 — `components/editor/decorations.ts`, `components/editor/widgets.ts`, `lib/i18n/locales.ts`
- [x] lightbox：ImageWidget 点击 CustomEvent 上报（ignoreEvent 调整）+ MarkdownEditor portal（Esc 分治 data-lightbox、点外关、焦点管理、hover zoom-in、reduced-motion）+ 组件测试 — `components/editor/widgets.ts`, `components/editor/MarkdownEditor/index.tsx`

### Phase 3 收尾

- [x] 默认排版提级 15px/1.8（DEFAULT_TYPOGRAPHY）+ 受影响测试/快照更新 — `lib/editor-state.ts`, `tests/`
- [x] 全量回归（绕行配方：tsc `--jitless --single-threaded`、vitest `--single-threaded`）+ 四主题 × 五交互 dev 走查（含键盘：Tab 到 checkbox/折叠钮可 Enter 触发、lightbox Esc）+ reduced-motion 核对 — `tests/`

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/editor.md`
- **理由:** 五项交互语义与边界（链接 IPC 直达、任务改写纯函数、折叠 StateField 契约、注释/脚注渲染语义、lightbox Esc 分治）是编辑器卡的新增长期结论；默认排版值变更与 change 1 的墨水层次段同卡承接；verified 刷新（verified-depth: unit）。不新增卡。
