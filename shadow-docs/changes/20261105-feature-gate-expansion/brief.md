---
{
  "schema": "shadow-dev/v1",
  "name": "20261105-feature-gate-expansion",
  "type": "feature",
  "scope": ".github",
  "status": "committed",
  "baseBranch": "main",
  "branch": "feature/20261105-feature-gate-expansion",
  "files": [
    ".github/workflows/ci-cd.yml",
    "package.json"
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
    "checkpoint": "0507d18c05021d08d08a5c1556488373e4ef7aad",
    "planHash": "6ef2c80aebe904478dbb64d9c683f98219e788bc0727f7605e5f74ed1516dc9a",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        ".github/workflows/ci-cd.yml",
        "package.json"
      ],
      "message": "feat(ci): 门禁扩容——next build + oxlint 进门、frozen-lockfile、PR 并发取消 (#183)\n\n- install --frozen-lockfile：lockfile 与 package.json 漂移即红（INV-2）\n- next build 编译完整性进机器门 + oxlint 1.91.0（npx 钉版本，零依赖变更——规避父 workspace 上下文 pnpm 锁写不可靠的实测坑）\n- 门并发 cancel-in-progress（release 构建保持不可取消）\n- 门即全部校验权威：本机不再承担任何校验（用户 directive）"
    }
  }
}
---

# 质量门扩容：next build + oxlint 进门、frozen-lockfile、PR 并发取消

## 动机

用户 directive：代码校验全部转移到 GitHub CI/CD（本机不再做任何校验），质量检查失败不许构建，且 x.wuh.site 家族四仓统一。desktop 仓首建 CI（PR #182）后，按定案（方案 2 自治 + 策略 i required check 不禁直推）扩容门内容，使其成为「全部校验」的唯一权威：

- `pnpm install --frozen-lockfile`：防 CI 静默解析出与 lockfile 不同的依赖树
- `next build` 进门：编译完整性归机器门
- oxlint 进门：本仓此前无 lint；28 警告 0 错误（默认拦 error 不拦 warning），镜像父仓 oxlint 栈、经 npx 钉版本（无 devDep/lockfile 变更——本机 pnpm 在父 workspace 上下文下锁写不可靠，实测教训）
- PR 并发取消旧 run（release 构建保持不可取消）：省 minutes

## 复杂度评级

- **评级:** M
- **理由:** 行为局部（workflow gate 步骤与脚本），无应用代码契约变更；门自身由本 PR 的 CI 自证
- **期望验证深度:** runtime
- **取证策略:** observation（本 PR 的 CI run 即扩容后门的首次自证：frozen-lockfile/lint/next build/test 全绿）

## 引用规范

- knowledge/install-distribution.md（CLI 仓先例）
  - 当前结论: windows bash 坑、$GITHUB_PATH 同 run 不可见、版本权威
  - 适用 scope: .github/workflows/ci-cd.yml
  - 遵循方式: 既有 job 级 bash shell 与版本断言不变
- shadow-docs/knowledge/desktop-app-architecture.md
  - 当前结论: 独立仓依赖安装必须 --ignore-workspace（父 workspace 上下文会锁写不可靠——本次实测复证）
  - 适用 scope: 依赖变更方式
  - 遵循方式: 本变更零依赖变更（npx 钉版本），规避该坑

## 领域模型

- **限界上下文:** desktop 交付链（沿 20261104-feature-ci-release-pipeline 既有卡面）
- **聚合与不变量:**
  - **INV-1** 门即全部校验权威：gate 含 lint + 三 tsc + next build + vitest，本机不再承担校验职责
  - **INV-2** 依赖锁定：CI 一律 frozen-lockfile，lockfile 与 package.json 漂移即红
  - **INV-3** 门红不许构建：既有 needs 依赖不变，release 矩阵只在绿门后启动
- **领域事件:** 无。

## 决策

- **选型:** oxlint 经 `npx -y oxlint@1.91.0`（registry 钉版本）而非 devDep——规避本机 pnpm 在父 workspace 上下文的锁写不可靠（实测两次复证），且零 lockfile 变更降低门自身风险
- **对比方案:** ①oxlint devDep——本机 pnpm 锁写挂死（父 workspace 上下文污染风险），否决；②shared reusable workflow——用户已裁定方案 2 自治
- **理由:** 门自身越简单越可信；npx 钉版本的可复现性足够（CI runner 每次全新解析）

## 任务

### Phase 1
- [ ] task 1 — `.github/workflows/ci-cd.yml` — frozen-lockfile / lint / next build / 并发取消 — 编辑（INV-1/2）
- [ ] task 2 — `package.json` — lint 脚本（npx 钉版本） — 编辑
- [ ] task 3 — 本 PR 的 CI run 即门自证：全步骤绿 — runtime 观察点（INV-1/2/3）

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/ci-release-pipeline.md（若 20261104-feature-ci-release-pipeline 归档时建卡则并入；否则建卡时统一承载）
- **理由:** 门内容扩容属交付链卡面增量
