# 项目开发菜单（wuh.site.desktop）

> 通用规范路由见 `shadow-dev-workflow/menu.md`；本表只维护项目独有路由。AI 在 propose 阶段按任务域、关键词和 scope 命中后只读取对应文件。

## 项目路由

| 技术域 | 关键词 | 应查阅 |
|--------|--------|--------|
| 渲染层导航/壳层 | 页面 视图 路由 路由段 App Router 设置 导航 工作台 rail 图标列 上下文面板 文档树 收起 快捷键 命令面板 palette ⌘K 专注模式 focus 用户入口 用户中心 /account 通知条 main 容器 浮窗 FloatLayer toggle 首页 任务流 问候语 热力图 静态导出 export next 拆分 文件夹化 组件组织 data-chrome 回到编辑 写作入口 首项 上下文切换 workbenchEntryTarget | knowledge/renderer-shell-routing.md |
| 壳层 chrome / 图标 | 图标 图标注册表 AppIcon Icon 品牌标 IconLogo Dock 图标 icon.svg 应用图标 ico 任务栏 rail 书脊 spine-ink spine-paper 朱砂装订线 StatusBar 状态栏 徽标 tooltip 描边 主题 token styled-components CSP 外观与语言 语言切换 SegmentedControl 分段控件 案面 Sheet 浮笺画芯 paperSurface 专注浮条 z 分带 层叠 | knowledge/shell-chrome-design.md |
| 用户中心 / GitHub 授权 | 用户中心 account 授权 OAuth Device Flow GitHub 登录 token 凭证 身份 头像 identity 仓库列表 默认站点仓库 PAT scopes 失效 | knowledge/renderer-shell-routing.md, knowledge/shell-chrome-design.md |
| 构建/工具链 | Next next.config 静态导出 app 协议 electron-vite 双进程 dev workspace pnpm 打包 electron-builder tsconfig vitest README | knowledge/renderer-shell-routing.md, knowledge/shell-chrome-design.md |
| 主编辑器 / 素笺 | 编辑器 MarkdownEditor CodeMirror CM6 源码编辑 素笺 书口 Spine 书耳 笺条 CardWidget 链接卡片 呼墨 SlashMenu 斜杠菜单 笔帘 SelectionToolbar 落笔印 空态 linkMeta 衬线 font-serif 开文档锚点 cmOpenAnchor 预览 分栏 命令通道 editor-commands 双通道 防回环 单挂载 图片粘贴 粘贴截图 图片上传 图床 远程链接 本地链接 切换图片 下拉菜单 MenuPopover 大纲 侧栏 SidePane 上下文侧栏 元数据 只读 字数 高亮 HighlightStyle 面包屑 breadcrumb 改名 迁移 复制 docTransfer transferDoc assets frontmatter 文档头 元数据 隐藏 发布 publish 发布磁贴 issue 回写 关联 Issue | knowledge/editor.md |
| 插件状态项 | statusItems statusBar 状态项 贡献点 徽标位 声明制 | knowledge/shell-chrome-design.md |
| 壳层胶囊 / 控制中心 | 胶囊 壳层胶囊 控制中心 磁贴 tile 功能分区 GIT 排版 任务中心 事件总线 events wuh.events 发布订阅 任务 待办 任务列表 任务胶囊 进度 时间线 TaskCapsule Capsule CapsulePanel ControlSections TaskCenterBody tasks 插件页签追加分区 statusItems 之外的状态聚合 | knowledge/shell-chrome-design.md |
| 插件浮窗视图 | float 浮窗 预览 preview 视图区域 FloatLayer floats | knowledge/shell-chrome-design.md, knowledge/renderer-shell-routing.md |
| 反馈提示 | 提示 反馈 Toast Message Alert 通知 弹窗 横幅 模态 系统通知 失焦 feedback notifySystem 插件提示 确认 | knowledge/ui-feedback.md |
| 插件系统 | 插件 manifest loader 启用 停用 批准 approvals resolveApproval reload 重载 revealDir plugin-state broker 沙箱 帧 握手 ready 协议注册 corsEnabled problems locale 语言 三语 文案 ui.locale views.area panelTabs context 页签 commands 命令贡献 装配 wire | knowledge/plugin-architecture.md |
| 渲染层列表性能 | 虚拟列表 虚拟滚动 VirtualList 大列表 项目树 滚动卡顿 列表渲染 展开状态 行高 | knowledge/renderer-virtual-list.md |

## 查阅流程

1. 先查通用 `shadow-dev-workflow/menu.md` 命中通用 norms。
2. 再按本表命中项目 active Knowledge（只读 `status: active`）。
3. 项目 Knowledge 的 `source` 指向 `shadow-docs/changes/<name>/brief.md`，读取前确认存在。
