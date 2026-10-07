---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-chore-restore-pnpm-lockfile",
  "type": "chore",
  "scope": "build",
  "status": "branched",
  "baseBranch": "main",
  "branch": "chore/20261007-chore-restore-pnpm-lockfile",
  "files": [
    "pnpm-lock.yaml"
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
    "planHash": "8ff0a9db939c86d734103a8cbc379cca1a94804dd98eb1aae875c471e0f64c39",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        "pnpm-lock.yaml",
        "shadow-docs/changes/20261007-chore-restore-pnpm-lockfile/brief.md"
      ],
      "message": "chore(build): 恢复 pnpm-lock.yaml 版控跟踪 —— 架构迁移时意外丢失，frozen-lockfile 校验一致"
    }
  }
}
---

# 恢复 pnpm-lock.yaml 版控跟踪

## 动机
Next.js 架构迁移（#131/#135 期间的仓库重组）把 `pnpm-lock.yaml` 从 git 跟踪中意外丢掉了：旧 main（38083ec）跟踪该文件，新 main（c370064）未跟踪且 `.gitignore` 无 lock 排除条目（非有意行为）。后果：CI 与协作者安装依赖时无锁定版本可依（`--frozen-lockfile` 无从校验），依赖树随时间漂移。本变更把本地已生成的 lockfile（`pnpm install --frozen-lockfile` 校验与 package.json 一致）重新纳入版控。

## 复杂度评级
- **评级：** S
- **理由：** 纯声明式配置恢复，零行为契约变更；触及面单一文件；结果立即可见（git ls-tree / frozen-lockfile 校验）。
- **期望验证深度：** diff 走查 + 结构校验（`pnpm install --frozen-lockfile`）

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md（构建/工具链路由命中）
  - 当前结论: pnpm workspace + mise 钉定 node 22.23.2（与 CI 同版本）
  - 适用 scope: 仓库根
  - 遵循: lockfile 与 mise 钉定版本配套提交，不改动 pin
- norms/code-style.md
  - 当前结论: 渐进式治理，不顺手扩大范围
  - 适用 scope: 全仓
  - 遵循: 仅提交 lockfile，不动其他

## 决策
- **选型：** 直接提交现有 lockfile（已用 `pnpm install --frozen-lockfile` 验证与 package.json 严格一致，node 22.23.2 生成）。
- **对比方案：** 删除后重新 `pnpm install` 生成（现文件即本机干净生成的产物，重做无增益，否决）；改用 npm/yarn lockfile（偏离仓库工具链，否决）。
- **理由：** 最小且可校验的恢复动作。

## 任务
### Phase 1 恢复跟踪
- [ ] 提交 `pnpm-lock.yaml` 回版本控制 — `pnpm-lock.yaml` — 新增

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响：** 无需变更
- **候选卡片：** 无
- **理由：** lockfile 跟踪是仓库常识级状态，不构成跨变更执行约束；构建/工具链路由的既有卡片已覆盖 node 版本配套。
