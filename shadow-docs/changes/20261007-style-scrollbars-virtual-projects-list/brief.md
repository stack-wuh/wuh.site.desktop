---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-style-scrollbars-virtual-projects-list",
  "type": "style",
  "scope": "renderer-shell",
  "status": "branched",
  "baseBranch": "main",
  "branch": "style/20261007-style-scrollbars-virtual-projects-list",
  "files": [
    "app/globals.css",
    "app/(shell)/projects/ProjectsPage.tsx",
    "app/(shell)/projects/styles.ts",
    "tests/globals-scrollbar.test.ts",
    "tests/projects-render.test.tsx"
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
    "checkpoint": null,
    "planHash": "4c3cab297c8471c9372560db228fef2d68e242843975b3513722c9b158823e79",
    "updatedAt": null,
    "lastError": null,
    "commit": null,
    "release": {
      "files": [
        "app/(shell)/projects/ProjectsPage.tsx",
        "app/(shell)/projects/styles.ts",
        "app/globals.css",
        "shadow-docs/changes/20261007-style-scrollbars-virtual-projects-list/brief.md",
        "shadow-docs/knowledge/renderer-virtual-list.md",
        "shadow-docs/knowledge/shell-chrome-design.md",
        "tests/globals-scrollbar.test.ts",
        "tests/projects-render.test.tsx"
      ],
      "message": "style(projects): 交互优化 —— 全应用隐藏滚动条（globals 唯一收口+源码守卫）+ 项目页文件列表接入共享 VirtualList 固定 10 行窗口",
      "title": "style(projects): 全应用隐藏滚动条 + 项目页文件列表虚拟滚动",
      "body": ""
    }
  }
}
---

# style(renderer): 交互优化 —— 全应用隐藏滚动条 + 项目页文件列表接入共享虚拟滚动

## 动机
用户实测反馈（项目页截图）三项：
1. 页面可见滚动条（8px 主题色胶囊）与纸面主题观感不符，要求全部去掉；
2. 项目页组内文件列表全量渲染（实测 $AST 专题 30+ 行全部铺出），要求改用虚拟滚动、只展示固定数量的行；
3. 所有页面必须使用公共组件与交互——项目页文件列表是全应用唯一未走 `components/ui/VirtualList` 的大列表（左栏 ProjectsTree 已接入）。

## 复杂度评级
- **评级:** S
- **理由:** 虚拟化组件、纯函数与消费先例（ProjectsTree）全部现成；改动为收口性质，不动契约不加依赖
- **期望验证深度:** unit（渲染冒烟 + 源码级守卫）+ 实机走查

## 引用规范
- shadow-docs/knowledge/renderer-virtual-list.md
  - 当前结论: 固定行高 VirtualList 窗口化；行高恒定、状态提升、style prop 传封顶、useMemo 压平
  - 适用 scope: 渲染层大列表——本变更即按卡接入第二消费方
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 组件样式一律 styled-components，globals.css 只留全局地基（含滚动条）
  - 适用 scope: 滚动条策略改动的落点唯一性

## 决策
- **选型:** ① globals.css 滚动条改隐藏（`scrollbar-width: none` + `::-webkit-scrollbar { display:none }`），滚动能力保留；全应用滚动容器（页面 ScrollArea / SideMenu / 虚拟列表 / 编辑预览 / 设置等）经 grep 确认无组件层自写滚动条样式，一处收口全覆盖。② 项目页组内文件列表逐组接入 VirtualList：FileRow 收敛为 40px 固定行高（baseline 文本对进 20px 行盒），组体 `maxHeight = 40px × 10 行`封顶固定窗口，其余行进虚拟化滚动。③ 守卫测试两项：`tests/globals-scrollbar.test.ts` 源码级锁定隐藏收口（并禁止组件层再造滚动条样式）；`tests/projects-render.test.tsx` 加视口 stub 与「大列表只呈窗口行」渲染断言。
- **对比方案:** (a) 滚动条改 auto-hide（hover 才现形）——用户明确要"一点都不好看"的全删，留悬浮变体违背裁决；(b) 项目页整页压平成单一 VirtualList（ProjectsTree 同构）——组卡分组结构（Group 卡片、组头、空态行）要全部重写为同高行，改动半径大且破坏既有吸顶/栅格范式，否；(c) 草稿箱列表一并虚拟化——Row 含摘要多行文本属动态行高，renderer-virtual-list 卡明令不得直塞现有组件，超出本次范围。
- **理由:** 三项裁决都能在既有收口点上完成：滚动条唯一在 globals.css，列表唯一在 ui/VirtualList；改动半径最小且各配源码级守卫防再犯。
- **待确认点:** 组体固定 10 行窗口是观感默认值（400px，桌面高度下与组头/搜索框共存不触底），如嫌矮/嫌高只改 `VISIBLE_ROWS` 一个常量。

## 任务
### Phase 1
- [x] globals.css 滚动条胶囊样式改隐藏 — `app/globals.css`
- [x] FileRow 固定行高 40px、GroupBody 去 gap — `app/(shell)/projects/styles.ts`
- [x] 项目页文件列表接入 VirtualList（10 行窗口封顶） — `app/(shell)/projects/ProjectsPage.tsx`
- [x] 滚动条隐藏源码守卫 — `tests/globals-scrollbar.test.ts`
- [x] 项目页虚拟化渲染冒烟（视口 stub + 窗口行断言） — `tests/projects-render.test.tsx`
- [x] 全量门禁（vitest + 三配置 tsc）与实机走查

## 结果
- 实际耗时: —
- 验证: vitest 全量 638/639（唯一失败为 icon-build 重渲染用例在并行负载下 30s 超时，单跑 13.5s 过，与本次无关）；三配置 tsc 全过；CDP 驱动真实 Electron 窗口实测——blog 组 173 文件仅 18 行入 DOM、窗口 400px=10×40 行、滚动到底可达 README.md、全页无可见滚动条
- 实机注意: 本机 swap 近满（9.2G 用 8.7G）引发 pnpm/tsc/vitest 随机 SIGSEGV，清理失控旧 dev 实例后重试即过；`next dev` 在 stdin EOF 时会静默自杀（Next 16 防孤儿机制），托管重启需挂持久 stdin

## 知识评估
- **预期影响:** 更新
- **候选卡片:** renderer-virtual-list.md（消费方登记 + 渲染冒烟视口 stub 与窗口行数推导约束）；shell-chrome-design.md（滚动条策略段：全应用隐藏 + 组件层禁再造）
- **理由:** 隐藏滚动条是观感裁决级政策变化，8px 胶囊先例可能诱发的"逐页美化滚动条"回潮由守卫 + 成文双保险封堵
