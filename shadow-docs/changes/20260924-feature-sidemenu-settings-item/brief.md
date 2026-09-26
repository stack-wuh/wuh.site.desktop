---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-sidemenu-settings-item",
  "type": "feature",
  "scope": "renderer-shell",
  "status": "branched",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-sidemenu-settings-item",
  "files": [
    "components/SideMenu.tsx",
    "lib/i18n/locales.ts",
    "lib/routes.ts",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "tests/sidemenu-bottom.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 86,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/86",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "54ae1b308138214f216a1e78db929d5a86b75f16",
    "verifiedAt": "2026-09-26T15:53:51.401Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:86",
    "planHash": "e0c6fd185e1a0fde3abb87592b71054c7912395be1901d37113eee7b5a95e2c7",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] SideMenu 底部改版：设置独立成项 + 快捷面板瘦身",
      "body": "## 动机\n设置入口目前埋在用户入口 hover 快捷面板的行内项里，收起态尤其难发现（要点开浮窗再点「设置」）。用户诉求：① 底部系统区改为【用户】在上、【设置】在下两枚独立项；② 菜单收起时点「设置」= 打开菜单（展开），不直接导航；③ 快捷面板浮窗里的「用户」移出（面板瘦身）。用户已确认：主题/外观/语言三组**保留**在瘦身后 hover 面板（不做设置页迁移、不做成导航图标）。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: SideMenu 底部两行制（收起态专属展开钮 + 用户入口恒为最后一项）；快捷面板结构（PopHead/三组二级 popover/收起行/设置行）；PopSubmenu 通用组件；Nav 禁 overflow:hidden；低频 chrome 控件不占导航黄金位；左栏展开收起瞬时切换\n  - 适用 scope: components/SideMenu\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: `settings` 不占主导航菜单项；⌘/Ctrl+B 全局展开/收起；快捷面板「设置」项独立指向 /settings；i18n 三语 parity 锁 + 缺键静默回落\n  - 适用 scope: app, components, lib/i18n\n\n## 决策\n- **选型:** 底部硬编码区重排为【用户】【设置】两项；删除收起态专属展开钮（「一击直达展开」职责由设置项在收起态承担，⌘/Ctrl+B 不变）；快捷面板瘦身——删 PopHead 与「设置」行内项，保留主题/外观/语言三组二级 popover 与「收起/展开菜单」行。\n- **点击语义:** 设置项——展开态 `router.push('/settings')`、/settings 时高亮（aria-current，同 userActive 模式）；收起态仅展开不导航，data-tip 复合「设置 · 展开菜单」。用户项——点击直达 /account（任意态不变），hover/聚焦弹瘦身面板。\n- **对比方案:** 浮窗整体退役、三组迁设置页（主题一击直达降为两击，用户否）；三组做成底部图标（rail 拥挤、违背低频控件约束，否）。\n- **理由:** 保留一击直达主题/语言切换；设置直达性显著提升；20260924-feature-sidemenu-bottom-toggle 的收起态专属展开钮被设置项取代（知识卡改写该段）。\n\n## 任务\n### Phase 1 SideMenu 结构\n- [ ] 底部 Group 重排：用户项在上、设置项在下（IconSettings + 展开态 label + 收起态 data-tip）；删除收起态专属展开钮 — `components/SideMenu.tsx` — 修改\n- [ ] 设置项点击语义（收起态展开/展开态导航 + settings 高亮） — `components/SideMenu.tsx`（必要时 `lib/routes.ts`） — 修改\n- [ ] 快捷面板瘦身：删 PopHead、删「设置」行，保留三组 + 收起/展开行；锚点/延迟关闭/Esc 逻辑不动 — `components/SideMenu.tsx` — 修改\n\n### Phase 2 文案与测试\n- [ ] i18n：新增 `menu.settings` 三语；`pop.user`/`pop.userHint` 若无引用三语同步移除 — `lib/i18n/locales.ts` — 修改\n- [ ] 渲染测试：底部顺序、收起态点设置只展开、展开态进 /settings 且高亮、用户点击 /account、面板瘦身内容 — `tests/sidemenu-bottom.test.tsx` — 新增\n- [ ] `pnpm typecheck` + `pnpm test` 全绿；四主题走查（两态底部/tooltip/键盘遍历/二级 popover/⌘B）\n- [ ] 知识写回：shell-chrome-design.md（底部两项制+展开钮退役+面板瘦身）、renderer-shell-routing.md（设置入口表述） — `shadow-docs/knowledge/` — 更新\n\n完整 brief：shadow-docs/changes/20260924-feature-sidemenu-settings-item/brief.md",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "shadow-docs/changes/20260924-feature-sidemenu-settings-item/brief.md"
      ],
      "message": "docs(shadow): sidemenu-settings-item 状态回填——review 记录对齐当前 HEAD（实现已随历史提交进入 main，流程补录）"
    }
  },
  "knowledge": null
}
---

# SideMenu 底部系统区改版：设置独立成项 + 快捷面板瘦身

## 动机

设置入口目前埋在用户入口 hover 快捷面板的行内项里，收起态尤其难发现（要点开浮窗再点「设置」）。用户诉求：① 底部系统区改为【用户】在上、【设置】在下两枚独立项；② 菜单收起时点「设置」= 打开菜单（展开），不直接导航；③ 快捷面板浮窗里的「用户」移出（面板瘦身）。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: SideMenu 底部两行制 = 收起态专属展开钮（20260924-feature-sidemenu-bottom-toggle）+ 用户入口恒为最后一项；快捷面板 = PopHead 身份头部 + 主题/外观/语言三组二级 popover（PopSubmenu）+「收起/展开菜单」行 +「设置」行内项；Nav 禁 `overflow: hidden`；低频 chrome 控件不占导航黄金位；左栏展开收起瞬时切换
  - 适用 scope: components/SideMenu
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 菜单项 id 与路由段一一映射但 `settings` 不占主导航菜单项；⌘/Ctrl+B 全局展开/收起；快捷面板「设置」项独立指向 /settings（onOpenSettings 与 onOpenUser 分离）；i18n 三语 parity 锁 + 缺键静默回落
  - 适用 scope: app, components, lib/i18n
- norms/ui-patterns.md、norms/interaction.md：禁布局位移过渡、图标按钮 aria-label、键盘 Tab 可达、Esc 关浮层

## 决策

- **选型:** 底部硬编码区重排为【用户】【设置】两项（用户在上、设置在下）；删除收起态专属展开钮（其「一击直达展开」职责由设置项在收起态承担，⌘/Ctrl+B 不变）；快捷面板瘦身——删除 PopHead 身份头部与「设置」行内项，保留主题/外观/语言三组二级 popover 与「收起/展开菜单」行（展开态收起动作的指针路径仍经面板）。
- **点击语义:** 设置项——展开态 `router.push('/settings')`，pathname 命中 /settings 时高亮（`aria-current="page"`，与用户项 userActive 同模式）；收起态仅 `onToggleExpanded()` 展开不导航，data-tip 复合「设置 · 展开菜单」。用户项——点击直达 `/account`（任意态，现状不变），hover/聚焦弹瘦身面板。
- **对比方案:** 浮窗整体退役、三组迁设置页（主题切换从一击直达降为两击，用户已否）；主题/外观/语言做成底部导航图标（rail 拥挤，违背低频控件约束，否）。
- **理由:** 保留用户确认的一击直达主题/语言切换；设置直达性显著提升（收起态一键展开、展开态一键进设置）；20260924-feature-sidemenu-bottom-toggle 引入的收起态专属展开钮被设置项取代（该卡结论需改写）。用户入口「点击 + hover 面板」双语义为用户确认的保留项。

## 任务

### Phase 1 SideMenu 结构
- [x] 底部 Group 重排：用户项在上、设置项在下（`IconSettings` + 展开态 label「设置」+ 收起态 data-tip）；删除收起态专属展开钮 —— `components/SideMenu.tsx`
- [x] 设置项点击语义：收起态仅展开、展开态导航 /settings、settings 高亮态 —— `components/SideMenu.tsx`（路由判定必要时 `lib/routes.ts`）
- [x] 快捷面板瘦身：删 PopHead、删「设置」行；保留主题/外观/语言三组 + 「收起/展开菜单」行；锚点定位/180ms 延迟关闭/Esc/键盘可达逻辑不动 —— `components/SideMenu.tsx`

### Phase 2 文案与测试
- [x] i18n：新增 `menu.settings`（三语）；`pop.user`/`pop.userHint` 若无引用则三语同步移除 —— `lib/i18n/locales.ts`
- [x] 渲染测试：底部顺序（用户上设置下）、收起态点设置只展开不导航、展开态点设置进 /settings 且高亮、用户点击 /account、面板瘦身内容与三组 popover 保留 —— `tests/sidemenu-bottom.test.tsx`（新）
- [x] `pnpm typecheck` + `pnpm test` 全绿（i18n parity + 源码键覆盖）；四主题走查：收起/展开两态底部、tooltip、键盘遍历、面板二级 popover、⌘/Ctrl+B

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md（SideMenu 段与「用户入口与快捷面板」段改写：底部两项制、展开钮退役、面板瘦身结构）；shadow-docs/knowledge/renderer-shell-routing.md（「快捷面板『设置』项」与 Cmd/Ctrl+B 控件入口表述更新）
- **理由:** 底部系统区结构与快捷面板契约变更，两卡现有结论过期。
