---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-feature-virtual-scroll-list",
  "type": "feature",
  "scope": "renderer-shell",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20261007-feature-virtual-scroll-list",
  "files": [
    "src/renderer/src/components/FileTree.tsx",
    "src/renderer/src/components/ui/VirtualList.tsx",
    "src/renderer/src/styles/global.css",
    "tests/virtuallist.test.ts"
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
    "verifiedCommit": "38083ec713b4dbd429be30ac8de15102f2a9c3c0",
    "verifiedAt": "2026-10-07T08:37:31.442Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "6eab00faef427fb869eb111e0dd4c2dc993e25b4553e7eca58e8c1bc5ad76f27",
    "updatedAt": null,
    "lastError": null,
    "release": {
      "files": [
        "shadow-docs/changes/20261007-feature-virtual-scroll-list/brief.md",
        "shadow-docs/knowledge/renderer-virtual-list.md",
        "shadow-docs/menu.md",
        "src/renderer/src/components/FileTree.tsx",
        "src/renderer/src/components/ui/VirtualList.tsx",
        "src/renderer/src/components/ui/virtual-range.ts",
        "src/renderer/src/styles/global.css",
        "tests/virtuallist.test.ts"
      ],
      "message": "feat(file-tree): 虚拟滚动列表 —— 自建 VirtualList 组件 + FileTree 两视图压平接入，行高 26px、展开状态提升列表层，新增渲染层虚拟列表知识卡",
      "title": "feat(file-tree): 虚拟滚动列表 —— VirtualList 组件 + FileTree 两视图接入",
      "body": "## 变更内容\n\n- 新增可复用固定行高虚拟滚动列表 `VirtualList`（components/ui/）：滚动容器 + spacer + 绝对定位窗口行，ResizeObserver 跟随容器尺寸；窗口数学抽为纯函数 `virtual-range.ts`\n- FileTree 普通树与博客结构化视图统一压平接入，展开状态提升到 FileTree 层（虚拟化卸载行不再丢状态），行高归一 26px，结构化视图不再整棵渲染 DOM\n- 单测 13 个（滚动映射/overscan/边界钳制/数据变短钳制），全套 96/96 通过；tsc 双侧通过\n- 新增知识卡 `shadow-docs/knowledge/renderer-virtual-list.md` 并接入 menu 路由\n\n## 验收备注\n\n- [ ] 真实博客仓库下人工确认侧栏滚动流畅、展开/收起与结构化视图表现正常"
    }
  },
  "knowledge": {
    "action": "新增",
    "target": "shadow-docs/knowledge/renderer-virtual-list.md",
    "reason": "固定行高虚拟列表落地、两视图接入与 brief 决策一致：96/96 测试通过（新增 13 个纯函数单测）、tsc 双侧通过、dev 启动无错误。卡片沉淀跨变更可复用约束：行高必须与 VirtualList itemHeight 对齐；窗口数学独立成 .ts 模块（node 侧测试导入 .tsx 会被未设 jsx 的 tsconfig.node 拒绝，TS6142）；列表行交互状态提升到列表层（虚拟化卸载行不丢状态）。verified-depth: unit+runtime；verified-scope: src/renderer/src/components"
  }
}
---

# 虚拟滚动列表组件 + FileTree 两个视图接入

## 动机
FileTree 当前把所有展开行全量渲染成 DOM：递归 `Node` 组件逐目录展开，博客结构化视图里 `years` 组默认全部展开，博客仓库数千个 md 文件时一次性渲染数千行 flex + 内联 SVG 图标，滚动掉帧；且 `global.css` 给每行 `.tree-row` 挂 0.3s hover 过渡，滚动时鼠标扫过大量行持续触发过渡，加剧卡顿。分两步走：第一步落一个可复用的固定行高虚拟滚动列表组件（`components/ui/`），第二步把 FileTree 普通树视图与结构化视图都替换为虚拟化渲染。

## 复杂度评级
- **评级：** M
- **理由：** 无契约变更（`FileNode` 类型、IPC 接口、对外组件接口均不变，纯渲染层重写）；触及面为独立组件（新增 ui 组件 + FileTree 内部实现 + 行高 CSS），不碰宿主核心与跨模块数据流；改坏立刻可见（滚动白屏、展开状态丢失、行错位），可发现性高。
- **期望验证深度：** unit（窗口计算纯函数）+ 走查 + runtime 手动滚动

## 引用规范
- norms/ui-patterns.md
  - 当前结论: 组件复用优先，新建组件走项目既有组件接口风格；禁止硬编码颜色，用 CSS 变量/token；过渡 150-300ms ease-out 且响应 prefers-reduced-motion
  - 适用 scope: src/renderer/src/components
  - 遵循: VirtualList 放入 `components/ui/`，Props 风格对齐相邻组件（受控数据传入 + renderItem 出口）；组件只管窗口定位不管行样式，行样式沿用既有 `.tree-row` token 体系
- norms/interaction.md
  - 当前结论: 用户操作须有即时反馈；滚动交互遵守交互底线
  - 适用 scope: src/renderer/src/components
  - 遵循: 展开/收起即时生效；滚动窗口更新不引入布局位移动画
- norms/code-style.md + norms/code-style-frontend.md
  - 当前结论: 禁止新增 any；状态归属靠近使用位置；副作用生命周期内建立和清理；不为未来场景提前抽象；渐进式治理
  - 适用 scope: src/renderer/src/components
  - 遵循: 窗口计算抽纯函数便于测试；ResizeObserver/scroll 监听在 effect 中建立并清理；只做固定行高，不预留动态行高抽象
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: FileTree 是 280px 侧栏面板，由 `activePanel === 'files'` 条件渲染
  - 适用 scope: src/renderer/src
  - 遵循: 不改变壳层导航结构与面板挂载方式，只动面板内部渲染

## 决策
- **选型：** 自建固定行高 `VirtualList`（滚动容器 + spacer 总高 + 绝对定位窗口行 + overscan；窗口计算 `computeRange` 抽为纯函数导出）。FileTree 两个视图各自 flatten 成可见行数组后接入：普通树前序遍历展开树，结构化视图把 section 标题/组/文件行统一压平。目录展开状态从行组件 `useState` 提升为 FileTree 层 `Set<path>`（默认展开 depth<2 与现状一致），否则虚拟化后滚出屏幕的行卸载即丢状态。行高归一 26px 固定值。
- **对比方案：** `@tanstack/react-virtual`（成熟但项目零 UI 依赖，行高恒定场景引入依赖不值，否决）；虚拟化逻辑直接写进 FileTree（改动集中但违反第一步「可复用组件」目标，后续列表无法复用，否决）；分页/懒展开（不是虚拟化，展开的大目录依旧全量渲染，否决）。
- **理由：** 固定行高虚拟化是该场景下最小且完备的方案；纯函数窗口计算使 M 级验证可用项目既有 vitest 纯逻辑测试风格（无 React 渲染依赖）覆盖数学正确性。

## 任务
### Phase 1 虚拟列表组件（可复用）
- [x] `VirtualList` 组件 + `computeRange` 纯函数：items/itemHeight/itemKey/renderItem/overscan/className props，scroll 容器 + spacer + 绝对定位窗口行，ResizeObserver 观察容器高度，监听在 effect 中清理 — `src/renderer/src/components/ui/VirtualList.tsx` — 新增
- [x] 窗口计算单测：滚动映射、overscan 扩展、边界钳制、itemCount 变短后 scrollTop 钳制不越界 — `tests/virtuallist.test.ts` — 新增（M 级绿灯测试）
### Phase 2 FileTree 两个视图替换
- [x] 普通树视图：前序遍历 flatten 为可见行数组，展开状态提升为 FileTree 层 `Set<path>`，toggle 收起裁剪后代，接入 VirtualList — `src/renderer/src/components/FileTree.tsx` — 修改
- [x] 结构化视图：section 标题/组/文件行统一压平为行数组（years 默认展开保持现状），接入 VirtualList — `src/renderer/src/components/FileTree.tsx` — 修改
- [x] 行高归一与滚动容器：`.tree-row` 固定高度 26px（对齐现渲染高度），`.file-tree` 变为虚拟滚动容器占满侧栏剩余高度，hover 过渡仅作用于可见行 — `src/renderer/src/styles/global.css` — 修改

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响：** 新增
- **候选卡片：** shadow-docs/knowledge/renderer-virtual-list.md（命名以 apply 阶段查重后为准）
- **理由：** 虚拟列表组件的固定行高约束、纯函数窗口计算、展开状态提升模式是后续其他列表接入时要复用的跨变更结论，且 verify-depth 覆盖 unit + runtime。
