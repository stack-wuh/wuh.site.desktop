---
{
  "schema": "shadow-dev/v1",
  "name": "20260922-fix-shell-avatar-app-icon",
  "type": "fix",
  "scope": "components,shadow-docs/knowledge",
  "status": "archived",
  "baseBranch": "main",
  "branch": "fix/20260922-fix-shell-avatar-app-icon",
  "files": [
    "components/SideMenu.tsx",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "shadow-docs/knowledge/shell-chrome-design.md"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 37,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/37",
    "pullRequest": 38,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/38"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "a09999583a6124c9419aabd6f1e441c4f6433456",
    "verifiedAt": "2026-09-22T07:35:33.831Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:38",
    "planHash": "61517bd38ab6d600116f948c251c1144926ba541b9de6d8ba0d300b96009019e",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[fix] 侧栏用户栏图标回退 APP 品牌标（去远程头像 img）",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\nGitHub 头像（`avatars.githubusercontent.com` 远程图片）在壳层渲染存在网络可靠性问题，时常规显示破损图标。壳层 chrome 不应依赖网络图片。用户后续将在 Settings 页新增「用户设置」（本地 name/avatar）接管显示源；本变更先回退侧栏头像渲染为 APP 品牌标。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 用户入口双态身份投影（UserAvatar 替代品牌标 + PopAvatar 面板头部小头像）——本变更**有意部分推翻**该结论的图片部分\n  - 适用 scope: SideMenu 用户入口/快捷面板的视觉数据源（图标回退品牌标，名字文本投影保留）\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 全局身份 store 消费方含 SideMenu 入口/快捷面板头部与 HomePage 问候\n  - 适用 scope: 消费方从「头像+文本」收窄为「仅文本」；store 机制本身不动\n\n## 决策\n- **选型:** 仅删除壳层远程头像 img 渲染——入口图标恒为品牌标 IconLogo（展开/折叠同）、快捷面板头部去掉 PopAvatar（保留用户名文本，未授权回落「用户」）；GitHub 用户名文本与首页问候带名**保留**（文本走 API 响应，无网络图片问题）\n- **对比方案:** 连身份 store 消费一起拆掉（回到纯品牌标 + 「用户」标题）——会把用户名文本联动与问候带名一并退掉，推翻昨日已确认需求的另一半；否决。连同「用户设置」本地接管一起做——用户明确表示该部分后续自行添加；本次不做\n- **理由:** 破损显示的根因是**远程图片**，文本无此问题；最小回退既消除破损图标又保留无网络依赖的联动价值。新增长期约束：**壳层禁止渲染远程头像图片，头像显示待本地用户设置接管**\n\n## 任务\n### Phase 1\n- [ ] SideMenu 去头像 img：入口恒为 IconLogo（删 UserAvatar 分支）、面板头部删 PopAvatar 渲染与两个 styled 组件、名字文本投影与回退保留 — `components/SideMenu.tsx` — 修改\n- [ ] 残留扫描：SideMenu.tsx 无 `<img`/`styled.img` 残留 — `components/SideMenu.tsx` — 验证\n- [ ] 知识卡回写：chrome 卡用户入口段改「图标恒品牌标 + 壳层远程头像禁令」；routing 卡 store 段消费方改文本投影 — `shadow-docs/knowledge/shell-chrome-design.md`, `shadow-docs/knowledge/renderer-shell-routing.md` — 修改\n\n完整 brief：shadow-docs/changes/20260922-fix-shell-avatar-app-icon/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260922-fix-shell-avatar-app-icon\",\"type\":\"fix\",\"scope\":\"components,shadow-docs/knowledge\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260922-fix-shell-avatar-app-icon/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "fix"
      ]
    }
  },
  "knowledge": null
}
---

# 侧栏用户栏图标回退 APP 品牌标（去远程头像 img）

## 动机

GitHub 头像（`avatars.githubusercontent.com` 远程图片）在壳层渲染存在网络可靠性问题，时常规显示破损图标。壳层 chrome 不应依赖网络图片。用户后续将在 Settings 页新增「用户设置」（本地 name/avatar）接管显示源；本变更先回退侧栏头像渲染为 APP 品牌标。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 用户入口双态身份投影（UserAvatar 替代品牌标 + PopAvatar 面板头部小头像）——本变更**有意部分推翻**该结论的图片部分
  - 适用 scope: SideMenu 用户入口/快捷面板的视觉数据源（图标回退品牌标，名字文本投影保留）
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 全局身份 store 消费方含 SideMenu 入口/快捷面板头部与 HomePage 问候
  - 适用 scope: 消费方从「头像+文本」收窄为「仅文本」；store 机制本身不动

## 决策

- **选型:** 仅删除壳层远程头像 img 渲染——入口图标恒为品牌标 IconLogo（展开/折叠同）、快捷面板头部去掉 PopAvatar（保留用户名文本，未授权回落「用户」）；GitHub 用户名文本与首页问候带名**保留**（文本走 API 响应，无网络图片问题）
- **对比方案:** 连身份 store 消费一起拆掉（回到纯品牌标 + 「用户」标题）——会把用户名文本联动与问候带名一并退掉，推翻昨日已确认需求的另一半；否决。连同「用户设置」本地接管一起做——用户明确表示该部分后续自行添加；本次不做
- **理由:** 破损显示的根因是**远程图片**，文本无此问题；最小回退既消除破损图标又保留无网络依赖的联动价值。新增长期约束：**壳层禁止渲染远程头像图片，头像显示待本地用户设置接管**

## 任务

### Phase 1
- [x] SideMenu 去头像 img：入口恒为 IconLogo（删 UserAvatar 分支）、面板头部删 PopAvatar 渲染与两个 styled 组件、名字文本投影与回退保留 — `components/SideMenu.tsx` — 修改
- [x] 残留扫描：SideMenu.tsx 无 `<img`/`styled.img` 残留 — `components/SideMenu.tsx` — 验证
- [x] 知识卡回写：chrome 卡用户入口段改「图标恒品牌标 + 壳层远程头像禁令」；routing 卡 store 段消费方改文本投影 — `shadow-docs/knowledge/shell-chrome-design.md`, `shadow-docs/knowledge/renderer-shell-routing.md` — 修改

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md、shadow-docs/knowledge/renderer-shell-routing.md
- **理由:** 用户入口段的双态头像投影被有意回退，需原位改写并沉淀「壳层禁远程头像图片」约束（头像待本地用户设置接管）；store 消费方清单收窄为文本投影
