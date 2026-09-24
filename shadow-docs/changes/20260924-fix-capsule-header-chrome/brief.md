---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-fix-capsule-header-chrome",
  "type": "fix",
  "scope": "desktop",
  "status": "branched",
  "baseBranch": "main",
  "branch": "fix/20260924-fix-capsule-header-chrome",
  "files": [
    "app/(shell)/layout.tsx",
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel.tsx",
    "components/capsule/sections/EditorSection.tsx",
    "shadow-docs/knowledge/shell-chrome-design.md"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 69,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/69",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "2c60b8993210a36762ee2b8a7d9a35a1cceb2c6b",
    "verifiedAt": "2026-09-24T03:49:58.751Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:69",
    "planHash": "de5fa73680c1958e9bed692bb057027ba505f7313a05a87a09525406ced70cd3",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 胶囊入 Header：挂点迁移 + 通知条激活 + 编辑器工具条间距修复",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n任务中心上线后真机走查发现三个视觉缺陷：① 模块 tab 编辑器工具条换行后两排图标仅隔 2px（`gap` 横纵共用所致），与「排版设置」行之间也只有 4px 垫片，面板加宽到 420px 后换行点变化使问题显形；② 胶囊 chip 悬浮在 main 容器右上（top:10px），与上方 44px 空通知条割裂，视觉不协调；③ Header（预留通知条）完全空置。②③同源：chip「贴着内容顶」而非「站在 header 里」。用户已确认方向：**胶囊入 Header**（chip 垂直居中挂 TitleBar 右侧、左区保留通知预留位）。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 壳层胶囊挂点契约（main 容器右上常驻、宿主无 z-index、pointer-events 穿透、面板 z70 向下弹出、低于浮窗 z2 高于内容、低于 Dialog 100）；预留通知条段（44px TitleBar 空置，aria-label=通知栏 + aria-live=polite）；浮层点外关 target 归属守卫；胶囊动效属持续状态指示、reduced-motion 静态降级；「Nav 不得 overflow:hidden」与移动挂点必须整段同步的约束\n  - 适用 scope: app, components/capsule, shadow-docs/knowledge\n\n## 决策\n- **选型:** 方案 A——胶囊挂点从 main 容器右上迁移到 TitleBar（Header）右侧：chip 作为 TitleBar flex 子项垂直居中（`margin-left:auto` 推右），面板贴 chip 下缘（`top: calc(100% + 10px)`）向下弹出；TitleBar 左区保留通知/信息预留位（aria 语义不变）。\n- **对比方案:** ① 移除空 header（44px 还给内容，胶囊贴顶）——最简但废弃通知预留契约且胶囊仍独自悬浮，不选；② 只填 header 内容不动胶囊——改动最小但割裂感仍在，不选。\n- **理由:** 一并解决问题②③；胶囊获得结构归属，header 右侧被激活、左区预留契约以更合理形态保留。**挂点契约有意变更**（main 容器右上 → TitleBar 右侧），层叠语义等价换算：TitleBar 无层叠上下文，面板 z70 仍在根上下文参与层叠（>浮窗 z2、<Dialog 100），chip 低于浮窗不变；Esc/点外关（window 级监听 + target 归属守卫）不受影响。问题①随本变更修复（IconRow 横密纵疏 + 上下节奏）。\n\n## 任务\n### Phase 1 挂点迁移\n- [ ] Capsule Wrap 从绝对定位改为 TitleBar flex 子项（`position: relative` + `margin-left: auto`），头注释挂点契约同步 — `components/capsule/Capsule.tsx` — 修改\n- [ ] CapsulePanel Pop 锚点改为贴 Wrap 下缘（`top: calc(100% + 10px); right: 0`），挂点注释同步 — `components/capsule/CapsulePanel.tsx` — 修改\n- [ ] TitleBar 挂入 Capsule（chip 垂直居中、右缘对齐），MainArea 内移除挂载；通知条 aria 语义保留，挂点契约注释迁移 — `app/(shell)/layout.tsx` — 修改\n\n### Phase 2 工具条间距\n- [ ] IconRow 横密纵疏（`column-gap: 2px; row-gap: 6px; padding: 6px 8px`），移除 4px 垫片改 `margin-bottom: 8px` — `components/capsule/sections/EditorSection.tsx` — 修改\n\n### Phase 3 验证与知识\n- [ ] pnpm typecheck + pnpm test 全绿；冒烟测试确认 chip 开合/点外关用例不受挂点迁移影响 — 用户手动验收（面板弹出位置、浮窗/面板层叠、四主题）\n- [ ] 知识卡更新：胶囊挂点契约整段同步（TitleBar 右侧 + 层叠等价换算）、预留通知条段（左区预留/右区胶囊） — `shadow-docs/knowledge/shell-chrome-design.md` — 更新\n\n完整 brief：shadow-docs/changes/20260924-fix-capsule-header-chrome/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-fix-capsule-header-chrome\",\"type\":\"fix\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-fix-capsule-header-chrome/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":69} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 胶囊入 Header：挂点迁移 + 通知条激活 + 编辑器工具条间距修复

## 动机

任务中心上线后真机走查发现三个视觉缺陷：① 模块 tab 编辑器工具条换行后两排图标仅隔 2px（`gap` 横纵共用所致），与「排版设置」行之间也只有 4px 垫片，面板加宽到 420px 后换行点变化使问题显形；② 胶囊 chip 悬浮在 main 容器右上（top:10px），与上方 44px 空通知条割裂，视觉不协调；③ Header（预留通知条）完全空置。②③同源：chip「贴着内容顶」而非「站在 header 里」。用户已确认方向：**胶囊入 Header**（chip 垂直居中挂 TitleBar 右侧、左区保留通知预留位）。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 壳层胶囊挂点契约（main 容器右上常驻、宿主无 z-index、pointer-events 穿透、面板 z70 向下弹出、低于浮窗 z2 高于内容、低于 Dialog 100）；预留通知条段（44px TitleBar 空置，aria-label=通知栏 + aria-live=polite）；浮层点外关 target 归属守卫；胶囊动效属持续状态指示、reduced-motion 静态降级；「Nav 不得 overflow:hidden」与移动挂点必须整段同步的约束
  - 适用 scope: app, components/capsule, shadow-docs/knowledge

## 决策

- **选型:** 方案 A——胶囊挂点从 main 容器右上迁移到 TitleBar（Header）右侧：chip 作为 TitleBar flex 子项垂直居中（`margin-left:auto` 推右），面板贴 chip 下缘（`top: calc(100% + 10px)`）向下弹出；TitleBar 左区保留通知/信息预留位（aria 语义不变）。
- **对比方案:** ① 移除空 header（44px 还给内容，胶囊贴顶）——最简但废弃通知预留契约且胶囊仍独自悬浮，不选；② 只填 header 内容不动胶囊——改动最小但割裂感仍在，不选。
- **理由:** 一并解决问题②③；胶囊获得结构归属，header 右侧被激活、左区预留契约以更合理形态保留。**挂点契约有意变更**（main 容器右上 → TitleBar 右侧），层叠语义等价换算：TitleBar 无层叠上下文，面板 z70 仍在根上下文参与层叠（>浮窗 z2、<Dialog 100），chip 低于浮窗不变；Esc/点外关（window 级监听 + target 归属守卫）不受影响。问题①随本变更修复（IconRow 横密纵疏 + 上下节奏）。

## 任务

### Phase 1 挂点迁移
- [x] Capsule Wrap 从绝对定位改为 TitleBar flex 子项（`position: relative` + `margin-left: auto`），头注释挂点契约同步 — `components/capsule/Capsule.tsx` — 修改
- [x] CapsulePanel Pop 锚点改为贴 Wrap 下缘（`top: calc(100% + 10px); right: 0`），挂点注释同步 — `components/capsule/CapsulePanel.tsx` — 修改
- [x] TitleBar 挂入 Capsule（chip 垂直居中、右缘对齐），MainArea 内移除挂载；通知条 aria 语义保留，挂点契约注释迁移 — `app/(shell)/layout.tsx` — 修改

### Phase 2 工具条间距
- [x] IconRow 横密纵疏（`column-gap: 2px; row-gap: 6px; padding: 6px 8px`），移除 4px 垫片改 `margin-bottom: 8px` — `components/capsule/sections/EditorSection.tsx` — 修改

### Phase 3 验证与知识
- [x] pnpm typecheck + pnpm test 全绿；冒烟测试确认 chip 开合/点外关用例不受挂点迁移影响 — 用户手动验收（面板弹出位置、浮窗/面板层叠、四主题）
- [x] 知识卡更新：胶囊挂点契约整段同步（TitleBar 右侧 + 层叠等价换算）、预留通知条段（左区预留/右区胶囊） — `shadow-docs/knowledge/shell-chrome-design.md` — 更新

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** 挂点契约属契约级变更（知识卡明示「移动挂点或调整层级必须整段同步」）；预留通知条段随 TitleBar 角色变化同步。
