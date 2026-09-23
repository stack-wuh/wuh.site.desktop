---
{
  "schema": "shadow-dev/v1",
  "name": "20260923-feature-capsule-control-center",
  "type": "feature",
  "scope": "capsule",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260923-feature-capsule-control-center",
  "files": [
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel.tsx",
    "components/capsule/modules.tsx",
    "components/capsule/sections/EditorSection.tsx",
    "components/editor/MarkdownEditor.tsx",
    "components/home/HomePage.tsx",
    "lib/editor-commands.ts",
    "lib/editor-export.ts",
    "lib/editor-info.ts",
    "plugins/github-issues",
    "src/main/plugins",
    "src/shared/plugin.ts",
    "tests/plugin-capsule.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 54,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/54",
    "pullRequest": 56,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/56"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "6a97b890c281a3f545b4f66ac86b42b4b84ece15",
    "verifiedAt": "2026-09-23T09:01:53.994Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:56",
    "planHash": "f29c6c0011b89f33c45ae6ebaa8bbc5cf09639366aef1a2c50e145b7b7cd38e9",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 胶囊控制中心化 —— 三区聚合 + capsule 插件贡献点",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n胶囊已常驻（状态信号舱）但只是「任务 + 编辑器入口」的列表面板；渲染开关/查找替换/专注模式/排版设置/导出/快捷键/阅读时长等九项能力没有全局入口，插件聚合也停留在任务上报一种形态。用户定位升级：胶囊是类似 iOS 控制中心的全局组件，所有插件都可在胶囊聚合。本变更把面板重构为三区控制中心（任务 → 编辑器 → 插件），九项功能全部模块化收编，并新增 `capsule` 插件贡献点（github-issues 先行参考）。交互与视觉以已拍板的设计稿为实施规范（design-mockups/20260923-capsule-control-center PART 2/3）。依赖 20260923-feature-cm-live-preview 提供的 toggleRender/findReplace/undo/redo/标题跟随命令，须在其后合入。\n\n## 引用规范\n- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）\n  - 当前结论: 胶囊为壳层复合入口（任务/文档任一存在即显示）；新增插件贡献点必须以真实参考插件需要为准，不预留空抽象；插件能力走白名单 + 权限词表，任务上报为单向上报安全模型；文档操作宿主 EditorCommandHost 壳层单实例\n  - 适用 scope: capsule 贡献点以 github-issues 为真实消费方；数据单向上报 + 宿主白名单模板渲染，插件帧不触 DOM；命令宿主不重复挂载\n- shadow-docs/knowledge/design-system.md（frontend）\n  - 当前结论: 语义 token 体系 + 四主题自动跟随 + font-synthesis none\n  - 适用 scope: 模块卡/开关/图标网格全部 token 化，明暗随 data 属性自动生效\n\n## 决策\n- **选型:** 面板重构为三区控制中心——任务区（现状行式保留 + 状态环图例）、编辑器模块区（文档卡 + 双列 tile + iOS 式开关 + 格式/插入图标网格 + 排版/快捷键二级手风琴 + 导出双卡）、插件模块区（capsule 贡献点 tiles）；模块卡语言：chrome-raised 底 + 12px 圆角 + hover 描边 primary 42% + active 缩放 0.98\n- **对比方案:** (a) 现有列表式继续堆按钮——九项功能塞入后信息密度失控，无法承载插件聚合；(b) 全屏控制中心页——打断编辑心流，违背胶囊轻量挂点定位，否决\n- **理由:** 模块卡「就地生效 + 点击展开二级」平衡密度与轻量；布尔功能用开关语言（on 态取 --success-color），状态与命令通道双向同步；专注模式/大纲跟随为会话态，渲染开关 `wd.editorRenderMode` 与排版设置 `wd.editorTypography` 持久化。贡献点安全模型复用 tasks 单向上报先例：manifest 声明 capsule 模块 → 逻辑帧 SDK 单向上报数据 → 宿主按白名单模板渲染，权限词表新增对应项\n\n## 任务\n### Phase 1 · 控制中心骨架\n- [ ] CapsulePanel 三区重构：任务区迁移 + 编辑器/插件区骨架，模块卡/文档卡/开关基础组件（reduced-motion 降级） — `components/capsule/CapsulePanel.tsx` `components/capsule/modules.tsx` — 重构\n- [ ] 编辑器模块区模块化：文档卡（路径/脏点/字数/阅读时长/保存组）、开关 tile（即时渲染/专注/大纲跟随）、格式+插入图标网格、导出双卡 — `components/capsule/sections/EditorSection.tsx` — 重构\n- [ ] 排版设置/快捷键速查二级手风琴（220ms unfold）；排版三参数（字号/行距/行宽）持久化 wd.editorTypography 并作用于编辑器 surface CSS 变量 — `components/capsule/sections/EditorSection.tsx` `components/editor/MarkdownEditor.tsx` — 新增\n\n### Phase 2 · 新能力\n- [ ] 专注模式：toggleFocus 命令 + HomePage 沉浸态（问候/散点图淡出至 5% 不卸载、面板描边染 primary、Esc/再点退出、Mod-Shift-F） — `components/home/HomePage.tsx` `lib/editor-commands.ts` — 新增\n- [ ] 阅读时长估算（countWords 派生）；大纲跟随开关消费编辑器回推事件高亮当前章节 — `lib/editor-info.ts` `components/capsule/sections/EditorSection.tsx` — 修改\n- [ ] 导出：复制为 HTML（renderService 渲染态）+ 导出 .html/.md 文件 — `lib/editor-export.ts` `components/capsule/sections/EditorSection.tsx` — 新增\n\n### Phase 3 · capsule 插件贡献点\n- [ ] manifest capsule 贡献点类型 + validateManifest 校验（声明模块 id/图标/标题/模板类型） — `src/shared/plugin.ts` — 修改\n- [ ] 主进程注册表 + SDK capsule 上报 API（单向上报、权限词表新项、broker 会话继承） — `src/main/plugins` `src/shared` — 修改\n- [ ] 宿主 CapsulePluginSection 白名单模板渲染（计数卡/状态卡两类起步） — `components/capsule` — 新增\n- [ ] github-issues 参考模块（open 计数/指派给我/点击跳插件视图）+ capsule 契约测试 — `plugins/github-issues` `tests/plugin-capsule.test.ts` — 新增\n\n### Phase 4 · 验证\n- [ ] 全量验证：vitest（含 plugin-*.test）、双侧 tsc、electron-vite build、四主题与 reduced-motion 走查 — — 验证\n\n完整 brief：shadow-docs/changes/20260923-feature-capsule-control-center/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260923-feature-capsule-control-center\",\"type\":\"feature\",\"scope\":\"capsule\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260923-feature-capsule-control-center/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 胶囊控制中心化 —— 三区聚合 + capsule 插件贡献点

## 动机

胶囊已常驻（状态信号舱）但只是「任务 + 编辑器入口」的列表面板；渲染开关/查找替换/专注模式/排版设置/导出/快捷键/阅读时长等九项能力没有全局入口，插件聚合也停留在任务上报一种形态。用户定位升级：胶囊是类似 iOS 控制中心的全局组件，所有插件都可在胶囊聚合。本变更把面板重构为三区控制中心（任务 → 编辑器 → 插件），九项功能全部模块化收编，并新增 `capsule` 插件贡献点（github-issues 先行参考）。交互与视觉以已拍板的设计稿为实施规范（design-mockups/20260923-capsule-control-center PART 2/3）。依赖 20260923-feature-cm-live-preview 提供的 toggleRender/findReplace/undo/redo/标题跟随命令，须在其后合入。

## 引用规范

- apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md（desktop）
  - 当前结论: 胶囊为壳层复合入口（任务/文档任一存在即显示）；新增插件贡献点必须以真实参考插件需要为准，不预留空抽象；插件能力走白名单 + 权限词表，任务上报为单向上报安全模型；文档操作宿主 EditorCommandHost 壳层单实例
  - 适用 scope: capsule 贡献点以 github-issues 为真实消费方；数据单向上报 + 宿主白名单模板渲染，插件帧不触 DOM；命令宿主不重复挂载
- shadow-docs/knowledge/design-system.md（frontend）
  - 当前结论: 语义 token 体系 + 四主题自动跟随 + font-synthesis none
  - 适用 scope: 模块卡/开关/图标网格全部 token 化，明暗随 data 属性自动生效

## 决策

- **选型:** 面板重构为三区控制中心——任务区（现状行式保留 + 状态环图例）、编辑器模块区（文档卡 + 双列 tile + iOS 式开关 + 格式/插入图标网格 + 排版/快捷键二级手风琴 + 导出双卡）、插件模块区（capsule 贡献点 tiles）；模块卡语言：chrome-raised 底 + 12px 圆角 + hover 描边 primary 42% + active 缩放 0.98
- **对比方案:** (a) 现有列表式继续堆按钮——九项功能塞入后信息密度失控，无法承载插件聚合；(b) 全屏控制中心页——打断编辑心流，违背胶囊轻量挂点定位，否决
- **理由:** 模块卡「就地生效 + 点击展开二级」平衡密度与轻量；布尔功能用开关语言（on 态取 --success-color），状态与命令通道双向同步；专注模式/大纲跟随为会话态，渲染开关 `wd.editorRenderMode` 与排版设置 `wd.editorTypography` 持久化。贡献点安全模型复用 tasks 单向上报先例：manifest 声明 capsule 模块 → 逻辑帧 SDK 单向上报数据 → 宿主按白名单模板渲染，权限词表新增对应项

## 任务

### Phase 1 · 控制中心骨架
- [x] CapsulePanel 三区重构：任务区迁移 + 编辑器/插件区骨架，模块卡/文档卡/开关基础组件（reduced-motion 降级） — `components/capsule/CapsulePanel.tsx` `components/capsule/modules.tsx` — 重构
- [x] 编辑器模块区模块化：文档卡（路径/脏点/字数/阅读时长/保存组）、开关 tile（即时渲染/专注/大纲跟随）、格式+插入图标网格、导出双卡 — `components/capsule/sections/EditorSection.tsx` — 重构
- [x] 排版设置/快捷键速查二级手风琴（220ms unfold）；排版三参数（字号/行距/行宽）持久化 wd.editorTypography 并作用于编辑器 surface CSS 变量 — `components/capsule/sections/EditorSection.tsx` `components/editor/MarkdownEditor.tsx` — 新增

### Phase 2 · 新能力
- [x] 专注模式：toggleFocus 命令 + HomePage 沉浸态（问候/散点图淡出至 5% 不卸载、面板描边染 primary、Esc/再点退出、Mod-Shift-F） — `components/home/HomePage.tsx` `lib/editor-commands.ts` — 新增
- [x] 阅读时长估算（countWords 派生）；大纲跟随开关消费编辑器回推事件高亮当前章节 — `lib/editor-info.ts` `components/capsule/sections/EditorSection.tsx` — 修改
- [x] 导出：复制为 HTML（renderService 渲染态）+ 导出 .html/.md 文件 — `lib/editor-export.ts` `components/capsule/sections/EditorSection.tsx` — 新增

### Phase 3 · capsule 插件贡献点
- [x] manifest capsule 贡献点类型 + validateManifest 校验（声明模块 id/图标/标题/模板类型） — `src/shared/plugin.ts` — 修改
- [x] 主进程注册表 + SDK capsule 上报 API（单向上报、权限词表新项、broker 会话继承） — `src/main/plugins` `src/shared` — 修改
- [x] 宿主 CapsulePluginSection 白名单模板渲染（计数卡/状态卡两类起步） — `components/capsule` — 新增
- [x] github-issues 参考模块（open 计数/指派给我/点击跳插件视图）+ capsule 契约测试 — `plugins/github-issues` `tests/plugin-capsule.test.ts` — 新增

### Phase 4 · 验证
- [x] 全量验证：vitest（含 plugin-*.test）、双侧 tsc、electron-vite build、四主题与 reduced-motion 走查 — — 验证

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** apps/desktop/shadow-docs/knowledge/desktop-plugin-architecture.md
- **理由:** 「胶囊复合入口/入口双轨制」段升级为控制中心事实；贡献点首期四类扩为五类（capsule）；与 cm-live-preview 变更同卡合并更新，避免双写冲突
