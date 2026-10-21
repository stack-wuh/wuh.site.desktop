# 设计决策清单 — 整窗「书脊案面」（20261016-app-workbench）

> 定稿方向：**书脊案面**（书脊极客风版）。视觉稿：`design-mockups/20261016-app-workbench/index.html`（常驻 http://localhost:4650，场景 `?scene=a|b|c|d|palette|focus|home`；b 为定稿构）。截图留档：`shots/01–04`。
> 本清单是后继 app-layout change 的 propose 输入；实现 = 视觉稿无损移植。

## 已定稿决策

- **D1 书脊（极客风）**：窗左缘 48px 通高深墨竖条——布纹织理（双向 repeating-linear-gradient 1px 织纹）+ 图标即导航（⌂ ▤ ✉ ⌗ + W + ⚙，徽标位/激活指示条/hover 浮起）+ 右缘 1px 朱砂装订线。**无竖排题名、无大印**（20261016 用户裁决「太冗余，极客风就可以」）。暗色主题下 normal-900 反转为浅脊（倒置书效果，实现时实机核对）。
  - 实现：`components/rail`（现 Rail 改造为书脊样式，dark 变体在 `build/icon.svg` 亮暗变体同机制下核对）；守卫：rail 宽度断言 48px + 朱线存在（style 层）。
- **D2 案面（画芯底）**：主区 = 暖案面（背景三重渐变：顶部窗光扫 + 双 radial 暖晕 + 1.2% 纸纹竖纹），内容载体为**浮起素笺**（radius 6、双投影 + 顶部内高光、右缘纸页叠口两层）。素笺排版沿用编辑器 2.0 定稿（衬线题阶/两端对齐/引用墨晕/笺条卡）。
  - 实现：`app/(shell)/layout.tsx` main 容器 + 路由页画芯；`/editor` 页纸面即素笺本体。
- **D3 浮笺（目次/书耳）**：ContextPanel 与 SidePane 从贴边栏改为**浮在案面的 slip-card**——默认收起；呼出入口 = 顶栏「书耳」钮 / rail 项目钮；滑出 220ms ease-out-soft（自书脊/书耳侧平移 + 淡入，reduced-motion 即时）；书耳展开时书口让位、收起时书口回归。
  - 实现：`components/contextpanel`、`components/editor/SidePane` 改浮笺容器（absolute + .open 类切换，禁 display 瞬切）；守卫：滑出动效 token 断言。
- **D4 控制中心（胶囊定位）**：**胶囊 = 全应用控制中心**（用户定位，类 iOS 控制中心）。点 chip 向下展开 470px 浮笺卡：上部 **磁贴网格 4×2**（即时渲染/大纲跟随/专注模式/图床·oss/主题/外观/语言/查找替换——激活态朱底方印图标 + 右上状态点 + 1.5px 朱边），下部**分区**（任务时间线 / GIT（分支·未提交数 + 提交/推送钮）/ 排版（字号步进））。功能迁入范围：任务+编辑器+git+图床+外观语言（用户多选全选）。磁贴图标一律方印（半径 7px），禁圆形。
  - 实现：`components/capsule/CapsulePanel` 重构为控制中心（磁贴网格 + 分区渲染器）；git 行接既有 `gitStatus/gitCommit/gitPush` IPC；外观行接 ThemeProvider/locale；守卫：磁贴方印断言 + 全部迁入功能回归（EditorSection/任务时间线既有用例改造）。
- **D5 案头（Dock）退役**：Dock 组件与 dockbar 退役——任务/插件动态聚合职责由控制中心承接，不设第二聚合点。状态栏**原样保留**（只读 mono 数据常驻：分支·未提交/文档名/图床进度/预览态）。
  - 实现：删 `components/dock`、dockbar；`components/StatusBar` 保留现状；守卫：dock 引用清零扫描。
- **D6 顶栏（画芯内 hover 显影）**：/editor 顶栏 absolute 于画芯列内（**不跨侧栏**——20261016 走查修复按钮压书耳页签缺陷）、hover/focus 显影 0.28→1、渐隐纸罩背景；按钮组=返回/面包屑/书耳开关/新建/保存。
  - 实现：`app/(shell)/editor/page.tsx`（本次已修，随 PR #156）；守卫：editor-page 测试顶栏五件断言。
- **D7 纸面无焦点环**：CM6 聚焦虚线框关闭（`.cm-focused{outline:none}`）——写作面以光标为焦点指示（20261016 走查修复，随 PR #156）。
  - 实现：`components/editor/MarkdownEditor/renderTheme.ts`（已修）；守卫：renderTheme 快照含 outline none。
- **D8 被否决方向（本轮归档，不得复活）**：
  - 构 B 初版「三栏同质笺化」（全 chrome-panel 同色 + 发丝线）——否决维度：同质化无记忆点、无 figure/ground（用户「没有设计感」）；
  - 书脊竖排题名 + 大吾印——否决维度：冗余（用户「极客风就可以」）；
  - 浮笺挤压画芯宽度的布局——否决维度：编辑区必须保持构 A 素笺比例（用户「全部挤在一起」）；
  - 构 C 横卷甲板（IDE 通栏）——预登记否决（书卷气尽失）。

## 落地方式

后继 change（建议名 `2026101X-feature-app-layout-workbench`，propose 时引用本清单与视觉稿）：
Phase 1 书脊化 rail + 案面底色 → Phase 2 控制中心（磁贴+分区+功能迁入）→ Phase 3 浮笺化目次/书耳 + Dock 退役 → Phase 4 四主题核对 + 实机走查。当前 PR #156（编辑器 2.0 素笺手记）独立先行，两 change 无文件级强冲突（D6/D7 已随 #156 落地）。
