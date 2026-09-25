---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-breadcrumb-doc-ops",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-breadcrumb-doc-ops",
  "files": [
    "app/(shell)/editor/page.tsx",
    "components/capsule/sections/EditorSection.tsx",
    "lib/editor-commands.ts",
    "lib/i18n/locales.ts",
    "src/main/workspace.ts",
    "src/preload/index.ts",
    "src/shared/docTransfer.ts",
    "src/shared/types.ts",
    "tests/doc-transfer.test.ts",
    "tests/editor-page.test.tsx",
    "tests/i18n.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 87,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/87",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "9d23c3c278617471706a6fcb0dfe9b879cc547ff",
    "verifiedAt": "2026-09-24T14:17:36.265Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:87",
    "planHash": "87f6392f399172cdc567dae2d3622b6aeb5c96a2b6502808d0982ec4de78bdab",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "编辑页面包屑文档操作：完整路径 + 点击改名 + 文件夹迁移/复制",
      "body": "## 动机\n/editor 顶栏面包屑当前为纯展示（工作区名/文件名），中间目录不显示；改名/移动/复制需绕道文件系统。图片按 blog 约定落在文档同目录 <文件名>.assets/ 且正文为相对引用，改名/迁移不同步处理 assets 目录与引用会导致图片断链。\n\n## 方案（方案 A：命令通道扩展 + 宿主统一执行）\n- 面包屑改完整相对路径渲染；文件名段点击原地改名（Enter/blur 提交、Esc 取消、草稿态禁用，仅 basename、强制 .md）\n- 文件夹段点击发布 transferDoc 命令 → EditorCommandHost 打开目标文件夹选择 Dialog（迁移/复制双动作内嵌）\n- EditorCommand 词表新增 renameDoc/transferDoc；主进程新增 IPC transferDoc(srcRel, destRel, mode)，safeJoin 守卫 + <stem>.assets/ 目录跟随 + 正文引用改写（纯逻辑在 src/shared/docTransfer.ts 配测试）\n- 复制完成后停留原文 + Toast；rename/move 脏缓冲跟随并保持 dirty；目标同名冲突/非法字符宿主校验拒绝\n\n## 验收\n- 面包屑完整路径、点击交互、草稿态禁用（tests/editor-page.test.tsx）\n- docTransfer 纯逻辑（tests/doc-transfer.test.ts）：路径校验/assets 映射/引用改写\n- i18n 三语覆盖；不绕过命令通道契约（knowledge/editor.md）\n\n详细 brief：shadow-docs/changes/20260924-feature-breadcrumb-doc-ops/brief.md",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# 编辑页面包屑文档操作：完整路径 + 点击改名 + 文件夹迁移/复制

## 动机

`/editor` 顶栏面包屑当前是纯展示（`工作区名 / 文件名` + 脏点，`app/(shell)/editor/page.tsx:157`），中间目录不显示，改名/移动/复制只能绕道文件系统。用户期望编辑页内闭环：点文件名原地改名；点文件夹段选目标文件夹，并当场选择「迁移」还是「复制」。同时主进程目前只有 `readTree/readFile/writeFile`，且图片按 blog 约定落在文档同目录 `<文件名>.assets/`（`src/shared/imagePlan.ts` assetsDirNameFor）、正文为相对引用——任何改名/迁移若不同步处理 assets 目录与引用，图片将全部断链。本变更把三件事一次做对。

## 引用规范

- `shadow-docs/knowledge/editor.md`
  - 当前结论: `/editor` 顶栏文档操作经 `publishEditorCommand` 命令通道、由常驻壳层 EditorCommandHost 认领（save/saveAs/newDraft/closeDoc 先例）；编辑面不得为某页另建状态源或直连主进程写盘；新编辑器命令先入 `EditorCommand` 词表。
  - 适用 scope: [components/editor, components/home/EditorPanel, app/(shell)/editor, lib/editor-cm, lib/editor-commands, lib/editor-info]
- `shadow-docs/knowledge/ui-feedback.md`
  - 当前结论: 操作成功类反馈用 Toast（`lib/feedback.ts` 命令式总线）；文档操作的模态确认走既有 `uiConfirm`/Dialog 链路；不得绕过总线自建浮层。
  - 适用 scope: [lib/feedback.ts, components/ui/FeedbackHost.tsx]

## 决策

- **选型:** 方案 A——命令通道扩展 + 宿主统一执行。面包屑只承载交互（完整路径渲染、文件名段原地 input、文件夹段点击发命令），`EditorCommand` 词表新增 `renameDoc`/`transferDoc`（带 payload），EditorCommandHost 认领并承载目标文件夹选择 Dialog（readTree 收集目录 + 迁移/复制双动作内嵌，避免二次弹窗）；主进程新增 IPC `transferDoc(srcRel, destRel, mode: 'move'|'copy')`，内部同步处理 `<stem>.assets/` 目录跟随与正文相对引用改写（重命名必然改目录名、移动时目录随迁引用天然有效），沿用 `safeJoin` 防穿越守卫。
- **对比方案:** 方案 B（页内自治直调 IPC）违背 editor.md「不得直连主进程写盘」约束且胶囊不可复用，否；方案 C（悬停菜单形态）扩展性好但与用户明确要的「点击即操作」直觉不符、实现量最大，否。
- **理由:** A 把交互直觉留在面包屑、变更执行收敛在宿主与主进程，契约与 saveAs 先例完全一致；assets 映射与引用改写为纯逻辑放 `src/shared/docTransfer.ts` 配测试，唯一事实源。已确认 UX 细节：面包屑展示完整相对路径；复制完成后编辑器停留原文 + Toast 提示。脏缓冲语义：rename/move 时缓冲跟随（引用改写同步作用于内存缓冲，经 openDoc+setContent 保持 dirty），copy 落盘「所见即所存」（dirty 先 saveActive 再复制磁盘内容）。草稿态（activePath null）文件名段不可点；改名仅 basename、强制 `.md` 后缀（同 saveAs 惯例）；目标目录同名冲突与非法字符在宿主校验拒绝并提示。

## 任务

### Phase 1 — shared 纯逻辑 + 主进程 IPC（TDD）

- [x] 新建 `src/shared/docTransfer.ts`：transferDoc 纯逻辑（相对路径合法性校验、新旧路径 assets 目录名映射、重命名场景正文引用改写、同名冲突检测辅助）+ 新建 `tests/doc-transfer.test.ts`（参照 imagePlan.test.ts 形态）
- [x] `src/main/workspace.ts` 新增 `transferDoc` IPC 实现（move：文档+assets 目录随迁；copy：复制文档与 assets 目录；safeJoin 守卫；目标已存在抛错）；`src/preload/index.ts` 与 `src/shared/types.ts` 的 DesktopApi 同步暴露
- [x] `src/shared/types.ts` FileNode 相关不需扩展；确认 `readTree` 可枚举目录供选择器复用（不改则不列）

### Phase 2 — 命令通道与宿主认领

- [x] `lib/editor-commands.ts` 词表新增 `{ kind: 'renameDoc'; newName: string }` 与 `{ kind: 'transferDoc' }`，注释同步
- [x] `components/capsule/sections/EditorSection.tsx` EditorCommandHost：认领两命令——renameDoc 做校验后发 IPC 并同步 store（openDoc 新路径 + 脏缓冲引用改写回灌）；transferDoc 打开目标文件夹选择 Dialog（readTree 收集目录树、「迁移/复制」双动作按钮、冲突错误内联展示），完成后 Toast 反馈（复制停留原文）
- [x] `lib/i18n/locales.ts` 三语新增面包屑交互/冲突/迁移复制文案 key；`tests/i18n.test.ts` 覆盖

### Phase 3 — 面包屑交互与回归

- [x] `app/(shell)/editor/page.tsx`：面包屑改为完整相对路径渲染（工作区/目录段/文件名+脏点，长路径中间段 ellipsis 收敛）；文件名段点击原地变 input（Enter/blur 提交、Esc 取消、草稿态禁用），提交经 publishEditorCommand({kind:'renameDoc'})；各目录段点击 publishEditorCommand({kind:'transferDoc'})
- [x] `tests/editor-page.test.tsx` 扩展：完整路径渲染、点击交互发命令、草稿态禁用；全量 `vitest run` 相关套件回归

## 结果

- 实际耗时: 约 2.5h（apply+review，worktree 隔离）
- 验证: vitest 目标套件 59/59、全量 414+8 全绿；tsc 三份 tsconfig 全绿（本机 V8 139 重试收敛）
- 备注: `src/main/ipc.ts` 为 brief 漏列的新增 DesktopApi 方法强制接线点，已随本变更修改；测试侧确认 React 18 act 块内离散事件状态刷新在 act 收尾提交，click 与断言须分属两个 act（已注记在 tests/editor-page.test.tsx）

## 知识评估

- **预期影响:** 更新
- **候选卡片:** `shadow-docs/knowledge/editor.md`
- **理由:** /editor 顶栏面包屑从纯展示升级为可交互文档操作入口，EditorCommand 词表扩充（renameDoc/transferDoc），宿主新增文件夹选择 Dialog——均为 editor.md「命令通道 + 宿主认领」结论的自然延伸，合并进该卡即可，不新增卡片；ui-feedback.md 无需变（仅消费既有 Toast/Dialog 惯例）。
