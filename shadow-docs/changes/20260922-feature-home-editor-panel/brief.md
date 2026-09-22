---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-feature-home-editor-panel",
  "type": "feature",
  "scope": "desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260922-feature-home-editor-panel",
  "files": [
    "components/home/EditorPanel.tsx",
    "components/home/FormatToolbar.tsx",
    "components/home/HomePage.tsx",
    "components/home/PreviewCapsule.tsx",
    "components/home/ProjectSection.tsx",
    "lib/i18n/locales.ts",
    "lib/store.ts",
    "tests/home-editor-panel.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 29,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/29",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "709e1a5d1bd0138cc8a89c18bfb3397e1eabda89",
    "verifiedAt": "2026-09-22T03:26:54.624Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:29",
    "planHash": "796ab8d3867dff20bf9362ff8e4cbe69d006caa71c0f68c93e8878123d4458a2",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 首页编辑器面板：热力图上移 + Claude Code 风格主编辑器",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n首页当前是「项目入口 + 下方热力图」的静态面板，宿主无任何写入 UI（内置编辑器已随两栏布局移除）。写作动线被拆散：写一篇博客要先切项目、再借道插件视图。本次把首页升级为一屏完成「打开 → 编辑 → 预览」的工作台：热力图上移作为节奏总览，主位让给仿 Claude Code 的主编辑器输入框（简化版/全量版两态），文件相关交互（项目切换、文件筛选、保存、实时预览）拆放在输入框上方与下方的固定行，保持输入框本身稳定一致。\n\n## 引用规范\n- shadow-docs/knowledge/desktop-app-architecture.md\n  - 当前结论: desktop UI 颜色只经主题变量暴露；fs/git 操作收敛主进程经 `window.api` 契约；图标走 lucide-react\n  - 适用 scope: apps/desktop\n- shadow-docs/knowledge/desktop-plugin-architecture.md\n  - 当前结论: 「内置编辑器已移除，宿主不再有写入 UI——content 仅经帧协议 doc.set 更新」；插件 documentHooks 监听 store 的 open/save/changed/closed 事件\n  - 适用 scope: apps/desktop\n- shadow-docs/knowledge/design-system.md\n  - 当前结论: 新组件先确认 `components/ui` 是否已有可复用实现（Input/Button/Dialog/Empty 等）\n  - 适用 scope: apps/desktop\n\n## 决策\n- **选型:** 方案 A——宿主首页内嵌编辑器面板（EditorPanel），复用 workspaceStore 保存链路与 preview-markdown 浮窗实时渲染\n- **对比方案:** 方案 B（编辑器做成官方插件 main 视图）——符合「编辑核心+插件」组织但首页与编辑器分离、iframe 内工具栏/胶囊交互受限；方案 C（首页轻输入框 + 独立全量编辑页）——两处编辑态同步复杂，与「输入框就是主编辑器」不符\n- **理由:** 需求核心是首页一屏完成写作闭环；`store.setContent/saveActive` 与 documentHooks 广播链路现成，preview 插件零改动即可实时渲染；工具栏为纯前端插入逻辑，无新增主进程面与插件协议改动。宿主重新持有写入 UI 是对「内置编辑器已移除」结论的需求级演进，归档时更新该卡片。\n- **待确认点:** desktop-plugin-architecture.md 当前结论与本变更方向相反，属需求驱动的结论演进（非代码事实冲突）；若实现中发现与插件 doc 服务存在写冲突，回到方案讨论再继续。\n\n## 任务\n### Phase 1 首页骨架与编辑器面板\n- [ ] HomePage 布局重构：热力图卡片上移至问候语之下、编辑器面板之上 — components/home/HomePage.tsx\n- [ ] EditorPanel 骨架：上方上下文行（项目/文件筛选 + 模式切换）、中央自动增高主输入框（placeholder、聚焦态）、下方动作行，样式全走主题变量 — components/home/EditorPanel.tsx\n- [ ] editor.* 三语文案（中/英/日）补齐 — lib/i18n/locales.ts\n\n### Phase 2 文件链路\n- [ ] ProjectSection 改造：打开本地目录 / clone / 最近项目收进上下文行项目菜单 — components/home/ProjectSection.tsx\n- [ ] 文件筛选：readTree 过滤 .md + 关键字过滤，选中经 readFile 载入（store 新增 openDoc：activePath/content/saved 赋值 + doc.opened 广播） — components/home/ProjectSection.tsx, lib/store.ts\n- [ ] 保存链路：saveActive 写盘 + dirty/保存态展示；新草稿保存时命名落盘（writeFile，复用 Dialog） — components/home/EditorPanel.tsx\n\n### Phase 3 全量版与预览胶囊\n- [ ] Markdown 插入工具栏：标题/加粗/斜体/列表/引用/代码/链接，光标处插入或包裹选区（仅全量版显示） — components/home/FormatToolbar.tsx\n- [ ] 简化/全量模式切换 + localStorage 偏好持久化 — components/home/EditorPanel.tsx\n- [ ] 预览胶囊：简化版且有内容时出现，提醒可实时预览，点击经 toggleFloat 唤起 preview-markdown 浮窗 — components/home/PreviewCapsule.tsx\n- [ ] vitest 测试 + 双侧 tsc + electron-vite build 回归 — tests/home-editor-panel.test.ts\n\n完整 brief：shadow-docs/changes/20260922-feature-home-editor-panel/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-feature-home-editor-panel\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-feature-home-editor-panel/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 首页编辑器面板：热力图上移 + Claude Code 风格主编辑器

## 动机

首页当前是「项目入口 + 下方热力图」的静态面板，宿主无任何写入 UI（内置编辑器已随两栏布局移除）。写作动线被拆散：写一篇博客要先切项目、再借道插件视图。本次把首页升级为一屏完成「打开 → 编辑 → 预览」的工作台：热力图上移作为节奏总览，主位让给仿 Claude Code 的主编辑器输入框（简化版/全量版两态），文件相关交互（项目切换、文件筛选、保存、实时预览）拆放在输入框上方与下方的固定行，保持输入框本身稳定一致。

## 引用规范

- shadow-docs/knowledge/desktop-app-architecture.md
  - 当前结论: desktop UI 颜色只经主题变量暴露；fs/git 操作收敛主进程经 `window.api` 契约；图标走 lucide-react
  - 适用 scope: apps/desktop
- shadow-docs/knowledge/desktop-plugin-architecture.md
  - 当前结论: 「内置编辑器已移除，宿主不再有写入 UI——content 仅经帧协议 doc.set 更新」；插件 documentHooks 监听 store 的 open/save/changed/closed 事件
  - 适用 scope: apps/desktop
- shadow-docs/knowledge/design-system.md
  - 当前结论: 新组件先确认 `components/ui` 是否已有可复用实现（Input/Button/Dialog/Empty 等）
  - 适用 scope: apps/desktop

## 决策

- **选型:** 方案 A——宿主首页内嵌编辑器面板（EditorPanel），复用 workspaceStore 保存链路与 preview-markdown 浮窗实时渲染
- **对比方案:** 方案 B（编辑器做成官方插件 main 视图）——符合「编辑核心+插件」组织但首页与编辑器分离、iframe 内工具栏/胶囊交互受限；方案 C（首页轻输入框 + 独立全量编辑页）——两处编辑态同步复杂，与「输入框就是主编辑器」不符
- **理由:** 需求核心是首页一屏完成写作闭环；`store.setContent/saveActive` 与 documentHooks 广播链路现成，preview 插件零改动即可实时渲染；工具栏为纯前端插入逻辑，无新增主进程面与插件协议改动。宿主重新持有写入 UI 是对「内置编辑器已移除」结论的需求级演进，归档时更新该卡片。
- **待确认点:** desktop-plugin-architecture.md 当前结论与本变更方向相反，属需求驱动的结论演进（非代码事实冲突）；若实现中发现与插件 doc 服务存在写冲突，回到方案讨论再继续。

## 任务

### Phase 1 首页骨架与编辑器面板
- [x] HomePage 布局重构：热力图卡片上移至问候语之下、编辑器面板之上 — components/home/HomePage.tsx
- [x] EditorPanel 骨架：上方上下文行（项目/文件筛选 + 模式切换）、中央自动增高主输入框（placeholder、聚焦态）、下方动作行，样式全走主题变量 — components/home/EditorPanel.tsx
- [x] editor.* 三语文案（中/英/日）补齐 — lib/i18n/locales.ts

### Phase 2 文件链路
- [x] ProjectSection 改造：打开本地目录 / clone / 最近项目收进上下文行项目菜单 — components/home/ProjectSection.tsx
- [x] 文件筛选：readTree 过滤 .md + 关键字过滤，选中经 readFile 载入（store 新增 openDoc：activePath/content/saved 赋值 + doc.opened 广播） — components/home/ProjectSection.tsx, lib/store.ts
- [x] 保存链路：saveActive 写盘 + dirty/保存态展示；新草稿保存时命名落盘（writeFile，复用 Dialog） — components/home/EditorPanel.tsx

### Phase 3 全量版与预览胶囊
- [x] Markdown 插入工具栏：标题/加粗/斜体/列表/引用/代码/链接，光标处插入或包裹选区（仅全量版显示） — components/home/FormatToolbar.tsx
- [x] 简化/全量模式切换 + localStorage 偏好持久化 — components/home/EditorPanel.tsx
- [x] 预览胶囊：简化版且有内容时出现，提醒可实时预览，点击经 toggleFloat 唤起 preview-markdown 浮窗 — components/home/PreviewCapsule.tsx
- [x] vitest 测试 + 双侧 tsc + electron-vite build 回归 — tests/home-editor-panel.test.ts

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/desktop-plugin-architecture.md（「内置编辑器已移除，content 仅经帧协议 doc.set 更新」→ 宿主首页重新持有主编辑器写入 UI，content 双通道：宿主输入框直写 workspaceStore + 插件帧 doc.set 并存）；shadow-docs/knowledge/desktop-app-architecture.md 视实现微调
- **理由:** 宿主写入 UI 回归属结论级变化，归档时必须回写卡片，避免后续方案依据过期结论
