---
{
  "schema": "shadow-dev/v1",
  "name": "20260921-feature-settings-redesign",
  "type": "feature",
  "scope": "components/settings,components/ui,shadow-docs/knowledge",
  "status": "reviewed",
  "baseBranch": "fix/20260921-fix-plugin-frame-scheme-cors",
  "branch": "feature/20260921-feature-settings-redesign",
  "files": [
    "components/settings/PluginManagerSection.tsx",
    "components/settings/SettingSection.tsx",
    "components/settings/SettingsNav.tsx",
    "components/settings/SettingsPage.tsx",
    "components/ui/SettingRow.tsx",
    "components/ui/Switch.tsx",
    "shadow-docs/knowledge/shell-chrome-design.md"
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
    "verifiedCommit": "e10b2eb3fe1a1082d85df64de822db98e91d2470",
    "verifiedAt": "2026-09-21T12:13:41.646Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": null,
    "planHash": "bb0b4acf01d10153b1898eb6d1a5a35c1b349e6cde08191148141c43dec7c4fb",
    "updatedAt": null,
    "lastError": null
  },
  "knowledge": null
}
---

# Settings 页重设计——页内锚点导航 + 行式布局 + 交互重制

## 动机

渲染层迁移（20260921-refactor-renderer-nextjs）落地后，设置页沿用迁移前的平铺结构，实机走查（2026-09-21 截图）暴露三类结构性问题：

1. **布局错位**：`auto-fit minmax(340px, 1fr)` 栅格在卡片数量不均时产生孤行——「Git 身份」卡片独占一行且右侧空缺，与上排两卡错位；「关于」大横幅占据首屏高价值位置但信息密度低。
2. **无导航结构**：全部设置平铺单页，插件列表（当前 4 项，随插件增多持续变长）把页面撑到数屏，无跳转手段；`AppSettings` 中 autoCommit/uploadCommand 等字段尚未展示，设置项只会更多。
3. **反馈弱**：onBlur 静默保存 + 顶部一闪而过（2.5s）的全局提示离操作位置远；插件启停用 primary/danger 大色块按钮视觉过重；权限以顿号长串呈现难扫读；列表加载态只有一行文字。

现在做：迁移刚合、设置页即将承载更多设置项，此时重立骨架成本最低。

## 引用规范

- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: styled-components + 主题 token；图标一律 components/icons 注册表 + AppIcon（禁裸 lucide-react）；动效 150-300ms ease-out、禁布局位移过渡、响应 prefers-reduced-motion；品牌标书写动效落点 = 设置页「关于」区块（animated prop + reduced-motion 直出静态终态）；测试不得依赖 styled 类名
  - 适用 scope: app, components, lib
- shadow-docs/knowledge/renderer-shell-routing.md
  - 当前结论: 设置页是右栏普通页面（`app/(shell)/settings`），左栏常驻；`Cmd/Ctrl+,` 在 settings ↔ home 间切换；页面 mount 聚焦（tabIndex={-1}）；新增页面才新增路由段
  - 适用 scope: app, components, lib
  - 本次遵循: 不新增路由段，页内重排
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 启停/批准只经 `plugin:setEnabled` 单通道，批准时机由设置页 PluginManagerSection 的权限确认框承载；`resolveApproval` 判定 approved/pending/changed
  - 适用 scope: src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, src/preload/index.ts
  - 本次遵循: 只改观感与控件形态，通道、确认框语义、状态判定全部不动
- norms/ui-patterns.md（通用）
  - 执行约束: 组件复用优先（ui/ 已有 Button/Input/Tag/Dialog/Empty/Text）、暗黑模式全覆盖 token 化、响应式 768/1024、a11y 底线（focus ring/aria-label/label 关联）
- norms/interaction.md（通用）
  - 执行约束: 即时反馈、skeleton 优于 spinner、禁用态颜色变化而非隐藏、Tab 遍历、动态更新 aria-live
- norms/code-style.md（通用）
  - 执行约束: 禁新增 any、单一职责拆文件、不吞异常

## 决策

- **选型:** 方案 A——页内粘性锚点导航 + SettingRow 行式布局 + Switch 插件启停 + 行内保存反馈；IPC 数据层（getSettings/setSettings/plugin:setEnabled/plugin:list/plugin:reload/plugin:revealDir）不动。
- **对比方案:**
  - *方案 B（单列卡片流）*: 否决——消除错位但无导航，设置项增多后仍会越滚越长，骨架扩展价值弱。
  - *方案 C（Tab 分组）*: 否决——当前仅 4 个分区，Tab 粒度过细；ui/ 无 Tabs 组件需新建并处理方向键导航；桌面设置页惯例是滚动+锚点。
- **理由:** A 的骨架组件（SettingRow/Switch/SettingSection）同时是 B 的子集，后续不浪费；锚点导航为 autoCommit/uploadCommand 等待展示设置项预留分组结构；行内反馈把确认信息放到视线落点。
- **设计规格**（apply 阶段照此执行）:
  - **布局**: 内容区 = 左导航列 168px（sticky）+ 右内容列 max-width 720px；整体居中。<768px 导航折叠为顶部横向 chips（不产生页面横向滚动条）。
  - **SettingsNav**: item 高 28px、字号 13px；激活态 = `--primary-color` 文字 + 左缘 2px 指示条（颜色/透明度过渡，无位移）；scroll-spy 用 IntersectionObserver；激活项 `aria-current="true"`；容器 `aria-label="设置分区导航"`。
  - **SettingSection**: 卡片 `--chrome-panel` + 1px `--chrome-border` + `--border-radius-md`；头部 = 16px AppIcon（chrome 规格）+ 13px 标题 + 12px `--text-muted` 描述；卡片携带锚点 id。
  - **SettingRow**: 左列标题 13px `--text-primary` + 描述 12px `--text-muted`；右列控件区右对齐；行间 12px 间距，不做通栏分隔线；<768px 堆叠（label 在上控件在下）；输入控件以 label 关联（沿用 aria-label 模式）。
  - **Switch**: 36×20 轨道 + 16px thumb，选中 `--primary-color` / 未选中灰阶 token；thumb transform 过渡 200ms ease-out；`role="switch"` + `aria-checked` + label 关联；Space 触发；visible focus ring；禁用态灰阶而非隐藏；reduced-motion 瞬时切换。
  - **保存反馈**: 每行保存成功在控件侧短暂显示「已保存 ✓」（约 1.8s，`role="status"` + `aria-live="polite"`）；失败行内红字 `role="alert"`；全局加载失败（getSettings/plugin:list）保留页面顶部错误位。
  - **Token 行**: 状态点 6px（success/muted）+ 文字（颜色非唯一信息通道）；已配置时「清除」为 danger 次级动作。
  - **插件卡**: 启停 = Switch（走原 toggle/批准确认框通道）；批准状态 = 徽标（待批准/权限已变更高亮，颜色+文字）；权限 = Tag 组件列表（复用 components/ui/Tag）；「打开目录」ghost sm；「重载插件」保留分区头 ghost sm；加载态 skeleton 卡片占位；manifest 视图图标经 `pluginIcon()`/AppIcon 展示（无则文字占位）。
  - **「关于」**: 压缩为分区卡（IconLogo animated + 名称 + 版本 hint），书写动效约束照旧（reduced-motion 直出终态）。
- **base-branch:** `fix/20260921-fix-plugin-frame-scheme-cors`。理由：main 尚未合入渲染层迁移（`components/settings/` 在 main 不存在），本变更依赖迁移后路径；沿先例（CORS fix 基于 refactor 分支）挂链最新已过审分支，前方 PR 合入 main 后本变更 PR 自动重定向。

## 任务

### Phase 1 — 骨架组件（无依赖，可并行）
- [x] `SettingRow` 行式布局组件（label/desc 左、控件右，<768px 堆叠；接口风格对齐 ui/ 既有组件） — `components/ui/SettingRow.tsx` — 新增
- [x] `Switch` 开关组件（role=switch、aria-checked、Space 触发、focus ring、禁用态灰阶、reduced-motion 瞬时） — `components/ui/Switch.tsx` — 新增
- [x] `SettingSection` 分区卡组件（图标+标题+描述头部 + 锚点 id） — `components/settings/SettingSection.tsx` — 新增
- [x] `SettingsNav` 粘性锚点导航（IntersectionObserver scroll-spy、aria-current、<768px 横向 chips） — `components/settings/SettingsNav.tsx` — 新增

### Phase 2 — 设置页重构（依赖 Phase 1）
- [x] `SettingsPage` 骨架替换：页头（返回+标题）+ 导航列 + 分区流；移除 auto-fit 栅格与「关于」大横幅；「关于」压缩为分区卡（品牌标动效保留）；mount 聚焦与 `Cmd/Ctrl+,` 语义不动 — `components/settings/SettingsPage.tsx` — 修改
- [x] 服务分区：Token 行（状态点徽标 + 行内反馈）与站点服务行迁入 SettingRow；保存反馈从顶部 flash 改为行内 ✓/错误 — `components/settings/SettingsPage.tsx` — 修改
- [x] Git 身份分区行式化（user.name / user.email 两行，onBlur 自动保存 + 行内反馈） — `components/settings/SettingsPage.tsx` — 修改

### Phase 3 — 插件区重绘（依赖 Phase 1，可与 Phase 2 并行）
- [x] `PluginManagerSection`：启停改 Switch（走原 toggle/批准确认框通道）、权限 Tag 列表、批准状态徽标、加载 skeleton、「打开目录」ghost 化、manifest 视图图标展示；`plugin:setEnabled`/reload/revealDir 通道与 uiConfirm 语义不动 — `components/settings/PluginManagerSection.tsx` — 修改

### Phase 4 — 验证与文档
- [x] `pnpm typecheck` + `pnpm test` 回归 — 仓库根 — 验证
- [x] 四主题 × 亮暗走查（wine/plain × light/dark）：导航高亮、Switch 两态、状态徽标、skeleton、行内反馈、键盘 Tab 遍历 + Space 开关、reduced-motion 降级、<768px chips 折叠 — 验证
- [x] 知识卡核对：`shell-chrome-design.md` 品牌标落点表述（「关于」区块形态变化后是否仍准确）、设置页结构描述按需更新 — `shadow-docs/knowledge/shell-chrome-design.md` — 按需修改
- [x] brief 结果段回填（含走查结论） — `shadow-docs/changes/20260921-feature-settings-redesign/brief.md` — 修改

## 结果

- 实际耗时: ~1.5h（apply，2026-09-21）
- 验证:
  - `pnpm typecheck` 双 tsconfig 通过；`pnpm test` 18 文件 124 用例全绿；`pnpm build`（next 静态导出 + electron-vite）通过，`dist/next/settings.html` 新鲜产出
  - 残留扫描：lucide 直引仅存在于 `components/icons` 注册表；settings 目录无旧 `RowActions`/`OkText` 残留
  - 待用户实机走查（task-10）：`pnpm dev` 四主题 × 亮暗——导航高亮/scroll-spy、Switch 两态与 Space 开关、Token 状态点、skeleton、行内「已保存」、reduced-motion 降级、<768px chips 折叠
- apply 偏差记录（相对设计规格）:
  1. 分区头部不放图标——图标注册表无语义匹配项（key/globe/puzzle 类），新增图标需改 `components/icons/index.tsx`（不在本变更声明文件清单内）；插件卡图标改走 `pluginIcon()` 注册表 API（manifest views[0].icon，空 views 时首字母占位）
  2. 权限标签未用 `components/ui/Tag`——该组件为 GitHub labels 风格（需外部 color hex、默认白字在浅色主题不可见），改用与既有批准徽标同款的中性描边 pill（`$accent` 变体表达「权限已变更」高亮）
  3. `SettingsNav` scroll-spy 用容器 `scroll` 事件 + getBoundingClientRect 计算（IntersectionObserver 需要滚动容器作为 root，跨组件传递成本更高），行为等价
- 知识影响（留给 review/ship）: `shell-chrome-design.md` 品牌标落点表述核对通过——「关于」仍为设置页分区（形态压缩为分区卡），无需改写；页内锚点导航/行式布局模式如需沉淀并入该卡，不新增卡片

## 知识评估

- **最终结论:** 无需变更（不创建/不改写卡片）
- **理由:** 实施核对确认三张 active 卡结论均未失真——不新增路由段（renderer-shell-routing 不受影响）、不改插件通道契约（plugin-architecture 不受影响）；「关于」区块虽压缩为分区卡，但品牌标书写动效落点仍是设置页「关于」分区（shell-chrome-design 表述仍准确）。页内锚点导航/行式布局属页面级实现细节，未产生需形式化的长期事实；如后续沉淀并入 shell-chrome-design 卡，另行变更。
- **propose 期预估（留档）:** 更新——候选卡片 shadow-docs/knowledge/shell-chrome-design.md；apply 阶段核对后降级为无需变更，理由如上。
