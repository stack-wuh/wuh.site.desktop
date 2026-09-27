---
{
  "schema": "shadow-dev/v1",
  "name": "20260925-build-pin-node22",
  "type": "build",
  "scope": "desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "build/20260925-build-pin-node22",
  "files": [
    "README.md",
    "mise.toml",
    "package.json",
    "shadow-docs/knowledge/renderer-shell-routing.md"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 127,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/127",
    "pullRequest": 129,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/129"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "5f597f80cc1fbc64bd2f519b93123b09dd6b95cd",
    "verifiedAt": "2026-09-27T09:13:28.678Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:129",
    "planHash": "7bc8cd9beaa4bb04ce3dbe7facdb1b2e095d964d1d32a5a4b3ed189ff9b942cf",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[build] node@22 工具链钉定（mise.toml + engines）——根治本机 V8 段错误",
      "titleRaw": "[build] node@22 工具链钉定（mise.toml + engines）——根治本机 V8 段错误",
      "supplement": "## 动机\n本机 node v24.19.0 的 V8（并发 GC/CodeSerializer）高负载下随机 SIGSEGV（exit 139）。2026-09-25 单日实测：shadow-dev CLI 多次、typecheck 三 tsconfig 风暴级连崩、vitest 多次重试——盲重试穿越且污染验证结论。历史同因曾致 electron-builder 打包崩（82a86b1 曾以 dist 脚本包装缓解，后随 renderer-nextjs 丢失）。交叉验证：CI（父仓库 ci-cd.yml）钉 node 22；本机 mise exec node@22（22.23.2）同日零崩溃。仓库当前无任何版本钉定，README 的 NODE_OPTIONS 缓解实测不足。\n\n## 决策\n方案 A：仓库根提交 mise.toml（node = \"22.23.2\"，注释记录根因与 CI 对齐）+ package.json engines（\"node\": \"22\"）+ README 段错误段改写为钉定说明 + renderer-shell-routing 构建域知识回写。不恢复 dist 包装（mise 激活后冗余）。否决：仅恢复 82a86b1（覆盖不了 tsc/vitest/CLI 崩溃面）、.nvmrc（本机 mise 不认）。\n\n## 任务\n- Phase 1 钉定落地：mise.toml；engines + README 改写\n- Phase 2 验证与知识：钉定 node 下全量 vitest + 三 tsconfig 全绿；构建域知识回写\n\n完整 brief：shadow-docs/changes/20260925-build-pin-node22/brief.md",
      "body": "## 动机\n本机 node v24.19.0 的 V8（并发 GC/CodeSerializer）在高负载下随机 SIGSEGV（exit 139）。2026-09-25 单日实测：shadow-dev CLI 多次崩溃、`npm run typecheck` 三 tsconfig 风暴级连崩、vitest 多次重试才绿——每次都靠盲重试穿越，且 exit 139 与真实失败难以区分，污染验证结论。历史同因（2026-09-17 前后）曾致 electron-builder 打包崩溃，当时以 82a86b1（dist 脚本包 `mise exec node@22`）缓解，该提交随 renderer-nextjs 脚本重写丢失（carrier 分支 `feature/20260917-feature-shell-chrome-plugin-api` 保留至今）。交叉验证：CI（父仓库 `x.wuh.site/.github/workflows/ci-cd.yml`）钉 `node-version: '22'`；本机 `mise exec node@22`（22.23.2）同日同等负载零崩溃。当前仓库无任何版本钉定（无 mise.toml/.nvmrc/engines），README 仅记载 `NODE_OPTIONS=--max-old-space-size=6144` 内存缓解（2026-09-25 实测不足）。钉定缺失是段错误风暴反复发生的根因级缺口。\n\n## 引用规范\n- `shadow-docs/knowledge/renderer-shell-routing.md`\n  - 当前结论: 构建/工具链域约定（静态导出、构建期内联、`pnpm typecheck`/`pnpm test` 验证段）；无 node 版本管理规范。\n  - 适用 scope: 仓库工具链——本变更新增 node 钉定约定，落地后构建域结论需回写（见任务 Phase 2）。\n- `norms/tdd-verification.md`\n  - 当前结论: M 级 = 绿灯验证 + unit。\n  - 适用 scope: 本变更无代码行为面，验证主体 = 既有套件在钉定 node 下全绿。\n- `README.md` 段错误记载（:41 附近 NODE_OPTIONS 缓解）与本变更结论冲突，随任务改写。\n\n## 决策\n- **选型:** 方案 A —— ① 仓库根新建 `mise.toml`（`[tools] node = \"22.23.2\"`，注释写明根因与 CI 对齐）；② `package.json` 增加 `engines: { \"node\": \"22\" }`（非 mise 环境的文档化信号，npm/pnpm 生态通用）；③ README 段错误段落改写为钉定说明（NODE_OPTIONS 降级为历史备注）；④ 知识回写 renderer-shell-routing 构建域。\n- **对比方案:** B 仅恢复 82a86b1 的 dist 脚本包装——只保 electron-builder 段，今天崩得最凶的 tsc/vitest/CLI 依然裸奔，否；C `.nvmrc` + engines——本机工具链是 mise，nvmrc 无自动效果，否；不恢复 dist 包装（B 的残留动作）——mise 激活后 `npm run dist` 全链已运行在 22 上，wrapper 冗余，理由记录于此。\n- **理由:** 用户确认方案 A；精确钉定 22.23.2（本日实测版本 + /tmp/mise.toml.bak 历史记录）保证重现确定性，major 与 CI 一致；engines 覆盖非 mise 场景；根因与证据全部写进 toml 注释与 README，后人不再考古。\n\n## 任务\n### Phase 1 钉定落地\n- [ ] 新建仓库根 `mise.toml`：`[tools]` `node = \"22.23.2\"`，注释记录根因（node 24.19 V8 并发 GC/CodeSerializer SIGSEGV，20260925 实测波及 CLI/tsc/vitest）与 CI 对齐（父仓库 ci-cd.yml node-version: '22'） — `mise.toml`\n- [ ] `package.json` 增加 `engines: { \"node\": \"22\" }`；README 段错误记载改写为钉定说明（NODE_OPTIONS 降级为历史备注） — `package.json`, `README.md`\n### Phase 2 验证与知识回写\n- [ ] 钉定验证：`mise exec node@22 -- node --version` = v22.23.2；既有全量 `vitest run` + 三 tsconfig typecheck 在钉定 node 下全绿 — 证据进 brief 结果段\n- [ ] 知识回写：renderer-shell-routing.md 构建域补 node 钉定约定（22.23.2、根因一句话、engines 信号）；若该卡与其他 active change 冲突则降级为 README 承载并在结果段记录 — `shadow-docs/knowledge/renderer-shell-routing.md`\n\n## 补充\n## 动机\n本机 node v24.19.0 的 V8（并发 GC/CodeSerializer）高负载下随机 SIGSEGV（exit 139）。2026-09-25 单日实测：shadow-dev CLI 多次、typecheck 三 tsconfig 风暴级连崩、vitest 多次重试——盲重试穿越且污染验证结论。历史同因曾致 electron-builder 打包崩（82a86b1 曾以 dist 脚本包装缓解，后随 renderer-nextjs 丢失）。交叉验证：CI（父仓库 ci-cd.yml）钉 node 22；本机 mise exec node@22（22.23.2）同日零崩溃。仓库当前无任何版本钉定，README 的 NODE_OPTIONS 缓解实测不足。\n\n## 决策\n方案 A：仓库根提交 mise.toml（node = \"22.23.2\"，注释记录根因与 CI 对齐）+ package.json engines（\"node\": \"22\"）+ README 段错误段改写为钉定说明 + renderer-shell-routing 构建域知识回写。不恢复 dist 包装（mise 激活后冗余）。否决：仅恢复 82a86b1（覆盖不了 tsc/vitest/CLI 崩溃面）、.nvmrc（本机 mise 不认）。\n\n## 任务\n- Phase 1 钉定落地：mise.toml；engines + README 改写\n- Phase 2 验证与知识：钉定 node 下全量 vitest + 三 tsconfig 全绿；构建域知识回写\n\n完整 brief：shadow-docs/changes/20260925-build-pin-node22/brief.md\n\n完整 brief：shadow-docs/changes/20260925-build-pin-node22/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260925-build-pin-node22\",\"type\":\"build\",\"scope\":\"desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260925-build-pin-node22/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "build"
      ]
    },
    "release": {
      "files": [
        "README.md",
        "mise.toml",
        "package.json",
        "shadow-docs/changes/20260925-build-pin-node22/brief.md",
        "shadow-docs/knowledge/renderer-shell-routing.md"
      ],
      "message": "build(toolchain): node 钉定 22.23.2（仓库根 mise.toml）+ engines \"22\"——node 24.19 V8 并发 GC 本机随机 SIGSEGV（CLI/tsc/vitest 实证），与 CI 同 major；README 段错误记载改写为钉定说明；renderer-shell-routing 构建域回写钉定约定（Closes #127）",
      "title": "build(toolchain): node@22.23.2 钉定（mise.toml + engines）——根治本机 V8 段错误（Closes #127）",
      "body": "Closes #127\n\n完整 brief：shadow-docs/changes/20260925-build-pin-node22/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/renderer-shell-routing.md",
    "reason": "同前次审查结论在合并后 main HEAD 重录（恢复 PR 关联后）：node 钉定 22.23.2 + engines + README + 构建域知识回写；验证=钉定解析断言 + 519 用例绿 + canonical 树 tsconfig node/next 绿"
  }
}
---

# node@22 工具链钉定（mise.toml）——根治本机 V8 段错误

## 动机

本机 node v24.19.0 的 V8（并发 GC/CodeSerializer）在高负载下随机 SIGSEGV（exit 139）。2026-09-25 单日实测：shadow-dev CLI 多次崩溃、`npm run typecheck` 三 tsconfig 风暴级连崩、vitest 多次重试才绿——每次都靠盲重试穿越，且 exit 139 与真实失败难以区分，污染验证结论。历史同因（2026-09-17 前后）曾致 electron-builder 打包崩溃，当时以 82a86b1（dist 脚本包 `mise exec node@22`）缓解，该提交随 renderer-nextjs 脚本重写丢失（carrier 分支 `feature/20260917-feature-shell-chrome-plugin-api` 保留至今）。交叉验证：CI（父仓库 `x.wuh.site/.github/workflows/ci-cd.yml`）钉 `node-version: '22'`；本机 `mise exec node@22`（22.23.2）同日同等负载零崩溃。当前仓库无任何版本钉定（无 mise.toml/.nvmrc/engines），README 仅记载 `NODE_OPTIONS=--max-old-space-size=6144` 内存缓解（2026-09-25 实测不足）。钉定缺失是段错误风暴反复发生的根因级缺口。

## 复杂度评级

- **评级:** M
- **理由:** 契约变更——无（零生产代码，产品行为面不变）；触及面——全仓 dev 工具链运行时（所有 dev 命令的 node 从 24.19 切至 22.23.2，环境行为变更）；可发现性——版本错配在命令层即时可见（`mise exec node@22 -- node --version` 可断言）。无新增测试文件（工具链钉定无可测代码行为面），以既有全量套件在钉定 node 下跑绿作为运行时证据——超出 S 级「diff 走查」深度，故评 M。
- **期望验证深度:** unit（既有套件全绿 + mise 解析与版本断言）

## 引用规范

- `shadow-docs/knowledge/renderer-shell-routing.md`
  - 当前结论: 构建/工具链域约定（静态导出、构建期内联、`pnpm typecheck`/`pnpm test` 验证段）；无 node 版本管理规范。
  - 适用 scope: 仓库工具链——本变更新增 node 钉定约定，落地后构建域结论需回写（见任务 Phase 2）。
- `norms/tdd-verification.md`
  - 当前结论: M 级 = 绿灯验证 + unit。
  - 适用 scope: 本变更无代码行为面，验证主体 = 既有套件在钉定 node 下全绿。
- `README.md` 段错误记载（:41 附近 NODE_OPTIONS 缓解）与本变更结论冲突，随任务改写。

## 决策

- **选型:** 方案 A —— ① 仓库根新建 `mise.toml`（`[tools] node = "22.23.2"`，注释写明根因与 CI 对齐）；② `package.json` 增加 `engines: { "node": "22" }`（非 mise 环境的文档化信号，npm/pnpm 生态通用）；③ README 段错误段落改写为钉定说明（NODE_OPTIONS 降级为历史备注）；④ 知识回写 renderer-shell-routing 构建域。
- **对比方案:** B 仅恢复 82a86b1 的 dist 脚本包装——只保 electron-builder 段，今天崩得最凶的 tsc/vitest/CLI 依然裸奔，否；C `.nvmrc` + engines——本机工具链是 mise，nvmrc 无自动效果，否；不恢复 dist 包装（B 的残留动作）——mise 激活后 `npm run dist` 全链已运行在 22 上，wrapper 冗余，理由记录于此。
- **理由:** 用户确认方案 A；精确钉定 22.23.2（本日实测版本 + /tmp/mise.toml.bak 历史记录）保证重现确定性，major 与 CI 一致；engines 覆盖非 mise 场景；根因与证据全部写进 toml 注释与 README，后人不再考古。

## 任务

### Phase 1 钉定落地
- [x] 新建仓库根 `mise.toml`：`[tools]` `node = "22.23.2"`，注释记录根因（node 24.19 V8 并发 GC/CodeSerializer SIGSEGV，20260925 实测波及 CLI/tsc/vitest）与 CI 对齐（父仓库 ci-cd.yml node-version: '22'） — `mise.toml`
- [x] `package.json` 增加 `engines: { "node": "22" }`；README 段错误记载改写为钉定说明（NODE_OPTIONS 降级为历史备注） — `package.json`, `README.md`
### Phase 2 验证与知识回写
- [x] 钉定验证：`mise exec node@22 -- node --version` = v22.23.2；既有全量 `vitest run` + 三 tsconfig typecheck 在钉定 node 下全绿 — 证据进 brief 结果段
- [x] 知识回写：renderer-shell-routing.md 构建域补 node 钉定约定（22.23.2、根因一句话、engines 信号）；若该卡与其他 active change 冲突则降级为 README 承载并在结果段记录 — `shadow-docs/knowledge/renderer-shell-routing.md`

## 结果

- 实际耗时: 约 0.5 天（含父仓库 CI 取证与共享依赖环境排查）
- 验证: ① 钉定解析断言 `mise exec -- node --version` → v22.23.2（mise.toml 配置生效）；② 全量 `vitest run` 在钉定 node 下 **59 文件/519 用例一次全绿**（独立环境，零段错误）；③ typecheck：node.json + next.json 在钉定 node（canonical 依赖树）绿，tests.json 同日在 milkdown-wt 独立环境有绿记录——canonical 环境补装 @milkdown/kit 受父 workspace apps/site 安装脚本阻断（PR #125 遗留的 devDep 安装摩擦，与本案无关）。
- 环境发现（记录，不立约束）: 无锁文件的全新 npm 解析在本机触发 tsc 5.7.3 **确定性** SIGSEGV（canonical 树同版本 tsc + 同 node 可完成）——指向「依赖图规模 × 无锁文件漂移」风险；若复发考虑提交 lockfile。另：父仓库 x.wuh.site 是 npm/pnpm workspace 根，desktop 内跑 `npm i` 会提升到父根（本日已验证并确认无残留污染）。
- 知识评估: 已按 task-4 回写 renderer-shell-routing（当前结论段 + 执行约束 + 验证方式三处），知识影响「更新」落地于本变更内。

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/renderer-shell-routing.md`
- **理由:** 构建/工具链域唯一 active 卡，node 钉定是该域新增长期约定（根因 + 版本 + 验证方式），按查重并入不新增。
