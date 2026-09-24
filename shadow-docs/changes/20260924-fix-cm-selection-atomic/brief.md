---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-fix-cm-selection-atomic",
  "type": "fix",
  "scope": "apps/desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "fix/20260924-fix-cm-selection-atomic",
  "files": [
    "components/editor/MarkdownEditor.tsx",
    "components/editor/decorations.ts",
    "shadow-docs/knowledge/editor.md",
    "tests/editor-cm-live-preview.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 83,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/83",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "9d23c3c278617471706a6fcb0dfe9b879cc547ff",
    "verifiedAt": "2026-09-24T13:50:32.833Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:83",
    "planHash": "3a646e7342b456f448e1b09371ad124a8743bab8cffb8aefc11c64f0e9694351",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "修复 L3 装饰层原子区过宽导致的光标/选中失灵",
      "body": "用户实测光标点不进粗体/斜体/代码/链接内容、拖选吸附边缘。根因：livePreviewField 把整个 DecorationSet 供成 atomicRanges（应仅 widget replace 子集）+ 缺 drawSelection()。方案与任务见 shadow-docs/changes/20260924-fix-cm-selection-atomic/brief.md",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 修复 L3 装饰层原子区过宽导致的光标/选中失灵

## 动机

用户实测反馈「编辑器光标选中都有问题」。根因有二，均在自持 L3 装饰层，非 CM6 内核缺陷：

1. `components/editor/decorations.ts` 的 `livePreviewField` 把**整个 DecorationSet** 供成 `EditorView.atomicRanges`（本意仅让 mermaid/公式块等替换 widget 原子化）。CM6 原子区语义是「点击落入其中光标吸附最近边界」——于是粗体/斜体/行内代码/链接的**内容 mark 装饰**、隐藏符号（`**`、`#`、`>`）全部原子化：光标点不进任何样式文本内部，一律弹到 span 边缘，拖选同样吸附。
2. `MarkdownEditor` 扩展列表缺 `drawSelection()`，主题里 `.cm-selectionBackground` 规则永不生效，选区走浏览器原生渲染，与 `display:none` 隐藏标记互相打架（高亮跳块/缺块）。

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: 即时渲染 L3 装饰管线 StateField 直供 `EditorView.decorations` + `atomicRanges`；装饰重建条件必须覆盖 `tr.reconfigured`；主题只写语义 token
  - 适用 scope: renderer-ui（components/editor、lib/editor-cm）

## 决策

- **选型：** `buildDecorations` 同步产出**双集**——装饰集（现状不变）与**仅含 widget replace 装饰**的原子集；StateField 值改为 `{ decos, atomic }`，`atomicRanges` 只供原子集；扩展列表补 `drawSelection()`。
- **对比方案：** (a) provide 侧 `decos.update({ filter })` 惰性过滤——可行但规则藏在 provide 闭包、不可独立测试，且每次重建多一次全集合遍历；不选。(b) 去掉 atomicRanges——mermaid/公式块点击落点会进入被替换内容内部，交互劣化；不选。
- **理由：** 原子性本就只为「不可进入的替换呈现」设计；双集在纯函数里构造、可断言，且不触碰 `tr.reconfigured` 重建契约与主题 token 约束。

## 任务

### Phase 1
- [x] TDD：`tests/editor-cm-live-preview.test.ts` 加用例——含 `**bold**`/隐藏标记/围栏头的文档，断言原子集不含 mark/hidden 区间、恰含 widget replace 区间；纯文本与空文档行为不变 — `tests/editor-cm-live-preview.test.ts`
- [x] `buildDecorations` 双集改造 + StateField 值改 `{ decos, atomic }` + `atomicRanges` 供原子集 — `components/editor/decorations.ts`
- [x] 扩展列表补 `drawSelection()`（`@codemirror/view`）— `components/editor/MarkdownEditor.tsx`

### Phase 2
- [x] 全量门禁（vitest + tsc + lint）+ 用户真机 HMR 验证（点选粗体内部、拖选跨隐藏符号、mermaid/公式块点击回源码仍正常）

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md
- **理由:** 即时渲染段的 atomicRanges 契约需改写为「仅 widget replace 子集」，执行约束补「扩展必带 drawSelection()」；live-preview-toggle-rebuild 的 `tr.reconfigured` 契约保持不变须显式复核。

## 测试策略说明

happy-dom 下 CM6 选区坐标映射不可复现真机点击吸附行为，原子集正确性以纯逻辑断言（集合内容）覆盖；真机手感由用户 HMR 验证把关（同 20260924-fix-capsule-self-close 的结论）。
