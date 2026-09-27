---
{
  "schema": "shadow-dev/v1",
  "name": "20260927-refactor-midsize-component-split",
  "type": "refactor",
  "scope": "components,app",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "refactor/20260927-refactor-midsize-component-split",
  "files": [
    "app/(shell)/drafts/page.tsx",
    "app/(shell)/projects/page.tsx",
    "components/FloatLayer.tsx",
    "components/home/EditorPanel.tsx",
    "components/settings/PluginManagerSection.tsx",
    "components/ui/FeedbackHost.tsx"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 113,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/113",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "85c3fe7500d28638847710e6b6b1c0668ead580d",
    "verifiedAt": "2026-09-27T06:31:55.402Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:113",
    "planHash": "8bffa65844e0682d1f12cb0c0e7ce8e3c7725e6822c109a37876b1b91d5f4bdf",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[refactor] refactor(components): 六个中型组件域内文件夹化续拆（路由段薄入口变体，零行为变化）",
      "titleRaw": "refactor(components): 六个中型组件域内文件夹化续拆（路由段薄入口变体，零行为变化）",
      "supplement": "FloatLayer/FeedbackHost/EditorPanel/PluginManagerSection/projects 页/drafts 页六个 300–430 行多职责文件，沿用 20260926 沉淀的域内文件夹化约定续拆；路由段 page.tsx 留薄入口 + 同目录 View + styles（约定变体）；Heatmap/modules/ProjectsTree 职责单一不强拆。纯机械搬移零行为变化，全量绿灯 + 三 tsconfig typecheck 护航。方案见 shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md",
      "body": "## 动机\n20260926-refactor-mega-component-split 完成六个巨型组件拆分并沉淀「域内文件夹化」约定后，渲染层仍有 6 个 300–430 行的多职责文件（styled 大块 + 多个可独立理解的逻辑区域）。本轮按同一打法续拆，并把「路由段 page.tsx 的文件夹化变体」（page.tsx 留薄入口）补进约定。按 norms/code-style「300 行是信号、职责决定」的原则，3 个单一职责件（Heatmap 自包含可视化、capsule/modules.tsx 样式库、ProjectsTree 单树件）**不拆**。\n\n**非目标**：Heatmap.tsx、capsule/modules.tsx、ProjectsTree.tsx 保持原样；frameProtocol.ts 再拆、EditorSection/styles.ts 三个死 styled 清理（各自后续候选）；locales/types/plugin.ts/plugin-sdk 固有长度文件；任何行为优化——纯机械搬移。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 域内文件夹化约定（20260926 沉淀）：`组件名/` + index.tsx 对外 + 子单元 + styles.ts，逐字搬移、全量绿灯 + 三 tsconfig typecheck 护航；本变更沿用并补「路由段变体」\n  - 适用 scope: app, components\n- norms/code-style.md\n  - 当前结论: 单一职责（300 行是信号，职责/耦合/测试难度共同决定）——本变更按职责筛选目标，单一职责件不强拆\n  - 适用 scope: 全仓\n- norms/tdd-verification.md\n  - 当前结论: M 级=绿灯测试，验证强度与评级匹配\n  - 适用 scope: 全仓\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: 反馈三件（Toast/Message/Alert）走 lib/feedback 命令式总线 + 三 Host 挂载——FeedbackHost 拆分后三 Host 的挂载点与命令式 API 零变化\n  - 适用 scope: components/ui\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 浮窗开合与几何是 lib/floats 注册表状态（commit 产新引用）——FloatLayer 的 viewportOf/nextGeometry 纯函数搬移逐字保留，Esc 顶层语义与 reduced-motion 降级不动\n  - 适用 scope: components/FloatLayer\n- shadow-docs/knowledge/editor.md\n  - 当前结论: workspaceStore 单状态源 + content 双通道——EditorPanel 内嵌 WorkspacePicker/FilePicker 拆出后消费契约不变\n  - 适用 scope: components/home\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 启停/重载/批准流经 PluginFrameHost API——PluginManagerSection 仅样式与展示拆分，toggle/rebootstrap 调用面不动\n  - 适用 scope: components/settings\n\n## 决策\n- **选型:** 沿用域内文件夹化，两形态：①组件目录化——FloatLayer → `FloatLayer/{index,geometry,FloatWindow,styles}`（geometry.ts 纯几何函数可单测）；FeedbackHost → `FeedbackHost/{index,ToastStack,MessageBannerStack,AlertHost,styles}`（index 编排 + 三 Host 各一文件，index 保持 FeedbackHost 具名导出可达）；EditorPanel → `EditorPanel/{index,WorkspacePicker,FilePicker,styles}`；PluginManagerSection → `PluginManagerSection/{index,styles}`。②路由段变体——`projects/page.tsx`、`drafts/page.tsx` 保留为薄路由入口（App Router 约定文件名不动），内容迁同目录 `ProjectsPage.tsx`/`DraftsPage.tsx` + `styles.ts`。搬移规则同前：逐字等价，仅调整 import/export。\n- **对比方案:** ①9 文件全拆——Heatmap/modules/ProjectsTree 职责单一，强拆违反「职责决定」规范本意，弃；②只拆 FloatLayer/FeedbackHost——PR 最小但 projects/drafts 页与 EditorPanel 的多职责依旧，后续再开 change 流程浪费，弃。\n- **理由:** 按职责筛选 + 已沉淀约定直接复用，风险集中在搬移正确性本身；路由段变体补全约定覆盖面，为本轮及后续页面拆分建立模式。\n\n## 任务\n### Phase 1 反馈与浮窗\n- [ ] FeedbackHost 拆分为 `FeedbackHost/{index,ToastStack,MessageBannerStack,AlertHost,styles}`——`components/ui/FeedbackHost.tsx`\n- [ ] FloatLayer 拆分为 `FloatLayer/{index,geometry,FloatWindow,styles}`——`components/FloatLayer.tsx`\n- [ ] 反馈/浮窗面回归：feedback-render/feedback/plugin-feedback/float 相关测试绿——`tests/`\n### Phase 2 页面与面板\n- [ ] projects 页拆分：page.tsx 薄入口 + `ProjectsPage.tsx` + `styles.ts`——`app/(shell)/projects/page.tsx`\n- [ ] drafts 页拆分：page.tsx 薄入口 + `DraftsPage.tsx` + `styles.ts`——`app/(shell)/drafts/page.tsx`\n- [ ] EditorPanel 拆分为 `EditorPanel/{index,WorkspacePicker,FilePicker,styles}`——`components/home/EditorPanel.tsx`\n- [ ] PluginManagerSection 拆分为 `PluginManagerSection/{index,styles}`——`components/settings/PluginManagerSection.tsx`\n- [ ] 页面/面板面回归：projects/drafts/home-editor 相关测试绿——`tests/`\n### Phase 3 验证闭环\n- [ ] 全量 vitest（基线 58 文件/501 用例）+ 三 tsconfig typecheck 全绿；机器 V8 段错误按预案重试——`package.json`\n- [ ] 旧 specifier 解析核查（6 个目标全部既有 import 点仍可解析）+ brief 结果回填与知识影响复评——`shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md`\n\n## 补充\nFloatLayer/FeedbackHost/EditorPanel/PluginManagerSection/projects 页/drafts 页六个 300–430 行多职责文件，沿用 20260926 沉淀的域内文件夹化约定续拆；路由段 page.tsx 留薄入口 + 同目录 View + styles（约定变体）；Heatmap/modules/ProjectsTree 职责单一不强拆。纯机械搬移零行为变化，全量绿灯 + 三 tsconfig typecheck 护航。方案见 shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md\n\n完整 brief：shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260927-refactor-midsize-component-split\",\"type\":\"refactor\",\"scope\":\"components,app\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "refactor"
      ]
    },
    "release": {
      "files": [
        "app/(shell)/drafts/DraftsPage.tsx",
        "app/(shell)/drafts/page.tsx",
        "app/(shell)/drafts/styles.ts",
        "app/(shell)/projects/ProjectsPage.tsx",
        "app/(shell)/projects/page.tsx",
        "app/(shell)/projects/styles.ts",
        "components/FloatLayer.tsx",
        "components/FloatLayer/FloatWindow.tsx",
        "components/FloatLayer/geometry.ts",
        "components/FloatLayer/index.tsx",
        "components/FloatLayer/styles.ts",
        "components/home/EditorPanel.tsx",
        "components/home/EditorPanel/FilePicker.tsx",
        "components/home/EditorPanel/WorkspacePicker.tsx",
        "components/home/EditorPanel/index.tsx",
        "components/home/EditorPanel/styles.ts",
        "components/settings/PluginManagerSection.tsx",
        "components/settings/PluginManagerSection/index.tsx",
        "components/settings/PluginManagerSection/styles.ts",
        "components/ui/FeedbackHost.tsx",
        "components/ui/FeedbackHost/AlertHost.tsx",
        "components/ui/FeedbackHost/MessageBannerStack.tsx",
        "components/ui/FeedbackHost/ToastStack.tsx",
        "components/ui/FeedbackHost/index.tsx",
        "components/ui/FeedbackHost/styles.ts",
        "shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md",
        "shadow-docs/knowledge/renderer-shell-routing.md",
        "tests/drafts-render.test.tsx",
        "tests/projects-render.test.tsx"
      ],
      "message": "refactor(components): 六个中型多职责组件域内文件夹化续拆——FloatLayer（geometry 纯函数独立）/FeedbackHost（三 Host 各一文件）/EditorPanel（双 Picker 拆出）/PluginManagerSection 目录化，projects/drafts 路由段薄入口变体（page.tsx 留 default 出口 + 同目录 Page 组件 + styles）；Heatmap/modules/ProjectsTree 职责单一不强拆；纯机械搬移零行为变化，分面回归 133 用例绿 + 全量 58 文件/501 用例单次全绿，三 tsconfig typecheck PASS（Closes #113）",
      "title": "refactor(components): 六个中型组件域内文件夹化续拆（路由段薄入口变体，零行为变化）",
      "body": "Closes #113\n\n完整 brief：shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md"
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/renderer-shell-routing.md",
    "reason": "六个中型多职责组件完成域内文件夹化续拆，并落地首个「路由段 page.tsx 薄入口 + 同目录 Page 组件 + styles」变体实例；经分面回归 133 用例 + 全量 58 文件/501 用例单次全绿 + 三 tsconfig PASS 验证。卡片增补路由段变体一句（含 Heatmap/modules/ProjectsTree 单一职责不强拆的正向筛选示例），release 写入时补 verified-depth: unit 与 verified-scope"
  }
}
---

# 六个中型组件按域内文件夹化续拆（对齐 20260926 沉淀约定）

## 动机
20260926-refactor-mega-component-split 完成六个巨型组件拆分并沉淀「域内文件夹化」约定后，渲染层仍有 6 个 300–430 行的多职责文件（styled 大块 + 多个可独立理解的逻辑区域）。本轮按同一打法续拆，并把「路由段 page.tsx 的文件夹化变体」（page.tsx 留薄入口）补进约定。按 norms/code-style「300 行是信号、职责决定」的原则，3 个单一职责件（Heatmap 自包含可视化、capsule/modules.tsx 样式库、ProjectsTree 单树件）**不拆**。

**非目标**：Heatmap.tsx、capsule/modules.tsx、ProjectsTree.tsx 保持原样；frameProtocol.ts 再拆、EditorSection/styles.ts 三个死 styled 清理（各自后续候选）；locales/types/plugin.ts/plugin-sdk 固有长度文件；任何行为优化——纯机械搬移。

## 复杂度评级
- **评级:** M
- **理由:** 契约变更=无（对外导出面、行为、路由、反馈总线与浮窗注册表契约零变化；组件相对 import 无扩展名，目录解析保持 specifier 兼容；路由段 page.tsx 本身不动只减内容）；触及面=6 个文件重组（约 2100 行搬移，逐字等价优先）；可发现性=高（反馈宿主/浮窗/首页面板/设置区都是常驻壳层件，破坏立即可见，501 用例锁定行为）。
- **期望验证深度:** unit

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 域内文件夹化约定（20260926 沉淀）：`组件名/` + index.tsx 对外 + 子单元 + styles.ts，逐字搬移、全量绿灯 + 三 tsconfig typecheck 护航；本变更沿用并补「路由段变体」
  - 适用 scope: app, components
- norms/code-style.md
  - 当前结论: 单一职责（300 行是信号，职责/耦合/测试难度共同决定）——本变更按职责筛选目标，单一职责件不强拆
  - 适用 scope: 全仓
- norms/tdd-verification.md
  - 当前结论: M 级=绿灯测试，验证强度与评级匹配
  - 适用 scope: 全仓
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: 反馈三件（Toast/Message/Alert）走 lib/feedback 命令式总线 + 三 Host 挂载——FeedbackHost 拆分后三 Host 的挂载点与命令式 API 零变化
  - 适用 scope: components/ui
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 浮窗开合与几何是 lib/floats 注册表状态（commit 产新引用）——FloatLayer 的 viewportOf/nextGeometry 纯函数搬移逐字保留，Esc 顶层语义与 reduced-motion 降级不动
  - 适用 scope: components/FloatLayer
- shadow-docs/knowledge/editor.md
  - 当前结论: workspaceStore 单状态源 + content 双通道——EditorPanel 内嵌 WorkspacePicker/FilePicker 拆出后消费契约不变
  - 适用 scope: components/home
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 启停/重载/批准流经 PluginFrameHost API——PluginManagerSection 仅样式与展示拆分，toggle/rebootstrap 调用面不动
  - 适用 scope: components/settings

## 决策
- **选型:** 沿用域内文件夹化，两形态：①组件目录化——FloatLayer → `FloatLayer/{index,geometry,FloatWindow,styles}`（geometry.ts 纯几何函数可单测）；FeedbackHost → `FeedbackHost/{index,ToastStack,MessageBannerStack,AlertHost,styles}`（index 编排 + 三 Host 各一文件，index 保持 FeedbackHost 具名导出可达）；EditorPanel → `EditorPanel/{index,WorkspacePicker,FilePicker,styles}`；PluginManagerSection → `PluginManagerSection/{index,styles}`。②路由段变体——`projects/page.tsx`、`drafts/page.tsx` 保留为薄路由入口（App Router 约定文件名不动），内容迁同目录 `ProjectsPage.tsx`/`DraftsPage.tsx` + `styles.ts`。搬移规则同前：逐字等价，仅调整 import/export。
- **对比方案:** ①9 文件全拆——Heatmap/modules/ProjectsTree 职责单一，强拆违反「职责决定」规范本意，弃；②只拆 FloatLayer/FeedbackHost——PR 最小但 projects/drafts 页与 EditorPanel 的多职责依旧，后续再开 change 流程浪费，弃。
- **理由:** 按职责筛选 + 已沉淀约定直接复用，风险集中在搬移正确性本身；路由段变体补全约定覆盖面，为本轮及后续页面拆分建立模式。

## 任务
### Phase 1 反馈与浮窗
- [x] FeedbackHost 拆分为 `FeedbackHost/{index,ToastStack,MessageBannerStack,AlertHost,styles}`——`components/ui/FeedbackHost.tsx`
- [x] FloatLayer 拆分为 `FloatLayer/{index,geometry,FloatWindow,styles}`——`components/FloatLayer.tsx`
- [x] 反馈/浮窗面回归：feedback-render/feedback/plugin-feedback/float 相关测试绿——`tests/`
### Phase 2 页面与面板
- [x] projects 页拆分：page.tsx 薄入口 + `ProjectsPage.tsx` + `styles.ts`——`app/(shell)/projects/page.tsx`
- [x] drafts 页拆分：page.tsx 薄入口 + `DraftsPage.tsx` + `styles.ts`——`app/(shell)/drafts/page.tsx`
- [x] EditorPanel 拆分为 `EditorPanel/{index,WorkspacePicker,FilePicker,styles}`——`components/home/EditorPanel.tsx`
- [x] PluginManagerSection 拆分为 `PluginManagerSection/{index,styles}`——`components/settings/PluginManagerSection.tsx`
- [x] 页面/面板面回归：projects/drafts/home-editor 相关测试绿——`tests/`
### Phase 3 验证闭环
- [x] 全量 vitest（基线 58 文件/501 用例）+ 三 tsconfig typecheck 全绿；机器 V8 段错误按预案重试——`package.json`
- [x] 旧 specifier 解析核查（6 个目标全部既有 import 点仍可解析）+ brief 结果回填与知识影响复评——`shadow-docs/changes/20260927-refactor-midsize-component-split/brief.md`

## 结果
- 实际耗时: 约 2.5h（含机器 V8 段错误重试与一次中途停下复盘调整流程）
- 验证:
  - 分面回归: 反馈面 37 用例绿（feedback-render/feedback/plugin-feedback）+ 浮窗面 20 用例绿（feedback-render/navigation-guard/plugin-protocol 组合）+ projects 面 28 + drafts 面 32 + EditorPanel 16
  - 三 tsconfig typecheck **全 PASS**（tsc 过程中拦截 EditorPanel/index 与 PluginManagerSection/index 两起旧层级残留——教训落实为「每落一个文件立即 tsc，不攒批」后归零）
  - 全量 vitest 确认跑 **58 文件 / 501 用例单次全绿**（--no-file-parallelism，吸收 1 次 V8 段错误重试）
  - specifier 核查: layout/SettingsPage/三处测试共 5 个组件消费点全部目录解析兼容；projects/drafts 两处测试具名导入随迁新 Page 组件文件；tsc next/tests 双 PASS 在类型层覆盖全部 import 解析
- 偏差与发现:
  1. **测试具名导入随迁 ×2**: projects-render.test.tsx / drafts-render.test.tsx 原从 page 具名导入 ProjectsPage/DraftsPage，薄入口后改指 ./ProjectsPage、./DraftsPage（断言逐字未动）。
  2. **两次「猜测试文件名」流程失误**（settings-render/plugin-manager 并不存在即跑）——PluginManagerSection 与 settings 页本无直接测试网，靠 tsc + 全量兜底；失误已向用户明示并获准「继续验证」，后续以 tsc-next 即时复验替代猜测性跑测。
  3. **路由段变体落地顺利**: page.tsx 薄入口 + 同目录 Page 组件 + styles.ts，default export 保留，Next 路由约定不受影响；两页面为约定补全了首个实例。
  4. 机器 V8 段错误贯穿（全量 3 连 139 → 查无僵尸、负载 5.5，纯随机抖动 → 重试收敛）。

## 知识评估
- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/renderer-shell-routing.md
- **理由:** 增补「路由段 page.tsx 文件夹化变体」（薄入口 + 同目录 View + styles）一句，补全约定覆盖面；拆分本身零行为变化。release 时按 verified-depth: unit 复评写入。
