---
{
  "schema": "shadow-dev/v1",
  "name": "20260926-refactor-mega-component-split",
  "type": "refactor",
  "scope": "components",
  "status": "archived",
  "baseBranch": "main",
  "branch": "refactor/20260926-refactor-mega-component-split",
  "files": [
    "components/SideMenu.tsx",
    "components/account/AccountPage.tsx",
    "components/capsule/CapsulePanel.tsx",
    "components/capsule/sections/EditorSection.tsx",
    "components/editor/MarkdownEditor.tsx",
    "components/plugins/PluginFrameHost.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 108,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/108",
    "pullRequest": 112,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/112"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "2655ceefd49c01b7ff353d6ae9a86cab88567b4f",
    "verifiedAt": "2026-09-27T01:06:33.903Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:112",
    "planHash": "c23ccb557e72ee833da5fc25f20f8be0a948c7bd1dd354c063381a77a00bff1b",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[refactor] refactor(components): 六个巨型组件域内文件夹化拆分（机械搬移、零行为变化）",
      "titleRaw": "refactor(components): 六个巨型组件域内文件夹化拆分（机械搬移、零行为变化）",
      "supplement": "CapsulePanel/EditorSection/SideMenu/AccountPage/PluginFrameHost/MarkdownEditor 六个 600–961 行组件按域内文件夹化拆分（对齐 site 端 #313 拆分先例）：组件名/ 目录 + index.tsx 对外 + 子单元文件 + styles.ts；纯机械搬移、对外导出面与行为零变化，全量绿灯测试护航。方案见 shadow-docs/changes/20260926-refactor-mega-component-split/brief.md",
      "body": "## 动机\ndesktop 端渲染层 6 个核心组件文件 600–961 行，styled 样式块占 35–50%，多个可独立理解的逻辑区域（命令宿主/迁移 Dialog、帧握手协议/视图、导航/弹出面板、授权流/身份仓库）挤在同一文件，阅读、定位与并行修改成本持续上升。site 端已有成熟先例（`refactor(frontend): 拆分组件文件夹结构` #313：文件夹化 + 子单元文件 + 结构测试），desktop 端上周也刚以同打法完成 lib 微 store 收敛（PR #105，M 级、全量绿灯护航）。本轮把该打法落到渲染层巨型组件，并为后续中型组件（300–430 行 ×9）拆分建立固定落位模式。\n\n**非目标**：中型 9 文件（FloatLayer/projects 页/Heatmap/modules/PluginManagerSection/FeedbackHost/EditorPanel/drafts 页/ProjectsTree）另立变更；长度固有的数据/类型文件（locales.ts、types.ts、plugin-sdk/index.ts）与 lib 逻辑文件（plugin.ts、feedback.ts、capsule.ts）本轮不动；不做任何行为、样式、命名优化——纯机械搬移，不顺手重写。\n\n## 引用规范\n- norms/code-style.md\n  - 当前结论: 单一职责（300 行是拆分信号，职责/耦合/测试难度共同决定）；渐进式治理——专设 refactor 变更是合法入口，禁顺手重写无关代码\n  - 适用 scope: 全仓\n- norms/tdd-verification.md\n  - 当前结论: M 级=绿灯测试，验证强度与评级匹配\n  - 适用 scope: 全仓\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: app/components/lib 既有约定；本次不改任何路由与页面行为，仅组件内部重组\n  - 适用 scope: app, components\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: SideMenu/胶囊挂点与动效约束（nav 不设 overflow:hidden、禁 width 过渡、reduced-motion 静态降级、胶囊挂点契约整段同步）——拆分搬移必须逐字保留这些注释与实现，不得借机调整\n  - 适用 scope: components/SideMenu, components/capsule\n- shadow-docs/knowledge/editor.md\n  - 当前结论: workspaceStore 单状态源 + content 双通道/EditorCommand 命令通道契约 + EditorCommandHost 胶囊驻留——EditorSection 拆分后 host 仍在 section 内、`layout.tsx` 从原路径具名导入 EditorCommandHost 的可达性必须保持\n  - 适用 scope: components/capsule/sections, components/editor\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 帧握手协议 kind（hello/ready/invoke/result/event/request/response）三方同步约束、特权 scheme 唯一声明点——frameProtocol 搬移为独立文件时协议语义与超时常量逐字保留，仅移动不改动\n  - 适用 scope: components/plugins\n\n## 决策\n- **选型:** 域内文件夹化（对齐 site #313 先例）：`组件名/` 目录 + `index.tsx`（对外唯一入口，原具名导出全部经此可达）+ 按逻辑区域拆出的子单元文件 + `styles.ts`（styled 大块）。六个组件的落位：CapsulePanel → `index/TaskTimeline/PluginTabRows/styles`；EditorSection → `index/EditorCommandHost/TransferDialog/styles`；SideMenu → `index/MenuPopovers/styles`；AccountPage → `index/AuthFlow/IdentityRepos/styles`；PluginFrameHost → `index/frameProtocol/PluginView/styles`；MarkdownEditor → `index/renderTheme/styles`。搬移规则：代码逐字搬移，仅调整 import/export 与跨文件 styled 显式导出；每步拆完跑相关面测试再进下一个。\n- **对比方案:** ①域内平铺新文件（desktop 现状）——少一层目录但域内渐散、无固定落位模式，弃；②巨型+中型 15 文件一次拆完——约 8000 行级 PR，审查质量下降，违反渐进式治理，弃；③按域分 3 个 change——单 PR 最小但流程开销 ×3、总周期最长，弃。\n- **理由:** 零契约变化 + import specifier 目录解析兼容使风险集中在搬移正确性本身，由全量绿灯测试与 typecheck 护航；文件夹化为后续中型拆分与新增组件建立一致模式，一次投入长期复用。\n\n## 任务\n### Phase 1 胶囊域（测试网最强，先行）\n- [ ] CapsulePanel 拆分为 `CapsulePanel/{index,TaskTimeline,PluginTabRows,styles}`——`components/capsule/CapsulePanel.tsx`\n- [ ] EditorSection 拆分为 `EditorSection/{index,EditorCommandHost,TransferDialog,styles}`，index 保持 `EditorCommandHost` 具名导出可达——`components/capsule/sections/EditorSection.tsx`\n- [ ] 胶囊域回归：capsule-render/editor-page 等相关面测试绿——`tests/`\n### Phase 2 壳层域\n- [ ] SideMenu 拆分为 `SideMenu/{index,MenuPopovers,styles}`——`components/SideMenu.tsx`\n- [ ] AccountPage 拆分为 `AccountPage/{index,AuthFlow,IdentityRepos,styles}`——`components/account/AccountPage.tsx`\n- [ ] 壳层域回归：sidemenu-bottom/account 相关面测试绿——`tests/`\n### Phase 3 插件/编辑器域\n- [ ] PluginFrameHost 拆分为 `PluginFrameHost/{index,frameProtocol,PluginView,styles}`，index 全量 re-export 七个消费符号（PluginView/rebootstrapPluginsHost/togglePlugin/applyWorkspaceSwitch/hostGeneration/listMainViews/usePluginsReady）——`components/plugins/PluginFrameHost.tsx`\n- [ ] MarkdownEditor 拆分为 `MarkdownEditor/{index,renderTheme,styles}`——`components/editor/MarkdownEditor.tsx`\n- [ ] 插件/编辑器域回归：plugin-broker/editor-page 相关面测试绿——`tests/`\n### Phase 4 验证闭环\n- [ ] 全量 vitest（基线 58 文件/501 用例）+ 三 tsconfig typecheck 全绿；机器 V8 段错误按预案 `NODE_DISABLE_COMPILE_CACHE=1` 重试——`package.json`\n- [ ] 旧 specifier 解析核查（6 个组件的全部既有 import 点逐一仍可解析）+ brief 结果回填与知识影响复评——`shadow-docs/changes/20260926-refactor-mega-component-split/brief.md`\n\n## 补充\nCapsulePanel/EditorSection/SideMenu/AccountPage/PluginFrameHost/MarkdownEditor 六个 600–961 行组件按域内文件夹化拆分（对齐 site 端 #313 拆分先例）：组件名/ 目录 + index.tsx 对外 + 子单元文件 + styles.ts；纯机械搬移、对外导出面与行为零变化，全量绿灯测试护航。方案见 shadow-docs/changes/20260926-refactor-mega-component-split/brief.md\n\n完整 brief：shadow-docs/changes/20260926-refactor-mega-component-split/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260926-refactor-mega-component-split\",\"type\":\"refactor\",\"scope\":\"components\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260926-refactor-mega-component-split/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "refactor"
      ]
    },
    "release": {
      "files": [
        "components/SideMenu.tsx",
        "components/SideMenu/MenuPopovers.tsx",
        "components/SideMenu/index.tsx",
        "components/SideMenu/styles.ts",
        "components/account/AccountPage.tsx",
        "components/account/AccountPage/AuthFlow.tsx",
        "components/account/AccountPage/IdentityRepos.tsx",
        "components/account/AccountPage/index.tsx",
        "components/account/AccountPage/styles.tsx",
        "components/capsule/CapsulePanel.tsx",
        "components/capsule/CapsulePanel/PluginTabRows.tsx",
        "components/capsule/CapsulePanel/TaskTimeline.tsx",
        "components/capsule/CapsulePanel/index.tsx",
        "components/capsule/CapsulePanel/styles.ts",
        "components/capsule/sections/EditorSection.tsx",
        "components/capsule/sections/EditorSection/EditorCommandHost.tsx",
        "components/capsule/sections/EditorSection/TransferDialog.tsx",
        "components/capsule/sections/EditorSection/index.tsx",
        "components/capsule/sections/EditorSection/styles.ts",
        "components/editor/MarkdownEditor.tsx",
        "components/editor/MarkdownEditor/index.tsx",
        "components/editor/MarkdownEditor/renderTheme.ts",
        "components/editor/MarkdownEditor/styles.ts",
        "components/plugins/PluginFrameHost.tsx",
        "components/plugins/PluginFrameHost/PluginView.tsx",
        "components/plugins/PluginFrameHost/frameProtocol.ts",
        "components/plugins/PluginFrameHost/index.tsx",
        "components/plugins/PluginFrameHost/styles.ts",
        "shadow-docs/changes/20260926-refactor-mega-component-split/brief.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "shadow-docs/menu.md",
        "tests/capsule-nesting.test.ts"
      ],
      "message": "refactor(components): 六个巨型组件域内文件夹化拆分——CapsulePanel/EditorSection/SideMenu/AccountPage/PluginFrameHost/MarkdownEditor 迁入组件名/ 目录（index.tsx 对外 + 子单元文件 + styles，20 文件，最大单文件 407 行）；纯机械搬移零行为变化，旧 specifier 17 处全部目录解析兼容，确认跑 58 文件/501 用例单次全绿，三 tsconfig typecheck PASS（Closes #108）",
      "title": "refactor(components): 六个巨型组件域内文件夹化拆分（机械搬移、零行为变化）",
      "body": "Closes #108\n\n完整 brief：shadow-docs/changes/20260926-refactor-mega-component-split/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/renderer-shell-routing.md",
    "reason": "域内文件夹化（组件名/ 目录 + index.tsx 对外出口 + 子单元文件 + styles）经六组件 58 文件/501 用例全量回归与三 tsconfig typecheck 验证，成为渲染层组件组织约定与后续中型拆分的固定落位模式；卡片增补该约定并补 verified-depth: unit 与 verified-scope（已随 PR #112 落地）"
  }
}
---

# 六个巨型组件域内文件夹化拆分（机械搬移、零行为变化）

## 动机
desktop 端渲染层 6 个核心组件文件 600–961 行，styled 样式块占 35–50%，多个可独立理解的逻辑区域（命令宿主/迁移 Dialog、帧握手协议/视图、导航/弹出面板、授权流/身份仓库）挤在同一文件，阅读、定位与并行修改成本持续上升。site 端已有成熟先例（`refactor(frontend): 拆分组件文件夹结构` #313：文件夹化 + 子单元文件 + 结构测试），desktop 端上周也刚以同打法完成 lib 微 store 收敛（PR #105，M 级、全量绿灯护航）。本轮把该打法落到渲染层巨型组件，并为后续中型组件（300–430 行 ×9）拆分建立固定落位模式。

**非目标**：中型 9 文件（FloatLayer/projects 页/Heatmap/modules/PluginManagerSection/FeedbackHost/EditorPanel/drafts 页/ProjectsTree）另立变更；长度固有的数据/类型文件（locales.ts、types.ts、plugin-sdk/index.ts）与 lib 逻辑文件（plugin.ts、feedback.ts、capsule.ts）本轮不动；不做任何行为、样式、命名优化——纯机械搬移，不顺手重写。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更=无（对外导出面、组件行为、路由、EditorCommand 通道、帧协议零变化；全部消费方走相对路径无扩展名 import，搬入 `组件名/index.tsx` 后旧 specifier 经目录解析保持字节不变）；触及面=6 个壳层核心文件重组（约 4700 行机械搬移，逐字等价优先，仅 import/export 与必要的 styled 跨文件导出调整）；可发现性=高（壳层任何破坏立即可见，且全量 58 文件/501 用例锁定既有行为）。严格按「触及面=宿主核心」可辩 L，但机械搬移不改任何数据流与协议语义，与 PR #105 先例（M）同性质，验证深度同为 unit 全量绿灯。
- **期望验证深度:** unit

## 引用规范
- norms/code-style.md
  - 当前结论: 单一职责（300 行是拆分信号，职责/耦合/测试难度共同决定）；渐进式治理——专设 refactor 变更是合法入口，禁顺手重写无关代码
  - 适用 scope: 全仓
- norms/tdd-verification.md
  - 当前结论: M 级=绿灯测试，验证强度与评级匹配
  - 适用 scope: 全仓
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: app/components/lib 既有约定；本次不改任何路由与页面行为，仅组件内部重组
  - 适用 scope: app, components
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: SideMenu/胶囊挂点与动效约束（nav 不设 overflow:hidden、禁 width 过渡、reduced-motion 静态降级、胶囊挂点契约整段同步）——拆分搬移必须逐字保留这些注释与实现，不得借机调整
  - 适用 scope: components/SideMenu, components/capsule
- shadow-docs/knowledge/editor.md
  - 当前结论: workspaceStore 单状态源 + content 双通道/EditorCommand 命令通道契约 + EditorCommandHost 胶囊驻留——EditorSection 拆分后 host 仍在 section 内、`layout.tsx` 从原路径具名导入 EditorCommandHost 的可达性必须保持
  - 适用 scope: components/capsule/sections, components/editor
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 帧握手协议 kind（hello/ready/invoke/result/event/request/response）三方同步约束、特权 scheme 唯一声明点——frameProtocol 搬移为独立文件时协议语义与超时常量逐字保留，仅移动不改动
  - 适用 scope: components/plugins

## 决策
- **选型:** 域内文件夹化（对齐 site #313 先例）：`组件名/` 目录 + `index.tsx`（对外唯一入口，原具名导出全部经此可达）+ 按逻辑区域拆出的子单元文件 + `styles.ts`（styled 大块）。六个组件的落位：CapsulePanel → `index/TaskTimeline/PluginTabRows/styles`；EditorSection → `index/EditorCommandHost/TransferDialog/styles`；SideMenu → `index/MenuPopovers/styles`；AccountPage → `index/AuthFlow/IdentityRepos/styles`；PluginFrameHost → `index/frameProtocol/PluginView/styles`；MarkdownEditor → `index/renderTheme/styles`。搬移规则：代码逐字搬移，仅调整 import/export 与跨文件 styled 显式导出；每步拆完跑相关面测试再进下一个。
- **对比方案:** ①域内平铺新文件（desktop 现状）——少一层目录但域内渐散、无固定落位模式，弃；②巨型+中型 15 文件一次拆完——约 8000 行级 PR，审查质量下降，违反渐进式治理，弃；③按域分 3 个 change——单 PR 最小但流程开销 ×3、总周期最长，弃。
- **理由:** 零契约变化 + import specifier 目录解析兼容使风险集中在搬移正确性本身，由全量绿灯测试与 typecheck 护航；文件夹化为后续中型拆分与新增组件建立一致模式，一次投入长期复用。

## 任务
### Phase 1 胶囊域（测试网最强，先行）
- [x] CapsulePanel 拆分为 `CapsulePanel/{index,TaskTimeline,PluginTabRows,styles}`——`components/capsule/CapsulePanel.tsx`
- [x] EditorSection 拆分为 `EditorSection/{index,EditorCommandHost,TransferDialog,styles}`，index 保持 `EditorCommandHost` 具名导出可达——`components/capsule/sections/EditorSection.tsx`
- [x] 胶囊域回归：capsule-render/editor-page 等相关面测试绿——`tests/`
### Phase 2 壳层域
- [x] SideMenu 拆分为 `SideMenu/{index,MenuPopovers,styles}`——`components/SideMenu.tsx`
- [x] AccountPage 拆分为 `AccountPage/{index,AuthFlow,IdentityRepos,styles}`——`components/account/AccountPage.tsx`
- [x] 壳层域回归：sidemenu-bottom/account 相关面测试绿——`tests/`
### Phase 3 插件/编辑器域
- [x] PluginFrameHost 拆分为 `PluginFrameHost/{index,frameProtocol,PluginView,styles}`，index 全量 re-export 七个消费符号（PluginView/rebootstrapPluginsHost/togglePlugin/applyWorkspaceSwitch/hostGeneration/listMainViews/usePluginsReady）——`components/plugins/PluginFrameHost.tsx`
- [x] MarkdownEditor 拆分为 `MarkdownEditor/{index,renderTheme,styles}`——`components/editor/MarkdownEditor.tsx`
- [x] 插件/编辑器域回归：plugin-broker/editor-page 相关面测试绿——`tests/`
### Phase 4 验证闭环
- [x] 全量 vitest（基线 58 文件/501 用例）+ 三 tsconfig typecheck 全绿；机器 V8 段错误按预案 `NODE_DISABLE_COMPILE_CACHE=1` 重试——`package.json`
- [x] 旧 specifier 解析核查（6 个组件的全部既有 import 点逐一仍可解析）+ brief 结果回填与知识影响复评——`shadow-docs/changes/20260926-refactor-mega-component-split/brief.md`

## 结果
- 实际耗时: 约 5h（含 worktree 环境、机器 V8 段错误与僵尸进程排查重试）
- 验证:
  - 基线（拆分前，worktree @261f159）: 全量 vitest **58 文件 / 501 用例全绿**。
  - 分域回归: 胶囊域 4 文件 43 用例绿（capsule-render/editor-page/capsule-nesting/plugin-capsule）；壳层面 2 文件 29 用例绿（sidemenu-bottom/capsule-render）；插件域 6 文件 65 用例绿（plugin-broker/plugin-protocol/plugin-capsule/navigation-guard/editor-page/plugin-feedback/plugin-statusitems 分两批）；编辑器域 7 文件 84 用例绿（editor-cm 系列 + home-editor-panel + editor-page，1 例机器假超时后单独重跑 9/9 绿）。
  - 全量vitest: 首轮 54 文件 472 用例通过、7 个渲染冒烟/图标用例超时——定位为两个残留后台 vitest 重试进程双占 95% CPU（load 54），清理后串行重跑 7 文件 39/40 绿 + icon-build 负载低谷单独重跑 3/3 绿；最终负载低谷确认跑（`--no-file-parallelism`）**58 文件 / 501 用例单次全绿**。
  - 三 tsconfig typecheck **全 PASS**（node/next/tests）；`build-icon.mjs` 裸跑 14.2s、产物 cmp 字节不变（icon-build 用例 environment 佐证）。
  - 旧 specifier 解析核查: 全仓扫描 17 处指向六个旧路径的 import，全部目录解析到新 `index.tsx`，0 失败。
- 偏差与发现:
  1. **capsule-nesting.test.ts 随迁**（结构守卫）: SOURCES 三处硬编码路径更新为 `CapsulePanel/index.tsx`、`sections/EditorSection/index.tsx`，扫描规则与断言逐字未动。
  2. **EditorSection/styles.ts 携带三个无消费 styled**（DocChip/DocPath/DirtyDot，早期迭代遗留死代码）: 按「逐字搬移」原则原样携带并在文件头注明，删除留给后续清理变更。
  3. **拆分形态微调**: TransferDialog 落为纯展示组件（open/src/dir/options/busy/error + 三回调注入，JSX 逐字等价）；AccountPage 五组 state 互相引用，采取「状态与 handler 全留 index、AuthFlow/IdentityRepos 纯展示 + props 注入」的机械解，AuthFlow 顶部 const 解构保持原判别收窄语义；Git 输入的函数式 setState 在 index 内以分支展开保类型收窄。
  4. **typecheck 抓到 vitest 漏掉的 4 起真错**: TransferDialog 的 Button 误从 ui/Dialog 导入（原文件来自 ui/Button）；AccountPage/styles.ts 含 JSX 组件却为 .ts 扩展名（改名 .tsx，SavedFlash 属微展示组件暂居样式文件）；SideMenu/MarkdownEditor/frameProtocol/AccountPage 搬入目录后相对路径层级错（vitest 运行时宽松解析不报、tsc 全数拦截）——「绿灯测试不可省 tsc 门禁」再证。
  5. **机器负载事故归因**: 两个僵尸 vitest 进程（残留后台重试循环）双核满载数小时，造成后续批量假超时/V8 段错误/icon 子进程被杀（`spawnSync` status null）；清杀后全部复绿。icon-build 在负载尖峰下 4 连败（自带 30s 包装 vs 裸跑 14.2s），负载低谷即绿。
  6. **frameProtocol.ts 662 行超 300 信号**: 为插件帧协议+宿主服务的单一职责整体（模块级状态拓扑 records/sessions/frames 不可跨文件拆分），保持整块搬移；其内部 service 分流表的进一步拆分列为后续候选。
- 结构产出: 六文件夹 20 个文件，最大 407 行（EditorSection/index），其余 ≤394；原单文件 6 个全部删除；pnpm-lock.yaml 为 worktree 安装副产物（仓库不跟踪），不入提交。

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md
- **理由:** 域内文件夹化（`组件名/` + index.tsx 对外 + 子单元文件 + styles.ts）成为渲染层组件组织约定与后续中型拆分的固定落位模式，值得在卡片增补一句；拆分本身零行为变化，不新增行为结论。release 时按 verified-depth: unit 复评写入。
