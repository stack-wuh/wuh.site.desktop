---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-fix-live-preview-toggle-rebuild",
  "type": "fix",
  "scope": "apps/desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "fix/20260924-fix-live-preview-toggle-rebuild",
  "files": [
    "components/editor/decorations.ts",
    "tests/editor-live-preview-toggle.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 74,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/74",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "a09ec68e6d2bda3f6299e47a678bdbb032446d36",
    "verifiedAt": "2026-09-24T07:43:22.249Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:74",
    "planHash": "a0b4a4b55e12bccee95f25d764f10c18ae499b9f4b7d3857fa3b1d581994a892",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 即时渲染开关切换后装饰层不重建——reconfigure 事务零装饰",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n用户实测（/editor 统一编辑页，首页面板同链路同样复现）：胶囊「即时渲染」开关点亮后画面仍为纯源码，直到下一次敲键/移动光标才出现渲染装饰。根因双叠加：\n\n1. 用户 localStorage 持久化 `wd.editorRenderMode=source`（leveldb 写入序列 render→source→render→source），打开即在源码态——尊重偏好的设计行为，非缺陷；\n2. 真缺陷：`components/editor/decorations.ts` 的 `rebuildNeeded` 只认 `tr.docChanged || tr.selection != null`，而 MarkdownEditor 的 toggleRender 仅派发 `Compartment.reconfigure`（无 docChanged、无 selection），新挂载的 livePreviewField 以 `create()=Decoration.none` 初始化且不触发重建——开关切到渲染态后装饰集保持空。关渲染立即生效、开渲染延迟到下次输入，开关观感「点了没用」。\n\n加重观感：光标行按设计永远保持源码态，盯着当前行看两种模式几乎无差别。\n\nCM6 状态机时序取证（临时测试已复现并清理）：reconfigure 后装饰 0 条 → 交互一次 2 条；修复验证：`rebuildNeeded` 补 `tr.reconfigured` 后切换即出 2 条。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: CM6 薄包装、content 双通道防回环、命令通道解耦、主题桥接只写 var(--token)；尚未收录 L3 即时渲染装饰管线（知识缺口，本变更补齐）\n  - 适用 scope: components/editor\n\n## 决策\n- **选型:** `rebuildNeeded` 增加 `tr.reconfigured` 条件（一行）\n- **对比方案:** (a) MarkdownEditor toggleRender 在 reconfigure 后追加 selection 触碰事务——修复散进调用方，未来任何 reconfigure 路径都会再踩同一坑； (b) StateField `create()` 直接 buildDecorations——只救挂载初值，救不了切回渲染态的语义；\n- **理由:** `tr.reconfigured` 是 CM6 官方事务标记，在装饰层单点兜住「任何 Compartment 重配后必须重建」的契约，最小且完备；已用真实状态机测试验证。\n\n## 任务\n### Phase 1\n- [ ] 回归测试：开关切换即时产出装饰 / 源码态不误伤 / 光标行保持源码态 / 首次输入即重建 — `tests/editor-live-preview-toggle.test.ts`\n- [ ] 一行修复：rebuildNeeded 补 tr.reconfigured — `components/editor/decorations.ts`\n\n完整 brief：shadow-docs/changes/20260924-fix-live-preview-toggle-rebuild/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-fix-live-preview-toggle-rebuild\",\"type\":\"fix\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-fix-live-preview-toggle-rebuild/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 即时渲染开关切换后装饰层不重建——reconfigure 事务零装饰

## 动机
用户实测（/editor 统一编辑页，首页面板同链路同样复现）：胶囊「即时渲染」开关点亮后画面仍为纯源码，直到下一次敲键/移动光标才出现渲染装饰。根因双叠加：

1. 用户 localStorage 持久化 `wd.editorRenderMode=source`（leveldb 写入序列 render→source→render→source），打开即在源码态——尊重偏好的设计行为，非缺陷；
2. 真缺陷：`components/editor/decorations.ts` 的 `rebuildNeeded` 只认 `tr.docChanged || tr.selection != null`，而 MarkdownEditor 的 toggleRender 仅派发 `Compartment.reconfigure`（无 docChanged、无 selection），新挂载的 livePreviewField 以 `create()=Decoration.none` 初始化且不触发重建——开关切到渲染态后装饰集保持空。关渲染立即生效、开渲染延迟到下次输入，开关观感「点了没用」。

加重观感：光标行按设计永远保持源码态，盯着当前行看两种模式几乎无差别。

CM6 状态机时序取证（临时测试已复现并清理）：reconfigure 后装饰 0 条 → 交互一次 2 条；修复验证：`rebuildNeeded` 补 `tr.reconfigured` 后切换即出 2 条。

## 引用规范
- shadow-docs/knowledge/editor.md
  - 当前结论: CM6 薄包装、content 双通道防回环、命令通道解耦、主题桥接只写 var(--token)；尚未收录 L3 即时渲染装饰管线（知识缺口，本变更补齐）
  - 适用 scope: components/editor

## 决策
- **选型:** `rebuildNeeded` 增加 `tr.reconfigured` 条件（一行）
- **对比方案:** (a) MarkdownEditor toggleRender 在 reconfigure 后追加 selection 触碰事务——修复散进调用方，未来任何 reconfigure 路径都会再踩同一坑； (b) StateField `create()` 直接 buildDecorations——只救挂载初值，救不了切回渲染态的语义；
- **理由:** `tr.reconfigured` 是 CM6 官方事务标记，在装饰层单点兜住「任何 Compartment 重配后必须重建」的契约，最小且完备；已用真实状态机测试验证。

## 任务
### Phase 1
- [x] 回归测试：开关切换即时产出装饰 / 源码态不误伤 / 光标行保持源码态 / 首次输入即重建 — `tests/editor-live-preview-toggle.test.ts`
- [x] 一行修复：rebuildNeeded 补 tr.reconfigured — `components/editor/decorations.ts`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md
- **理由:** 卡片缺 L3 即时渲染装饰管线段落；补「装饰集必须响应 reconfigure（tr.reconfigured）重建」契约，source 列表补 20260923-feature-cm-live-preview 与本变更。
