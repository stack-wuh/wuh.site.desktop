---
{
  "schema": "shadow-dev/v1",
  "name": "20261015-chore-release-v1.0.0",
  "type": "chore",
  "scope": "distribution",
  "status": "published",
  "baseBranch": "main",
  "branch": "chore/20261015-chore-release-v1.0.0",
  "files": [
    "package.json",
    "shadow-docs/changes/20261015-chore-release-v1.0.0/brief.md"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 155,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/155"
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:155",
    "planHash": "2313f60445ef30008f83d23c885acd3ae1e5155534fec2394de933e8aaf30abb",
    "updatedAt": null,
    "lastError": null,
    "release": {
      "files": [
        "package.json",
        "shadow-docs/changes/20261015-chore-release-v1.0.0/brief.md"
      ],
      "message": "chore(release): v1.0.0 版本号 bump——首个正式版本",
      "title": "chore(release): v1.0.0 版本号 bump——首个正式版本",
      "body": "## 发布 v1.0.0\n\n纯发版载体：bump `package.json` `0.1.0 → 1.0.0`，桌面端首个正式对外版本，不携带实现代码。\n\n### 覆盖范围\n\n无历史 tag 基线，首版覆盖 main 全部已合并 change，重点：\n\n- **工作台壳层重设计**（#154）：rail + 可停靠面板 + 插件挂点系统化 + 专注模式 + ⌘K 命令面板\n- **图床链路**：图床插件、上传选择交互（#152）、设置 UX 修复（#146/#147）\n- **frontmatter 渲染隐藏**（#150）\n- **编辑器渲染修复**（#137/#139）与滚动/虚拟列表样式（#149）\n- 更早已合并能力（CodeMirror 编辑器内核、虚拟项目树、GitHub 授权、文档迁移）一并纳入首版\n\n### 门禁证据\n\n- node 22.23.2（mise 钉定）+ 独立 lockfile 安装：`pnpm install --ignore-workspace --frozen-lockfile`\n- 全量测试 **769/769 通过（87 文件）**，于 main `1420062` 取证\n\n### 合并后动作（tag 必须指向已含 bump 的 tree：先合并，后打 tag）\n\n1. `git tag v1.0.0 && git push origin v1.0.0`\n2. `gh release create v1.0.0 --generate-notes`（安装包按需手动 `pnpm dist` 后附资产）\n\n完整 brief：`shadow-docs/changes/20261015-chore-release-v1.0.0/brief.md`"
    }
  }
}
---

# 发布 v1.0.0 —— 首个正式版本

## 动机
发布 v1.0.0：工作台壳层重设计（Writing Workbench）落地作为 1.0 里程碑，桌面端迎来首个正式对外版本。本变更为纯发版载体——bump 版本号 + 打 tag + GitHub Release，不携带任何实现代码。

## 复杂度评级
- **评级：** S
- **理由：** 纯声明式配置（单 manifest 版本号），零行为契约变更；结果立即可见（tag 与 Release URL）。
- **期望验证深度：** diff 走查 + 版本同源校验

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md（构建/工具链路由命中）
  - 当前结论: pnpm workspace + mise 钉定 node 22.23.2
  - 适用 scope: 仓库根
  - 遵循: 仅 bump package.json 的 version 字段，不动依赖与工具链 pin

## 覆盖范围
无历史 tag 基线，首版覆盖 main 全部已合并 change，重点：
- 20261015-feature-workbench-shell（PR #154）——工作台壳层重设计：rail + 可停靠面板 + 插件挂点系统化 + 专注模式 + ⌘K 命令面板
- 20261008-feature-image-upload-choice（PR #152）——图床上传选择交互（双链回传契约）
- 20261007-feature-frontmatter-editor-hide（PR #150）——frontmatter 渲染态隐藏与光标浮现
- 20261007-feature-image-host-plugin——图床插件（任务上报/批量进度/datalist）
- 20260928-fix-editor-render-defects（PR #139）/ 20260928-plugin-view-sdk（PR #137）——编辑器渲染语言与插件视图 SDK 修复
- 20261007 系列 fix/style——shell 页面滚动修复、图床设置 UX、滚动条与虚拟项目列表样式
- 更早已合并能力（CodeMirror 编辑器内核、虚拟项目树、GitHub 授权、文档迁移等）一并纳入首版

## 决策
- **版本号：** v1.0.0（用户商定：以工作台范式落地宣告成熟里程碑）
- **单 manifest 仓：** 仅 bump package.json（本仓无宿主清单，无 bump-version.mjs / check:version 设施，版本同源校验以 grep package.json 为准）
- **发版能力缺口：** CLI 1.6.0 命令目录不含发版命令键（publish.* 语义为推分支+PR，非打 tag）——tag 与 GitHub Release 按 publish 技能第 5 节响亮阻塞并委托用户执行；缺口记入结果段，待 execution-layer 提供发版命令键后由后续 change 替换为 CLI 调用

## 任务
### Phase 1 bump 与合并
- [ ] bump package.json version → 1.0.0，经 release 提交并创建 PR — `package.json` + `shadow-docs/changes/20261015-chore-release-v1.0.0/brief.md`
- [ ] PR 合并 main（tag 必须指向已含 bump 的 tree：先合并，后打 tag）

### Phase 2 发版（能力缺口，委托用户）
- [ ] 用户执行：复核 `package.json` version == 1.0.0（无 bump 脚本，grep 复核）
- [ ] 用户执行：`git tag v1.0.0 && git push origin v1.0.0`
- [ ] 用户执行：`gh release create v1.0.0 --generate-notes`（安装包按需手动 `pnpm dist` 后附资产）

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响：** 无需变更
- **候选卡片：** 无
- **理由：** 版本号与 Release 是发布事件本身，不构成跨变更执行约束；发版能力缺口若落地治理，届时按 norms/knowledge-cards.md 更新对应卡片。
