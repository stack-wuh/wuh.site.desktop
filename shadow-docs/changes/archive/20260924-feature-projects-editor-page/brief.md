---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-projects-editor-page",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "archived",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-projects-editor-page",
  "files": [
    "app/(shell)/drafts/page.tsx",
    "app/(shell)/editor/page.tsx",
    "app/(shell)/layout.tsx",
    "app/(shell)/projects/page.tsx",
    "components/SideMenu.tsx",
    "components/icons/index.tsx",
    "components/menu/ProjectsTree.tsx",
    "lib/i18n/locales.ts",
    "lib/projectOpen.ts",
    "lib/projects.ts",
    "lib/routes.ts",
    "shadow-docs/knowledge/editor.md",
    "shadow-docs/knowledge/renderer-shell-routing.md",
    "src/main/workspace.ts",
    "src/preload/index.ts",
    "src/shared/types.ts",
    "tests/drafts-render.test.tsx",
    "tests/editor-page.test.tsx",
    "tests/i18n.test.ts",
    "tests/projects-render.test.tsx",
    "tests/projects-tree.test.tsx",
    "tests/projects.test.ts",
    "tests/workspace-tree.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 73,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/73",
    "pullRequest": 77,
    "pullRequestUrl": "https://github.com/stack-wuh/wuh.site.desktop/pull/77"
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "35a315b99262a57386cf7509677704082b16110d",
    "verifiedAt": "2026-09-24T08:52:58.971Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "merged-pr:77",
    "planHash": "967f479caac4f579ada316fce1574a5fbde9ebc4a3238735f38931d63c224dbc",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 按项目浏览（项目页）+ 统一编辑页（Typora 式沉浸）",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n草稿箱落地后，「先写后存」链路已通，但文档浏览仍缺**按项目**维度：文件入口散在首页面板的 popover 与胶囊编辑器分区里，跨项目找文件要来回切工作区；草稿「继续编辑」回落首页面板，写面被首页 chrome（问候/热力图/面板边框）包裹，不沉浸。\n\n本次新增三件事：\n1. 左侧菜单新增【项目】页（`/projects`）：以项目维度划分 Group（当前工作区 + 最近项目），每个 Group 内列各自的 `.md` 文件，点击快速进入编辑；组内含「打开目录」入口。\n2. 统一编辑页（`/editor`）：窄栏居中、极简顶栏的 Typora 式沉浸写面，复用 CM6 即时渲染；从项目页点文件、从草稿箱「继续编辑」都进入这一页——草稿与项目文件共用同一编辑页。\n3. 主进程 `readTree` 增加可选 `root` 参数：项目页无需切换工作区即可列出任意最近项目的文件清单。\n\n## 引用规范\n- shadow-docs/knowledge/renderer-shell-routing.md\n  - 当前结论: 新右栏页面 = 新增 `app/(shell)/<segment>/page.tsx` 路由段，菜单项与路由段一一对应；`useSyncExternalStore` 必须带第三参 `getServerSnapshot`（静态导出）；客户端组件一律 'use client'。\n  - 适用 scope: `/projects` `/editor` 两个新路由段 + `lib/routes.ts` + `app/(shell)/layout.tsx` 菜单\n- shadow-docs/knowledge/editor.md\n  - 当前结论: content 双通道防回环（pushedRef 比对）、命令通道消费契约（EditorCommandHost 常驻壳层 layout 单实例）、UI 颜色只经主题 token、禁重新引入大体积静态资产管线；MarkdownEditor 为唯一编辑器内核。\n  - 适用 scope: `/editor` 页复用 MarkdownEditor；保存/新建经 publishEditorCommand，不绕命令通道\n- shadow-docs/knowledge/desktop-app-architecture.md（父仓库）\n  - 当前结论: fs 操作收敛主进程经 window.api 类型安全 IPC；草稿仓 `userData/drafts/`（先写后存语义）；DOM 渲染类变更验收必须跑 happy-dom 用例（零 React 告警）。\n  - 适用 scope: `readTree(root?)` 契约扩展、新页面 DOM 测试\n- norms/ui-patterns.md / norms/interaction.md\n  - 当前结论: 组件复用优先、暗色全覆盖禁裸色值、动效 150-300ms ease-out + reduced-motion、a11y 底线（aria-label/焦点环）、破坏性操作先确认、Esc 语义。\n  - 适用 scope: 两个新页面的全部 UI\n\n## 决策\n- **选型:** 方案 A′——双新路由段（`/projects`、`/editor`）+ `readTree(root?)` 签名扩展 + 草稿箱跳转改向 `/editor`；**首页 EditorPanel 原样保留**（产品明确要求先不撤），两处编辑面互斥挂载、共用 workspaceStore 单状态源。\n- **对比方案:** B（`/editor` 单页内嵌项目文件树侧栏）——编辑面 chrome 变重不 Typora，且 `/editor` 承载两个菜单语义破坏「菜单项=路由段」约定，排除；C（新增 `listMarkdownFiles(root)` 平铺 IPC）——主进程重复 `buildTree` 已有的深度/预算/忽略规则（有测试锁定），FilePicker 仍走 readTree 两套遍历并存，排除。\n- **理由:** 完全复用现有 store/命令通道/CM6 装饰层/草稿自动暂存；导航与草稿箱同构；IPC 面最小（仅一个签名扩展）。\n- **边界决策:**\n  - 首页 EditorPanel 及其 popover（WorkspacePicker/FilePicker）不动，`tests/home-editor-panel.test.ts` 不受影响；`/editor` 页是独立第二个挂载点，路由段互斥保证任一时刻仅一处挂载 CM6 实例。\n  - 草稿箱「继续编辑」从跳 `/` 改为跳 `/editor`（编辑页与草稿箱合流）；草稿会话语义（openDraft/activeDraftId/自动暂存/另存为消费）不变。\n  - `/editor` 冷启动（无文档无草稿会话，content==null）自动 `startDraft()` 进入新草稿会话——延续「先写后存」；页内无预览分栏（即时渲染即预览），胶囊渲染模式开关仍作用于同一 store。\n  - 极简顶栏：返回（`/projects`，无历史则 `/`）· 面包屑（项目名/文件名或「草稿」）· 脏点 · 新建 · 保存（canSave 语义与首页面板一致）；撤销/重做/查找走 CM6 原生快捷键与胶囊入口，不在顶栏重复；专注模式经 editor-state 总线联动（顶栏随 focusMode 淡出）。\n  - 项目页 Group：当前工作区组置顶（徽标「当前」），最近项目组随 `listRecentWorkspaces`（去重当前项）；首屏并行拉取各组清单（cap 8+1），失效目录组呈「不可访问」态并保留路径；组内行 = 文件名 + 相对路径；顶部筛选复用 `filterMarkdownFiles`。\n  - 跨组打开：脏文档先 `uiConfirm`；非当前组先 `openWorkspaceByPath(root)` 切工作区（登记最近）再 `readFile` → `openDoc` → `router.push('/editor')`；当前组直接 readFile → openDoc → `/editor`。\n  - `readTree(root?)`：root 提供时校验目录存在（不存在/非目录抛错）后按该根构树，**不切换当前工作区**；缺省保持现行为（requireRoot）。\n  - `/editor` 为非菜单路由 key（不高亮菜单项，与 `/account` 的菜单外路由处理同构）；菜单项顺序：首页 → 项目 → 草稿箱 → 插件视图。\n  - 图标走 lucide：菜单「项目」用既有 IconFolderOpen；顶栏返回新增 IconArrowLeft 导出。\n  - i18n 三语（zh/en/ja）：`menu.projects`、`projects.*` 族、编辑页顶栏 `editor.*` 新键；key 集合一致性由 `tests/i18n.test.ts` 锁定。\n\n## 任务\n### Phase 1 数据契约（主进程）\n- [ ] shared 契约：`readTree(root?: string)` 签名扩展 — `src/shared/types.ts` — 修改\n- [ ] 主进程实现：root 提供时校验目录存在并按根构树（不切工作区），缺省走 requireRoot 现行为 — `src/main/workspace.ts` — 修改\n- [ ] preload 透传可选 root — `src/preload/index.ts` — 修改\n- [ ] 主进程测试（node env + tmp dir：缺省=当前工作区、指定 root 构树、root 不存在/为文件抛错、隐藏文件与忽略目录规则不变） — `tests/workspace-tree.test.ts` — 新增\n\n### Phase 2 项目纯逻辑与路由菜单\n- [ ] lib/projects 纯逻辑：buildProjectGroups（当前置顶去重、组元数据）、组展开态 helpers（可独立测试，无 DOM） — `lib/projects.ts` — 新增\n- [ ] 路由：`routeKeyFromPathname` 增加 '/projects' → 'projects'、'/editor' → 'editor'（非菜单 key） — `lib/routes.ts` — 修改\n- [ ] 菜单：SideMenu items 增加「项目」项（IconFolderOpen，置于首页后）+ onChange 分发 `/projects` — `app/(shell)/layout.tsx` — 修改\n\n### Phase 3 项目页 UI\n- [ ] `/projects` 页：组列表（当前组徽标/最近组路径/失效组不可访问态）、组内 .md 行（文件名+相对路径）、顶部筛选、打开目录按钮、空态 — `app/(shell)/projects/page.tsx` — 新增\n- [ ] 打开文件流：脏确认 → 按需切工作区 → readFile → openDoc → 跳 `/editor` — `app/(shell)/projects/page.tsx` — 新增\n- [ ] i18n 三语：`menu.projects` + `projects.*` 族 — `lib/i18n/locales.ts` — 修改\n- [ ] 测试：纯逻辑（分组/去重/失效组）+ DOM 渲染（happy-dom + mock api：分组结构/空态/不可访问态/点击流转断言，零 React 告警） — `tests/projects.test.ts` `tests/projects-render.test.tsx` — 新增\n\n### Phase 4 统一编辑页\n- [ ] `/editor` 页：窄栏沉浸布局（~760px 居中列）+ 极简顶栏（返回/面包屑/脏点/新建/保存）+ MarkdownEditor 复用（无预览分栏）+ 冷启动自动 startDraft + focusMode 顶栏联动 — `app/(shell)/editor/page.tsx` — 新增\n- [ ] i18n 三语：编辑页顶栏 `editor.*` 新键 — `lib/i18n/locales.ts` — 修改\n- [ ] 草稿箱「继续编辑」跳转 `/` → `/editor` — `app/(shell)/drafts/page.tsx` — 修改\n- [ ] 图标：IconArrowLeft 导出 — `components/icons/index.tsx` — 修改\n- [ ] 测试：编辑页 DOM 渲染（顶栏结构/面包屑草稿与文档两态/保存可用性，零 React 告警）+ drafts-render 断言更新 — `tests/editor-page.test.tsx` `tests/drafts-render.test.tsx` — 新增/修改\n\n### Phase 5 全量验证\n- [ ] `pnpm typecheck`（node/next 双侧）+ `pnpm test` 全量回归 — 无文件 — 验证\n- [ ] 手动走查：四主题（wine/plain × light/dark）项目页与编辑页、跨组打开切工作区、草稿续写合流、reduced-motion — 无文件 — 验证\n\n完整 brief：shadow-docs/changes/20260924-feature-projects-editor-page/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-feature-projects-editor-page\",\"type\":\"feature\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-feature-projects-editor-page/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": {
    "action": "更新",
    "target": "shadow-docs/knowledge/renderer-shell-routing.md；shadow-docs/knowledge/editor.md；shadow-docs/knowledge/shell-chrome-design.md（协调项）",
    "reason": "随 PR 合入定稿：①renderer-shell-routing——/projects、/editor 路由段、左栏项目树与共享 openProjectFile、readTree(root?) 契约、i18n 缺键回落与源码键覆盖测试；②editor——/editor 第二编辑面挂载点与「新编辑面复用 MarkdownEditor + 命令通道」约束（已与 main 侧即时渲染事实合并落卡）；③shell-chrome-design——SideMenu 条目子树槽位待与原 change 同卡合并补齐。merge 后补丁：main 侧 typecheck 红由 tests/editor-live-preview-toggle 改名 .tsx 修复（173fb73）、编辑页 flake 断言改 findByText（38d84a7）。"
  }
}
---

# 按项目浏览（项目页）+ 统一编辑页（Typora 式沉浸）

## 动机

草稿箱落地后，「先写后存」链路已通，但文档浏览仍缺**按项目**维度：文件入口散在首页面板的 popover 与胶囊编辑器分区里，跨项目找文件要来回切工作区；草稿「继续编辑」回落首页面板，写面被首页 chrome（问候/热力图/面板边框）包裹，不沉浸。

本次新增三件事：
1. 左侧菜单新增【项目】页（`/projects`）：以项目维度划分 Group（当前工作区 + 最近项目），每个 Group 内列各自的 `.md` 文件，点击快速进入编辑；组内含「打开目录」入口。
2. 统一编辑页（`/editor`）：窄栏居中、极简顶栏的 Typora 式沉浸写面，复用 CM6 即时渲染；从项目页点文件、从草稿箱「继续编辑」都进入这一页——草稿与项目文件共用同一编辑页。
3. 主进程 `readTree` 增加可选 `root` 参数：项目页无需切换工作区即可列出任意最近项目的文件清单。

## 引用规范

- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 新右栏页面 = 新增 `app/(shell)/<segment>/page.tsx` 路由段，菜单项与路由段一一对应；`useSyncExternalStore` 必须带第三参 `getServerSnapshot`（静态导出）；客户端组件一律 'use client'。
  - 适用 scope: `/projects` `/editor` 两个新路由段 + `lib/routes.ts` + `app/(shell)/layout.tsx` 菜单
- shadow-docs/knowledge/editor.md
  - 当前结论: content 双通道防回环（pushedRef 比对）、命令通道消费契约（EditorCommandHost 常驻壳层 layout 单实例）、UI 颜色只经主题 token、禁重新引入大体积静态资产管线；MarkdownEditor 为唯一编辑器内核。
  - 适用 scope: `/editor` 页复用 MarkdownEditor；保存/新建经 publishEditorCommand，不绕命令通道
- shadow-docs/knowledge/desktop-app-architecture.md（父仓库）
  - 当前结论: fs 操作收敛主进程经 window.api 类型安全 IPC；草稿仓 `userData/drafts/`（先写后存语义）；DOM 渲染类变更验收必须跑 happy-dom 用例（零 React 告警）。
  - 适用 scope: `readTree(root?)` 契约扩展、新页面 DOM 测试
- norms/ui-patterns.md / norms/interaction.md
  - 当前结论: 组件复用优先、暗色全覆盖禁裸色值、动效 150-300ms ease-out + reduced-motion、a11y 底线（aria-label/焦点环）、破坏性操作先确认、Esc 语义。
  - 适用 scope: 两个新页面的全部 UI

## 决策

- **选型:** 方案 A′——双新路由段（`/projects`、`/editor`）+ `readTree(root?)` 签名扩展 + 草稿箱跳转改向 `/editor`；**首页 EditorPanel 原样保留**（产品明确要求先不撤），两处编辑面互斥挂载、共用 workspaceStore 单状态源。
- **对比方案:** B（`/editor` 单页内嵌项目文件树侧栏）——编辑面 chrome 变重不 Typora，且 `/editor` 承载两个菜单语义破坏「菜单项=路由段」约定，排除；C（新增 `listMarkdownFiles(root)` 平铺 IPC）——主进程重复 `buildTree` 已有的深度/预算/忽略规则（有测试锁定），FilePicker 仍走 readTree 两套遍历并存，排除。
- **理由:** 完全复用现有 store/命令通道/CM6 装饰层/草稿自动暂存；导航与草稿箱同构；IPC 面最小（仅一个签名扩展）。
- **边界决策:**
  - 首页 EditorPanel 及其 popover（WorkspacePicker/FilePicker）不动，`tests/home-editor-panel.test.ts` 不受影响；`/editor` 页是独立第二个挂载点，路由段互斥保证任一时刻仅一处挂载 CM6 实例。
  - 草稿箱「继续编辑」从跳 `/` 改为跳 `/editor`（编辑页与草稿箱合流）；草稿会话语义（openDraft/activeDraftId/自动暂存/另存为消费）不变。
  - `/editor` 冷启动（无文档无草稿会话，content==null）自动 `startDraft()` 进入新草稿会话——延续「先写后存」；页内无预览分栏（即时渲染即预览），胶囊渲染模式开关仍作用于同一 store。
  - 极简顶栏：返回（`/projects`，无历史则 `/`）· 面包屑（项目名/文件名或「草稿」）· 脏点 · 新建 · 保存（canSave 语义与首页面板一致）；撤销/重做/查找走 CM6 原生快捷键与胶囊入口，不在顶栏重复；专注模式经 editor-state 总线联动（顶栏随 focusMode 淡出）。
  - 项目页 Group：当前工作区组置顶（徽标「当前」），最近项目组随 `listRecentWorkspaces`（去重当前项）；首屏并行拉取各组清单（cap 8+1），失效目录组呈「不可访问」态并保留路径；组内行 = 文件名 + 相对路径；顶部筛选复用 `filterMarkdownFiles`。
  - 跨组打开：脏文档先 `uiConfirm`；非当前组先 `openWorkspaceByPath(root)` 切工作区（登记最近）再 `readFile` → `openDoc` → `router.push('/editor')`；当前组直接 readFile → openDoc → `/editor`。
  - `readTree(root?)`：root 提供时校验目录存在（不存在/非目录抛错）后按该根构树，**不切换当前工作区**；缺省保持现行为（requireRoot）。
  - `/editor` 为非菜单路由 key（不高亮菜单项，与 `/account` 的菜单外路由处理同构）；菜单项顺序：首页 → 项目 → 草稿箱 → 插件视图。
  - 图标走 lucide：菜单「项目」用既有 IconFolderOpen；顶栏返回新增 IconArrowLeft 导出。
  - i18n 三语（zh/en/ja）：`menu.projects`、`projects.*` 族、编辑页顶栏 `editor.*` 新键；key 集合一致性由 `tests/i18n.test.ts` 锁定。
  - **（走查反馈修订 2026-09-24）菜单树**：左栏【项目】条目升级为树根——行尾旋钮展开/收起子树（行本体点击仍进 `/projects` 总览），子树一级为项目节点（当前工作区置顶带「当前」徽标，其余为最近项目），二级起为项目内文件夹 + `.md` 文件递归树（`pruneMarkdownTree` 只留含 .md 的分支）；项目/目录节点懒加载（首次展开才 `readTree(root)`，失败呈「无法访问」行可重试）；点文件 = 共享 `openProjectFile`（脏确认 → 按需切工作区 → readFile → openDoc）直达 `/editor`；rail 收起态不渲染子树（条目回落纯导航）；无任何项目时子树给「打开目录」入口。树内容用「打开文件流抽共享」防两处实现漂移。

## 任务

### Phase 1 数据契约（主进程）
- [x] shared 契约：`readTree(root?: string)` 签名扩展 — `src/shared/types.ts` — 修改
- [x] 主进程实现：root 提供时校验目录存在并按根构树（不切工作区），缺省走 requireRoot 现行为 — `src/main/workspace.ts` — 修改
- [x] preload 透传可选 root — `src/preload/index.ts` — 修改
- [x] 主进程测试（node env + tmp dir：缺省=当前工作区、指定 root 构树、root 不存在/为文件抛错、隐藏文件与忽略目录规则不变） — `tests/workspace-tree.test.ts` — 新增

### Phase 2 项目纯逻辑与路由菜单
- [x] lib/projects 纯逻辑：buildProjectGroups（当前置顶去重、组元数据）、组展开态 helpers（可独立测试，无 DOM） — `lib/projects.ts` — 新增
- [x] 路由：`routeKeyFromPathname` 增加 '/projects' → 'projects'、'/editor' → 'editor'（非菜单 key） — `lib/routes.ts` — 修改
- [x] 菜单：SideMenu items 增加「项目」项（IconFolderOpen，置于首页后）+ onChange 分发 `/projects` — `app/(shell)/layout.tsx` — 修改

### Phase 3 项目页 UI
- [x] `/projects` 页：组列表（当前组徽标/最近组路径/失效组不可访问态）、组内 .md 行（文件名+相对路径）、顶部筛选、打开目录按钮、空态 — `app/(shell)/projects/page.tsx` — 新增
- [x] 打开文件流：脏确认 → 按需切工作区 → readFile → openDoc → 跳 `/editor` — `app/(shell)/projects/page.tsx` — 新增
- [x] i18n 三语：`menu.projects` + `projects.*` 族 — `lib/i18n/locales.ts` — 修改
- [x] 测试：纯逻辑（分组/去重/失效组）+ DOM 渲染（happy-dom + mock api：分组结构/空态/不可访问态/点击流转断言，零 React 告警） — `tests/projects.test.ts` `tests/projects-render.test.tsx` — 新增

### Phase 4 统一编辑页
- [x] `/editor` 页：窄栏沉浸布局（~760px 居中列）+ 极简顶栏（返回/面包屑/脏点/新建/保存）+ MarkdownEditor 复用（无预览分栏）+ 冷启动自动 startDraft + focusMode 顶栏联动 — `app/(shell)/editor/page.tsx` — 新增
- [x] i18n 三语：编辑页顶栏 `editor.*` 新键 — `lib/i18n/locales.ts` — 修改
- [x] 草稿箱「继续编辑」跳转 `/` → `/editor` — `app/(shell)/drafts/page.tsx` — 修改
- [x] 图标：IconArrowLeft 导出 — `components/icons/index.tsx` — 修改
- [x] 测试：编辑页 DOM 渲染（顶栏结构/面包屑草稿与文档两态/保存可用性，零 React 告警）+ drafts-render 断言更新 — `tests/editor-page.test.tsx` `tests/drafts-render.test.tsx` — 新增/修改

### Phase 5 全量验证
- [x] `pnpm typecheck`（node/next 双侧）+ `pnpm test` 全量回归 — 无文件 — 验证
- [x] 手动走查：四主题（wine/plain × light/dark）项目页与编辑页、跨组打开切工作区、草稿续写合流、reduced-motion — 无文件 — 验证

### Phase 6 菜单树（走查反馈修订：项目入口长在左栏）
- [x] lib/projects 扩展：pruneMarkdownTree（只留含 .md 分支）+ 树节点展开态 key helpers — `lib/projects.ts` — 修改
- [x] 打开文件流抽共享 openProjectFile（脏确认 → 按需切工作区 → readFile → openDoc，跳转留给调用方），项目页改用 — `lib/projectOpen.ts` `app/(shell)/projects/page.tsx` — 新增/修改
- [x] SideMenu 支持条目子树（tree/treeOpen/onToggleTree，行尾旋钮不冒泡导航；rail 收起态不渲染子树） — `components/SideMenu.tsx` — 修改
- [x] 菜单项目树：项目节点（当前徽标/懒加载/失效重试/空项目引导）→ 文件夹+.md 递归树，点文件直达 `/editor`；layout 接线【项目】条目 — `components/menu/ProjectsTree.tsx` `app/(shell)/layout.tsx` — 新增/修改
- [x] i18n 三语：树交互新键（`projects.treeToggle`/`projects.loading`） — `lib/i18n/locales.ts` — 修改
- [x] 测试：树纯逻辑 + ProjectsTree DOM 渲染（懒展开/失效/点击流转/空态，零 React 告警）+ 既有 projects 渲染回归 — `tests/projects.test.ts` `tests/projects-tree.test.tsx` — 新增/修改
- [x] `pnpm typecheck` + `pnpm test` 全量回归 + 提交 — 无文件 — 验证
- [x] 缺键修复（走查反馈）：补 `menu.projects`（左栏曾显示裸 key「menu.projects」，三语）+ 既有遗漏 `account.authFailed`；新增「源码引用键 ⊆ 字典」回归测试（字面量 t() 直调 + 命名空间守卫扫描间接传键） — `lib/i18n/locales.ts` `tests/i18n.test.ts` — 修改

## 结果

- 实际耗时: 约 3 小时（跨两轮会话：首轮项目页/编辑页实现 + 走查反馈修订「左栏项目树 + i18n 缺键修复」）
- 验证: tsc 三套（node/next/tests）全过；vitest 362/362（43 文件；本轮走查修订新增 13 用例：项目树渲染 7 + 树纯逻辑 4 + i18n 键覆盖 2）；`pnpm build`（next 静态导出 + electron-vite）通过；用户手动走查——四主题、跨项目切工作区、草稿续写合流、菜单树点文件直达 `/editor`、缺键修复后左栏文案，全部确认

## 知识评估

- **最终结果:** 更新
- **目标卡片:** shadow-docs/knowledge/renderer-shell-routing.md；shadow-docs/knowledge/editor.md；shadow-docs/knowledge/shell-chrome-design.md（协调项，见理由③）
- **理由:** ① renderer-shell-routing——追加 `/projects`、`/editor` 两个路由段（后者菜单外 key，同 `/account`）、左栏项目树与共享 `openProjectFile` 打开流、`readTree(root?)` 契约（显式 root 不切工作区）、i18n 缺键静默回落为裸 key + 源码键覆盖扫描；② editor——追加 `/editor` 第二编辑面挂载点（路由互斥、同 store 单状态源与命令通道、无预览分栏）与「新编辑面必须复用 MarkdownEditor + 命令通道」约束；③ shell-chrome-design——SideMenu 条目子树槽位与左栏项目树，该卡另有并行变更 20260924-feature-sidemenu-bottom-toggle 的**未提交编辑**（其文本已含「导航子树 TreeWrap」一笔），本次不混入对方 WIP，待其落地后于归档时补齐 props 细节。查重：三卡各覆盖对应域（路由 / 编辑器 / 壳层 chrome），无重复卡片可合并。
