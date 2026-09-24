---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-sidemenu-bottom-toggle",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-sidemenu-bottom-toggle",
  "files": [
    "components/SideMenu.tsx",
    "shadow-docs/knowledge/shell-chrome-design.md"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 75,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/75",
    "pullRequest": 79,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/79"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "ed98add8af4b4453ec13bc39bcb7ce9ae705c3d0",
    "verifiedAt": "2026-09-24T09:09:46.440Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:79",
    "planHash": "91d28cffa1d91a249875ac992d880923e885136932455eb4d39d225addaf417e",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] SideMenu 底部交互优化：收起态专属展开钮 + 用户入口上移",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n左侧菜单收起态下，展开入口藏在用户快捷面板行内（hover 两跳），左下角图标本身点击是跳转用户中心——展开菜单这一高频动作没有直接触点。本次把底部结构改为两行：用户入口在上（行为不变）、**菜单开合钮垫底**；收起态点击开合钮直接展开菜单。用户已确认：① 开合钮**仅收起态可点**（展开态不渲染，收起仍走快捷面板/快捷键）；② 快捷面板「收起/展开菜单」行**保留**（两处入口并存）；③ 用户入口迁移只换位置、行为不变（hover 快捷面板 / 点击 /account）。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: SideMenu 两形态瞬时切换（禁 width 过渡）、左缘激活指示条、data-tip 自绘 tooltip 仅收起态（hover 与 :focus-visible 可见）、底部系统区 `margin-top:auto` 吸附左下、toggle 型 item `aria-pressed` 语义、Nav 不得 overflow:hidden（裁剪面板/tooltip）、用户快捷面板 popover 定位与 Esc/延迟关闭、文案经 useT() 三语、图标先进 components/icons 注册表\n  - 适用 scope: components, shadow-docs/knowledge\n\n## 决策\n- **选型:** 底部系统区改两行制——用户入口（`UserWrap` 现状保留，仅位于开合钮上方）+ **收起态专属展开钮**（复用 `Item` 样式基：48px 命中区、data-tip「展开菜单 ⌘/Ctrl+B」、`IconPanelExpand`）；展开态不渲染该钮（无死控件），收起动作仍由快捷面板行与 ⌘/Ctrl+B 承担。\n- **对比方案:** ① 双向 toggle（展开态点击收起）——用户否决，展开态出现无用按钮；② 开合钮常驻但展开态禁用灰显——死控件更差，不选。\n- **理由:** 高频动作（收起态展开菜单）获得一击直达触点；展开态零冗余；快捷面板行保留使两处入口并存、⌘/Ctrl+B 全局不变。\n\n## 任务\n### Phase 1 实施与验证\n- [ ] SideMenu 底部系统区两行制：用户入口上移、收起态渲染展开钮（复用 Item 基样式 + IconPanelExpand + data-tip 复合快捷键提示 + onClick=onToggleExpanded），展开态仅用户入口 — `components/SideMenu.tsx` — 修改\n- [ ] pnpm typecheck + pnpm test 全绿；用户手动验收（收起态点击展开、tooltip、hover 面板两行不重叠、键盘遍历、四主题）\n- [ ] 知识卡更新：SideMenu 段底部系统区两行制 + 用户入口段（收起态专属展开钮，与快捷面板行并存） — `shadow-docs/knowledge/shell-chrome-design.md` — 更新\n\n完整 brief：shadow-docs/changes/20260924-feature-sidemenu-bottom-toggle/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-feature-sidemenu-bottom-toggle\",\"type\":\"feature\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-feature-sidemenu-bottom-toggle/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# SideMenu 底部交互优化：收起态专属展开钮 + 用户入口上移

## 动机

左侧菜单收起态下，展开入口藏在用户快捷面板行内（hover 两跳），左下角图标本身点击是跳转用户中心——展开菜单这一高频动作没有直接触点。本次把底部结构改为两行：用户入口在上（行为不变）、**菜单开合钮垫底**；收起态点击开合钮直接展开菜单。用户已确认：① 开合钮**仅收起态可点**（展开态不渲染，收起仍走快捷面板/快捷键）；② 快捷面板「收起/展开菜单」行**保留**（两处入口并存）；③ 用户入口迁移只换位置、行为不变（hover 快捷面板 / 点击 /account）。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: SideMenu 两形态瞬时切换（禁 width 过渡）、左缘激活指示条、data-tip 自绘 tooltip 仅收起态（hover 与 :focus-visible 可见）、底部系统区 `margin-top:auto` 吸附左下、toggle 型 item `aria-pressed` 语义、Nav 不得 overflow:hidden（裁剪面板/tooltip）、用户快捷面板 popover 定位与 Esc/延迟关闭、文案经 useT() 三语、图标先进 components/icons 注册表
  - 适用 scope: components, shadow-docs/knowledge

## 决策

- **选型:** 底部系统区改两行制——用户入口（`UserWrap` 现状保留，仅位于开合钮上方）+ **收起态专属展开钮**（复用 `Item` 样式基：48px 命中区、data-tip「展开菜单 ⌘/Ctrl+B」、`IconPanelExpand`）；展开态不渲染该钮（无死控件），收起动作仍由快捷面板行与 ⌘/Ctrl+B 承担。
- **对比方案:** ① 双向 toggle（展开态点击收起）——用户否决，展开态出现无用按钮；② 开合钮常驻但展开态禁用灰显——死控件更差，不选。
- **理由:** 高频动作（收起态展开菜单）获得一击直达触点；展开态零冗余；快捷面板行保留使两处入口并存、⌘/Ctrl+B 全局不变。

## 任务

### Phase 1 实施与验证
- [x] SideMenu 底部系统区两行制：用户入口上移、收起态渲染展开钮（复用 Item 基样式 + IconPanelExpand + data-tip 复合快捷键提示 + onClick=onToggleExpanded），展开态仅用户入口 — `components/SideMenu.tsx` — 修改
- [x] pnpm typecheck + pnpm test 全绿；用户手动验收（收起态点击展开、tooltip、hover 面板两行不重叠、键盘遍历、四主题）
- [x] 知识卡更新：SideMenu 段底部系统区两行制 + 用户入口段（收起态专属展开钮，与快捷面板行并存） — `shadow-docs/knowledge/shell-chrome-design.md` — 更新

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** SideMenu 底部系统区结构与入口归属变化（原「仅用户入口」结论失效），属结构性事实更新。
