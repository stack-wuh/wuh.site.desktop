---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-native-save-dialog",
  "type": "feature",
  "scope": "desktop",
  "status": "published",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-native-save-dialog",
  "files": [
    "components/capsule/sections/EditorSection.tsx",
    "lib/i18n/locales.ts",
    "shadow-docs/knowledge/editor.md",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "src/main/saveDialog.ts",
    "src/main/workspace.ts",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "tests/save-dialog.test.ts",
    "tests/saveas-flow.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 85,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/85",
    "pullRequest": 106,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/106"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "54ae1b308138214f216a1e78db929d5a86b75f16",
    "verifiedAt": "2026-09-26T15:53:50.249Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:106",
    "planHash": "17605b4ca00f01b9ff69cecae8538f832f28a6ef9ca076d4bebd34d71ba08f47",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 保存新文件统一系统原生弹窗（saveAs 原生化）",
      "body": "## 动机\n「保存新文件选位置」与「打开项目选文件夹」是两套交互心智：saveAs 走渲染层自绘 Dialog + 相对路径文本框（无目录浏览、无位置记忆、无工作区时报错卡死），打开项目走主进程原生 `dialog.showOpenDialog`。本次统一为「凡选文件系统位置一律系统原生弹窗」，并给无工作区保存一条引导路径。用户已确认：① saveAs 改走主进程 `dialog.showSaveDialog`（目录+文件名一次选定）；② 打开项目维持原生弹窗不变；③ 无工作区时保存 → 先弹目录选择打开为工作区，再接保存面板。\n\n## 引用规范\n- shadow-docs/knowledge/editor.md\n  - 当前结论: save/saveAs/newDraft/closeDoc 归宿主（EditorCommandHost）认领，经 `publishEditorCommand` 命令通道，编辑面不直呼主进程写盘\n  - 适用 scope: components/capsule, lib/editor-commands, lib/store\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 打开本地目录 = 原生 `showOpenDialog`；工作区切换 `applyWorkspaceSwitch` 单点收口；最近项目持久化 `userData/recent-workspaces.json`\n  - 适用 scope: src/main, components/workspace\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: 错误/影响操作的提示经 `lib/feedback.ts` 总线（Message 横幅），不自建浮层\n  - 适用 scope: lib/feedback\n\n## 决策\n- **选型:** saveAs 原生化。defaultPath = 上次保存目录（userData JSON 持久化）→ 回落工作区根 → 回落主目录；建议文件名 = 草稿标题清洗 + `.md`；确认路径在工作区内 → 相对化走既有 `writeFile` + `openDoc` + `consumeDraft` 转正链路；在工作区外 → 不落盘，feedback Message 提示、会话保留（v1 不自动切工作区）；无工作区 → 先 `openWorkspace()` 目录选择再接保存面板，取消则整个流程终止。\n- **对比方案:** 渲染层统一自绘目录浏览器（自建 UI + 新 IPC、偏离系统习惯，弃）；相对路径框补目录树（半吊子统一，弃）。\n- **理由:** 最小工作量达成一致心智；原生面板自带目录浏览/新建文件夹/键盘可达；工作区模型（activePath 相对 root、项目树、openProjectFile）不被破坏。\n\n## 任务\n### Phase 1 主进程与契约\n- [ ] DesktopApi 新增 `pickSaveLocation(opts)`（`dialog.showSaveDialog` 包装）+ 上次保存目录持久化 — `src/shared/types.ts` `src/preload/index.ts` `src/main/saveDialog.ts` — 新增\n- [ ] 主进程单测（mock dialog：取消/确认/defaultPath 拼装/持久化回读）— `tests/save-dialog.test.ts` — 新增\n\n### Phase 2 渲染层接线\n- [ ] EditorCommandHost saveAs 流程改写（无工作区引导/取消/外部路径拒绝/成功转正四分支） — `components/capsule/sections/EditorSection.tsx` — 修改\n- [ ] i18n 键调整（复用 `editor.saveAsTitle` 作面板 title；移除自绘 Dialog 键；新增工作区外提示键；三语齐配） — `lib/i18n/locales.ts` — 修改\n- [ ] 渲染层测试 saveAs 四分支 — `tests/saveas-flow.test.tsx` — 新增\n\n### Phase 3 回归\n- [ ] `pnpm typecheck` + `pnpm test` 全绿（含 i18n parity）；四主题手动走查（草稿保存原生面板、无工作区两步流、取消、外部路径提示、草稿箱条目消费）\n- [ ] 知识写回：editor.md（saveAs 认领流程改原生面板+位置记忆+边界规则）、renderer-shell-routing.md（保存触发开工作区链路） — `shadow-docs/knowledge/` — 更新\n\n完整 brief：shadow-docs/changes/20260924-feature-native-save-dialog/brief.md",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "shadow-docs/changes/20260924-feature-native-save-dialog/brief.md"
      ],
      "message": "docs(shadow): native-save-dialog 状态回填——review 记录对齐当前 HEAD（实现已随历史提交进入 main，流程补录）"
    }
  },
  "knowledge": null
}
---

# 保存新文件统一系统原生弹窗（saveAs 原生化）

## 动机

「保存新文件选位置」与「打开项目选文件夹」是两套交互心智：saveAs 走渲染层自绘 Dialog + 相对路径文本框（`components/capsule/sections/EditorSection.tsx`，无目录浏览、无位置记忆、依赖已打开工作区否则报错卡死），打开项目走主进程原生 `dialog.showOpenDialog`（`src/main/workspace.ts`）。统一为「凡选文件系统位置一律系统原生弹窗」，并让无工作区时的保存有引导路径而不是报错。

## 引用规范

- shadow-docs/knowledge/editor.md
  - 当前结论: save/saveAs/newDraft/closeDoc 归宿主（EditorCommandHost）认领，经 `publishEditorCommand` 命令通道，编辑面不直呼主进程写盘；编辑面挂载点收敛
  - 适用 scope: components/capsule, lib/editor-commands, lib/store
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 打开本地目录 = 主进程原生 `dialog.showOpenDialog`（WorkspacePicker → openWorkspace）；工作区切换 `applyWorkspaceSwitch` 单点收口；最近项目持久化 `userData/recent-workspaces.json`
  - 适用 scope: src/main, components/workspace
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: 错误/影响操作的提示经 `lib/feedback.ts` 总线（Message 横幅 = 常驻可操作），不得自建浮层或 window.alert
  - 适用 scope: lib/feedback
- norms/ui-patterns.md、norms/interaction.md、norms/code-style.md：组件复用优先、焦点与键盘可达、禁新增 any、异步三态语义

## 决策

- **选型:** saveAs 改走主进程 `dialog.showSaveDialog`（原生保存面板：目录+文件名一次选定）；打开项目维持原生 `showOpenDialog` 不变。统一心智 = 「选文件系统位置一律系统原生弹窗」。
- **对比方案:** 渲染层统一自绘目录浏览器（需自建浏览 UI + 新列目录 IPC、偏离系统习惯，弃）；相对路径输入框补目录树（半吊子统一，弃）。
- **理由:** 最小工作量达成一致；原生面板自带目录浏览/新建文件夹/键盘可达；工作区模型（activePath 相对 root、项目树、openProjectFile）不被破坏。

细化规则：

1. **默认位置记忆**: `defaultPath` = 上次保存目录（userData JSON 持久化，主进程读写）→ 回落当前工作区根 → 回落用户主目录；建议文件名 = 草稿标题清洗非法字符 + `.md`，无标题用「未命名.md」；filters 限 markdown。
2. **路径边界**: 确认路径在当前工作区内 → 相对化走既有 `writeFile`（mkdir recursive 语义不变），成功后 `openDoc` + 有归属草稿则 `consumeDraft`（既有转正链路保持）；在工作区外 → **不落盘**，`feedback` Message 提示「保存位置需在当前工作区内」，编辑会话保留（v1 不自动切工作区——静默换工作区会失效其他文档并广播插件，过于惊扰）。
3. **无工作区时 saveAs**: 先复用既有 `openWorkspace()` 原生目录选择打开工作区（用户取消则整个保存流程终止），成功后自动接保存面板（defaultPath = 新工作区根）。不再出现「未打开工作区」报错死路。

## 任务

### Phase 1 主进程与契约
- [x] DesktopApi 新增 `pickSaveLocation(opts)`：参数 title / defaultPath / 建议文件名，返回 `{canceled: true} | {canceled: false, path}`（`dialog.showSaveDialog` 包装）—— `src/shared/types.ts`、`src/preload/index.ts`、`src/main/saveDialog.ts`（新）
- [x] 上次保存目录持久化（userData JSON，读写容错）—— `src/main/saveDialog.ts`
- [x] 主进程单测（mock dialog：取消/确认/defaultPath 拼装/持久化回读）—— `tests/save-dialog.test.ts`

### Phase 2 渲染层接线
- [x] EditorCommandHost 的 saveAs 流程改写：无工作区 → `openWorkspace()` → 成功接 `pickSaveLocation`；有工作区 → 直接 `pickSaveLocation`（defaultPath = 上次目录或工作区根）；确认后相对化校验 + `writeFile` + `openDoc` + `consumeDraft`；取消静默终止 —— `components/capsule/sections/EditorSection.tsx`
- [x] 工作区外路径 → feedback Message 提示、会话保留 —— `components/capsule/sections/EditorSection.tsx`
- [x] i18n 键调整：复用 `editor.saveAsTitle` 作原生面板 title；移除不再引用的自绘 Dialog 键（如 `editor.fileNameLabel`）；新增工作区外提示键；三语齐配 —— `lib/i18n/locales.ts`
- [x] 渲染层测试：saveAs 四分支（无工作区引导 / 取消 / 外部路径拒绝 / 成功落盘转正+消费草稿）—— `tests/saveas-flow.test.tsx`（新）或并入既有 capsule 渲染测试

### Phase 3 回归
- [x] `pnpm typecheck` + `pnpm test` 全绿（含 i18n parity 与源码键覆盖扫描）
- [x] 四主题手动走查：草稿保存弹原生面板、无工作区两步流、取消、外部路径提示、保存后草稿箱条目消费

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/editor.md（EditorCommandHost saveAs 认领流程改原生面板 + 位置记忆 + 边界规则）；shadow-docs/knowledge/renderer-shell-routing.md（无工作区保存 → 开工作区的引导链路，若成稳定契约）
- **理由:** saveAs 语义变更改变命令宿主契约描述；打开工作区新增「保存触发」入口。
