---
{
  "schema": "shadow-dev/v1",
  "name": "20260925-chore-milkdown-editor-poc",
  "type": "chore",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "chore/20260925-chore-milkdown-editor-poc",
  "files": [
    "package.json",
    "shadow-docs/changes/20260925-chore-milkdown-editor-poc/report.md",
    "shadow-docs/knowledge/editor.md",
    "tests/editor-poc-roundtrip.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 116,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/116",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "368857ffecc75a13c1d92bd7008f4822c00797d0",
    "verifiedAt": "2026-09-27T08:10:16.673Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:116",
    "planHash": "67f9f3d2da6ff0ee4ea29122808925edaabfb16b026dc60e1ce0cb5ee6d13b32",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[chore] Milkdown 编辑引擎 PoC 评估——round-trip 保真实测 + 形态体验",
      "titleRaw": "[chore] Milkdown 编辑引擎 PoC 评估——round-trip 保真实测 + 形态体验",
      "supplement": "## 动机\n用户观察到 Milkdown（ProseMirror + remark，Typora 式 WYSIWYG）可能比现有 CM6 即时渲染更合适。2026-09-25 调研确认：形态与现有 Obsidian 式源码+装饰不同类（无「光标行显源码」方案，上游 #645）；保存时序列化走 remark-stringify 默认风格必规范化全文（#2349 autolink 转义翻倍仍 OPEN、frontmatter 不支持 #1712 OPEN）；上游健康度优秀（v7.22.2/MIT/周下载 42 万）；仓库集成面友好（命令通道边界好，硬重写约 1290 行引擎绑定层，消费方零改动）。决策缺口是第一手实测与形态体验。\n\n## 决策\nPoC 评估先行（chore，零生产代码）：@milkdown/kit 仅 devDependency 的 round-trip 实测套件（真实形态样例集，量化规范化/损坏点）+ worktree 内不落库的最小挂载体验 + 选型评估报告 + editor.md 知识卡回写，为「是否全量替换」提供证据判断。\n\n## 任务\n- Phase 1 round-trip 保真实测：devDeps 引入 @milkdown/kit；tests/editor-poc-roundtrip.test.ts 实测套件\n- Phase 2 形态体验与报告：不落库挂载体验；选型评估报告 report.md\n- Phase 3 知识沉淀：editor.md 新增选型评估结论，若不换则固化「round-trip 字节不保真」为选型约束\n\n完整 brief：shadow-docs/changes/20260925-chore-milkdown-editor-poc/brief.md",
      "body": "## 动机\n用户观察到 Milkdown（ProseMirror + remark，Typora 式 WYSIWYG）「看起来比 CM6 更合适」，提出引擎选型议题。2026-09-25 双路调研（仓库集成面盘点 + 上游生态核查）已确认的事实：\n\n- **形态不同类**：Milkdown 是 Typora 式所见即所得；现编辑器是 Obsidian 式源码+装饰（光标行保持源码是 20260923 起专门实现并经三轮修复迭代的设计语义）。Milkdown 无「光标行显源码」方案（上游 #645）。\n- **格式保真是结构性代价**：Milkdown 序列化直接调 remark-stringify 默认风格（`bullet: '-'`、`emphasis: '_'`，无配置暴露，`packages/transformer/src/serializer/state.ts:363`），保存即全文规范化（`*`→`-`、`*em*`→`_em_`）→ git 全文 churn；序列化损坏线贯穿 2022-2026（#704→#2403），#2349（autolink 转义每次保存翻倍）仍 OPEN；frontmatter 不支持（#1712 OPEN）、HTML 块支持有限（#1249 OPEN）。\n- **健康度优秀**：MIT、v7.22.2（2026-09-23 发版）、kit 周下载 42 万、ProseMirror 成熟 IME 栈——若形态合适，工程风险低。\n- **集成成本已量化**：实例 API 封在 `components/editor/MarkdownEditor/index.tsx`，命令通道 + workspaceStore 双边界，消费方（EditorPanel/EditorSection/EditorCommandHost/editor 页/Toolbar）零改动；硬重写约 1290 行引擎绑定层（含 L3 装饰管线 decorations/widgets/renderTheme 约 767 行）+ PM 层新写。\n- **先例**：20260922-feature-vditor-md-editor 曾引入 Vditor 后整体退场（11MB 资产 + 形态不合用），对比方案 C 即 Milkdown（当时以搭建周期长否掉）；editor.md 卡约束「禁止 copy-vditor 式大体积静态资产管线」，Crepe 预设夹带 Vue runtime + 3.46MB 资产踩线。\n\n**决策缺口**：以上均为文献证据，缺两块第一手数据——① 本仓库真实形态 markdown（frontmatter/中英文混排/HTML 块/硬换行）经 Milkdown 真实 transformer 的量化保真损失；② Typora 式形态在本产品写作流（紧凑首页面板 + `/editor` 沉浸页 + 胶囊命令）中的真实上手感受。本变更补齐后回写知识卡，为「是否全量替换」提供决策依据。\n\n## 引用规范\n- `shadow-docs/knowledge/editor.md`\n  - 当前结论: 主编辑器为 CM6 源码编辑 + L3 即时渲染装饰管线；光标行保持源码是设计语义；Vditor 曾引入后退场；执行约束含「依赖只经 package.json 声明消费；禁止重新引入本地化大体积静态资产管线」「编辑面挂载点必须复用 MarkdownEditor + publishEditorCommand 命令通道 + 同一 workspaceStore」。\n  - 适用 scope: components/editor、lib/editor-cm、lib/editor-commands、lib/editor-info——本 PoC 不触碰生产编辑面（挂载体验仅在 worktree 内不落库），评估结论将回写本卡。\n- `norms/tdd-verification.md`\n  - 当前结论: 评级三要素（契约变更/触及面/可发现性）与 S/M/L 测试要求；M 级 = 绿灯测试 + unit 验证。\n  - 适用 scope: 本变更按 M 级执行，round-trip 套件即验证主体。\n\n## 决策\n- **选型:** 方案 A —— PoC 评估先行（chore，零生产代码）：① `@milkdown/kit` 以 devDependency 引入，建 round-trip 实测套件（真实形态样例集 → Milkdown 真实 transformer parse→serialize，逐类记录规范化/损坏点并量化变更行比例，对照上游 #2349/#2403/#1712/#1249）；② worktree 内不落库的最小挂载体验（CDN/临时依赖），记录 Typora 式形态与现有 live-preview 的心智差异、表格/图片/代码块编辑、主题 token 桥接可行性；③ 选型评估报告落 change 目录；④ 结论回写 editor.md 知识卡。\n- **对比方案:** B 全量替换（feature/L）——立即重写约 1290 行引擎绑定层，但形态切换与 remark 规范化代价未经实测、#2349 类损坏风险未量化，且存量文档首次编辑即全文规范化 diff 不可逆，否；C 不换仅沉淀调研——文献证据已偏负面，但缺本仓库真实文档实测与形态上手，「换/不换」仍是印象判断而非证据判断，否。\n- **理由:** 用户确认 PoC 先行；用第一手数据把选型从印象判断变为证据判断；devDependency 隔离保证零生产风险；无论结论正反，证据链沉淀进知识卡都是净收益。若结论为「换」，后续另立 feature 变更走全量流程；若「不换」，round-trip 不保真固化为选型约束。\n\n## 任务\n### Phase 1 round-trip 保真实测\n- [ ] devDependencies 引入 `@milkdown/kit`（仅 devDeps 不进产物；若安装受阻降级 unified/remark-* 等价序列化路径并在报告注明差异） — `package.json`\n- [ ] round-trip 实测套件：真实形态样例集（frontmatter、`*` 列表、`_em_`、HTML 块、硬换行、autolink、嵌套强调、中文正文、表格、围栏代码块）经 Milkdown transformer parse→serialize，逐类断言记录规范化与损坏点，量化变更行比例并对照上游 issue 归因 — `tests/editor-poc-roundtrip.test.ts`\n\n### Phase 2 形态体验与选型报告\n- [ ] worktree 内最小挂载体验（CDN/临时依赖，**不落库不提交**）：Typora 式形态上手——表格/图片/代码块编辑、光标与选区行为、暗色主题桥接可行性、与 live-preview 心智差异；观察记录 — 产物进报告\n- [ ] 选型评估报告：保真实测数据、集成成本清单（重写面/保留面）、形态结论、明确建议（换/不换/条件换及条件内容） — `shadow-docs/changes/20260925-chore-milkdown-editor-poc/report.md`\n\n### Phase 3 知识沉淀\n- [ ] editor.md 卡回写：新增「编辑引擎选型评估」结论段（Milkdown 证据链 + 本 PoC 实测决策）；若决策为不换，把「round-trip 字节不保真」固化为编辑器选型约束 — `shadow-docs/knowledge/editor.md`\n\n## 补充\n## 动机\n用户观察到 Milkdown（ProseMirror + remark，Typora 式 WYSIWYG）可能比现有 CM6 即时渲染更合适。2026-09-25 调研确认：形态与现有 Obsidian 式源码+装饰不同类（无「光标行显源码」方案，上游 #645）；保存时序列化走 remark-stringify 默认风格必规范化全文（#2349 autolink 转义翻倍仍 OPEN、frontmatter 不支持 #1712 OPEN）；上游健康度优秀（v7.22.2/MIT/周下载 42 万）；仓库集成面友好（命令通道边界好，硬重写约 1290 行引擎绑定层，消费方零改动）。决策缺口是第一手实测与形态体验。\n\n## 决策\nPoC 评估先行（chore，零生产代码）：@milkdown/kit 仅 devDependency 的 round-trip 实测套件（真实形态样例集，量化规范化/损坏点）+ worktree 内不落库的最小挂载体验 + 选型评估报告 + editor.md 知识卡回写，为「是否全量替换」提供证据判断。\n\n## 任务\n- Phase 1 round-trip 保真实测：devDeps 引入 @milkdown/kit；tests/editor-poc-roundtrip.test.ts 实测套件\n- Phase 2 形态体验与报告：不落库挂载体验；选型评估报告 report.md\n- Phase 3 知识沉淀：editor.md 新增选型评估结论，若不换则固化「round-trip 字节不保真」为选型约束\n\n完整 brief：shadow-docs/changes/20260925-chore-milkdown-editor-poc/brief.md\n\n完整 brief：shadow-docs/changes/20260925-chore-milkdown-editor-poc/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260925-chore-milkdown-editor-poc\",\"type\":\"chore\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260925-chore-milkdown-editor-poc/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "chore"
      ]
    },
    "release": {
      "files": [
        "package.json",
        "shadow-docs/changes/20260925-chore-milkdown-editor-poc/brief.md",
        "shadow-docs/changes/20260925-chore-milkdown-editor-poc/report.md",
        "shadow-docs/knowledge/editor.md",
        "tests/__snapshots__/editor-poc-roundtrip.test.ts.snap",
        "tests/editor-poc-roundtrip.test.ts"
      ],
      "message": "chore(editor): Milkdown 选型 PoC——@milkdown/kit 真实 transformer round-trip 实测 17 样例：frontmatter 毁坏、图片行整行丢失、风格翻写一次性（二次保存零差异）；用户字节保真判据否决替换，editor.md 固化选型约束并修 7 条 source 死链（Closes #116）",
      "title": "chore(editor): Milkdown 选型 PoC——实测否决替换，字节保真固化为选型约束（Closes #116）",
      "body": "Closes #116\n\n完整 brief：shadow-docs/changes/20260925-chore-milkdown-editor-poc/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "编辑器选型评估产生长期有效事实：字节保真判据 + milkdown 7.22.2 实测数据级损坏两例（frontmatter 毁坏/图片行丢失）+ 风格翻写一次性——已按 task-4 更新 editor.md（选型评估结论段、字节保真执行约束、验证方式、source 补本 brief 并修复 7 条 archive 死链、verified-scope 补 PoC 证据）"
  }
}
---

# Milkdown 编辑引擎 PoC 评估（round-trip 保真实测 + 形态体验）

## 动机

用户观察到 Milkdown（ProseMirror + remark，Typora 式 WYSIWYG）「看起来比 CM6 更合适」，提出引擎选型议题。2026-09-25 双路调研（仓库集成面盘点 + 上游生态核查）已确认的事实：

- **形态不同类**：Milkdown 是 Typora 式所见即所得；现编辑器是 Obsidian 式源码+装饰（光标行保持源码是 20260923 起专门实现并经三轮修复迭代的设计语义）。Milkdown 无「光标行显源码」方案（上游 #645）。
- **格式保真是结构性代价**：Milkdown 序列化直接调 remark-stringify 默认风格（`bullet: '-'`、`emphasis: '_'`，无配置暴露，`packages/transformer/src/serializer/state.ts:363`），保存即全文规范化（`*`→`-`、`*em*`→`_em_`）→ git 全文 churn；序列化损坏线贯穿 2022-2026（#704→#2403），#2349（autolink 转义每次保存翻倍）仍 OPEN；frontmatter 不支持（#1712 OPEN）、HTML 块支持有限（#1249 OPEN）。
- **健康度优秀**：MIT、v7.22.2（2026-09-23 发版）、kit 周下载 42 万、ProseMirror 成熟 IME 栈——若形态合适，工程风险低。
- **集成成本已量化**：实例 API 封在 `components/editor/MarkdownEditor/index.tsx`，命令通道 + workspaceStore 双边界，消费方（EditorPanel/EditorSection/EditorCommandHost/editor 页/Toolbar）零改动；硬重写约 1290 行引擎绑定层（含 L3 装饰管线 decorations/widgets/renderTheme 约 767 行）+ PM 层新写。
- **先例**：20260922-feature-vditor-md-editor 曾引入 Vditor 后整体退场（11MB 资产 + 形态不合用），对比方案 C 即 Milkdown（当时以搭建周期长否掉）；editor.md 卡约束「禁止 copy-vditor 式大体积静态资产管线」，Crepe 预设夹带 Vue runtime + 3.46MB 资产踩线。

**决策缺口**：以上均为文献证据，缺两块第一手数据——① 本仓库真实形态 markdown（frontmatter/中英文混排/HTML 块/硬换行）经 Milkdown 真实 transformer 的量化保真损失；② Typora 式形态在本产品写作流（紧凑首页面板 + `/editor` 沉浸页 + 胶囊命令）中的真实上手感受。本变更补齐后回写知识卡，为「是否全量替换」提供决策依据。

## 复杂度评级

- **评级:** M
- **理由:** 契约变更——无（零生产代码，@milkdown/kit 仅 devDependency 不进产物）；触及面——package.json devDeps + 新增孤立测试文件 + 文档，不碰宿主核心与共享模块；可发现性——改动自证（测试即证据），不新增运行时路径。因核心交付物是测试套件，不适用 S 级「不创建测试」，故评 M。
- **期望验证深度:** unit

## 引用规范

- `shadow-docs/knowledge/editor.md`
  - 当前结论: 主编辑器为 CM6 源码编辑 + L3 即时渲染装饰管线；光标行保持源码是设计语义；Vditor 曾引入后退场；执行约束含「依赖只经 package.json 声明消费；禁止重新引入本地化大体积静态资产管线」「编辑面挂载点必须复用 MarkdownEditor + publishEditorCommand 命令通道 + 同一 workspaceStore」。
  - 适用 scope: components/editor、lib/editor-cm、lib/editor-commands、lib/editor-info——本 PoC 不触碰生产编辑面（挂载体验仅在 worktree 内不落库），评估结论将回写本卡。
- `norms/tdd-verification.md`
  - 当前结论: 评级三要素（契约变更/触及面/可发现性）与 S/M/L 测试要求；M 级 = 绿灯测试 + unit 验证。
  - 适用 scope: 本变更按 M 级执行，round-trip 套件即验证主体。

## 决策

- **选型:** 方案 A —— PoC 评估先行（chore，零生产代码）：① `@milkdown/kit` 以 devDependency 引入，建 round-trip 实测套件（真实形态样例集 → Milkdown 真实 transformer parse→serialize，逐类记录规范化/损坏点并量化变更行比例，对照上游 #2349/#2403/#1712/#1249）；② 选型评估报告落 change 目录；③ 结论回写 editor.md 知识卡。
- **对比方案:** B 全量替换（feature/L）——立即重写约 1290 行引擎绑定层，但形态切换与 remark 规范化代价未经实测、#2349 类损坏风险未量化，且存量文档首次编辑即全文规范化 diff 不可逆，否；C 不换仅沉淀调研——文献证据已偏负面，但缺本仓库真实文档实测与形态上手，「换/不换」仍是印象判断而非证据判断，否。
- **理由:** 用户确认 PoC 先行；用第一手数据把选型从印象判断变为证据判断；devDependency 隔离保证零生产风险；无论结论正反，证据链沉淀进知识卡都是净收益。若结论为「换」，后续另立 feature 变更走全量流程；若「不换」，round-trip 不保真固化为选型约束。
- **修订（2026-09-25，执行前用户拍板）:** 用户提出硬性判据「`.md` 在 GitHub 上保持原状、字节不被影响」——字节保真是现 CM6 架构的结构保证、却是 Milkdown 序列化架构的目标外物，该判据直接否决全量替换；Phase 2 的挂载体验任务随之失去动机，经用户确认剔除（原 task-3），本变更收缩为最小实测收尾。另：propose 阶段文献转述的「`*`→`-`、`*em*`→`_em_`」经 remark-stringify@11 实测修正——其默认风格是 `*` 世界，`-` 列表/`---` 分隔线/`_em_`/setext/`1)` 首次保存被翻写，且规范化为一次性（二次保存零差异）。

## 任务

### Phase 1 round-trip 保真实测
- [x] devDependencies 引入 `@milkdown/kit`（仅 devDeps 不进产物；若安装受阻降级 unified/remark-* 等价序列化路径并在报告注明差异） — `package.json`
- [x] round-trip 实测套件：真实形态样例集（frontmatter、`*` 列表、`_em_`、HTML 块、硬换行、autolink、嵌套强调、中文正文、表格、围栏代码块）经 Milkdown transformer parse→serialize，逐类断言记录规范化与损坏点，量化变更行比例并对照上游 issue 归因 — `tests/editor-poc-roundtrip.test.ts`

### Phase 2 选型报告
- [x] 选型评估报告：真 transformer 保真实测数据（含与纯 remark 模拟的差异）、集成成本清单（重写面/保留面）、明确建议——全量替换已被用户「字节保真」判据否决，报告聚焦否决证据坐实与残余价值评估 — `shadow-docs/changes/20260925-chore-milkdown-editor-poc/report.md`

### Phase 3 知识沉淀
- [x] editor.md 卡回写：新增「编辑引擎选型评估」结论段（Milkdown 证据链 + 本 PoC 实测决策）；若决策为不换，把「round-trip 字节不保真」固化为编辑器选型约束 — `shadow-docs/knowledge/editor.md`

## 结果

- 实际耗时: 约 0.5 天（含 propose 前双路调研、用户两轮拍板转向、brief 修订剔任务）
- 验证: `vitest run tests/editor-poc-roundtrip.test.ts` → 18 用例全绿（17 样例 round-trip 快照 + metrics 汇总快照入库，二次幂等断言全过）；全量回归 `vitest run` → 59 文件/519 用例单次全绿。数据级损坏两例（frontmatter 毁坏、图片行丢失）与翻写率明细见 `report.md` 与快照文件。
- 修正记录: propose 阶段「每次保存全文 diff」表述过强——实测规范化为一次性（二次保存零差异）；「`*`→`-`、`*em*`→`_em_`」文献转述有误——真实 transformer 保留 `*` 列表与 `_em_`（显式传 `emphasis: '_'`），翻写方向以实测为准。
- 知识评估: editor.md 已按 task-4 回写（选型评估结论段 + 字节保真执行约束 + 验证方式 + 7 条 archive 死链顺手修复），知识影响「更新」已落地于本变更内。

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/editor.md`
- **理由:** 编辑器域已有唯一 active 卡，选型评估结论并入该卡（不新增，按 domain+keywords+scope 查重）；若未来立项全量替换，该卡当时的 CM6 执行约束面需随引擎决策大修，本 PoC 报告是修订输入。
