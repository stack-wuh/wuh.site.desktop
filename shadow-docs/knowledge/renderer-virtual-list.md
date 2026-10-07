---
title: 渲染层固定行高虚拟列表
domain: renderer-ui
keywords: [虚拟列表, 虚拟滚动, VirtualList, 大列表, 滚动卡顿, 文件树, 列表渲染, 展开状态]
scope: [src/renderer/src/components]
status: active
source:
  - changes/20261007-feature-virtual-scroll-list/brief.md
verified: 2026-10-07
verified-depth: unit
verified-scope: computeRange/clampScrollTop 13 个纯函数单测通过（vitest 96/96）；tsc 双侧通过；dev 启动冒烟无错误（Electron 进程正常拉起）。真实大仓库下的滚动流畅度（field）尚待人工确认
---

# 渲染层固定行高虚拟列表

## 当前结论
大列表（如 FileTree 数千行）用自建 `VirtualList`（`src/renderer/src/components/ui/VirtualList.tsx`）虚拟化：滚动容器 + 总高 spacer + 绝对定位窗口行（`translateY`），只渲染可见窗口 ± overscan 行；窗口数学独立在 `virtual-range.ts` 纯函数（`computeRange` / `clampScrollTop`）。FileTree 两个视图（普通树 / 博客结构化）均已压平接入，行高 26px。

## 执行约束
- 行高必须恒定且与 `itemHeight` 严格一致（当前 26px：`.tree-row` CSS 与 `FileTree` 的 `ROW_HEIGHT` 对齐）；要支持动态行高必须先扩展 `computeRange` 的测量缓存，不能直接塞进现有组件。
- 窗口数学保持独立 `.ts` 纯函数模块：node 侧测试导入 renderer `.tsx` 会被未设 `jsx` 的 `tsconfig.node.json` 拒绝（TS6142）。新列表的单测一律导入纯函数模块，不导入组件文件。
- 行交互状态（展开/选中）必须提升到列表消费方组件层，不能存在行组件内部——虚拟化后滚出屏幕的行会卸载，行内 state 随之丢失。
- 压平结果（行数组）用 `useMemo` 缓存，依赖数据与展开状态；滚动只移动窗口，不重算全量行。
- 新列表接入沿用现有 props 风格：`items / itemHeight / itemKey / renderItem / overscan / className`；组件只管窗口定位，行样式与交互由 `renderItem` 提供。

## 适用边界
适用于固定行高的渲染层大列表。不适用于动态行高场景（图片流、多行文本）——需先扩展窗口数学；不适用于主进程或插件沙箱内部渲染。

## 验证方式
- `pnpm test`：`tests/virtuallist.test.ts` 覆盖滚动映射、overscan、上下边界钳制、数据变短钳制。
- `pnpm typecheck` + `pnpm dev`：打开大仓库滚动侧栏，观察流畅度、展开状态保持（滚出屏幕再滚回不丢）、结构化视图表现。
- 本机注意：tsc/vitest 偶发随机 SIGSEGV（退出码 139），重试即过，勿误判为代码问题。

## 关联知识
- [Renderer 壳层双层路由约定](renderer-shell-routing.md)（FileTree 是 `activePanel` 侧栏面板，虚拟列表不改变面板挂载方式）
