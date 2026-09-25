---
{
  "schema": "shadow-dev/v1",
  "name": "20260925-fix-page-header-sticky",
  "type": "fix",
  "scope": "renderer-shell",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260925-fix-page-header-sticky",
  "files": [
    "components/account/AccountPage.tsx",
    "components/settings/SettingsPage.tsx",
    "components/ui/PageTopbar.tsx",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "tests/page-topbar.test.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 96,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/96",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "f6847bcd4771c812ed5626706547995df17b368e",
    "verifiedAt": "2026-09-25T09:37:58.196Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:96",
    "planHash": "7fe6b0cdbfac91822bb058f762d976281c7ec292b0ccd1f86bd3cbc940a84648",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 设置/用户中心页头吸顶：Header 移出滚动流",
      "titleRaw": "[fix] 设置/用户中心页头吸顶：Header 移出滚动流",
      "supplement": "## 动机\nSettings/User 页面的页内 Header（「< 返回 + 页面标题」栏）写在滚动容器内部，内容一滚 Header 就消失，长列表页没有常驻的页面上下文与返回入口。现状 4 个右栏页面同病（settings/account/drafts/projects），本次只做点名的 settings + account 两页；/editor 页是唯一「Header 在滚动流外（flex 固定）」的参照实现。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 右栏页面 = 路由段页面；settings 页含左列 SettingsNav（已 sticky top:8px）+ Sections 的 grid 两栏；account 单列 760px\n  - 适用 scope: app, components\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: Message 横幅挂 MainColumn 文档流内（页面滚动容器之外）——页头吸顶不得影响横幅位置\n  - 适用 scope: components/ui\n\n## 决策\n- **选型:** 头部移出滚动流（对齐 /editor flex 固定范式）——页面根改 flex 列（无 overflow），共享 `PageTopbar`（返回+标题，onBack prop）为常驻顶行，内容区包进新滚动容器（原 padding 迁入）；两页消除复制粘贴的 Topbar。\n- **对比方案:** sticky 补丁（负 margin 遮 gutter + 联动 SettingsNav top，每页一套补丁，弃）。\n- **理由:** /editor 已验证该范式；吸顶是结构性质，PageTopbar 可供后续 drafts/projects 复用；SettingsNav sticky 以新滚动容器为基准、top:8px 语义不变。\n\n## 任务\n### Phase 1 结构重构\n- [ ] 新增共享 `PageTopbar`（返回按钮 + 标题，onBack prop） — `components/ui/PageTopbar.tsx` — 新增\n- [ ] settings 页重构（Topbar 移出滚动流 + 内容区独立滚动 + Nav sticky 验证） — `components/settings/SettingsPage.tsx` — 修改\n- [ ] account 页重构（同构） — `components/account/AccountPage.tsx` — 修改\n\n### Phase 2 验证\n- [ ] 渲染冒烟测试（Header 在滚动容器外、内容区独立滚动） — `tests/page-topbar.test.tsx` — 新增\n- [ ] `pnpm typecheck` + `pnpm test` 全绿；手动走查（两页滚动 Header 固定、settings 左列 sticky 正常、Message 横幅位置不变、返回行为不变）\n- [ ] 知识写回：renderer-shell-routing.md（页头 flex 固定范式 + PageTopbar） — `shadow-docs/knowledge/` — 更新\n\n完整 brief：shadow-docs/changes/20260925-fix-page-header-sticky/brief.md",
      "body": "## 动机\nSettings/User 页面的页内 Header（「< 返回 + 页面标题」栏）写在滚动容器内部，内容一滚 Header 就消失，长列表页（尤其设置页插件清单）没有常驻的页面上下文与返回入口。用户要求 Header 吸顶不随滚动。现状：4 个右栏页面（settings/account/drafts/projects）同病，本次只做点名的 settings + account 两页；/editor 页是唯一的「Header 在滚动流外（flex 固定）」参照实现。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 右栏页面 = `app/(shell)/<segment>/page.tsx` 路由段；settings 页含左列 SettingsNav（已 sticky top:8px）+ 右侧 Sections 的 grid 两栏；account 单列 760px\n  - 适用 scope: app, components\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: Message 横幅挂 MainColumn 文档流内、TitleBar 之下（页面滚动容器之外）——页头吸顶不得影响横幅位置\n  - 适用 scope: components/ui\n- norms/ui-patterns.md、norms/interaction.md：复用优先、瞬时布局（禁布局位移动画）、键盘可达\n\n## 决策\n- **选型:** 头部移出滚动流（对齐 /editor 页 flex 固定范式）——页面根改为 flex 列容器（无 overflow），`PageTopbar` 为 flex:none 常驻顶行，内容区包进新的滚动容器（overflow:auto，原 padding 迁入）。顺势抽共享组件 `components/ui/PageTopbar.tsx`（返回按钮 + 标题槽位，onBack prop），settings/account 两页复用，消除两份复制粘贴的 Topbar。\n- **对比方案:** sticky 补丁（四行 CSS 加 position:sticky + 负 margin 遮 gutter + 联动 SettingsNav top——改动小但每页一套补丁、层级细节毛糙，弃）。\n- **理由:** /editor 页已验证该范式；吸顶是结构性质而非补丁性质，后续 drafts/projects 若要跟进直接复用 PageTopbar；SettingsNav 的 sticky 以新滚动容器为基准，top:8px 语义不变。\n\n## 任务\n### Phase 1 结构重构\n- [ ] 新增共享 `PageTopbar`（返回按钮 + 标题，onBack prop；视觉沿用现有 Topbar）—— `components/ui/PageTopbar.tsx`（新）\n- [ ] settings 页重构：Page 根改 flex 列，Topbar 移出滚动流，内容区包进滚动容器（原 padding 迁入）；SettingsNav sticky 语义验证 —— `components/settings/SettingsPage.tsx`\n- [ ] account 页重构：同构改造 —— `components/account/AccountPage.tsx`\n\n### Phase 2 验证\n- [ ] 渲染冒烟测试：两页 Header 在滚动容器外、内容区独立滚动 —— `tests/page-topbar.test.tsx`（新）\n- [ ] `pnpm typecheck` + `pnpm test` 全绿；手动走查：两页滚动时 Header 固定、settings 左列 sticky 正常、Message 横幅位置不变、返回行为不变\n\n## 补充\n## 动机\nSettings/User 页面的页内 Header（「< 返回 + 页面标题」栏）写在滚动容器内部，内容一滚 Header 就消失，长列表页没有常驻的页面上下文与返回入口。现状 4 个右栏页面同病（settings/account/drafts/projects），本次只做点名的 settings + account 两页；/editor 页是唯一「Header 在滚动流外（flex 固定）」的参照实现。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 右栏页面 = 路由段页面；settings 页含左列 SettingsNav（已 sticky top:8px）+ Sections 的 grid 两栏；account 单列 760px\n  - 适用 scope: app, components\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: Message 横幅挂 MainColumn 文档流内（页面滚动容器之外）——页头吸顶不得影响横幅位置\n  - 适用 scope: components/ui\n\n## 决策\n- **选型:** 头部移出滚动流（对齐 /editor flex 固定范式）——页面根改 flex 列（无 overflow），共享 `PageTopbar`（返回+标题，onBack prop）为常驻顶行，内容区包进新滚动容器（原 padding 迁入）；两页消除复制粘贴的 Topbar。\n- **对比方案:** sticky 补丁（负 margin 遮 gutter + 联动 SettingsNav top，每页一套补丁，弃）。\n- **理由:** /editor 已验证该范式；吸顶是结构性质，PageTopbar 可供后续 drafts/projects 复用；SettingsNav sticky 以新滚动容器为基准、top:8px 语义不变。\n\n## 任务\n### Phase 1 结构重构\n- [ ] 新增共享 `PageTopbar`（返回按钮 + 标题，onBack prop） — `components/ui/PageTopbar.tsx` — 新增\n- [ ] settings 页重构（Topbar 移出滚动流 + 内容区独立滚动 + Nav sticky 验证） — `components/settings/SettingsPage.tsx` — 修改\n- [ ] account 页重构（同构） — `components/account/AccountPage.tsx` — 修改\n\n### Phase 2 验证\n- [ ] 渲染冒烟测试（Header 在滚动容器外、内容区独立滚动） — `tests/page-topbar.test.tsx` — 新增\n- [ ] `pnpm typecheck` + `pnpm test` 全绿；手动走查（两页滚动 Header 固定、settings 左列 sticky 正常、Message 横幅位置不变、返回行为不变）\n- [ ] 知识写回：renderer-shell-routing.md（页头 flex 固定范式 + PageTopbar） — `shadow-docs/knowledge/` — 更新\n\n完整 brief：shadow-docs/changes/20260925-fix-page-header-sticky/brief.md\n\n完整 brief：shadow-docs/changes/20260925-fix-page-header-sticky/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260925-fix-page-header-sticky\",\"type\":\"fix\",\"scope\":\"renderer-shell\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260925-fix-page-header-sticky/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    },
    "commit": {
      "files": [
        "components/account/AccountPage.tsx",
        "components/settings/SettingsPage.tsx",
        "components/ui/PageTopbar.tsx",
        "shadow-docs/changes/20260925-fix-page-header-sticky",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "tests/page-topbar.test.tsx"
      ],
      "message": "fix(shell): 设置/用户中心页头吸顶——Header 移出滚动流 + 共享 PageTopbar（#96）"
    }
  },
  "knowledge": null
}
---

# 设置/用户中心页头吸顶：Header 移出滚动流

## 动机

Settings/User 页面的页内 Header（「< 返回 + 页面标题」栏）写在滚动容器内部，内容一滚 Header 就消失，长列表页（尤其设置页插件清单）没有常驻的页面上下文与返回入口。用户要求 Header 吸顶不随滚动。现状：4 个右栏页面（settings/account/drafts/projects）同病，本次只做点名的 settings + account 两页；/editor 页是唯一的「Header 在滚动流外（flex 固定）」参照实现。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 右栏页面 = `app/(shell)/<segment>/page.tsx` 路由段；settings 页含左列 SettingsNav（已 sticky top:8px）+ 右侧 Sections 的 grid 两栏；account 单列 760px
  - 适用 scope: app, components
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: Message 横幅挂 MainColumn 文档流内、TitleBar 之下（页面滚动容器之外）——页头吸顶不得影响横幅位置
  - 适用 scope: components/ui
- norms/ui-patterns.md、norms/interaction.md：复用优先、瞬时布局（禁布局位移动画）、键盘可达

## 决策

- **选型:** 头部移出滚动流（对齐 /editor 页 flex 固定范式）——页面根改为 flex 列容器（无 overflow），`PageTopbar` 为 flex:none 常驻顶行，内容区包进新的滚动容器（overflow:auto，原 padding 迁入）。顺势抽共享组件 `components/ui/PageTopbar.tsx`（返回按钮 + 标题槽位，onBack prop），settings/account 两页复用，消除两份复制粘贴的 Topbar。
- **对比方案:** sticky 补丁（四行 CSS 加 position:sticky + 负 margin 遮 gutter + 联动 SettingsNav top——改动小但每页一套补丁、层级细节毛糙，弃）。
- **理由:** /editor 页已验证该范式；吸顶是结构性质而非补丁性质，后续 drafts/projects 若要跟进直接复用 PageTopbar；SettingsNav 的 sticky 以新滚动容器为基准，top:8px 语义不变。

## 任务

### Phase 1 结构重构
- [x] 新增共享 `PageTopbar`（返回按钮 + 标题，onBack prop；视觉沿用现有 Topbar）—— `components/ui/PageTopbar.tsx`（新）
- [x] settings 页重构：Page 根改 flex 列，Topbar 移出滚动流，内容区包进滚动容器（原 padding 迁入）；SettingsNav sticky 语义验证 —— `components/settings/SettingsPage.tsx`
- [x] account 页重构：同构改造 —— `components/account/AccountPage.tsx`

### Phase 2 验证
- [x] 渲染冒烟测试：两页 Header 在滚动容器外、内容区独立滚动 —— `tests/page-topbar.test.tsx`（新）
- [x] `pnpm typecheck` + `pnpm test` 全绿；手动走查：两页滚动时 Header 固定、settings 左列 sticky 正常、Message 横幅位置不变、返回行为不变

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（settings/account 页结构：页头移出滚动流的 flex 固定范式 + PageTopbar 共享组件）
- **理由:** 右栏页面骨架结构变更，现有卡片描述的页面构成已过期。
