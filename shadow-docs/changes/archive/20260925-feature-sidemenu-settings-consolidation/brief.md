---
{
  "schema": "shadow-dev/v1",
  "name": "20260925-feature-sidemenu-settings-consolidation",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260925-feature-sidemenu-settings-consolidation",
  "files": [
    "app/(shell)/layout.tsx",
    "components/SideMenu.tsx",
    "components/capsule/modules.tsx",
    "components/icons/index.tsx",
    "components/menu/PluginTree.tsx",
    "lib/i18n/locales.ts",
    "tests/i18n.test.ts",
    "tests/sidemenu-bottom.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 98,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/98",
    "pullRequest": 101,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/101"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "924e62cb9bf818f03473e54dd60bdec713b9efe4",
    "verifiedAt": "2026-09-25T11:14:54.792Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:101",
    "planHash": "d720e5cafbc089638a6cca7b4946c705f7ce1e5b65497b58b7045ad5fc66da05",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] SideMenu 底部交互合并与「插件」分组 + 胶囊模块卡 gap 修复",
      "titleRaw": "SideMenu 底部交互合并与「插件」分组 + 胶囊模块卡 gap 修复",
      "supplement": "需求与方案见 shadow-docs/changes/20260925-feature-sidemenu-settings-consolidation/brief.md：①快捷面板迁移挂【设置】项（折叠态右箭头展开/展开态 Setting+收起双图标）②「插件」单一可展开条目收纳全部插件视图与浮窗开关 ③胶囊 ModuleRow 纵向 gap 修复。",
      "body": "## 动机\n用户走查反馈三点：①【个人中心】的悬停快捷面板（主题/外观/语言）应挂到【设置】项上，且【设置】项要有明确的展开/收起交互（折叠态显示右箭头、点击展开菜单；展开态左侧正常 Setting 图标、右侧收起图标）；②注册的插件 main 视图目前平铺在主导航，需要一个「插件」分组收纳后续所有插件入口；③胶囊面板「模块」tab 上下堆叠的卡片（排版设置/快捷键手风琴行）没有纵向间距，视觉贴死。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论： 底部两项制语义（用户项点击 /account + hover 快捷面板、设置项折叠态点击仅展开不导航）、菜单项↔路由 key 映射（lib/routes.ts pluginPanelKey）、i18n 三语键集一致性测试硬约束（缺键测试红、缺键静默回落裸 key）\n  - 适用 scope: app, components, lib\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论： SideMenu 能力沿袭（data-tip tooltip 仅收起态、tree/treeOpen/onToggleTree 子树机制、展开收起瞬时切换禁 width 过渡）；图标先进注册表（业务禁裸 import lucide-react）；动效 150-300ms ease-out + reduced-motion 降级；胶囊模块卡基础件 ModuleGrid gap 6px\n  - 适用 scope: app, components, lib, src/shared/plugin.ts\n\n## 决策\n- **选型：** 底部保留两项但重新分工——用户项纯导航（移除 hover 快捷面板与相关计时器逻辑，保留点击 /account、userActive 高亮、展开态身份文本投影与版本行）；快捷面板整体迁移挂【设置】项（仅展开态弹出，收起态保留 data-tip 单一职责，两者都锚定右侧会重叠）并瘦身边缘行（「收起/展开菜单」行退役——展开态右缘收起图标 + 折叠态点击展开已双向覆盖，⌘/Ctrl+B 全局快捷键不变）；设置项三态交互：折叠态图标 IconChevronRight + 点击仅展开 + data-tip「设置 · 展开菜单」，展开态左侧 IconSettings 点击 /settings（settingsActive 高亮不变）、右侧新增收起图标点击收起。「插件」分组用单一可展开条目：复用 SideMenuItem 既有 tree/treeOpen/onToggleTree 机制（同项目树交互），id=plugins、新注册 IconPuzzle 图标；子树 = PluginTree 组件（main 视图导航行 + 浮窗开关行，开关行保留 aria-pressed 开合态，均经 pluginPanelKey 路由）；主导航 toggleItems 组退役（floatViews 并入子树）；折叠态插件条目 = 图标 + tooltip「插件」、点击仅展开菜单（同设置项折叠态语义）；条目常驻（空子树显示「无启用插件」提示行），呼应「后续注册的插件都归此组」。gap 修复 = ModuleRow `margin: 0 4px` → `6px 4px`，上下堆叠手风琴行获得纵向间距。\n- **对比方案：** (a) 快捷面板内加「个人中心」行或 /account 并入设置页——用户已选「底部保留两项」，最小改动；(b) 插件分组用小节标签制（展开态灰 label）——用户选单一可展开条目，省纵向空间且与项目树交互一致；(c) gap 用 CenterSection 改 flex+gap 整体重排——影响全部分区布局，仅修 ModuleRow 更精准、回归面小。\n- **理由：** 全部遵循命中知识卡：子树复用既有 tree 机制不新造抽象（新增贡献点须以真实需要为准）；i18n 新键三语齐配过 tests/i18n.test.ts；IconPuzzle 先进注册表再使用；瞬时切换禁 width 过渡继续成立（本次不动展开收起动画）；无新增浮层（面板迁移沿用既有 target 归属/Esc/180ms 延迟语义）。\n- **待确认点：** 无\n\n## 任务\n### Phase 1\n- [ ] 底部改造：用户项移除 UserQuickPanel 挂载/hover/焦点逻辑与 closeTimer（保留点击 onOpenUser、userActive、展开态 UserMeta）；设置项包 UserAnchor 式 hover 锚点（仅展开态弹面板），折叠态图标换 IconChevronRight 且点击仅展开，展开态行内右缘加收起图标钮（stopPropagation 防误触导航，点击 onToggleExpanded）；UserQuickPanel 移除「收起/展开菜单」行与 expanded/onToggleExpanded props — components/SideMenu.tsx\n- [ ] i18n 新键三语齐配（menu.plugins 等；pop 收起行相关键退役则同步清理），tests/i18n.test.ts 键集校验通过 — lib/i18n/locales.ts, tests/i18n.test.ts\n### Phase 2\n- [ ] 注册 IconPuzzle（lucide Puzzle）进通用图标注册表 — components/icons/index.tsx\n- [ ] 新建 PluginTree 子树组件：main 视图行（点击 router.push /plugin/<id>/<view>）+ 浮窗开关行（aria-pressed，onToggle 走既有 toggleFloat），空态「无启用插件」行 — components/menu/PluginTree.tsx（新）\n- [ ] layout 接线：items 增「插件」条目（tree=<PluginTree/>，pluginsTreeOpen state，置 drafts 之后），toggleItems/openToggleKeys 改传给 PluginTree、SideMenu 该组渲染退役 — app/(shell)/layout.tsx, components/SideMenu.tsx\n### Phase 3\n- [ ] gap 修复：ModuleRow margin 0 4px → 6px 4px，走查与 SubPanel/ModuleGrid 邻接间距视觉 — components/capsule/modules.tsx\n- [ ] 测试扩展：sidemenu-bottom.test.tsx 覆盖设置项三态交互/面板挂点迁移/插件条目子树；tsc 双侧 + vitest 全绿 — tests/sidemenu-bottom.test.tsx\n\n## 补充\n需求与方案见 shadow-docs/changes/20260925-feature-sidemenu-settings-consolidation/brief.md：①快捷面板迁移挂【设置】项（折叠态右箭头展开/展开态 Setting+收起双图标）②「插件」单一可展开条目收纳全部插件视图与浮窗开关 ③胶囊 ModuleRow 纵向 gap 修复。\n\n完整 brief：shadow-docs/changes/20260925-feature-sidemenu-settings-consolidation/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260925-feature-sidemenu-settings-consolidation\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260925-feature-sidemenu-settings-consolidation/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "release": {
      "files": [
        "app/(shell)/layout.tsx",
        "components/SideMenu.tsx",
        "components/capsule/modules.tsx",
        "components/icons/index.tsx",
        "components/menu/PluginTree.tsx",
        "lib/i18n/locales.ts",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "tests/sidemenu-bottom.test.tsx"
      ],
      "message": "feat(sidemenu): 底部交互合并与「插件」分组——设置项三态（收起右箭头展开/展开 Setting+收起旋钮）、快捷面板迁移挂设置项（收起行退役）、插件 main 视图收进可展开子树（toggleItems 退役、IconPuzzle、空态行）、胶囊 ModuleRow 纵向 gap 修复（Closes #98）",
      "title": "SideMenu 底部交互合并与「插件」分组 + 胶囊模块卡 gap 修复",
      "body": "Closes #98\n\n完整 brief：shadow-docs/changes/20260925-feature-sidemenu-settings-consolidation/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/renderer-shell-routing.md",
    "reason": "PR #101 已合入 main（924e62c）；合并后回归证据：tsc 三套绿（139 重试收敛）+ 受影响面 33/33（sidemenu-bottom/i18n/capsule-render/page-topbar）+ CDP 走查 16 项断言；知识卡更新已随 PR 落库（含与 #100 的 frontmatter 并集解冲突）。"
  }
}
---

# SideMenu 底部交互合并与「插件」分组 + 胶囊模块卡 gap 修复

## 动机

用户走查反馈三点：①【个人中心】的悬停快捷面板（主题/外观/语言）应挂到【设置】项上，且【设置】项要有明确的展开/收起交互（折叠态显示右箭头、点击展开菜单；展开态左侧正常 Setting 图标、右侧收起图标）；②注册的插件 main 视图目前平铺在主导航，需要一个「插件」分组收纳后续所有插件入口；③胶囊面板「模块」tab 上下堆叠的卡片（排版设置/快捷键手风琴行）没有纵向间距，视觉贴死。

## 复杂度评级

- **评级：** M
- **理由：** 契约变更=仅 SideMenu 内部 props/组件级（无跨进程/manifest 契约）；触及面=SideMenu + layout + 新组件 PluginTree + 图标注册 + i18n 三语 + 胶囊样式，约 7 文件；可发现性=UI 直观可见。三要素中触及面中等、契约局部，不到 L。
- **期望验证深度：** unit + runtime

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论： 底部两项制语义（用户项点击 /account + hover 快捷面板、设置项折叠态点击仅展开不导航）、菜单项↔路由 key 映射（lib/routes.ts pluginPanelKey）、i18n 三语键集一致性测试硬约束（缺键测试红、缺键静默回落裸 key）
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论： SideMenu 能力沿袭（data-tip tooltip 仅收起态、tree/treeOpen/onToggleTree 子树机制、展开收起瞬时切换禁 width 过渡）；图标先进注册表（业务禁裸 import lucide-react）；动效 150-300ms ease-out + reduced-motion 降级；胶囊模块卡基础件 ModuleGrid gap 6px
  - 适用 scope: app, components, lib, src/shared/plugin.ts

## 决策

- **选型：** 底部保留两项但重新分工——用户项纯导航（移除 hover 快捷面板与相关计时器逻辑，保留点击 /account、userActive 高亮、展开态身份文本投影与版本行）；快捷面板整体迁移挂【设置】项（仅展开态弹出，收起态保留 data-tip 单一职责，两者都锚定右侧会重叠）并瘦身边缘行（「收起/展开菜单」行退役——展开态右缘收起图标 + 折叠态点击展开已双向覆盖，⌘/Ctrl+B 全局快捷键不变）；设置项三态交互：折叠态图标 IconChevronRight + 点击仅展开 + data-tip「设置 · 展开菜单」，展开态左侧 IconSettings 点击 /settings（settingsActive 高亮不变）、右侧新增收起图标点击收起。「插件」分组用单一可展开条目：复用 SideMenuItem 既有 tree/treeOpen/onToggleTree 机制（同项目树交互），id=plugins、新注册 IconPuzzle 图标；子树 = PluginTree 组件（main 视图导航行 + 浮窗开关行，开关行保留 aria-pressed 开合态，均经 pluginPanelKey 路由）；主导航 toggleItems 组退役（floatViews 并入子树）；折叠态插件条目 = 图标 + tooltip「插件」、点击仅展开菜单（同设置项折叠态语义）；条目常驻（空子树显示「无启用插件」提示行），呼应「后续注册的插件都归此组」。gap 修复 = ModuleRow `margin: 0 4px` → `6px 4px`，上下堆叠手风琴行获得纵向间距。
- **对比方案：** (a) 快捷面板内加「个人中心」行或 /account 并入设置页——用户已选「底部保留两项」，最小改动；(b) 插件分组用小节标签制（展开态灰 label）——用户选单一可展开条目，省纵向空间且与项目树交互一致；(c) gap 用 CenterSection 改 flex+gap 整体重排——影响全部分区布局，仅修 ModuleRow 更精准、回归面小。
- **理由：** 全部遵循命中知识卡：子树复用既有 tree 机制不新造抽象（新增贡献点须以真实需要为准）；i18n 新键三语齐配过 tests/i18n.test.ts；IconPuzzle 先进注册表再使用；瞬时切换禁 width 过渡继续成立（本次不动展开收起动画）；无新增浮层（面板迁移沿用既有 target 归属/Esc/180ms 延迟语义）。
- **待确认点：** 无

## 任务

### Phase 1
- [x] 底部改造：用户项移除 UserQuickPanel 挂载/hover/焦点逻辑与 closeTimer（保留点击 onOpenUser、userActive、展开态 UserMeta）；设置项包 UserAnchor 式 hover 锚点（仅展开态弹面板），折叠态图标换 IconChevronRight 且点击仅展开，展开态行内右缘加收起图标钮（stopPropagation 防误触导航，点击 onToggleExpanded）；UserQuickPanel 移除「收起/展开菜单」行与 expanded/onToggleExpanded props — components/SideMenu.tsx
- [x] i18n 新键三语齐配（menu.plugins 等；pop 收起行相关键退役则同步清理），tests/i18n.test.ts 键集校验通过 — lib/i18n/locales.ts, tests/i18n.test.ts
### Phase 2
- [x] 注册 IconPuzzle（lucide Puzzle）进通用图标注册表 — components/icons/index.tsx
- [x] 新建 PluginTree 子树组件：main 视图行（点击 router.push /plugin/<id>/<view>）+ 浮窗开关行（aria-pressed，onToggle 走既有 toggleFloat），空态「无启用插件」行 — components/menu/PluginTree.tsx（新）
- [x] layout 接线：items 增「插件」条目（tree=<PluginTree/>，pluginsTreeOpen state，置 drafts 之后），toggleItems/openToggleKeys 改传给 PluginTree、SideMenu 该组渲染退役 — app/(shell)/layout.tsx, components/SideMenu.tsx
### Phase 3
- [x] gap 修复：ModuleRow margin 0 4px → 6px 4px，走查与 SubPanel/ModuleGrid 邻接间距视觉 — components/capsule/modules.tsx
- [x] 测试扩展：sidemenu-bottom.test.tsx 覆盖设置项三态交互/面板挂点迁移/插件条目子树；tsc 双侧 + vitest 全绿 — tests/sidemenu-bottom.test.tsx

## 结果

- 实际耗时： —
- 验证: —

## 知识评估

- **预期影响：** 更新
- **候选卡片：** shadow-docs/knowledge/renderer-shell-routing.md（底部两项制语义段：面板迁移设置项、插件分组条目）、shadow-docs/knowledge/shell-chrome-design.md（SideMenu 段：设置项三态交互 + 插件可展开条目取代 toggleItems 组）
- **理由：** 底部交互语义与菜单结构是知识卡明确记载的结论，本次改变后必须回写，否则下次变更按旧两项制推导出错。
