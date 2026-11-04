---
{
  "schema": "shadow-dev/v1",
  "name": "20261104-feature-ci-release-pipeline",
  "type": "feature",
  "scope": ".github",
  "status": "published",
  "baseBranch": "main",
  "branch": "feature/20261104-feature-ci-release-pipeline",
  "files": [
    ".github/workflows/ci-cd.yml",
    "electron-builder.yml"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": 182,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/182"
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "pr:182",
    "planHash": "c6dd709254e37674be9a180175cc7f0405c68388803d2b45a94d6d8c490574fb",
    "updatedAt": null,
    "lastError": null,
    "commit": {
      "files": [
        ".github/workflows/ci-cd.yml",
        "electron-builder.yml"
      ],
      "message": "feat(ci): CI/CD 质量门 + release 远程构建 mac/win 包 (#182)\n\n- 单文件两段式（同构父仓）：quality-gate（PR/main：三 tsc + vitest 全量）+ build-release（release published + dispatch 演练）\n- 矩阵 macos/windows 互不遮蔽；版本权威断言（tag==package.json）沿 CLI 仓语义；job 级 bash shell 防 windows pwsh 坑\n- electron-builder target：mac dir→dmg+zip（unsigned）、win 显式 nsis；产物 gh release upload 同 tag"
    }
  }
}
---

# desktop CI/CD：质量门 + release 远程构建 mac/win 包

## 动机

desktop 仓（wuh.site.desktop）今日零 CI：PR 与 main 无机器门（typecheck/vitest 只在本机跑），发版无远程构建——应用包只能本机 `dist:mac` 手打（且本机沙箱对 spawn worker 不稳定）。用户要求：release 流程触发远程构建 mac/win 包，对齐父仓 x.wuh.site 的 CI-CD 模式（quality-gate + release 触发）。electron-builder.yml 现状 mac target 仅 `dir`（本地开发形态），win 未显式声明 target。

## 复杂度评级

- **评级:** L
- **理由:** ①契约变更——引入机器门（PR/main 的 typecheck+vitest 从本机约定升为放行门槛）+ 发版产物契约（tag 版本权威断言 + 资产名与上传）；②跨平台构建链（macos/windows runner 差异，CLI 仓已有 windows 踩坑先例）；③发布是外向产物。
- **期望验证深度:** runtime
- **取证策略:** observation（首个 workflow_dispatch 构建绿 + 首个真实 release run 产物在案；观察点=run 链接与资产清单）

## 引用规范

- 父仓库 .github/workflows/ci-cd.yml
  - 当前结论: quality-gate（pnpm+node22）+ release published 触发构建；concurrency 防并发
  - 适用 scope: .github/workflows/
  - 遵循方式: 同构简化——单体仓无需按应用变更检测，release 直建全平台
- shadow-dev-workflow knowledge/install-distribution.md（CLI 仓发布先例）
  - 当前结论: windows runner 的 bash/tar 坑；$GITHUB_PATH 同 run 不可见；版本权威=tag
  - 适用 scope: .github/workflows/ci-cd.yml
  - 遵循方式: job 级 `defaults.run.shell: bash`；版本断言内联在构建 job 首步；资产名带版本号
- shadow-docs/knowledge/desktop-app-architecture.md
  - 当前结论: 独立仓独立 lockfile；typecheck 三 tsconfig；vitest 默认 node 环境按文件开 DOM
  - 适用 scope: CI 步骤
  - 遵循方式: `pnpm install`（本仓独立无 --ignore-workspace 需求）+ `npm run typecheck` + `npm run test`

## 领域模型

- **限界上下文:** desktop 仓交付链。上游 = main 推送/PR/release published；下游 = GitHub Release 资产（mac dmg+zip、win nsis）。反腐边界：不改应用代码、不动 electron-builder 打包语义（只扩分发 target）、不引入签名/公证（无证书，待确认点）。
- **统一语言增量:** 机器门（quality gate）：PR/main 的 typecheck+vitest 放行门槛。发布构建（release build）：release published 触发的双平台远程打包与资产上传。
- **聚合与不变量:**
  - **INV-1** 版本权威：release 构建首步断言 tag 去 v == package.json.version，不一致即红（沿 CLI 仓 VERSION_AUTHORITY 语义）
  - **INV-2** 双平台矩阵：macos 与 windows 各产自有目标产物，一平台红不吞另一平台产物（matrix 互不遮蔽）
  - **INV-3** 机器门不半绿：PR/push main 必跑三 tsc + vitest 全量，任一红即阻断
  - **INV-4** 资产可发现：构建产物以 `wuh-site-desktop-<version>-<平台后缀>` 形态上传到同 tag 的 GitHub Release（electron-builder 产物名即含版本）
- **领域事件:** 无（workflow 内部流转）。

## 决策

- **选型:** 单文件 `.github/workflows/ci-cd.yml`：①quality-gate（ubuntu，pnpm 10.23 + node 22，typecheck + vitest）挂 push main + PR；②build-release（release published，matrix macos/windows，bash shell）版本断言 → next build → electron-vite build → electron-builder（配置内 target：mac dmg+zip / win nsis）→ `gh release upload` 到同 tag Release；③workflow_dispatch 供无 release 的构建演练（产物仅 workflow artifacts）。
- **对比方案:** ①tag push 直接触发（不经 GitHub Release）——与父仓「release published 触发」模式不一致且 tag 可误推，否决；②electron-builder 自带 publish（GH_TOKEN）——上传行为黑盒且对 release event 语义耦合，显式 gh release upload 更可审计，否决；③签名/公证——无 Apple 证书，本期不做（mac 包 unsigned，下载后需右键打开；记待确认点）。
- **理由:** 单体仓镜像父仓两段式（门+发布）足够；target 声明进 electron-builder.yml 使本地与 CI 同构；显式上传步骤让产物清单可断言（INV-4）。

## 任务

### Phase 1
- [x] task 1 — `.github/workflows/ci-cd.yml` — 三触发（push main/PR/release published + workflow_dispatch）、quality-gate、build-release 矩阵（版本断言/双平台构建/gh release upload/dispatch 走 workflow artifacts）— 新建（INV-1/2/4）
- [x] task 2 — `electron-builder.yml` — mac target dir → [dmg, zip]；win 显式 target nsis（icon 既有）— 编辑
### Phase 2
- [ ] task 3 — dispatch 演练 run — 真实触发双平台构建，取 run 链接与产物清单 — runtime 观察点（INV-2/4）
- [ ] task 4 — 首个真实 release 触发 — bump 1.1.1（chore 变更）→ tag → release published → 双平台资产挂上 release — runtime 观察点（INV-1/4）

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 新增或更新
- **候选卡片:** 倾向新增 `shadow-docs/knowledge/ci-release-pipeline.md`（desktop 交付链：门+发布两段式、平台矩阵、资产契约、unsigned 限制）
- **理由:** 交付链是长期契约面，后续每次发版都依赖
