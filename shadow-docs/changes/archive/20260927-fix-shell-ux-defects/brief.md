---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-fix-shell-ux-defects",
  "type": "fix",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "fix/20260927-fix-shell-ux-defects",
  "files": [
    "app/(shell)/editor/page.tsx",
    "components/FloatLayer/FloatWindow.tsx",
    "components/FloatLayer/index.tsx",
    "components/SideMenu/index.tsx",
    "components/SideMenu/styles.ts",
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel/TaskTimeline.tsx",
    "components/capsule/CapsulePanel/styles.ts",
    "components/capsule/modules.tsx",
    "components/capsule/sections/EditorSection/index.tsx",
    "components/capsule/sections/EditorSection/styles.ts",
    "components/home/EditorPanel/styles.ts",
    "components/home/Heatmap.tsx",
    "components/plugins/PluginMainView.tsx",
    "components/ui/Button.tsx",
    "lib/floats.ts",
    "lib/i18n/locales.ts",
    "src/main/splash.html",
    "tests/sidemenu-bottom.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 122,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/122",
    "pullRequest": 130,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/130"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "51238e2fc68ccd9aa3247e7da51fd2485c20d64b",
    "verifiedAt": "2026-09-27T09:34:51.199Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:130",
    "planHash": "cdf52d7f499f97f5ef740fa5f5a6214663002efdaddad14bc76b06a4e4b2321b",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 壳层交互缺陷批修：侧栏对齐回归·splash 动效·Esc 与 z-index 层级·视觉 bug·i18n 泄漏",
      "titleRaw": "[fix] 壳层交互缺陷批修：侧栏对齐回归·splash 动效·Esc 与 z-index 层级·视觉 bug·i18n 泄漏",
      "supplement": "# 动机\n\n全壳层 UI 走查确认多项用户可直接感知的缺陷，一个 fix 批次收口：\n\n- 展开态设置行被居中（consolidation 合入引入的回归）：`PopAnchor` 无条件 `justify-content:center`\n- 启动 splash 纯静态 Logo，零 Loading 动效\n- 胶囊面板与浮窗层同监听 window Esc，一次按键双关\n- 浮窗 z-index 无上界递增，最终压过 Toast/Dialog\n- CapsulePanel 进度条全仓唯一 `transition: width`（违反「禁 width 过渡」约束）\n- 胶囊文档卡路径 truncate 类挂错位置，截断失效\n- 首页 GhostButton 恒定 opacity 0.45 与 disabled 撞值；保存按钮无 busy 态\n- 5 处硬编码中文绕过 i18n（任务行/浮窗/热力图/插件兜底页），英日环境泄漏\n\n# 引用规范\n\n- shadow-docs/knowledge/shell-chrome-design.md（SideMenu 底部两项制；品牌三方互锚；禁 width 过渡；z-index 既有层 60/70/90/100）\n- shadow-docs/knowledge/renderer-shell-routing.md（壳层两栏布局；组件目录化组织）\n\n# 决策\n\n- 单一 fix change 分 5 Phase：SideMenu 底部 / splash 动效 / 层级与事件 bug / 视觉 bug / i18n 泄漏\n- 收起旋钮采用 hover/focus 才显形降噪而非移除；Esc 分治采用面板侧优先消费；z-index 固定分带 clamp\n- 非目标：tooltip 双轨治理、分栏拖拽、视觉栅格整顿（归 style 批）\n\n# 任务\n\n1. Phase 1 SideMenu 底部：PopAnchor $expanded 拉伸通栏 + 旋钮 hover 显形 + 组件测试\n2. Phase 2 splash：纯 CSS 描边生长 + accent 呼吸动效，reduced-motion 降级，不改 SVG 结构\n3. Phase 3 Esc 分治、浮窗 z-index clamp、进度条 scaleX 化\n4. Phase 4 文档卡截断修复 + GhostButton/-disabled 区分 + 保存 busy 态\n5. Phase 5 硬编码中文迁入 locales 三语\n\n完整 brief：shadow-docs/changes/20260927-fix-shell-ux-defects/brief.md",
      "body": "## 动机\n2026-09-27 全壳层 UI 走查（用户发起「UI 设计大师」对话）确认多项用户可直接感知的缺陷：20260925-feature-sidemenu-settings-consolidation 合入引入展开态设置行被居中的回归；启动 splash 为纯静态 Logo 零 Loading 动效；胶囊面板与浮窗层同时监听 window Esc 导致一次按键双关；浮窗 z-index 无上界递增最终压过 Toast/Dialog；CapsulePanel 进度条是全仓唯一 width 过渡（违反「布局切换瞬时、禁 width 过渡」项目约束）；胶囊文档卡路径 truncate 类挂错位置截断失效；首页 GhostButton 恒定 opacity 0.45 与 Button disabled 撞值；另有 5 处硬编码中文在英/日环境泄漏。全部有 file:line 证据，一个 fix 批次收口。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: SideMenu 底部两项制（用户上/设置下）；品牌 SVG 与 splash/icon.svg 三方互锚（改任一处必须同步）；布局切换瞬时（禁 width 过渡）；styled-components 走 var(--token)；z-index 序 60 tooltip / 70 面板 / 90 Toast / 100 Dialog\n  - 适用 scope: components, src/main, lib\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 壳层两栏布局与页面族组织；组件目录化后文件结构\n  - 适用 scope: app, components\n\n## 决策\n- **选型:** 单一 fix change 分 5 个 Phase 收口；每项独立可验、互不依赖；收起旋钮采用「hover/focus 才显形」降噪而非移除（保留鼠标收起入口，⌘B 仍是键盘路径）\n- **对比方案:** 拆多个微型 change（流程开销大于收益，缺陷同属「壳层打磨」主题）；只修用户点名 3 项（走查已确认的同源 bug 一并存在，放掉浪费走查结论）\n- **理由:** 全部缺陷修法明确、不引入新设计体系；Esc 分治采用面板侧优先消费、浮窗侧让位的最小改动；z-index 用固定分带 clamp 而非全局 z 量表重构（后者归入后续 style 批）\n- **非目标:** tooltip 双轨治理、分栏拖拽、视觉栅格整顿（归 20260927-style 批）\n\n## 任务\n### Phase 1 SideMenu 底部（对齐回归 + 收起旋钮降噪）\n- [ ] PopAnchor 增加 $expanded 分支：展开态条目拉伸通栏（与导航行同栅格、hover 盖满行），收起态保持图标居中 — `components/SideMenu/styles.ts` `components/SideMenu/index.tsx`\n- [ ] 收起旋钮去噪：默认 transparent，hover/focus-visible 显形 — `components/SideMenu/styles.ts`\n- [ ] 组件测试：展开态设置行与导航行同宽、旋钮显形类切换 — `tests/sidemenu-bottom.test.tsx`\n### Phase 2 Splash Loading 动效\n- [ ] 纯 CSS 动效：W 描边 stroke-dasharray/offset 生长 + accent 块 opacity 呼吸循环；prefers-reduced-motion 降级静态；不改 SVG 结构（不触发品牌三方同步）、保持零脚本与 CSP 合规 — `src/main/splash.html`\n### Phase 3 层级与事件 bug\n- [ ] Esc 分治：胶囊面板 open 时消费 Esc 并阻止同次 keystroke 到达 FloatLayer — `components/capsule/Capsule.tsx` `components/FloatLayer/index.tsx`\n- [ ] 浮窗 z-index 收敛固定带（clamp 上限，不侵入 60/70/90/100 既有层） — `lib/floats.ts` `components/FloatLayer/FloatWindow.tsx`\n- [ ] HeadBar 进度条 width 过渡改 transform: scaleX(ratio) — `components/capsule/CapsulePanel/styles.ts`\n### Phase 4 视觉 bug\n- [ ] 文档卡路径截断修复：truncate 语义落到 ModuleHead 行内 span（styles 原子化），顺带删除未消费死代码 DocChip/DocPath/DirtyDot — `components/capsule/modules.tsx` `components/capsule/sections/EditorSection/index.tsx` `components/capsule/sections/EditorSection/styles.ts`\n- [ ] GhostButton 恒定 opacity 0.45 改为正常态（降灰语义只保留给 disabled） — `components/home/EditorPanel/styles.ts`\n- [ ] Button disabled 与可用态视觉可区分（0.45 透明度 + cursor 语义梳理） — `components/ui/Button.tsx`\n- [ ] 保存按钮 busy 态：保存期间 disabled，完成后轻量成功反馈（复用 feedback 体系） — `app/(shell)/editor/page.tsx`\n### Phase 5 i18n 泄漏\n- [ ] 硬编码中文迁入 locales 三语：任务行「查看 ›」、浮窗最小化/关闭/chip 还原/toolbar aria、SwitchCard hint、PluginMainView 兜底、热力图分类标签/tooltip 日期/图例 — `components/capsule/CapsulePanel/TaskTimeline.tsx` `components/FloatLayer/FloatWindow.tsx` `components/FloatLayer/index.tsx` `components/capsule/sections/EditorSection/index.tsx` `components/plugins/PluginMainView.tsx` `components/home/Heatmap.tsx` `lib/i18n/locales.ts`\n\n## 补充\n# 动机\n\n全壳层 UI 走查确认多项用户可直接感知的缺陷，一个 fix 批次收口：\n\n- 展开态设置行被居中（consolidation 合入引入的回归）：`PopAnchor` 无条件 `justify-content:center`\n- 启动 splash 纯静态 Logo，零 Loading 动效\n- 胶囊面板与浮窗层同监听 window Esc，一次按键双关\n- 浮窗 z-index 无上界递增，最终压过 Toast/Dialog\n- CapsulePanel 进度条全仓唯一 `transition: width`（违反「禁 width 过渡」约束）\n- 胶囊文档卡路径 truncate 类挂错位置，截断失效\n- 首页 GhostButton 恒定 opacity 0.45 与 disabled 撞值；保存按钮无 busy 态\n- 5 处硬编码中文绕过 i18n（任务行/浮窗/热力图/插件兜底页），英日环境泄漏\n\n# 引用规范\n\n- shadow-docs/knowledge/shell-chrome-design.md（SideMenu 底部两项制；品牌三方互锚；禁 width 过渡；z-index 既有层 60/70/90/100）\n- shadow-docs/knowledge/renderer-shell-routing.md（壳层两栏布局；组件目录化组织）\n\n# 决策\n\n- 单一 fix change 分 5 Phase：SideMenu 底部 / splash 动效 / 层级与事件 bug / 视觉 bug / i18n 泄漏\n- 收起旋钮采用 hover/focus 才显形降噪而非移除；Esc 分治采用面板侧优先消费；z-index 固定分带 clamp\n- 非目标：tooltip 双轨治理、分栏拖拽、视觉栅格整顿（归 style 批）\n\n# 任务\n\n1. Phase 1 SideMenu 底部：PopAnchor $expanded 拉伸通栏 + 旋钮 hover 显形 + 组件测试\n2. Phase 2 splash：纯 CSS 描边生长 + accent 呼吸动效，reduced-motion 降级，不改 SVG 结构\n3. Phase 3 Esc 分治、浮窗 z-index clamp、进度条 scaleX 化\n4. Phase 4 文档卡截断修复 + GhostButton/-disabled 区分 + 保存 busy 态\n5. Phase 5 硬编码中文迁入 locales 三语\n\n完整 brief：shadow-docs/changes/20260927-fix-shell-ux-defects/brief.md\n\n完整 brief：shadow-docs/changes/20260927-fix-shell-ux-defects/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-fix-shell-ux-defects\",\"type\":\"fix\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-fix-shell-ux-defects/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    },
    "commit": {
      "files": [
        "app/(shell)/editor/page.tsx",
        "components/FloatLayer/FloatWindow.tsx",
        "components/FloatLayer/index.tsx",
        "components/SideMenu/index.tsx",
        "components/SideMenu/styles.ts",
        "components/capsule/CapsulePanel/TaskTimeline.tsx",
        "components/capsule/CapsulePanel/index.tsx",
        "components/capsule/CapsulePanel/styles.ts",
        "components/capsule/modules.tsx",
        "components/capsule/sections/EditorSection/index.tsx",
        "components/capsule/sections/EditorSection/styles.ts",
        "components/home/EditorPanel/styles.ts",
        "components/home/Heatmap.tsx",
        "components/plugins/PluginMainView.tsx",
        "components/ui/Button.tsx",
        "lib/floats.ts",
        "lib/i18n/locales.ts",
        "shadow-docs/changes/20260927-fix-shell-ux-defects/brief.md",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "src/main/splash.html",
        "tests/sidemenu-bottom.test.tsx"
      ],
      "message": "fix(shell): 壳层交互缺陷批修——SideMenu 展开态设置行通栏对齐(修 PopAnchor 居中回归)+收起旋钮 ghost 降噪、splash 描边生长+accent 呼吸动效(纯 CSS/reduced-motion 降级)、Esc 面板浮窗分治、浮窗 z 渲染层钳制≤58、进度条 scaleX 化(清禁 width 过渡违例)、文档卡路径真截断+死样式清理、GhostButton 与 disabled 解撞+保存 busy 反馈、硬编码中文迁三语 22 键（Closes #122）"
    }
  },
  "knowledge": null
}
---

# 壳层交互缺陷批修：SideMenu 对齐回归 · splash 动效 · Esc/z-index 层级 · 视觉 bug · i18n 泄漏

## 动机
2026-09-27 全壳层 UI 走查（用户发起「UI 设计大师」对话）确认多项用户可直接感知的缺陷：20260925-feature-sidemenu-settings-consolidation 合入引入展开态设置行被居中的回归；启动 splash 为纯静态 Logo 零 Loading 动效；胶囊面板与浮窗层同时监听 window Esc 导致一次按键双关；浮窗 z-index 无上界递增最终压过 Toast/Dialog；CapsulePanel 进度条是全仓唯一 width 过渡（违反「布局切换瞬时、禁 width 过渡」项目约束）；胶囊文档卡路径 truncate 类挂错位置截断失效；首页 GhostButton 恒定 opacity 0.45 与 Button disabled 撞值；另有 5 处硬编码中文在英/日环境泄漏。全部有 file:line 证据，一个 fix 批次收口。

## 引用规范
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: SideMenu 底部两项制（用户上/设置下）；品牌 SVG 与 splash/icon.svg 三方互锚（改任一处必须同步）；布局切换瞬时（禁 width 过渡）；styled-components 走 var(--token)；z-index 序 60 tooltip / 70 面板 / 90 Toast / 100 Dialog
  - 适用 scope: components, src/main, lib
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 壳层两栏布局与页面族组织；组件目录化后文件结构
  - 适用 scope: app, components

## 决策
- **选型:** 单一 fix change 分 5 个 Phase 收口；每项独立可验、互不依赖；收起旋钮采用「hover/focus 才显形」降噪而非移除（保留鼠标收起入口，⌘B 仍是键盘路径）
- **对比方案:** 拆多个微型 change（流程开销大于收益，缺陷同属「壳层打磨」主题）；只修用户点名 3 项（走查已确认的同源 bug 一并存在，放掉浪费走查结论）
- **理由:** 全部缺陷修法明确、不引入新设计体系；Esc 分治采用面板侧优先消费、浮窗侧让位的最小改动；z-index 用固定分带 clamp 而非全局 z 量表重构（后者归入后续 style 批）
- **非目标:** tooltip 双轨治理、分栏拖拽、视觉栅格整顿（归 20260927-style 批）

## 任务
### Phase 1 SideMenu 底部（对齐回归 + 收起旋钮降噪）
- [x] PopAnchor 增加 $expanded 分支：展开态条目拉伸通栏（与导航行同栅格、hover 盖满行），收起态保持图标居中 — `components/SideMenu/styles.ts` `components/SideMenu/index.tsx`
- [x] 收起旋钮去噪：默认 transparent，hover/focus-visible 显形 — `components/SideMenu/styles.ts`
- [x] 组件测试：展开态设置行与导航行同宽、旋钮显形类切换 — `tests/sidemenu-bottom.test.tsx`
### Phase 2 Splash Loading 动效
- [x] 纯 CSS 动效：W 描边 stroke-dasharray/offset 生长 + accent 块 opacity 呼吸循环；prefers-reduced-motion 降级静态；不改 SVG 结构（不触发品牌三方同步）、保持零脚本与 CSP 合规 — `src/main/splash.html`
### Phase 3 层级与事件 bug
- [x] Esc 分治：胶囊面板 open 时消费 Esc 并阻止同次 keystroke 到达 FloatLayer — `components/capsule/Capsule.tsx` `components/FloatLayer/index.tsx`
- [x] 浮窗 z-index 收敛固定带（clamp 上限，不侵入 60/70/90/100 既有层） — `lib/floats.ts` `components/FloatLayer/FloatWindow.tsx`
- [x] HeadBar 进度条 width 过渡改 transform: scaleX(ratio) — `components/capsule/CapsulePanel/styles.ts`
### Phase 4 视觉 bug
- [x] 文档卡路径截断修复：truncate 语义落到 ModuleHead 行内 span（styles 原子化），顺带删除未消费死代码 DocChip/DocPath/DirtyDot — `components/capsule/modules.tsx` `components/capsule/sections/EditorSection/index.tsx` `components/capsule/sections/EditorSection/styles.ts`
- [x] GhostButton 恒定 opacity 0.45 改为正常态（降灰语义只保留给 disabled） — `components/home/EditorPanel/styles.ts`
- [x] Button disabled 与可用态视觉可区分（0.45 透明度 + cursor 语义梳理） — `components/ui/Button.tsx`
- [x] 保存按钮 busy 态：保存期间 disabled，完成后轻量成功反馈（复用 feedback 体系） — `app/(shell)/editor/page.tsx`
### Phase 5 i18n 泄漏
- [x] 硬编码中文迁入 locales 三语：任务行「查看 ›」、浮窗最小化/关闭/chip 还原/toolbar aria、SwitchCard hint、PluginMainView 兜底、热力图分类标签/tooltip 日期/图例 — `components/capsule/CapsulePanel/TaskTimeline.tsx` `components/FloatLayer/FloatWindow.tsx` `components/FloatLayer/index.tsx` `components/capsule/sections/EditorSection/index.tsx` `components/plugins/PluginMainView.tsx` `components/home/Heatmap.tsx` `lib/i18n/locales.ts`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** SideMenu 底部展开态对齐规范、浮窗 z-index 分带上限、splash 动效与 reduced-motion 约束均属该卡范围；完成后更新对应段落并盖 verified 戳
