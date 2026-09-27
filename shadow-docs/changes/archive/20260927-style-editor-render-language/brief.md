---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-style-editor-render-language",
  "type": "style",
  "scope": "apps/desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "style/20260927-style-editor-render-language",
  "files": [
    "components/editor/MarkdownEditor/renderTheme.ts",
    "components/editor/MarkdownEditor/styles.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 132,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/132",
    "pullRequest": 133,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/133"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "5f72fc8d41fdf95bb70123e575f75919777c8e09",
    "verifiedAt": "2026-09-27T13:42:20.499Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:133",
    "planHash": "d3480ac8b35499f72bfac3a406c8238ea8d584c9fcce016783ab6c1e0eeb532e",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[style] 编辑器渲染语言全面翻新（墨水层次）：链接/引用/行内代码样式重设计 + 图片大图内联 + 半 px 字号归整",
      "titleRaw": "编辑器渲染语言全面翻新（墨水层次）：链接/引用/行内代码样式重设计 + 图片大图内联 + 半 px 字号归整",
      "supplement": "重设计编辑器 L3 即时渲染各元素样式（链接墨水下划、引用细线、行内代码凹槽、标题/列表/围栏/查找面板对齐 token），图片渲染态解除 320px 上限改自然尺寸大图内联，半 px 字号散值归整，光标行 150ms 沉静过渡（reduced-motion 关停）。纯样式零契约变更（M 级），方案与任务见 shadow-docs/changes/20260927-style-editor-render-language/brief.md",
      "body": "## 动机\n编辑器 L3 即时渲染层（20260923-feature-cm-live-preview 建立）的样式是首版实现：链接只有基础下划、引用块/行内代码视觉偏重、围栏标头与查找面板是临时样式，且残留 12.5px/10.5px 半 px 字号散值（20260927-style-shell-visual-consistency 已在壳层清零，编辑器 CM 主题未跟进）。用户诉求：启用 UI 设计视角全面重设计编辑器各元素样式（链接、引用/注释、行内代码、标题、列表等），使之更现代化。\n\n设计方向定为**「墨水层次」**：本产品与 WYSIWYG 引擎的本质差异是「字节保真 + 即时渲染」——非光标行是沉淀的排版（接近成品的安静渲染），光标行是墨迹未干的源码（符号浮现，既有设计语义）。本 change 把这一状态转换升格为可感知的设计语言：渲染态元素全面翻新为墨水质感（链接 = 酒红墨水下划、引用 = 酒红细线、行内代码 = 纸面凹槽），光标进出行加 150ms 沉静过渡作为 signature；全部走既有语义 token，四主题 × 亮暗自动生效。图片渲染态同步解除 320px 缩略图上限，改为自然尺寸大图内联（Typora 心智的第一层；点击放大 lightbox 属后续交互 change，本 change 不做）。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: L3 即时渲染装饰管线（StateField 直供 + atomicRanges 仅 widget 子集 + 重建条件含 tr.reconfigured）；主题桥接 EditorView.theme + HighlightStyle 只写 var(--token)；字节保真约束\n  - 适用 scope: components/editor\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 圆角走 token scale（2/4/8/12/16）；字号禁半 px 值；键盘焦点统一 `outline: 2px solid var(--primary-color); outline-offset: -2px`；动效 150-300ms ease-out 并响应 prefers-reduced-motion\n  - 适用 scope: components（编辑器 CM 主题同属渲染层 UI，本 change 把半 px 归整与焦点规范跟进到 CM 主题）\n- norms/ui-patterns.md\n  - 当前结论: 禁硬编码色值必须 token；暗黑全覆盖、对比度 ≥4.5:1；动效约束；可见焦点\n  - 适用 scope: 全部新增样式\n\n## 决策\n- **选型:** 方案 B 拆双 change 顺序执行——本 change（style）只做渲染语言翻新 + 图片大图内联 + 半 px 字号归整 + 光标行过渡动效；五项新交互（lightbox、链接 Ctrl+点击打开、任务列表点选、标题折叠、注释/脚注渲染）立后续 feature change 单独走流程。\n- **对比方案:** A 单 change 一次到位（设计语言一次定稿、只走一轮流程，但单 PR 体量大 review 负担重）——用户选定 B，风险隔离优先（折叠等最重交互件翻车不拖累样式上线）。\n- **理由:** 样式与交互在 renderTheme/decorations 上的耦合点（链接 hover 提示、lightbox 层级）留到交互 change 一并设计；本 change 纯样式零契约变更，可快速见效验收。设计语言按「墨水层次」方向一次定稿，交互 change 落地时沿用同一 token 语言不二次翻新。装饰管线契约（atomicRanges 子集、reconfigured 重建、drawSelection）零触碰。\n\n## 任务\n### Phase 1\n\n- [ ] renderTheme 渲染语言全面重写（墨水层次）：链接墨水下划（主色 + 下划偏移/透明度分层）、引用块细线轻盈化、行内代码纸面凹槽（底色/描边/圆角 token scale）、标题字阶与字重、列表圆点/序号色、hr 渐变线、围栏标头（语言角标 + 复制钮）与查找面板/placeholder 对齐壳层 token；半 px 字号归整（12.5→13 或 12、10.5→11 或 10，禁散值）— `components/editor/MarkdownEditor/renderTheme.ts`\n- [ ] 图片渲染态大图内联：解除 `max-width: min(320px, 100%)` 上限改自然尺寸（上限编辑器内容列宽 `--editor-measure`），块级居中、保持 `cm-live-img--broken` 占位语义 — `components/editor/MarkdownEditor/renderTheme.ts`\n\n### Phase 2\n\n- [ ] 光标行沉静过渡：非光标行渲染态元素颜色/透明度 150ms ease-out 过渡（禁布局位移类属性），`prefers-reduced-motion: reduce` 关停；焦点可见性按 outline 统一规范补齐（围栏复制钮等）— `components/editor/MarkdownEditor/renderTheme.ts`\n- [ ] 容器样式微调与两挂载点核对（首页面板 + /editor 页共用量确认无分叉）— `components/editor/MarkdownEditor/styles.ts`\n\n### Phase 3\n\n- [ ] 全量回归 + 四主题走查：`pnpm typecheck` + 相关 vitest 绿；`pnpm dev` 酒红/素雅 × 亮/暗走查链接/引用/行内代码/标题/列表/围栏/图片大图/查找面板，reduced-motion 降级核对 — `tests/`\n\n## 补充\n重设计编辑器 L3 即时渲染各元素样式（链接墨水下划、引用细线、行内代码凹槽、标题/列表/围栏/查找面板对齐 token），图片渲染态解除 320px 上限改自然尺寸大图内联，半 px 字号散值归整，光标行 150ms 沉静过渡（reduced-motion 关停）。纯样式零契约变更（M 级），方案与任务见 shadow-docs/changes/20260927-style-editor-render-language/brief.md\n\n完整 brief：shadow-docs/changes/20260927-style-editor-render-language/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-style-editor-render-language\",\"type\":\"style\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-style-editor-render-language/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "style"
      ]
    },
    "release": {
      "files": [
        "components/editor/MarkdownEditor/renderTheme.ts",
        "components/editor/MarkdownEditor/styles.ts",
        "package.json",
        "shadow-docs/knowledge/editor.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "tests/editor-poc-roundtrip.test.ts"
      ],
      "message": "style(editor): 编辑器渲染语言「墨水层次」翻新——链接墨水下划、引用细线去斜体、行内代码纸面凹槽、标题字阶 23/18/15+h2 渐隐发丝线、列表几何圆点、围栏标头与查找面板对齐 token、图片解除 320px 上限改自然尺寸大图内联、半 px 字号归整、150ms 沉静过渡+reduced-motion 关停+焦点规范；移除 milkdown 观察哨（devDep+测试，用户批准）；V8 崩溃绕行配方回写工具链知识（Closes #132）",
      "title": "[style] 编辑器渲染语言全面翻新（墨水层次）——链接/引用/行内代码等样式重设计+图片大图内联+半 px 归整+移除 milkdown 观察哨",
      "body": "Closes #132\n\n完整 brief：shadow-docs/changes/20260927-style-editor-render-language/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "合并后新 HEAD 重录：墨水层次渲染语言定稿（PR #133 已合并，dac22b0）；知识动作已在发布提交落地（editor.md 渲染语言段+哨兵移除+验证刷新，另修订 renderer-shell-routing 工具链绕行配方）"
  }
}
---

# 编辑器渲染语言全面翻新（墨水层次）

## 动机

编辑器 L3 即时渲染层（20260923-feature-cm-live-preview 建立）的样式是首版实现：链接只有基础下划、引用块/行内代码视觉偏重、围栏标头与查找面板是临时样式，且残留 12.5px/10.5px 半 px 字号散值（20260927-style-shell-visual-consistency 已在壳层清零，编辑器 CM 主题未跟进）。用户诉求：启用 UI 设计视角全面重设计编辑器各元素样式（链接、引用/注释、行内代码、标题、列表等），使之更现代化。

设计方向定为**「墨水层次」**：本产品与 WYSIWYG 引擎的本质差异是「字节保真 + 即时渲染」——非光标行是沉淀的排版（接近成品的安静渲染），光标行是墨迹未干的源码（符号浮现，既有设计语义）。本 change 把这一状态转换升格为可感知的设计语言：渲染态元素全面翻新为墨水质感（链接 = 酒红墨水下划、引用 = 酒红细线、行内代码 = 纸面凹槽），光标进出行加 150ms 沉静过渡作为 signature；全部走既有语义 token，四主题 × 亮暗自动生效。图片渲染态同步解除 320px 缩略图上限，改为自然尺寸大图内联（Typora 心智的第一层；点击放大 lightbox 属后续交互 change，本 change 不做）。

## 复杂度评级

- **评级:** M
- **理由:** 三要素对照——①契约变更：零（纯 CSS 主题层，不碰装饰管线/词表/双通道；类名 `cm-live-*` 保持不变）；②触及面：renderTheme.ts 单文件为主 + MarkdownEditor/styles.ts 微调，不碰共享逻辑；③可发现性：高（样式改坏立刻可见，四主题走查覆盖）。
- **期望验证深度:** unit（既有全量测试回归绿，无新增测试——纯样式无逻辑可测）+ runtime（pnpm dev 四主题 × 亮暗走查，观察点见任务）

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: L3 即时渲染装饰管线（StateField 直供 + atomicRanges 仅 widget 子集 + 重建条件含 tr.reconfigured）；主题桥接 EditorView.theme + HighlightStyle 只写 var(--token)；字节保真约束
  - 适用 scope: components/editor
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 圆角走 token scale（2/4/8/12/16）；字号禁半 px 值；键盘焦点统一 `outline: 2px solid var(--primary-color); outline-offset: -2px`；动效 150-300ms ease-out 并响应 prefers-reduced-motion
  - 适用 scope: components（编辑器 CM 主题同属渲染层 UI，本 change 把半 px 归整与焦点规范跟进到 CM 主题）
- norms/ui-patterns.md
  - 当前结论: 禁硬编码色值必须 token；暗黑全覆盖、对比度 ≥4.5:1；动效约束；可见焦点
  - 适用 scope: 全部新增样式

## 决策

- **选型:** 方案 B 拆双 change 顺序执行——本 change（style）只做渲染语言翻新 + 图片大图内联 + 半 px 字号归整 + 光标行过渡动效；五项新交互（lightbox、链接 Ctrl+点击打开、任务列表点选、标题折叠、注释/脚注渲染）立后续 feature change 单独走流程。
- **对比方案:** A 单 change 一次到位（设计语言一次定稿、只走一轮流程，但单 PR 体量大 review 负担重）——用户选定 B，风险隔离优先（折叠等最重交互件翻车不拖累样式上线）。
- **理由:** 样式与交互在 renderTheme/decorations 上的耦合点（链接 hover 提示、lightbox 层级）留到交互 change 一并设计；本 change 纯样式零契约变更，可快速见效验收。设计语言按「墨水层次」方向一次定稿，交互 change 落地时沿用同一 token 语言不二次翻新。装饰管线契约（atomicRanges 子集、reconfigured 重建、drawSelection）零触碰。
- **决策修订（apply 期，用户批准）：** ①移除 milkdown 观察哨——`@milkdown/kit` devDep 与 `tests/editor-poc-roundtrip.test.ts` 删除（用户确认「彻底移除」）：字节保真硬约束已固化于 editor.md 知识卡，不采用前提下快照观察无行动价值，且锁文件失同步（#125 只改 package.json 未更父仓 pnpm-lock）已致本机 tsc TS2307；②原型定稿的正文 15px 默认值落点 `lib/editor-state.ts` 不在本 change 文件清单，顺延至交互 change 一并声明。

## 任务

### Phase 1

- [x] renderTheme 渲染语言全面重写（墨水层次）：链接墨水下划（主色 + 下划偏移/透明度分层）、引用块细线轻盈化、行内代码纸面凹槽（底色/描边/圆角 token scale）、标题字阶与字重、列表圆点/序号色、hr 渐变线、围栏标头（语言角标 + 复制钮）与查找面板/placeholder 对齐壳层 token；半 px 字号归整（12.5→13 或 12、10.5→11 或 10，禁散值）— `components/editor/MarkdownEditor/renderTheme.ts`
- [x] 图片渲染态大图内联：解除 `max-width: min(320px, 100%)` 上限改自然尺寸（上限编辑器内容列宽 `--editor-measure`），块级居中、保持 `cm-live-img--broken` 占位语义 — `components/editor/MarkdownEditor/renderTheme.ts`

### Phase 2

- [x] 光标行沉静过渡：非光标行渲染态元素颜色/透明度 150ms ease-out 过渡（禁布局位移类属性），`prefers-reduced-motion: reduce` 关停；焦点可见性按 outline 统一规范补齐（围栏复制钮等）— `components/editor/MarkdownEditor/renderTheme.ts`
- [x] 容器样式微调与两挂载点核对（首页面板 + /editor 页共用量确认无分叉）— `components/editor/MarkdownEditor/styles.ts`

### Phase 3

- [x] 全量回归 + 四主题走查：`pnpm typecheck` + 相关 vitest 绿；`pnpm dev` 酒红/素雅 × 亮/暗走查链接/引用/行内代码/标题/列表/围栏/图片大图/查找面板，reduced-motion 降级核对 — `tests/`

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/editor.md`
- **理由:** 渲染语言样式定稿（墨水层次方向、图片大图内联、半 px 归整）属编辑器卡的渲染层长期结论，更新其「即时渲染」段与主题桥接约束的 verified 记录（verified-depth: unit）；不新增卡片。
