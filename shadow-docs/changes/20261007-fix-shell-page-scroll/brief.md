---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-fix-shell-page-scroll",
  "type": "fix",
  "scope": "renderer-shell",
  "status": "branched",
  "baseBranch": "main",
  "branch": "fix/20261007-fix-shell-page-scroll",
  "files": [
    "app/(shell)/drafts/styles.ts",
    "app/(shell)/projects/styles.ts",
    "components/account/AccountPage/styles.tsx",
    "components/settings/SettingsPage.tsx",
    "tests/page-root-scroll.test.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "bad80c722512fe2aa54a13aa517931f5ae995bf6f8b605ef4377a78b53824ee2",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        "app/(shell)/drafts/styles.ts",
        "app/(shell)/projects/styles.ts",
        "components/account/AccountPage/styles.tsx",
        "components/settings/SettingsPage.tsx",
        "shadow-docs/changes/20261007-fix-shell-page-scroll/brief.md",
        "tests/page-root-scroll.test.ts"
      ],
      "message": "fix(shell): 页面根 min-height:0 封顶 —— 长页把文档层撑出滚动导致侧栏/标题栏跟随滚动，补齐 settings/drafts/projects/account 四页根容器并加源码级守卫"
    }
  }
}
---

# fix(shell): 长页把文档层撑出滚动 —— 侧栏/标题栏跟随页面滚动

## 动机
用户实测反馈（设置页截图）：滚动长页面时左侧 SideMenu 与 TitleBar 跟随滚动，应固定。根因：采用「页面根 flex 列 + 内容独立滚动容器」（PageTopbar 吸顶范式，renderer-shell-routing 卡）的页面根缺 `min-height: 0`——flex 列项的 `min-height: auto` 以内容高度托底，内容一长根容器撑破 `min-height: 0` 的 MainColumn，溢出落到文档层，body 成为滚动容器，整个壳层随之滚动。settings（#144 新增图床区块后内容更长，首发症状）/ drafts / projects / account 四页根容器同漏；editor 页根自带 `min-height: 0`、home 页根自滚动（`overflow: auto` 使 flex 最小高度归零）不受影响。

## 复杂度评级
- **评级:** M
- **理由:** 有行为但局部（四个页面的滚动语义修正为范式本意），不改契约、不动共享组件；改坏立即可见（布局）
- **期望验证深度:** unit（源码级守卫测试防回归）+ 实机走查

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 页面根无 overflow、页头固定在滚动流之外、内容区包进独立滚动容器（PageTopbar 吸顶范式）
  - 适用 scope: app/(shell) 各页面根容器
  - 本次即修复对该范式的违反，不改范式

## 决策
- **选型:** 为 settings / drafts / projects / account 四个页面根补 `min-height: 0`（一行一处），并加源码级守卫测试（tests/page-root-scroll.test.ts，capsule-nesting 源码守卫先例）锁定四个根
- **对比方案:** body 加 `overflow: hidden` 兜底——只把「侧栏滚动」换成「内容不可达」，掩盖而非修复；MainColumn 加 overflow: hidden——同样裁剪内容且不解决页面根托底
- **理由:** 根因是页面根漏了范式要求的封顶，逐页补齐 + 守卫测试是唯一既修复又不引入新失败模式的路径

## 任务
### Phase 1
- [ ] 四个页面根补 min-height: 0（settings Page / drafts PageShell / projects PageShell / account Page） — `components/settings/SettingsPage.tsx`、`app/(shell)/drafts/styles.ts`、`app/(shell)/projects/styles.ts`、`components/account/AccountPage/styles.tsx`
- [ ] 源码级守卫测试锁定四个页面根 — `tests/page-root-scroll.test.ts`
- [ ] 回归：settings/account/page-topbar 渲染测试 + 双侧 tsc — vitest

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md（吸顶范式段补一句「页面根必须 min-height: 0 封顶，文档层不得成为滚动容器」约束）
- **理由:** 该遗漏是范式落地时的系统性缺口，值得在卡片里显式成文防再犯
