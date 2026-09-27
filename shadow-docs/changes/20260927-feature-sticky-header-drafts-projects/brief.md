---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-feature-sticky-header-drafts-projects",
  "type": "feature",
  "scope": "app",
  "status": "published",
  "baseBranch": "main",
  "branch": null,
  "files": [
    "app/(shell)/drafts/DraftsPage.tsx",
    "app/(shell)/drafts/styles.ts",
    "app/(shell)/projects/ProjectsPage.tsx",
    "app/(shell)/projects/styles.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 120,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/120",
    "pullRequest": 128,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/128"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "e20ae2bf492f54b7271db557164abb3e9ce4a65e",
    "verifiedAt": "2026-09-27T08:36:28.402Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:128",
    "planHash": "5a2514aa8e05836bed62bb81b32f0a281ae37ed359b3b1c4e08b3b12ce23bd6e",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] feature: drafts/projects 页头吸顶跟进（对齐 PageTopbar 范式）",
      "titleRaw": "feature: drafts/projects 页头吸顶跟进（对齐 PageTopbar 范式）",
      "supplement": "20260925-fix-page-header-sticky 声明的候选后续：drafts/projects 两页页头移出滚动流（根 flex 列无 overflow + Head 固定 + 内容区独立滚动容器），搜索框与动作钮长列表下不再滚走；严格复用已验证范式，渲染冒烟锁定。方案见 shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md",
      "body": "## 动机\n20260925-fix-page-header-sticky 建立了「页头固定在滚动流之外」范式并只落地了 settings/account 两页，brief 明确记录 drafts/projects「同病候选后续」：两页的页头（标题/计数/动作钮）仍在滚动流内，长列表滚动时页头滚走，搜索框与「打开目录」入口随之不可达。两个页面刚在 20260927 完成文件夹化（ProjectsPage/DraftsPage + styles.ts），改造成本最低。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md：右栏页头吸顶范式（页面根无 overflow、页头固定、内容区包独立滚动容器）——本变更为范式第二次推广\n- norms/ui-patterns.md（经 menu 路由的 UI 变更通用约束）：滚动容器/层级/降级\n- norms/tdd-verification.md：M 级=绿灯测试\n\n## 决策\n- **选型:** 两页同构改造：根容器（原 PageShell）改为 `display:flex; flex-direction:column; overflow:hidden`（去掉滚动与 padding），Head 移出滚动流保持固定，新增内容滚动容器（承接原 padding 与 overflow:auto）包裹搜索框/列表主体；移动端 media 查询 padding 随迁；pageEnter 入场动画移至根容器保留。不动数据流、openFile/openDraft 交互与测试断言的可见结构。\n- **对比方案:** ①给 Head 加 position:sticky——范式不统一（既有两页是 flex 固定法），弃；②只改 projects 不改 drafts——同病不同治，弃。\n- **理由:** 严格复用已验证范式，第二次推广即成惯例；行为变化局部且渲染冒烟可锁定。\n\n## 任务\n### Phase 1\n- [ ] projects 页改造：根 flex 列 + Head 固定 + 内容滚动容器——`app/(shell)/projects/ProjectsPage.tsx`、`styles.ts`\n- [ ] drafts 页同构改造——`app/(shell)/drafts/DraftsPage.tsx`、`styles.ts`\n- [ ] 回归：projects-render/drafts-render/projects-tree 绿——`tests/`\n### Phase 2\n- [ ] 全量 vitest + 三 tsconfig typecheck——`package.json`\n- [ ] brief 结果回填——`shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md`\n\n## 补充\n20260925-fix-page-header-sticky 声明的候选后续：drafts/projects 两页页头移出滚动流（根 flex 列无 overflow + Head 固定 + 内容区独立滚动容器），搜索框与动作钮长列表下不再滚走；严格复用已验证范式，渲染冒烟锁定。方案见 shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md\n\n完整 brief：shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-feature-sticky-header-drafts-projects\",\"type\":\"feature\",\"scope\":\"app\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "release": {
      "files": [
        "app/(shell)/drafts/DraftsPage.tsx",
        "app/(shell)/drafts/styles.ts",
        "app/(shell)/projects/ProjectsPage.tsx",
        "app/(shell)/projects/styles.ts",
        "shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md"
      ],
      "message": "feature: drafts/projects 页头吸顶跟进——两页按 PageTopbar 范式改造（根 flex 列无 overflow + Head 固定 + 内容区独立滚动容器），长列表滚动时标题/搜索/动作钮常驻；吸顶范式四页全覆盖，tsc next PASS + 页面回归 18 用例 + 全量 59 文件/511 用例单次全绿（Closes #120）",
      "title": "feature: drafts/projects 页头吸顶（对齐 PageTopbar 范式）",
      "body": "Closes #120\n\n完整 brief：shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/renderer-shell-routing.md",
    "reason": "drafts/projects 两页按 PageTopbar 范式完成页头吸顶，tsc next PASS + 页面回归 18 用例 + 全量 59 文件/511 用例单次全绿；吸顶范式段落由两页扩为四页全覆盖，release 时补 verified-depth: unit 与 verified-scope"
  }
}
---

# drafts/projects 页头吸顶跟进（对齐 PageTopbar 范式）

## 动机
20260925-fix-page-header-sticky 建立了「页头固定在滚动流之外」范式并只落地了 settings/account 两页，brief 明确记录 drafts/projects「同病候选后续」：两页的页头（标题/计数/动作钮）仍在滚动流内，长列表滚动时页头滚走，搜索框与「打开目录」入口随之不可达。两个页面刚在 20260927 完成文件夹化（ProjectsPage/DraftsPage + styles.ts），改造成本最低。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更=无（视觉/交互行为变化为页头定位方式，路由/数据流/既有 aria 语义不变）；触及面=两个页面的布局容器结构（对齐既有范式，非新设计）；可发现性=高（projects-render/drafts-render 测试网 + 渲染即可见）。
- **期望验证深度:** unit

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md：右栏页头吸顶范式（页面根无 overflow、页头固定、内容区包独立滚动容器）——本变更为范式第二次推广
- norms/ui-patterns.md（经 menu 路由的 UI 变更通用约束）：滚动容器/层级/降级
- norms/tdd-verification.md：M 级=绿灯测试

## 决策
- **选型:** 两页同构改造：根容器（原 PageShell）改为 `display:flex; flex-direction:column; overflow:hidden`（去掉滚动与 padding），Head 移出滚动流保持固定，新增内容滚动容器（承接原 padding 与 overflow:auto）包裹搜索框/列表主体；移动端 media 查询 padding 随迁；pageEnter 入场动画移至根容器保留。不动数据流、openFile/openDraft 交互与测试断言的可见结构。
- **对比方案:** ①给 Head 加 position:sticky——范式不统一（既有两页是 flex 固定法），弃；②只改 projects 不改 drafts——同病不同治，弃。
- **理由:** 严格复用已验证范式，第二次推广即成惯例；行为变化局部且渲染冒烟可锁定。

## 任务
### Phase 1
- [x] projects 页改造：根 flex 列 + Head 固定 + 内容滚动容器——`app/(shell)/projects/ProjectsPage.tsx`、`styles.ts`
- [x] drafts 页同构改造——`app/(shell)/drafts/DraftsPage.tsx`、`styles.ts`
- [x] 回归：projects-render/drafts-render/projects-tree 绿——`tests/`
### Phase 2
- [x] 全量 vitest + 三 tsconfig typecheck——`package.json`
- [x] brief 结果回填——`shadow-docs/changes/20260927-feature-sticky-header-drafts-projects/brief.md`

## 结果
- 实际耗时: 约 40 分钟
- 验证: tsc next PASS；projects-render/drafts-render/projects-tree 回归 18 用例绿；全量确认跑 **59 文件 / 511 用例单次全绿**
- 偏差与发现:
  1. Head 直接携带吸顶样式（flex:none + max-width 860 居中 + 自身 padding），未新增包裹层——与 PageTopbar 的 Row 同构；内容列 Inner 增加 width:100%/box-sizing 对齐居中语义。
  2. 原滚动 padding（20px 32px 48px / @768 16px 16px 40px）迁移：垂直部分入 Head（顶部）与 ScrollArea（底部 48px/40px），水平部分 Head 与 ScrollArea 各自承担。
  3. SearchInput/GroupList/ErrorText 相对顺序与断言可见结构不变，既有渲染冒烟未改一行即绿。

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md
- **理由:** 页头吸顶范式段落更新：settings/account 扩展为四页全覆盖，「drafts/projects 同病候选后续」表述退役；release 时按 verified-depth: unit 复评写入。
