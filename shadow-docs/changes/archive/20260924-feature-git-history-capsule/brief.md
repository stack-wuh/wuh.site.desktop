---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-git-history-capsule",
  "type": "feature",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-git-history-capsule",
  "files": [
    "plugins/git-history/logic/status.js",
    "plugins/git-history/plugin.json",
    "plugins/git-history/view/view.js",
    "shadow-docs/knowledge/shell-chrome-design.md",
    "tests/plugin-manifests-real.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 88,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/88",
    "pullRequest": 94,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/94"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "31ab5ec087f33cef9b552943ac1e22eb95fcea67",
    "verifiedAt": "2026-09-25T01:27:55.063Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:94",
    "planHash": "a19be810c4af21fbe4b45edff92fd086d8535d0c931644bc77a8fef9b84cc4e0",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] Git History 接入胶囊 + 文件历史直达",
      "body": "",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# Git History 接入胶囊 + 文件历史直达

## 动机

用户诉求：文件要有历史记录功能。现有 `git-history` 官方参考插件已具备完整 Git 能力面（工作区状态/提交/推送/拉取/按文件或全仓历史/revert），但两个入口缺口使其不可发现：① 未接入胶囊——manifest 无 `capsule` 声明，胶囊面板「模块」tab 看不到 Git 状态（对比 github-issues 已有模块 tile）；② 文件历史只能在插件视图内手动切 scope，编辑器里没有「看当前文件历史」的直达路径。本次把现有插件接入胶囊入口 + 视图自动跟随当前文档，文件历史两击可达（点胶囊模块 → 跳 Git 视图即见当前文件历史）。

## 引用规范

- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 插件能力调用只走 `CAPABILITY_METHODS` 白名单 + 权限词表（gitStatus→git.status.read 等已就位）；manifest 声明制；逻辑帧为经典脚本语义运行于沙箱不透明源帧；插件停用清空、启用重注册
  - 适用 scope: src/shared/plugin.ts, plugins/git-history
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: capsule 贡献点为声明制槽位（manifest `capsule` 段，template `count|status`，每插件 ≤2，icon 白名单，viewId 须 main 区域视图），运行时经 SDK `wuh.capsule.update/remove` 只能更新/隐藏自己声明过的模块；status 模板 text 1-60 字符、detail ≤80；胶囊面板「任务 | 模块」双 tab，模块 tab 渲染 capsule tiles；胶囊 chip 微进度环是任务聚合语义，与 capsule 模块无关
  - 适用 scope: plugins/git-history, lib/capsule.ts
- 父仓 shadow-docs/knowledge/desktop-plugin-architecture.md
  - 当前结论: 官方参考插件（含 git-history）与第三方同约束——纯静态资产、不消费宿主组件、样式仅用注入主题 token 变量、第三方依赖自 vendor；「plugins/*/plugin.json 均过 validateManifest」是验证基线
  - 适用 scope: plugins/git-history

## 决策

- **选型:** 方案甲——逻辑帧常显上报 + 视图 doc 事件跟随。git-history 加 `logic` 帧（`logic/status.js`）与 `capsule` 声明（status 模板）；逻辑帧启动经 `gitStatus` 上报胶囊模块（text 如 `main · 2 未提交`，干净时显示分支名，非 git 仓库失败静默保持隐藏），并订阅 `doc.saved`/`doc.opened`/`workspace` 事件刷新；`view/view.js` 订阅 `doc.opened`/`doc.closed` 自动跟随当前文档切 file scope（无文档回 all），手动 scope 切换保留。
- **对比方案:** 乙（视图帧上报——视图不开则模块 stale/隐藏，「胶囊做入口」语义打折，否）；丙（甲 + 20s 轮询 gitStatus——覆盖终端等外部操作但引入常驻定时器，第一期收益有限，列为非目标）。
- **理由:** 零宿主代码改动、零新能力通道——完全复用声明制 capsule 槽位与 `documentEvents` 既有广播链路（SDK `wuh.on` 已可感知）；遵循 github-issues 确立的「胶囊模块由常驻逻辑帧维护、失败静默隐藏」惯例。能力面零扩展符合 plugin-architecture 白名单约束。

**非目标:** 宿主编辑器工具栏入口；外部 git 操作轮询；push/pull 经 tasks 贡献点上报时间线；胶囊 chip 语义与挂点改动。

## 任务

### Phase 1 胶囊模块（逻辑帧）
- [x] plugin.json 加 `logic: "logic/status.js"` 与 `capsule: [{ id: 'status', title: 'Git', icon: 'git-branch', template: 'status', viewId: 'git' }]` — `plugins/git-history/plugin.json` — 修改
- [x] 逻辑帧：启动 `gitStatus` → `capsule.update`（分支名 · N 未提交 / 干净态 / ahead-behind 进 detail；非 git 仓库静默保持隐藏）；`doc.saved`/`doc.opened`/`workspace` 事件驱动刷新；全程失败静默 — `plugins/git-history/logic/status.js` — 新增
- [x] 真实插件清单契约测试：扫描 `plugins/*/plugin.json` 全部过 `validateManifest`，并锁定 git-history 的 logic 入口、capsule 声明（template/status、viewId 指向存在 main 视图）与 git 权限声明 — `tests/plugin-manifests-real.test.ts` — 新增

### Phase 2 视图跟随与走查
- [x] view.js 订阅 `doc.opened`/`doc.closed`：有文档自动切 file scope 并加载该文件历史，无文档回 all scope；手动 scope 切换与既有 revert 流程不动 — `plugins/git-history/view/view.js` — 修改
- [x] `pnpm typecheck` + `pnpm test` 全绿（plugin-capsule / plugin-manifest / plugin-sdk 回归）
- [x] 实机走查：启用 git-history → 胶囊模块 tile 显示分支与未提交数 → 点 tile 跳 Git 视图 → 编辑器打开文件后视图自动切该文件历史 → 关文档回全仓 → 非 git 目录模块隐藏 → 插件停用模块消失
- [x] 知识写回：shell-chrome-design.md 胶囊段补 git-history 参考生产者、status 模板文本惯例与「视图 doc 跟随」直达惯例 — `shadow-docs/knowledge/shell-chrome-design.md` — 更新

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/shell-chrome-design.md
- **理由:** 胶囊段新增第二个 capsule 参考生产者（git-history）与 status 模板文本惯例、视图 doc 跟随直达惯例；plugin-architecture 无契约变化（能力面/协议零改动）。

## 走查发现（review 定稿：插件帧四层修复，全部实机验证）

实机走查（CDP 驱动 electron，worktree 隔离 dev）发现**插件帧体系三层存量损坏 + 一处定时器泄漏**，均为本 change 功能的前置阻塞，已全部修复并实机验证：

1. **protocol.handle 尾冒号静默失效**（`src/main/plugins/protocol.ts`）：electron 44.4.5 下 `protocol.handle('plugin:', …)` 注册不报错但 scheme 不可达——全部插件帧死于导航层（「external protocol blocked」+ 超时「帧文档未触发 load」）。修复：去掉尾冒号（Electron 文档要求 scheme 不含冒号）。
2. **SDK 下发缺口**：视图 HTML 从不加载 sdk.js（`window.wuh` 恒 undefined）、逻辑宿主用命名 `import { __startLogic }` 而 SDK 是无导出 IIFE（恒 SyntaxError）。修复：git-history 视图 HTML 自带 `<script src="/@core/sdk.js"></script>`（`plugins/git-history/view/index.html`）；逻辑宿主改经典脚本对 + 逻辑入口绝对 URL（`protocol.ts`）。
3. **握手定时器 StrictMode 误杀**（`components/plugins/PluginFrameHost.tsx`）：closeFrame 不取消 hello 定时器，双挂载下旧帧定时器 5s 后误杀已握手成功的同 key 后继帧，且错误被旧 effect 的 alive 守卫吞掉（界面零报错的空白面板）。修复：定时器落 FrameState.helloTimer、closeFrame 清除、回调守卫「只关自己」。
4. **资产契约测试豁免虚拟路径**（`tests/plugin-assets.test.ts`）：视图引用 `/@core/*` 为协议虚拟文件（非插件目录文件），测试豁免之。

**实机验证通过清单**：逻辑帧握手 + gitStatus 能力调用（broker 链路）；胶囊「Git 状态」tile 实机渲染真实分支（`feature/20260913-feature-desktop-markdown-editor`）；tile 点击 viewId 跳转 Git 视图；Git 面板完整渲染（状态行/提交框/Push/Pull/scope 切换/30 条提交历史）；**文件历史直达**——打开 `00.前言.md` 后进 Git 视图自动切「当前文件」scope + 标题「历史 · apps/blog/docs/$AST/00.前言.md」；非 git 工作区模块静默隐藏 + 视图正确报错。

**验证基线**：vitest 50 文件 / 421 用例全绿；tsc 三侧全绿（139 段错误重试收敛为机器已知问题）。
