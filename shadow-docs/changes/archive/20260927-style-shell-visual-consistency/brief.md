---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-style-shell-visual-consistency",
  "type": "style",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "style/20260927-style-shell-visual-consistency",
  "files": [
    "app/(shell)/drafts/DraftsPage.tsx",
    "app/(shell)/drafts/styles.ts",
    "app/(shell)/editor/page.tsx",
    "app/(shell)/projects/ProjectsPage.tsx",
    "app/(shell)/projects/styles.ts",
    "components/FloatLayer/styles.ts",
    "components/StatusBar.tsx",
    "components/account/AccountPage/index.tsx",
    "components/account/AccountPage/styles.tsx",
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel/TaskTimeline.tsx",
    "components/capsule/CapsulePanel/styles.ts",
    "components/capsule/modules.tsx",
    "components/capsule/sections/EditorSection/index.tsx",
    "components/capsule/sections/EditorSection/styles.ts",
    "components/capsule/sections/EditorSection/FormatGrid.tsx",
    "components/home/HomePage.tsx",
    "components/settings/SettingsPage.tsx",
    "components/ui/Button.tsx",
    "components/ui/Empty.tsx",
    "components/ui/PageTopbar.tsx",
    "components/workspace/PickerShell.tsx",
    "lib/i18n/locales.ts",
    "tests/page-topbar.test.tsx",
    "tests/drafts-render.test.tsx",
    "tests/projects-render.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 123,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/123",
    "pullRequest": 131,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/131"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "35d1468749d31c9452611e04e987537c02246d50",
    "verifiedAt": "2026-09-27T15:11:04.998Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:131",
    "planHash": "ae3c1a26d763e7f1fb3b5ef3fe82bb363c87cd1149be31edd624df280af35216",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[style] 壳层视觉一致性整顿：页头统一与吸顶跟进·栅格收敛·空态/焦点/溢出治理",
      "titleRaw": "[style] 壳层视觉一致性整顿：页头统一与吸顶跟进·栅格收敛·空态/焦点/溢出治理",
      "supplement": "# 动机\n\n全壳层走查发现页面族视觉语言不成体系：\n\n- 四种页头规格并存（PageTopbar 18px / editor 12px mono 有底线 / drafts·projects h1 20px / home 22px）\n- 五种内容宽度（760/860/900/920+720）与三种底部留白（32/40/48）\n- 草稿/项目页页头吸顶同病未跟进（页头+搜索框随长列表滚走）\n- 空态三套实现（共享 Empty vs 两页手写）\n- 键盘焦点三种视觉，Button 基类无 focus-visible，大纲 OutlineItem 键盘不可达\n- StatusBar 与胶囊面板 tab 无溢出防护（左区挤飞右区、ja 长标题出横向滚动）\n\n# 引用规范\n\n- shadow-docs/knowledge/renderer-shell-routing.md（页头吸顶范式 settings/account 已落地，扩展至 drafts/projects）\n- shadow-docs/knowledge/shell-chrome-design.md（token 圆角/字号 scale）\n\n# 决策\n\n- PageTopbar 扩展 actions 插槽作为唯一页头原语；drafts/projects 迁移吸顶范式；editor TopBar 规格对齐\n- 内容宽度收敛两档（760 表单/编辑、900 列表/首页），底距统一 48/40\n- 空态统一共享 Empty；focus-visible 统一 outline 2px primary；溢出防护补齐；散值圆角/字号收敛 token\n- 非目标：tooltip 双轨治理、分栏拖拽、胶囊面板 gutter 逐像素重排\n\n# 任务\n\n1. Phase 1 PageTopbar actions 插槽 + drafts/projects 吸顶迁移 + editor 对齐 + 测试更新\n2. Phase 2 栅格收敛（宽度两档、底距统一）\n3. Phase 3 drafts/projects 空态迁移共享 Empty\n4. Phase 4 Button focus-visible + 自绘焦点统一 + OutlineItem 键盘可达\n5. Phase 5 StatusBar/Tab/Capsule Label 溢出防护\n6. Phase 6 圆角/字号/脏点 token 收敛\n\n完整 brief：shadow-docs/changes/20260927-style-shell-visual-consistency/brief.md",
      "body": "## 动机\n2026-09-27 全壳层走查发现页面族视觉语言不成体系：四种页头规格并存（PageTopbar 18px 无底线 / editor 12px mono 有底线 arrow-left / drafts·projects h1 20px 滚动流内 / home 22px）；五种内容宽度（760/860/900/920+内720）与三种底部留白（32/40/48）；草稿/项目页页头吸顶同病未跟进（页头+搜索框随长列表滚走）；空态三套实现（共享 Empty vs 两页手写）；键盘焦点三种视觉（box-shadow 光环 / outline 描边 / Button 基类无 focus-visible）且大纲 OutlineItem 键盘不可达；状态栏与胶囊面板 tab 无溢出防护（左区挤飞右区、ja 长标题出横向滚动）。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 页头吸顶范式（settings/account 已落地：flex 列根 + PageTopbar 滚动流外 + 内容 ScrollArea）；组件目录化文件组织\n  - 适用 scope: app, components\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: styled-components 走 var(--token)；圆角 scale 2/4/8/12/16、字号 scale 12/13/15/17/22…\n  - 适用 scope: components, lib\n\n## 决策\n- **选型:** 以 PageTopbar 为唯一页头原语（扩展 actions 插槽），drafts/projects/editor 迁移，drafts/projects 落吸顶范式；内容宽度收敛两档（760 表单/编辑、900 列表/首页）底距统一 48/40；空态统一共享 Empty；focus-visible 统一 outline 2px primary；溢出防护补齐 StatusBar/Tab/Capsule Label；散值圆角/字号收敛 token scale\n- **对比方案:** 各页继续自绘（割裂持续扩大）；新建高阶 PageShell 一次性收编（改造面过大、回归风险高，本轮不做）；只统一页头不动吸顶（同病放掉违背走查初衷）\n- **理由:** 全部沿用 settings/account 已验证范式，零新发明；宽度两档覆盖现有全部场景；吸顶实现直接复制 #100 范式\n- **非目标:** tooltip 双轨治理、分栏拖拽分割条、胶囊面板 gutter 逐像素重排（另立 change）\n\n## 任务\n### Phase 1 页头原语与吸顶\n- [ ] PageTopbar 扩展 actions 插槽（右侧动作区），保持既有 API 向后兼容 — `components/ui/PageTopbar.tsx`\n- [ ] drafts 页迁移 PageTopbar + ScrollArea 吸顶范式（页头与搜索/筛选区滚定） — `app/(shell)/drafts/DraftsPage.tsx` `app/(shell)/drafts/styles.ts`\n- [ ] projects 页同上（页头含「打开目录」动作入 actions 插槽） — `app/(shell)/projects/ProjectsPage.tsx` `app/(shell)/projects/styles.ts`\n- [ ] editor TopBar 规格对齐：返回图标统一 IconChevronLeft sm、左右栅格对齐 32px 栅格 — `app/(shell)/editor/page.tsx`\n- [ ] 更新 PageTopbar 组件测试（actions 插槽渲染） — `tests/page-topbar.test.tsx`\n### Phase 2 栅格收敛\n- [ ] 内容宽度收敛两档（表单/编辑 760，列表/首页 900）、页面底距统一 48（移动 40） — `components/settings/SettingsPage.tsx` `components/account/AccountPage/styles.tsx` `app/(shell)/drafts/styles.ts` `app/(shell)/projects/styles.ts` `components/home/HomePage.tsx`\n### Phase 3 空态统一\n- [ ] drafts/projects 手写空态迁移共享 Empty 原子（引导句保留进 hint） — `app/(shell)/drafts/DraftsPage.tsx` `app/(shell)/projects/ProjectsPage.tsx` `components/ui/Empty.tsx`\n### Phase 4 焦点与可达性\n- [ ] Button 基类补 focus-visible（outline 2px primary offset -2px） — `components/ui/Button.tsx`\n- [ ] drafts/projects/Picker 自绘焦点统一 outline 规范 — `app/(shell)/drafts/styles.ts` `app/(shell)/projects/styles.ts` `components/workspace/PickerShell.tsx`\n- [ ] OutlineItem 由带 onClick 的 li 改 button（键盘可达 + focus-visible） — `components/capsule/sections/EditorSection/index.tsx` `components/capsule/sections/EditorSection/styles.ts`\n### Phase 5 溢出防护\n- [ ] StatusBar 左区收缩策略（min-width:0 + ellipsis，右区不被挤飞） — `components/StatusBar.tsx`\n- [ ] CapsulePanel Tab ellipsis + max-width、Capsule Label 溢出防护 — `components/capsule/CapsulePanel/styles.ts` `components/capsule/Capsule.tsx`\n### Phase 6 token 收敛\n- [ ] 圆角散值（5/7/13/14px）归位 token scale；9~13px 九档自制字号收敛（半 px 值清零）；脏点统一 6px — `components/capsule/modules.tsx` `components/capsule/CapsulePanel/TaskTimeline.tsx` `components/capsule/sections/EditorSection/styles.ts` `components/FloatLayer/styles.ts` `app/(shell)/drafts/styles.ts` `app/(shell)/projects/styles.ts`\n\n## 补充\n# 动机\n\n全壳层走查发现页面族视觉语言不成体系：\n\n- 四种页头规格并存（PageTopbar 18px / editor 12px mono 有底线 / drafts·projects h1 20px / home 22px）\n- 五种内容宽度（760/860/900/920+720）与三种底部留白（32/40/48）\n- 草稿/项目页页头吸顶同病未跟进（页头+搜索框随长列表滚走）\n- 空态三套实现（共享 Empty vs 两页手写）\n- 键盘焦点三种视觉，Button 基类无 focus-visible，大纲 OutlineItem 键盘不可达\n- StatusBar 与胶囊面板 tab 无溢出防护（左区挤飞右区、ja 长标题出横向滚动）\n\n# 引用规范\n\n- shadow-docs/knowledge/renderer-shell-routing.md（页头吸顶范式 settings/account 已落地，扩展至 drafts/projects）\n- shadow-docs/knowledge/shell-chrome-design.md（token 圆角/字号 scale）\n\n# 决策\n\n- PageTopbar 扩展 actions 插槽作为唯一页头原语；drafts/projects 迁移吸顶范式；editor TopBar 规格对齐\n- 内容宽度收敛两档（760 表单/编辑、900 列表/首页），底距统一 48/40\n- 空态统一共享 Empty；focus-visible 统一 outline 2px primary；溢出防护补齐；散值圆角/字号收敛 token\n- 非目标：tooltip 双轨治理、分栏拖拽、胶囊面板 gutter 逐像素重排\n\n# 任务\n\n1. Phase 1 PageTopbar actions 插槽 + drafts/projects 吸顶迁移 + editor 对齐 + 测试更新\n2. Phase 2 栅格收敛（宽度两档、底距统一）\n3. Phase 3 drafts/projects 空态迁移共享 Empty\n4. Phase 4 Button focus-visible + 自绘焦点统一 + OutlineItem 键盘可达\n5. Phase 5 StatusBar/Tab/Capsule Label 溢出防护\n6. Phase 6 圆角/字号/脏点 token 收敛\n\n完整 brief：shadow-docs/changes/20260927-style-shell-visual-consistency/brief.md\n\n完整 brief：shadow-docs/changes/20260927-style-shell-visual-consistency/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-style-shell-visual-consistency\",\"type\":\"style\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-style-shell-visual-consistency/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "style"
      ]
    },
    "commit": {
      "files": [
        "app/(shell)/drafts/DraftsPage.tsx",
        "app/(shell)/drafts/styles.ts",
        "app/(shell)/editor/page.tsx",
        "app/(shell)/projects/ProjectsPage.tsx",
        "app/(shell)/projects/styles.ts",
        "components/FloatLayer/styles.ts",
        "components/StatusBar.tsx",
        "components/capsule/Capsule.tsx",
        "components/capsule/CapsulePanel/TaskTimeline.tsx",
        "components/capsule/CapsulePanel/styles.ts",
        "components/capsule/modules.tsx",
        "components/capsule/sections/EditorSection/index.tsx",
        "components/capsule/sections/EditorSection/styles.ts",
        "components/home/HomePage.tsx",
        "components/settings/SettingsPage.tsx",
        "components/ui/Button.tsx",
        "components/ui/PageTopbar.tsx",
        "components/workspace/PickerShell.tsx",
        "lib/i18n/locales.ts",
        "shadow-docs/changes/20260927-style-shell-visual-consistency/brief.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "tests/drafts-render.test.tsx",
        "tests/page-topbar.test.tsx",
        "tests/projects-render.test.tsx"
      ],
      "message": "style(shell): 壳层视觉一致性整顿——PageTopbar 扩 back 可选+actions 插槽并收编 drafts/projects/editor 页头(吸顶结构沿用 #128)、内容宽度收敛两档 760/900 底距 48/40、空态统一共享 Empty(文案拆 title/hint 三语)、Button 基类 focus-visible+Picker offset 归一+大纲条目 li 改 button 键盘可达、StatusBar 左区收缩+胶囊 Tab/标签溢出防护、圆角与半 px 字号散值归位 token scale（Closes #123）"
    }
  },
  "knowledge": null
}
---

# 壳层视觉一致性整顿：页头统一与吸顶跟进 · 栅格收敛 · 空态/焦点/溢出治理

## 动机
2026-09-27 全壳层走查发现页面族视觉语言不成体系：四种页头规格并存（PageTopbar 18px 无底线 / editor 12px mono 有底线 arrow-left / drafts·projects h1 20px 滚动流内 / home 22px）；五种内容宽度（760/860/900/920+内720）与三种底部留白（32/40/48）；草稿/项目页页头吸顶同病未跟进（页头+搜索框随长列表滚走）；空态三套实现（共享 Empty vs 两页手写）；键盘焦点三种视觉（box-shadow 光环 / outline 描边 / Button 基类无 focus-visible）且大纲 OutlineItem 键盘不可达；状态栏与胶囊面板 tab 无溢出防护（左区挤飞右区、ja 长标题出横向滚动）。

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 页头吸顶范式（settings/account 已落地：flex 列根 + PageTopbar 滚动流外 + 内容 ScrollArea）；组件目录化文件组织
  - 适用 scope: app, components
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: styled-components 走 var(--token)；圆角 scale 2/4/8/12/16、字号 scale 12/13/15/17/22…
  - 适用 scope: components, lib

## 决策
- **范围修订（2026-09-27 开工前核对）:** drafts/projects 页头吸顶已由 20260927-feature-sticky-header-drafts-projects（#128）先行落地（根 flex 列 + Head 滚动流外 + ScrollArea `0 32px 48px`）——本轮 **剔除「吸顶迁移」任务**，改为「页头原语收编」：把两页自绘 `Head`（h1 20px/860px 各搞各的）迁移到共享 PageTopbar（back 可选 + actions 插槽），统一标题层级与规格
- **选型:** 以 PageTopbar 为唯一页头原语（back 可选 + actions 插槽），drafts/projects/editor 迁移；内容宽度收敛两档（760 表单/编辑、900 列表/首页）底距统一 48/40；空态统一共享 Empty；focus-visible 统一 outline 2px primary；溢出防护补齐 StatusBar/Tab/Capsule Label；散值圆角/字号收敛 token scale
- **对比方案:** 各页继续自绘（割裂持续扩大）；新建高阶 PageShell 一次性收编（改造面过大、回归风险高，本轮不做）
- **理由:** 全部沿用 settings/account 已验证范式，零新发明；宽度两档覆盖现有全部场景（含 #128 新引入的 860 一并收敛）
- **非目标:** tooltip 双轨治理、分栏拖拽分割条、胶囊面板 gutter 逐像素重排（另立 change）

## 任务
### Phase 1 页头原语收编（吸顶结构 #128 已落，仅换原语）
- [x] PageTopbar 扩展：`back` 可选（无返回语义页不渲染返回钮）+ `actions` 插槽（右侧动作区），既有 API 向后兼容 — `components/ui/PageTopbar.tsx`
- [x] drafts 页自绘 Head → PageTopbar（无返回、标题统一 18px；宽度随 Phase 2 收敛） — `app/(shell)/drafts/DraftsPage.tsx` `app/(shell)/drafts/styles.ts`
- [x] projects 页同上（「打开目录」动作入 actions 插槽） — `app/(shell)/projects/ProjectsPage.tsx` `app/(shell)/projects/styles.ts`
- [x] editor TopBar 规格对齐：返回图标统一 IconChevronLeft sm、左右栅格对齐 32px 栅格 — `app/(shell)/editor/page.tsx`
- [x] 测试：page-topbar 补 actions/无 back 断言；drafts/projects render 测试按新结构适配 — `tests/page-topbar.test.tsx` `tests/drafts-render.test.tsx` `tests/projects-render.test.tsx`
### Phase 2 栅格收敛
- [x] 内容宽度收敛两档（表单/编辑 760，列表/首页 900；#128 新引入的 860 一并收敛）、页面底距统一 48（移动 40） — `components/settings/SettingsPage.tsx` `components/account/AccountPage/styles.tsx` `app/(shell)/drafts/styles.ts` `app/(shell)/projects/styles.ts` `components/home/HomePage.tsx`
### Phase 3 空态统一
- [x] drafts/projects 手写空态迁移共享 Empty 原子（引导句保留进 hint） — `app/(shell)/drafts/DraftsPage.tsx` `app/(shell)/projects/ProjectsPage.tsx` `components/ui/Empty.tsx`
### Phase 4 焦点与可达性
- [x] Button 基类补 focus-visible（outline 2px primary offset -2px） — `components/ui/Button.tsx`
- [x] drafts/projects/Picker 自绘焦点统一 outline 规范 — `app/(shell)/drafts/styles.ts` `app/(shell)/projects/styles.ts` `components/workspace/PickerShell.tsx`
- [x] OutlineItem 由带 onClick 的 li 改 button（键盘可达 + focus-visible） — `components/capsule/sections/EditorSection/index.tsx` `components/capsule/sections/EditorSection/styles.ts`
### Phase 5 溢出防护
- [x] StatusBar 左区收缩策略（min-width:0 + ellipsis，右区不被挤飞） — `components/StatusBar.tsx`
- [x] CapsulePanel Tab ellipsis + max-width、Capsule Label 溢出防护 — `components/capsule/CapsulePanel/styles.ts` `components/capsule/Capsule.tsx`
### Phase 6 token 收敛
- [x] 圆角散值（5/7/13/14px）归位 token scale；9~13px 九档自制字号收敛（半 px 值清零）；脏点统一 6px — `components/capsule/modules.tsx` `components/capsule/CapsulePanel/TaskTimeline.tsx` `components/capsule/sections/EditorSection/styles.ts` `components/FloatLayer/styles.ts` `app/(shell)/drafts/styles.ts` `app/(shell)/projects/styles.ts`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md；shadow-docs/knowledge/shell-chrome-design.md
- **理由:** 页头吸顶范式扩展到 drafts/projects 与页头规格统一记入 routing 卡；宽度两档栅格、焦点规范、token 收敛记入 chrome 卡
