---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-feature-virtual-projects-tree",
  "type": "feature",
  "scope": "renderer-shell",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20261007-feature-virtual-projects-tree",
  "files": [
    "components/menu/ProjectsTree.tsx",
    "components/ui/VirtualList.tsx",
    "components/ui/virtual-range.ts",
    "tests/projects-tree.test.tsx",
    "tests/virtual-range.test.ts"
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
    "verifiedCommit": "d3fa1ecef8030d48cc3829557c72a1dbded65231",
    "verifiedAt": "2026-10-07T09:55:00.576Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "32be0c0f86526e4af4c1d455e072b511b9a6411defe7603e249c888fc2a5ed0e",
    "updatedAt": null,
    "lastError": null,
    "release": {
      "files": [
        "components/menu/ProjectsTree.tsx",
        "components/ui/VirtualList.tsx",
        "components/ui/virtual-range.ts",
        "shadow-docs/changes/20261007-feature-virtual-projects-tree/brief.md",
        "shadow-docs/knowledge/renderer-virtual-list.md",
        "shadow-docs/menu.md",
        "tests/projects-tree.test.tsx",
        "tests/virtual-range.test.ts"
      ],
      "message": "feat(projects-tree): 虚拟滚动列表迁移至 Next.js 壳层 —— VirtualList 平移 + ProjectsTree 压平接入，行高 26px、TreeWrap 口径封顶自滚动",
      "title": "feat(projects-tree): 虚拟滚动列表 —— VirtualList 组件平移 + ProjectsTree 接入",
      "body": "## 变更内容\n\n- 自建固定行高虚拟滚动列表 `VirtualList` / `virtual-range` 平移至 `components/ui/`（替代已关闭的 #140，目标从旧 FileTree 改为新 ProjectsTree）\n- ProjectsTree 全部行（项目/目录/文件/提示/空态）压平接入 VirtualList：只渲染可见窗口 ± overscan，展开态继续持有在组件层 Set，行高归一 26px\n- 滚动封顶口径（`max-height: min(52vh,560px)`）经 style prop 内联传入，TreeWrap 与 PluginTree 零改动（styled(VirtualList) 泛型折叠为 unknown，不可用）\n- 窗口数学单测 13 例平移；projects-tree 渲染冒烟适配视口 stub 并新增虚拟化接入断言\n- 新增知识卡 renderer-virtual-list.md（scope: components/）+ menu 路由\n\n## 验证\n\n- vitest 全套 595/595（67 文件）；tsc node/next/tests 三配置通过\n- [ ] 人工验收：真实大仓库下展开项目树滚动流畅、滚出屏幕再滚回展开不丢"
    }
  },
  "knowledge": {
    "action": "新增",
    "target": "shadow-docs/knowledge/renderer-virtual-list.md",
    "reason": "虚拟列表在新架构（Next.js 壳层）落地并接入 ProjectsTree，与 brief 决策一致：vitest 全套 595/595（含 13 个窗口数学单测 + 项目树渲染冒烟 8 例）、tsc 三配置通过。卡片沉淀跨变更约束：行高与 itemHeight 对齐；窗口数学独立 .ts（.tsx 不可被未设 jsx 的 tsconfig 测试工程导入）；styled(VirtualList) 泛型折叠需用 style prop 传样式；行交互状态提升列表层；VirtualList 根即滚动容器、禁嵌套滚动。verified-depth: unit（滚动流畅度 field 待人工确认）；verified-scope: components"
  }
}
---

# 虚拟滚动列表迁移至 Next.js 壳层（ProjectsTree 接入）

## 动机
PR #140（FileTree 虚拟化）建分支后，main 合入 #131/#135 完成架构重构（electron-vite 渲染层 → Next.js App Router），PR 目标文件被删除（modify/delete 冲突）已关闭。但原需求仍成立：新 `components/menu/ProjectsTree.tsx` 依旧全量渲染展开行（递归 `renderNodes`），大仓库（数千 .md）下侧栏滚动卡顿的根因未变。本变更把已验证的 `VirtualList` + `virtual-range` + 单测平移到新结构，压平逻辑按 ProjectsTree 的多项目分组 + 懒加载模型重写。

## 复杂度评级
- **评级：** M（沿用 #140 已批准的 M 画像：无契约变更 / 独立组件触及面 / 改坏立刻可见）
- **理由：** `FileNode`、IPC、路由流均不变；触及面为独立组件（新 ui 组件 + ProjectsTree 内部实现），TreeWrap 等共享容器零改动；回归立刻可见（滚动白屏、行错位、展开丢失）。
- **期望验证深度：** unit（窗口数学纯函数）+ 走查 + runtime（dev 冒烟 + 人工滚动）

## 引用规范
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 两栏布局，SideMenu 条目子树经 TreeWrap 渲染（`max-height: min(52vh,560px); overflow-y:auto` 高度封顶自滚动）；nav 不设 overflow:hidden
  - 适用 scope: components/SideMenu, components/menu
  - 遵循: VirtualList 作为 TreeWrap 内的自滚动子容器，TreeWrap 与 PluginTree 共享结构零改动
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: styled-components + token；键盘焦点 `outline:2px solid var(--primary-color); offset:-2`；动效 150-300ms + reduced-motion；图标走注册表
  - 适用 scope: components
  - 遵循: 行样式沿用既有 NodeRow/NoteRow（已合规），仅加固定高度；不新增样式变体
- norms/ui-patterns.md + norms/interaction.md + norms/code-style(-frontend).md
  - 当前结论: 组件复用与接口风格优先；副作用清理；禁 any；渐进式治理
  - 适用 scope: components
  - 遵循: 沿用既有压平/状态提升模式；ResizeObserver 等监听 effect 内清理

## 决策
- **选型：** 平移 `VirtualList`/`virtual-range` 至 `components/ui/`（props 不变），ProjectsTree 把 `groups × trees × expanded × failed` 压平为四类行（project/dir/file/note）接入；行高归一 26px；VirtualList 根自带 `max-height: min(52vh,560px); overflow-y:auto`（与 TreeWrap 同口径）作为自滚动容器——TreeWrap 不动，PluginTree 无感知。
- **对比方案：** 改 TreeWrap 让滚动职责下沉（共享容器牵连 PluginTree，否决）；扩展 VirtualList 支持外部滚动父容器（当前无第二消费者，违反不提前抽象，否决）；不迁移等实测卡了再说（根因明确存在且组件已验证，否决）。
- **理由：** 最小触及面；复用已通过 13 单测验证的窗口数学；NodeRow/NoteRow 本身已满足焦点/动效/token 规范，仅归一行高。
- **前置依赖：** 无（PR #140 已关闭留档，实现在 `feature/20261007-feature-virtual-scroll-list` 分支可追溯）。
- **非目标：** PluginTree 虚拟化（规模小）、动态行高、/projects 页表格虚拟化、键盘导航增强。

## 任务
### Phase 1 组件平移
- [x] `VirtualList` + `virtual-range` 平移至 `components/ui/`，props 与实现不变 — `components/ui/VirtualList.tsx`, `components/ui/virtual-range.ts` — 新增
- [x] 窗口数学单测平移（13 例）— `tests/virtual-range.test.ts` — 新增
### Phase 2 ProjectsTree 接入
- [x] 压平接入：groups/trees/expanded/failed → 行数组（project/dir/file/note），展开态复用既有 `expanded` Set（已在列表层，天然满足状态提升约束），行高 26px，滚动容器口径迁移至 VirtualList 根 — `components/menu/ProjectsTree.tsx` — 修改
- [x] 渲染冒烟跟随：压平后行序、展开/收起交互在 happy-dom 模式下回归 — `tests/projects-tree.test.tsx` — 修改

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响：** 新增（旧卡 `renderer-virtual-list.md` 随 #140 关闭未进 main，scope 需改 `components/` 后重落）
- **候选卡片：** shadow-docs/knowledge/renderer-virtual-list.md
- **理由：** 三条跨变更约束仍长期有效：行高与 itemHeight 对齐、窗口数学独立 .ts（node 侧测试导入 .tsx 会被未设 jsx 的工程拒绝）、行交互状态提升到列表层；并补充 TreeWrap 内自滚动子容器模式。
