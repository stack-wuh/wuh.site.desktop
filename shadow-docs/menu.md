# 项目开发菜单（wuh.site.desktop）

> 通用规范路由见 `shadow-dev-workflow/menu.md`；本表只维护项目独有路由。AI 在 propose 阶段按任务域、关键词和 scope 命中后只读取对应文件。

## 项目路由

| 技术域 | 关键词 | 应查阅 |
|--------|--------|--------|
| 渲染层导航/壳层 | 页面 视图 路由 路由段 App Router 设置 导航 SideMenu 菜单 两栏 展开 收起 快捷键 用户入口 用户中心 /account 快捷面板 通知条 main 容器 浮窗 FloatLayer toggle 首页 问候语 静态导出 export next | knowledge/renderer-shell-routing.md |
| 壳层 chrome / 图标 | 图标 图标注册表 AppIcon Icon 品牌标 IconLogo Dock 图标 icon.svg 应用图标 ico 任务栏 SideMenu StatusBar 状态栏 徽标 tooltip 描边 主题 token styled-components CSP 用户面板 语言切换 | knowledge/shell-chrome-design.md |
| 用户中心 / GitHub 授权 | 用户中心 account 授权 OAuth Device Flow GitHub 登录 token 凭证 身份 头像 identity 仓库列表 默认站点仓库 PAT scopes 失效 | knowledge/renderer-shell-routing.md, knowledge/shell-chrome-design.md |
| 构建/工具链 | Next next.config 静态导出 app 协议 electron-vite 双进程 dev workspace pnpm 打包 electron-builder tsconfig vitest README | knowledge/renderer-shell-routing.md, knowledge/shell-chrome-design.md |
| 主编辑器 / 预览 | 编辑器 MarkdownEditor CodeMirror CM6 源码编辑 预览 PreviewPane 分栏 命令通道 editor-commands 双通道 防回环 图片粘贴 粘贴截图 大纲 字数 高亮 HighlightStyle | knowledge/editor.md |
| 插件状态项 | statusItems statusBar 状态项 贡献点 徽标位 声明制 | knowledge/shell-chrome-design.md |
| 壳层胶囊 | 胶囊 壳层胶囊 任务 待办 任务列表 任务胶囊 进度 TaskCapsule TaskPopover Capsule CapsulePanel tasks statusItems 之外的状态聚合 | knowledge/shell-chrome-design.md |
| 插件浮窗视图 | float 浮窗 预览 preview 视图区域 FloatLayer floats | knowledge/shell-chrome-design.md, knowledge/renderer-shell-routing.md |
| 反馈提示 | 提示 反馈 Toast Message Alert 通知 弹窗 横幅 模态 系统通知 失焦 feedback notifySystem 插件提示 确认 | knowledge/ui-feedback.md |
| 插件系统 | 插件 manifest loader 启用 停用 批准 approvals resolveApproval reload 重载 revealDir plugin-state broker 沙箱 帧 握手 ready 协议注册 corsEnabled problems | knowledge/plugin-architecture.md |

## 查阅流程

1. 先查通用 `shadow-dev-workflow/menu.md` 命中通用 norms。
2. 再按本表命中项目 active Knowledge（只读 `status: active`）。
3. 项目 Knowledge 的 `source` 指向 `shadow-docs/changes/<name>/brief.md`，读取前确认存在。
