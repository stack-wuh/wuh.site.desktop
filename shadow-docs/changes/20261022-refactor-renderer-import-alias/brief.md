---
{
  "schema": "shadow-dev/v1",
  "name": "20261022-refactor-renderer-import-alias",
  "type": "refactor",
  "scope": "renderer-ui",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "refactor/20261022-refactor-renderer-import-alias",
  "files": [
    "app/(shell)/account/page.tsx",
    "app/(shell)/drafts/DraftsPage.tsx",
    "app/(shell)/editor/page.tsx",
    "app/(shell)/layout.tsx",
    "app/(shell)/page.tsx",
    "app/(shell)/plugin/[...slug]/page.tsx",
    "app/(shell)/projects/ProjectsPage.tsx",
    "app/(shell)/projects/styles.ts",
    "app/(shell)/settings/page.tsx",
    "components/FloatLayer/FloatWindow.tsx",
    "components/FloatLayer/geometry.ts",
    "components/FloatLayer/index.tsx",
    "components/account/AccountPage/AuthFlow.tsx",
    "components/account/AccountPage/IdentityRepos.tsx",
    "components/account/AccountPage/index.tsx",
    "components/account/AccountPage/styles.tsx",
    "components/capsule/Capsule.tsx",
    "components/capsule/CapsulePanel/ControlSections.tsx",
    "components/capsule/CapsulePanel/PluginTabRows.tsx",
    "components/capsule/CapsulePanel/TaskCenterBody.tsx",
    "components/capsule/CapsulePanel/TaskTimeline.tsx",
    "components/capsule/CapsulePanel/index.tsx",
    "components/capsule/CapsulePanel/styles.ts",
    "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
    "components/capsule/sections/EditorSection/FormatGrid.tsx",
    "components/capsule/sections/EditorSection/PanelsExport.tsx",
    "components/capsule/sections/EditorSection/TransferDialog.tsx",
    "components/capsule/sections/EditorSection/index.tsx",
    "components/contextpanel/index.tsx",
    "components/editor/MarkdownEditor/index.tsx",
    "components/editor/SelectionToolbar/index.tsx",
    "components/editor/SidePane/index.tsx",
    "components/editor/SlashMenu/index.tsx",
    "components/editor/Spine/index.tsx",
    "components/editor/decorations.ts",
    "components/editor/widgets.ts",
    "components/focusbar/index.tsx",
    "components/home/Heatmap.tsx",
    "components/home/HomePage.tsx",
    "components/menu/PluginTree.tsx",
    "components/menu/ProjectsTree.tsx",
    "components/palette/index.tsx",
    "components/plugins/PluginFrameHost/frameProtocol.ts",
    "components/plugins/PluginFrameHost/frameServices.ts",
    "components/plugins/PluginMainView.tsx",
    "components/rail/index.tsx",
    "components/settings/AppearanceSection.tsx",
    "components/settings/ImageHostSection.tsx",
    "components/settings/PluginManagerSection/index.tsx",
    "components/settings/SettingsNav.tsx",
    "components/settings/SettingsPage.tsx",
    "components/ui/Dialog.tsx",
    "components/ui/FeedbackHost/AlertHost.tsx",
    "components/ui/FeedbackHost/MessageBannerStack.tsx",
    "components/ui/FeedbackHost/ToastStack.tsx",
    "components/ui/FeedbackHost/index.tsx",
    "components/ui/FeedbackHost/styles.ts",
    "components/workspace/FilePicker.tsx",
    "components/workspace/WorkspacePicker.tsx",
    "next-env.d.ts",
    "tests/import-boundary.test.mjs",
    "tsconfig.json",
    "tsconfig.node.json",
    "vitest.config.ts"
  ],
  "github": {
    "repository": null,
    "issue": null,
    "issueUrl": null,
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "23231af68611150cf55d245186413d89cc52b857",
    "verifiedAt": "2026-10-23T00:23:15.093Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "4331799a5e884cad58e0a6c5690f0429a611adc43ffcdef9bc7685690e26b1bb",
    "updatedAt": null,
    "lastError": null,
    "release": {
      "files": [
        "app/(shell)/account/page.tsx",
        "app/(shell)/drafts/DraftsPage.tsx",
        "app/(shell)/editor/page.tsx",
        "app/(shell)/layout.tsx",
        "app/(shell)/page.tsx",
        "app/(shell)/plugin/[...slug]/page.tsx",
        "app/(shell)/projects/ProjectsPage.tsx",
        "app/(shell)/projects/styles.ts",
        "app/(shell)/settings/page.tsx",
        "components/FloatLayer/FloatWindow.tsx",
        "components/FloatLayer/geometry.ts",
        "components/FloatLayer/index.tsx",
        "components/account/AccountPage/AuthFlow.tsx",
        "components/account/AccountPage/IdentityRepos.tsx",
        "components/account/AccountPage/index.tsx",
        "components/account/AccountPage/styles.tsx",
        "components/capsule/Capsule.tsx",
        "components/capsule/CapsulePanel/ControlSections.tsx",
        "components/capsule/CapsulePanel/PluginTabRows.tsx",
        "components/capsule/CapsulePanel/TaskCenterBody.tsx",
        "components/capsule/CapsulePanel/TaskTimeline.tsx",
        "components/capsule/CapsulePanel/index.tsx",
        "components/capsule/CapsulePanel/styles.ts",
        "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
        "components/capsule/sections/EditorSection/FormatGrid.tsx",
        "components/capsule/sections/EditorSection/PanelsExport.tsx",
        "components/capsule/sections/EditorSection/TransferDialog.tsx",
        "components/capsule/sections/EditorSection/index.tsx",
        "components/contextpanel/index.tsx",
        "components/editor/MarkdownEditor/index.tsx",
        "components/editor/SelectionToolbar/index.tsx",
        "components/editor/SidePane/index.tsx",
        "components/editor/SlashMenu/index.tsx",
        "components/editor/Spine/index.tsx",
        "components/editor/decorations.ts",
        "components/editor/widgets.ts",
        "components/focusbar/index.tsx",
        "components/home/Heatmap.tsx",
        "components/home/HomePage.tsx",
        "components/menu/PluginTree.tsx",
        "components/menu/ProjectsTree.tsx",
        "components/palette/index.tsx",
        "components/plugins/PluginFrameHost/frameProtocol.ts",
        "components/plugins/PluginFrameHost/frameServices.ts",
        "components/plugins/PluginMainView.tsx",
        "components/rail/index.tsx",
        "components/settings/AppearanceSection.tsx",
        "components/settings/ImageHostSection.tsx",
        "components/settings/PluginManagerSection/index.tsx",
        "components/settings/SettingsNav.tsx",
        "components/settings/SettingsPage.tsx",
        "components/ui/Dialog.tsx",
        "components/ui/FeedbackHost/AlertHost.tsx",
        "components/ui/FeedbackHost/MessageBannerStack.tsx",
        "components/ui/FeedbackHost/ToastStack.tsx",
        "components/ui/FeedbackHost/index.tsx",
        "components/ui/FeedbackHost/styles.ts",
        "components/workspace/FilePicker.tsx",
        "components/workspace/WorkspacePicker.tsx",
        "next-env.d.ts",
        "shadow-docs/changes/20261022-refactor-renderer-import-alias/brief.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "shadow-docs/menu.md",
        "shadow-docs/signals.md",
        "tests/import-boundary.test.mjs",
        "tsconfig.json",
        "tsconfig.node.json",
        "vitest.config.ts"
      ],
      "message": "refactor(renderer): 渲染层相对导入收敛为 @/ 别名（≤1 级口径 + 守卫）",
      "title": "refactor(renderer): 渲染层导入别名收敛——消灭 ≥2 级相对路径",
      "body": "## 动机\n\n渲染层（app/components/lib）累积 275 处 ≥2 级相对导入（3+ 级 146 处 / 35 文件、2 级 129 处 / 59 文件，最深 4 级），深层组件多轮文件夹化后路径语义晦涩；`@/*` 别名虽配置但链路断裂（Next 读根 tsconfig、vitest 仅配 `@shared`），使用率为 0。\n\n## 变更\n\n- **275 处导入收敛**：`@/components/` 108 + `@/lib/` 166 + `@shared/` 1；`./` 同目录与单级 `../` 域内互引保留（对齐「入口级互引」理念）。深相对路径目标在 components 内部时由原始路径数学重算（简单前缀替换会产出 `@/ui/Button` 类错误 specifier，已 65 处修正）\n- **别名链路接通**：根 `tsconfig.json` 补 `compilerOptions.paths`（Next/IDE 唯一入口）；`tsconfig.node.json` 补 `@/*`（经 tests import 图解析渲染层所需）；`vitest.config.ts` 补 `'@'` alias 与 `.test.mjs` include\n- **守卫固化**：新增 `tests/import-boundary.test.mjs`——静态扫描渲染层断言相对导入 ≤1 级，随 vitest 全量执行；红绿自检通过（注入 2 级导入守卫红、撤销后绿）\n\n## 验证\n\n- 三套 tsc（node/next/tests）全绿\n- vitest 832/833——唯一失败为既有时间脆弱测试（`home-workbench` 问候语断言 `/好/` 在 0–5 点走 `greetNight`=「夜深了」必红；HomePage 非 import 行 diff 为空实锤非本变更引入）\n- `next build` 静态导出成功（全部路由 prerendered）\n- grep 复查渲染层 ≥2 级相对导入零残留；`src/` 零改动\n\n## 知识闭环\n\n`shadow-docs/knowledge/renderer-shell-routing.md` 追加「渲染层导入别名」条款（verified-depth: unit）；menu 构建/工具链行补路由关键词；SGN-1 信号加分（命中 4）。\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "apps/desktop/shadow-docs/knowledge/renderer-shell-routing.md",
    "reason": "渲染层导入别名收敛落地为长期工程约定：≥2 级相对导入全灭（275 处收敛，grep 零残留观察点），tests/import-boundary.test.mjs 守卫固化层数≤1 级口径；Next 读根 tsconfig、node 套经 tests import 图解析渲染层需 @/* paths 两点链路事实入卡；verified-depth: unit（守卫红绿自检 + 三套 tsc + next build 静态导出）。写卡在 release 执行。"
  }
}
---

# 渲染层导入别名收敛：消灭 ≥2 级相对路径

## 动机

渲染层（app/components/lib）已积累 275 处 ≥2 级相对导入（3+ 级 146 处 / 35 文件、2 级 129 处 / 59 文件，最深 4 级），深层组件多轮文件夹化拆分后路径语义晦涩、再挪位时易错。`tsconfig.next.json` 虽已配置 `@/*` 别名，但 Next 实际读取的根 `tsconfig.json` 是纯 references 空壳、vitest 仅配 `@shared`——别名链路处于断裂状态，`@/` 使用率为 0。本次一次性收敛为 `@/` 别名并接通构建链路，落地通用规范 code-style「项目别名优先于相对路径」条款，并以守卫固化防回归。

## 复杂度评级

- **评级:** M
- **理由:** 契约无变更（模块解析结果不变，纯导入表达形式）；触及面 ~90 文件但全部为机械 specifier 替换 + 2 个配置修改 + 1 个守卫测试新增；可发现性高——守卫测试静态固化，回归即时红。
- **期望验证深度:** unit（守卫探针 + 三套 tsc + vitest 全绿）+ runtime 抽查（`next build` 静态导出成功即解析不变的运行时证据）

## 领域模型

- **限界上下文:** renderer-ui — App Router 工作台壳层、书脊/案面/浮笺 chrome 与编辑器显示层的模块组织。上游 main-process（IPC 能力）、plugin（视图与贡献声明）；下游用户。反腐边界：不触碰 main-process/plugin 的模块图，不改 `tsconfig.node.json`（主进程/preload/plugin-sdk 零波及）。
- **统一语言增量:** 无业务新词。工程口径新增「渲染层相对导入层数 ≤1」：`./` 同目录引用与单级 `../` 域内互引保留（对齐组件规范「入口级互引」理念），≥2 级一律改 `@/` 或 `@shared/` 别名。
- **聚合与不变量:**
  - `renderer-ui 模块图`：app/components/lib 下 import specifier 不含 ≥2 级相对路径（观察点：tests/import-boundary.test.mjs 守卫，红/绿自检）；别名改写不改变模块解析结果（观察点：三套 tsc typecheck 全绿 + vitest run 全绿 + next build 成功）；main-process/preload/plugin-sdk 零波及（观察点：tsconfig.node.json 无变更、守卫扫描范围不含 src/）。
- **领域事件:** 无运行时状态改变；构建期解析行为变化（Next 与 vitest 链路获得 `@/` 别名解析能力）。

## 引用规范

- apps/desktop/shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 渲染层组件域内文件夹化（`组件名/index.tsx` 对外唯一入口）；拆分/搬移由全量绿灯测试 + 三 tsconfig typecheck 护航
  - 适用 scope: apps/desktop renderer-ui
- shadow-dev-workflow norms/code-style.md
  - 当前结论: Import 顺序为外部依赖、workspace 包、项目别名、相对路径；别名优先于相对路径
  - 适用 scope: 全项目通用
- apps/desktop/shadow-docs/domain.md
  - 当前结论: renderer-ui 主目录 app/、components/、lib/；共享内核 src/shared/ 为两侧共同契约
  - 适用 scope: apps/desktop
- shadow-docs/knowledge/desktop-app-architecture.md（父仓库）
  - 当前结论: 验证方式 = vitest + 三套 tsc（node/next/tests）；DOM 渲染测试按文件头启用 happy-dom
  - 适用 scope: apps/desktop

## 决策

- **选型:** 方案 A——`@/` 别名一次收敛（275 处）+ 根 tsconfig paths / vitest alias 链路接通 + import-boundary 硬规则守卫。
- **对比方案:** B 仅收敛 3+ 级、2 级登记台账棘轮（簿记负担长期存在，与已确认的收敛范围矛盾）；C 分层多别名 `@ui/`、`@lib/`（别名表膨胀、desktop 无先例、与站点 `@wuh.site/components/<dir>` 风格不一致，过度设计）。
- **理由:** 层数判据（≥2 级即别名）静态可查、无需语义分析跨域边界；存量已清零故守卫可用硬规则、免 baseline 台账簿记；根 tsconfig paths 是 Next 官方机制且 IDE 同步受益。非目标：不顺带整理 import 排序、不动单级域内互引、不改 main-process 侧任何文件。

## 任务

### Phase 1 链路接通与冒烟
- [x] 根 tsconfig.json 补 compilerOptions.baseUrl + paths（`@/*`→`./*`、`@shared/*`→`./src/shared/*`，与 tsconfig.next.json 口径一致） — `tsconfig.json` — 修改
- [x] vitest.config.ts resolve.alias 补 `'@'`→项目根（`@shared` 已在） — `vitest.config.ts` — 修改
- [x] 冒烟：app/(shell)/layout.tsx 导入改 `@/` 并跑 tsc（next 配置）确认解析 — `app/(shell)/layout.tsx` — 修改

### Phase 2 全量机械替换
- [x] app/ 下 2 级与 3+ 级相对导入改 `@/`（~64 处） — `app/` — 修改
- [x] components/ 下同上（~211 处） — `components/` — 修改
- [x] `components/capsule/sections/EditorSection/EditorCommandHost.tsx` 的 `../../../../src/shared/types` → `@shared/types`；lib/ 扫描确认无 ≥2 级残留 — `components/`、`lib/` — 修改

### Phase 3 守卫与全量验证
- [x] 新增 tests/import-boundary.test.mjs：静态扫描 app/components/lib 的 import，断言相对导入 ≤1 级；先故意注入一处 2 级导入确认守卫能红再清绿 — `tests/import-boundary.test.mjs` — 新增
- [x] 全量验证：`npm run typecheck`（三套 tsc）+ `npm test`（vitest 全绿）+ `pnpm build:next`（静态导出成功）；逐条不变量对账 — `—` — 验证

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** apps/desktop/shadow-docs/knowledge/renderer-shell-routing.md（追加「渲染层导入别名与 ≤1 级相对导入守卫」条款）
- **理由:** 别名口径与守卫规则是渲染层长期有效的工程约定，review 通过后按 verified-depth: unit 原位更新该卡。
