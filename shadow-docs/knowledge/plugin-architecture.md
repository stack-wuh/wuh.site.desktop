---
title: 插件系统架构（loader/批准/重载）
domain: plugin
keywords: [插件, plugin, manifest, loader, 启用, 停用, 批准, approvals, resolveApproval, reload, 重载, revealDir, plugin-state, broker, 沙箱]
scope: [src/main/plugins, src/shared/plugin.ts, src/plugin-sdk, src/preload/index.ts]
status: active
source:
  - changes/archive/20260915-feature-desktop-plugin-system/brief.md
  - changes/archive/20260920-feature-plugin-manager/brief.md
verified: 2026-09-21
---

# 插件系统架构（loader/批准/重载）

## 当前结论

插件 = 目录 + `plugin.json` manifest（经 `src/shared/plugin.ts` 的 `validateManifest` 严格校验）。主进程 loader（`src/main/plugins/loader.ts`）扫描双目录——内置 `app.getAppPath()/plugins/` 与 `userData/plugins/`（第三方），先扫到的同 id 保留，校验失败目录进 `problems`。

**状态单一源**：`userData/plugin-state.json` = `{ disabled: string[], approvals: Record<插件id, 权限快照[]> }`。

**批准模型（2026-09-21）**：纯函数 `resolveApproval(manifest, approvals)`（shared，可独立测试）判定 `approved/pending/changed`——快照与当前 manifest 权限**排序去重比较**（顺序无关）。**有效启用 = 未禁用 且 approval === 'approved'**，`PluginRecord.enabled/approval` 由扫描时一次算出；broker 会话裁决、逻辑帧加载（`getLogicEntry` 只认 enabled）、publisher 桥接、渲染层视图列表全部自动继承。

**启停与批准通道**：`plugin:setEnabled(pluginId, enabled, approvedPermissions?)` 三参——启用 pending/changed 插件必须携带与 manifest 完全一致的权限数组（`samePermissions` 校验，不一致拒绝），批准写入快照；批准后重复启用无需三参；禁用不撤销批准。批准时机由壳层管理入口（设置页 `PluginManagerSection` 弹权限确认框）承载。

**reload / revealDir 通道**：`plugin:reload` 幂等重跑 `rescan()`（重扫双目录 + 重建 records/桥接/IPC，`bootstrapPlugins` 与之共用同一实现）；`plugin:revealDir` 经 `shell.openPath` 打开插件目录，只认已注册插件 id，不接受任意路径。

**渲染层宿主**（`src/renderer/src/plugins/PluginFrameHost.tsx`）：`bootstrapPluginsHost` 只处理启动时已启用插件；`togglePlugin` 运行时启停——启用补建会话+逻辑帧+状态项注册，停用反向清理（配 `floats.closePluginFloats` 收起该插件浮窗）；`rebootstrapPluginsHost` 服务重载（主进程 rescan → 渲染层关全部帧 + `renderService.reset()` + 重建会话与逻辑帧）；`hostGeneration` 代际信号驱动 App 刷新 mainViews/floatViews 列表、失效路由回退 home。

## 执行约束

- 启停/批准只经 `plugin:setEnabled` 单通道，快照只存 plugin-state.json，不建第二状态源
- `resolveApproval`/`samePermissions` 是纯函数：改判定语义必须同步 `tests/plugin-approval.test.ts`
- 新增插件能力必须先进 `CAPABILITY_METHODS` 白名单并绑定权限词表，禁止为单插件开特例通道
- manifest `logic` 约定为经典脚本语义（顶层 await 允许；运行于沙箱 allow-scripts 不透明源帧）
- 消息协议 kind（hello/ready/invoke/result/event/request/response）变更须同步 shared 类型、SDK 字符串与帧宿主三方

## 适用边界

适用于桌面端插件装载/启停/批准/重载机制与其官方参考插件。渲染层壳层布局（SideMenu/rightRoute/FloatLayer）见 renderer-shell-routing 与 shell-chrome-design 卡片；站点 web 端无关。

## 验证方式

- `node node_modules/vitest/vitest.mjs run`（plugin-approval / plugin-manifest / plugin-broker / plugin-protocol / plugin-auth / plugin-assets / plugin-sdk / plugin-statusitems 全绿）
- `tsc --noEmit` 双侧 + `electron-vite build`
- CDP 走查：设置页插件区块 → 启用弹批准框 → 批准后 SideMenu 出现视图项 → 停用后消失；重载后菜单即时刷新

## 关联知识

- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)（贡献点扩展的声明制流程）
- [Renderer 壳层双层路由约定](renderer-shell-routing.md)（main/float 视图的落位）
- 父仓库 `shadow-docs/knowledge/desktop-plugin-architecture.md`（沙箱/能力白名单/权限词表上位约束）
