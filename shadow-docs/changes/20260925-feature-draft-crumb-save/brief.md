---
{
  "schema": "shadow-dev/v1",
  "name": "20260925-feature-draft-crumb-save",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260925-feature-draft-crumb-save",
  "files": [
    "app/(shell)/editor/page.tsx",
    "lib/i18n/locales.ts",
    "tests/editor-page.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 95,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/95",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "f6847bcd4771c812ed5626706547995df17b368e",
    "verifiedAt": "2026-09-25T08:52:04.226Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:95",
    "planHash": "91fcd02f3970c225d5bc078ccbb61bdce9c0f974e2a274d23285b898e69eb6dd",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 草稿态面包屑入口：「新草稿」点击走原生保存落盘",
      "titleRaw": "[feature] 草稿态面包屑入口：「新草稿」点击走原生保存落盘",
      "supplement": "## 动机\n草稿箱「继续编辑」/冷启动新草稿进 /editor 时（activePath=null），面包屑「新草稿」是纯文本，没有落盘入口——用户实测反馈草稿态也需要面包屑文档操作能力。\n\n## 方案\n有内容时「新草稿」变为可点击段，点击发布既有 saveAs 命令 → 原生保存面板（pickSaveLocation，目录+文件名一次选定）落盘；空内容维持纯文本。落盘后面包屑自动变完整路径，改名/迁移即刻可用。复用 saveAs 链（writeFile → openDoc → consumeDraft），零新增命令/IPC。\n\n## 决策\n复用原生 saveAs（合规 #92「凡选位置一律原生弹窗」约束）；否决自绘文件夹树 Dialog（违背约束）与草稿箱列表页入口（语义重复，经确认不在范围）。\n\n## 复杂度评级\nM（局部行为、零契约变更）；期望验证深度 unit（editor-page.test.tsx 扩展 + 回归）。\n\n完整 brief：shadow-docs/changes/20260925-feature-draft-crumb-save/brief.md",
      "body": "## 动机\n20260924-feature-breadcrumb-doc-ops 落地了面包屑文档操作（点文件名改名、点目录段迁移/复制），但**草稿态被划为禁用边界**：从草稿箱「继续编辑」或冷启动新草稿进入 `/editor` 时（activePath=null，文件未落盘），面包屑「新草稿」是纯文本——用户实测反馈草稿箱路径也需要这个能力。草稿态缺的不是改名/迁移（没有文件可改移），而是「把当前草稿选个文件夹落盘」的入口；落盘后面包屑自动变完整路径，既有交互即刻可用。目前草稿落盘只能走顶栏「保存」按钮或胶囊，入口语义不直观。\n\n## 引用规范\n- `shadow-docs/knowledge/editor.md`\n  - 当前结论: saveAs 一律走原生保存面板（`pickSaveLocation`，目录+文件名一次选定），渲染层不得再造位置选择 UI；工作区内走 `writeFile → openDoc → consumeDraft` 转正链；新交互经命令通道（先入词表再消费）；面包屑文档操作契约（草稿态当前为纯文本不可点）。\n  - 适用 scope: [components/editor, components/home/EditorPanel, app/(shell)/editor, lib/editor-cm, lib/editor-commands, lib/editor-info, src/shared/docTransfer]\n\n## 决策\n- **选型:** 草稿态「新草稿」在有内容时变为可点击段，点击经 `publishEditorCommand({ kind: 'saveAs' })` 发布既有命令，由 EditorCommandHost 走原生保存面板（`pickSaveLocation`）落盘；空内容草稿维持纯文本不可点（无可保存内容）。落盘后面包屑由 store 驱动自动渲染为完整路径交互态。\n- **对比方案:** ①自绘「文件夹树+文件名」保存 Dialog（与迁移/复制 Dialog 同视觉）——违背 #92 刚写入的「渲染层不得再造位置选择 UI；凡选文件系统位置一律系统原生弹窗」约束，需改写 Knowledge 且两套位置选择 UI 并存心智分裂，否；②草稿箱列表页加「存入工作区」入口——列表页语义是管理草稿而非落盘，链路更长且与编辑页入口重复，否（经用户确认仅面包屑入口）。\n- **理由:** 完全遵循 editor.md 的 saveAs 原生化约束与命令通道契约（零新增命令）；实现最小；交互语言统一（面包屑可点=可操作）。已确认：草稿箱列表页不在本次范围。\n\n## 任务\n### Phase 1\n\n- [ ] `app/(shell)/editor/page.tsx` 面包屑草稿态分支：有内容（canSave 语义一致）时「新草稿」渲染为 CrumbButton（title=crumbDraftTitle，onClick 发布 saveAs）；空内容维持纯文本；注释同步\n- [ ] `lib/i18n/locales.ts` 三语新增 `editor.crumbDraftTitle`（中「点击保存到工作区」/英「Click to save to workspace」/日「クリックでワークスペースへ保存」）\n- [ ] `tests/editor-page.test.tsx` 扩展：有内容草稿「新草稿」为可点按钮且点击发布 saveAs 命令；空内容草稿纯文本不可点；修正既有「草稿态纯文本」断言（openDraft 有内容场景语义反转）\n\n## 补充\n## 动机\n草稿箱「继续编辑」/冷启动新草稿进 /editor 时（activePath=null），面包屑「新草稿」是纯文本，没有落盘入口——用户实测反馈草稿态也需要面包屑文档操作能力。\n\n## 方案\n有内容时「新草稿」变为可点击段，点击发布既有 saveAs 命令 → 原生保存面板（pickSaveLocation，目录+文件名一次选定）落盘；空内容维持纯文本。落盘后面包屑自动变完整路径，改名/迁移即刻可用。复用 saveAs 链（writeFile → openDoc → consumeDraft），零新增命令/IPC。\n\n## 决策\n复用原生 saveAs（合规 #92「凡选位置一律原生弹窗」约束）；否决自绘文件夹树 Dialog（违背约束）与草稿箱列表页入口（语义重复，经确认不在范围）。\n\n## 复杂度评级\nM（局部行为、零契约变更）；期望验证深度 unit（editor-page.test.tsx 扩展 + 回归）。\n\n完整 brief：shadow-docs/changes/20260925-feature-draft-crumb-save/brief.md\n\n完整 brief：shadow-docs/changes/20260925-feature-draft-crumb-save/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260925-feature-draft-crumb-save\",\"type\":\"feature\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260925-feature-draft-crumb-save/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "release": {
      "files": [
        "app/(shell)/editor/page.tsx",
        "lib/i18n/locales.ts",
        "shadow-docs/changes/20260925-feature-draft-crumb-save/brief.md",
        "shadow-docs/knowledge/editor.md",
        "tests/editor-page.test.tsx"
      ],
      "message": "feat(editor): 草稿态面包屑入口——「新草稿」点击走原生保存落盘（复用 saveAs 零新增命令）（Closes #95）",
      "title": "[feature] 草稿态面包屑入口：「新草稿」点击走原生保存落盘",
      "body": "Closes #95\n\n完整 brief：shadow-docs/changes/20260925-feature-draft-crumb-save/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/editor.md",
    "reason": "面包屑文档操作段落撤回「草稿态纯文本不可点」绝对表述，补草稿态入口语义：有内容时「新草稿」可点、发布既有 saveAs 走原生保存面板落盘（合规 #92 原生位置选择约束），空内容纯文本；verified-depth: unit；verified-scope: app/(shell)/editor, lib/i18n/locales, tests/editor-page"
  }
}
---

# 草稿态面包屑入口：「新草稿」点击走原生保存落盘

## 动机

20260924-feature-breadcrumb-doc-ops 落地了面包屑文档操作（点文件名改名、点目录段迁移/复制），但**草稿态被划为禁用边界**：从草稿箱「继续编辑」或冷启动新草稿进入 `/editor` 时（activePath=null，文件未落盘），面包屑「新草稿」是纯文本——用户实测反馈草稿箱路径也需要这个能力。草稿态缺的不是改名/迁移（没有文件可改移），而是「把当前草稿选个文件夹落盘」的入口；落盘后面包屑自动变完整路径，既有交互即刻可用。目前草稿落盘只能走顶栏「保存」按钮或胶囊，入口语义不直观。

## 复杂度评级

- **评级:** M
- **理由:** 三要素对照——①契约变更：无，复用现有 `saveAs` 命令与原生保存面板链路，不改 EditorCommand 词表/IPC/store；②触及面：局部——`/editor` 页面包屑草稿态分支 + 三语文案 + 测试，不碰宿主核心与共享模块签名；③可发现性：低——交互入口变化立刻可见，行为语义与既有保存按钮完全一致。
- **期望验证深度:** unit（绿灯测试：editor-page.test.tsx 扩展草稿态点击发命令/空内容不可点 + 既有套件回归）

## 引用规范

- `shadow-docs/knowledge/editor.md`
  - 当前结论: saveAs 一律走原生保存面板（`pickSaveLocation`，目录+文件名一次选定），渲染层不得再造位置选择 UI；工作区内走 `writeFile → openDoc → consumeDraft` 转正链；新交互经命令通道（先入词表再消费）；面包屑文档操作契约（草稿态当前为纯文本不可点）。
  - 适用 scope: [components/editor, components/home/EditorPanel, app/(shell)/editor, lib/editor-cm, lib/editor-commands, lib/editor-info, src/shared/docTransfer]

## 决策

- **选型:** 草稿态「新草稿」在有内容时变为可点击段，点击经 `publishEditorCommand({ kind: 'saveAs' })` 发布既有命令，由 EditorCommandHost 走原生保存面板（`pickSaveLocation`）落盘；空内容草稿维持纯文本不可点（无可保存内容）。落盘后面包屑由 store 驱动自动渲染为完整路径交互态。
- **对比方案:** ①自绘「文件夹树+文件名」保存 Dialog（与迁移/复制 Dialog 同视觉）——违背 #92 刚写入的「渲染层不得再造位置选择 UI；凡选文件系统位置一律系统原生弹窗」约束，需改写 Knowledge 且两套位置选择 UI 并存心智分裂，否；②草稿箱列表页加「存入工作区」入口——列表页语义是管理草稿而非落盘，链路更长且与编辑页入口重复，否（经用户确认仅面包屑入口）。
- **理由:** 完全遵循 editor.md 的 saveAs 原生化约束与命令通道契约（零新增命令）；实现最小；交互语言统一（面包屑可点=可操作）。已确认：草稿箱列表页不在本次范围。

## 任务

### Phase 1

- [x] `app/(shell)/editor/page.tsx` 面包屑草稿态分支：有内容（canSave 语义一致）时「新草稿」渲染为 CrumbButton（title=crumbDraftTitle，onClick 发布 saveAs）；空内容维持纯文本；注释同步
- [x] `lib/i18n/locales.ts` 三语新增 `editor.crumbDraftTitle`（中「点击保存到工作区」/英「Click to save to workspace」/日「クリックでワークスペースへ保存」）
- [x] `tests/editor-page.test.tsx` 扩展：有内容草稿「新草稿」为可点按钮且点击发布 saveAs 命令；空内容草稿纯文本不可点；修正既有「草稿态纯文本」断言（openDraft 有内容场景语义反转）

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/editor.md`
- **理由:** 面包屑文档操作段落需补一句草稿态入口语义（有内容「新草稿」可点走原生 saveAs、空内容不可点），撤回「草稿态纯文本不可点」的绝对表述；merge 为该卡既有两段结论的拼合，不新增卡片。
