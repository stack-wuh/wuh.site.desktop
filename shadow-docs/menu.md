# 项目开发菜单（wuh.site.desktop）

> 通用规范路由见 `shadow-dev-workflow/menu.md`；本表只维护项目独有路由。AI 在 propose 阶段按任务域、关键词和 scope 命中后只读取对应文件。

## 项目路由

| 技术域 | 关键词 | 应查阅 |
|--------|--------|--------|
| 渲染层导航/壳层 | 页面 视图 路由 设置 导航 SideMenu 菜单 两栏 展开 收起 rightRoute main-area 浮窗 FloatLayer toggle 首页 | knowledge/renderer-shell-routing.md |
| 壳层 chrome / 图标 | 图标 图标注册表 AppIcon Icon 品牌标 IconLogo Dock 图标 icon.svg SideMenu StatusBar 状态栏 徽标 tooltip 描边 主题 token | knowledge/shell-chrome-design.md |
| 插件状态项 | statusItems statusBar 状态项 贡献点 徽标位 声明制 | knowledge/shell-chrome-design.md |
| 插件浮窗视图 | float 浮窗 预览 preview 视图区域 FloatLayer floats | knowledge/shell-chrome-design.md, knowledge/renderer-shell-routing.md |
| 插件系统 | 插件 manifest loader 启用 停用 批准 approvals resolveApproval reload 重载 revealDir plugin-state broker 沙箱 problems | knowledge/plugin-architecture.md |

## 查阅流程

1. 先查通用 `shadow-dev-workflow/menu.md` 命中通用 norms。
2. 再按本表命中项目 active Knowledge（只读 `status: active`）。
3. 项目 Knowledge 的 `source` 指向 `shadow-docs/changes/<name>/brief.md`，读取前确认存在。
