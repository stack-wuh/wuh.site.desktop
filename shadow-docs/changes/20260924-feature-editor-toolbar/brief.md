---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-editor-toolbar",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-editor-toolbar",
  "files": [
    "app/(shell)/editor/page.tsx",
    "components/editor/MarkdownEditor.tsx",
    "components/editor/Toolbar.tsx",
    "components/home/EditorPanel.tsx",
    "shadow-docs/knowledge/editor.md",
    "tests/editor-toolbar.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 84,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/84",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "669591c67a56bbfb09d69fe946abd7b627c534b1",
    "verifiedAt": "2026-09-24T14:11:16.714Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:84",
    "planHash": "28370afa46ab383c05c37f0018becbb6084fcacedf459a923c0c11b710bed26d",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "编辑区自建 Toolbar（命令通道发布方，零新增命令）",
      "body": "自持 UI 方向落地：新增 components/editor/Toolbar.tsx 纯发布方组件，复用 format/insert/insertClipboardImage 既有命令词表与三语 fmt* 键，挂载首页面板与 /editor 页；移除 highlightSelectionMatches；键盘行为层（defaultKeymap/history）保留。方案与任务见 shadow-docs/changes/20260924-feature-editor-toolbar/brief.md",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 编辑区自建 Toolbar（命令通道发布方，零新增命令）

## 动机

用户方向确认：引擎（CM6）只当「文本模型 + 键盘行为 + 装饰渲染」，**看得见的交互 UI 自持**。当前格式化/插入入口只有壳层胶囊（EditorSection）与首页动作行（撤销/重做/查找），编辑区上方无工具栏；自建 Toolbar 调 `publishEditorCommand` 既有命令，补齐编辑就地交互。

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: 命令通道 `EditorCommand` 是 UI 与编辑器解耦的唯一桥梁；新命令先入词表再消费；两挂载点（首页面板 / `/editor` 页）共用同一 workspaceStore 与命令通道
  - 适用 scope: renderer-ui（components/editor、components/home/EditorPanel、app/(shell)/editor）

## 决策

- **选型：** 新增 `components/editor/Toolbar.tsx` 纯发布方组件——词表全量复用现有命令（format: h1/h2/bold/italic/ul/ol/quote/code/link；insert: table/codeBlock/hr；insertClipboardImage），图标钮 + 分组分隔，i18n 复用 `editor.fmt*` 三语既有键（零新增）；挂载首页 EditorPanel（上下文行与编辑区之间）与 `/editor` 页顶栏之下。顺手移除 `highlightSelectionMatches`（用户已认可的修剪项）。
- **对比方案：** (a) 用 CM6 自带 panel 机制内嵌工具栏——与命令通道解耦设计相悖，胶囊/页面无法复用同一组件；不选。(b) 一并自建查找替换 UI 替换 CM 搜索面板——体量另起 change，本次不动 CM 面板（先砍后建=功能回退）；列为后续候选。(c) 砍 defaultKeymap/markdownKeymap 重写键盘行为——键盘行为层就是光标/选区/删除本身，自持风险大于收益（本次光标 bug 恰出自自绘装饰层）；明确不做。
- **理由：** 零新增命令词表、零引擎扩展改动（除移除 highlightSelectionMatches），完全落在既有契约内；UI 自持方向与用户决策一致。

## 任务

### Phase 1
- [x] TDD：`tests/editor-toolbar.test.tsx`——渲染冒烟 + 逐钮点击断言 `publishEditorCommand` 收到对应 format/insert/insertClipboardImage 命令（stub 订阅收集） — `tests/editor-toolbar.test.tsx`
- [x] `Toolbar.tsx` 组件（按钮词表 → 命令映射、分组分隔、aria/title 三语） — `components/editor/Toolbar.tsx`

### Phase 2
- [x] 挂载首页 `EditorPanel`（ContextRow 与 EditorBody 之间）与 `/editor` 页（顶栏之下） — `components/home/EditorPanel.tsx` `app/(shell)/editor/page.tsx`
- [x] `MarkdownEditor` 移除 `highlightSelectionMatches` — `components/editor/MarkdownEditor.tsx`
- [x] 全量门禁 + 用户真机验证（两挂载点按钮全动作、胶囊同命令并存不冲突）

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md
- **理由:** 命令通道段需补 Toolbar 发布方与其两处挂载契约（与胶囊 EditorSection、面板动作行并列）；「CM 搜索面板自建替换」列为后续候选记入讨论。

## 测试策略说明

Toolbar 是纯发布方，命令映射为纯逻辑可全量断言；挂载点改动以现有 render 冒烟族（home-editor-panel/editor-page）回归，真机手感用户验证。
