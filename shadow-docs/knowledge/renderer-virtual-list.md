---
title: 渲染层固定行高虚拟列表
domain: renderer-ui
keywords: [虚拟列表, 虚拟滚动, VirtualList, 大列表, 滚动卡顿, 文件树, 项目树, 列表渲染, 展开状态]
scope: [components]
status: active
source:
  - changes/20261007-feature-virtual-projects-tree/brief.md
  - changes/20261007-style-scrollbars-virtual-projects-list/brief.md
verified: 2026-10-07
verified-depth: unit
verified-scope: computeRange/clampScrollTop 13 个纯函数单测 + ProjectsTree 压平接入渲染冒烟 + /projects 页逐组虚拟化渲染冒烟（vitest 全套 638/639，唯一失败为 icon-build 并行负载超时、单跑过；72 文件）；tsc 三配置通过；Electron 实机 CDP 断言（173 文件仅 18 行入 DOM、窗口 400px=10×40、滚动到底可达末行）。滚动手感流畅度（field）尚待人工确认
---

# 渲染层固定行高虚拟列表

## 当前结论
大列表（如 ProjectsTree 数千行）用自建 `VirtualList`（`components/ui/VirtualList.tsx`）虚拟化：滚动容器 + 总高 spacer + 绝对定位窗口行（`translateY`），只渲染可见窗口 ± overscan 行；窗口数学独立在 `virtual-range.ts` 纯函数（`computeRange` / `clampScrollTop`）。已接入两消费方：ProjectsTree（多项目分组 + 懒加载树，压平单列表，行高 26px）；`/projects` 页组内文件列表（20261007 交互优化，逐组 VirtualList，行高 40px，`maxHeight = 10 行`封顶固定窗口，滚动条全局隐藏不可见）。新增长列表不得再全量 map 渲染，一律走本组件。

## 执行约束
- 行高必须恒定且与 `itemHeight` 严格一致（当前 26px：行 styled-components 的 `height` 与消费方 `ROW_HEIGHT` 对齐）；要支持动态行高必须先扩展 `computeRange` 的测量缓存，不能直接塞进现有组件。
- 窗口数学保持独立 `.ts` 纯函数模块：node 侧测试导入含 JSX 的 `.tsx` 会被未设 jsx 的 tsconfig 拒绝。新列表的单测一律导入纯函数模块，不导入组件文件。
- `styled(VirtualList)` 会把组件泛型折叠成 `unknown`（styled-components v6 已知限制，itemKey 等回调参数丢类型）；需要给容器加样式时用 VirtualList 的 `style` prop 传递（如 ProjectsTree 的 `SCROLL_STYLE`），不要 styled() 包裹。
- 行交互状态（展开/选中）必须提升到列表消费方组件层，不能存在行组件内部——虚拟化后滚出屏幕的行会卸载，行内 state 随之丢失。
- 压平结果（行数组）用 `useMemo` 缓存，依赖数据与展开状态；滚动只移动窗口，不重算全量行。
- VirtualList 根元素即滚动容器：高度封顶（如 SideMenu TreeWrap 同款 `max-height: min(52vh, 560px)` + `overflow-y: auto`）由调用方经 `style`/`className` 给；嵌套滚动容器（外层再包 overflow 容器）会让视口测量失效、退化为全量渲染。
- 新列表接入沿用现有 props 风格：`items / itemHeight / itemKey / renderItem / overscan / className / style`；组件只管窗口定位，行样式与交互由 `renderItem` 提供。

## 适用边界
适用于固定行高的渲染层大列表。不适用于动态行高场景（图片流、多行文本）——需先扩展窗口数学；不适用于主进程或插件沙箱内部渲染。

## 验证方式
- `pnpm test`：`tests/virtual-range.test.ts` 覆盖滚动映射、overscan、上下边界钳制、数据变短钳制；`tests/projects-tree.test.tsx`（happy-dom + clientHeight 视口 stub）覆盖压平行序与展开交互回归；`tests/projects-render.test.tsx` 覆盖项目页逐组虚拟化（大列表只呈窗口行）。渲染层冒烟统一视口 stub 800px，窗口行数按 itemHeight 推导，改行高须同步推导断言。
- `pnpm typecheck` + `pnpm dev`：打开大仓库展开项目树，观察滚动流畅度、展开状态保持（滚出屏幕再滚回不丢）。
- 本机注意：tsc/vitest 偶发随机 SIGSEGV（exit 139），高负载下更频繁——先查是否有失控进程占满核心，重试即过，勿误判为代码问题。swap 将满时连 `pnpm`/`wait-on` 二进制本身也会段错误（先 `sysctl vm.swapusage` 看水位再重试）。
- 托管重启 `next dev` 注意：Next 16 起 dev server 侦测 stdin EOF 即**零输出静默退出**（防孤儿机制）——nohup/后台任务裸启必死；需挂持久 stdin（如 `< /dev/zero`）再后台化。

## 关联知识
- [Renderer 壳层两栏布局与 App Router 路由约定](renderer-shell-routing.md)（ProjectsTree 是 SideMenu【项目】条目子树，TreeWrap 高度封顶自滚动的结构约束）
