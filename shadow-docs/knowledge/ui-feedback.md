---
title: UI 反馈提示系统（Toast / Message / Alert）
domain: renderer-ui
keywords: [提示, 反馈, Toast, Message, Alert, 通知, 弹窗, 横幅, 模态, 系统通知, 失焦降级, feedback, notifySystem, 插件提示, 频率护栏]
scope: [lib/feedback.ts, components/ui/FeedbackHost.tsx, components/plugins/PluginFrameHost.tsx, src/shared/plugin.ts, src/main/systemNotify.ts, src/plugin-sdk]
status: active
source:
  - changes/archive/20260924-feature-ui-feedback-system/brief.md
verified: 2026-09-24
---

# UI 反馈提示系统（Toast / Message / Alert）

## 当前结论

宿主与插件共用的三档反馈机制按**阻塞程度分层**，统一经 `lib/feedback.ts` 的命令式总线入队（单状态源，组件侧 `useFeedback()` 订阅），由 `components/ui/FeedbackHost.tsx` 的三个 Host 渲染：

- **Toast**（`toast(opts)`）：右下角浮出、默认 3s 自动消退（钳制 1–10s）、无按钮——操作成功/配置变动等确认性反馈；同 kind+文案去重（计时重开），上限 4 条、溢出丢最旧。
- **Message**（`message(opts): Promise<string | null>`）：内容区顶部横幅（壳层 `MainColumn` 文档流内、TitleBar 之下）、常驻到手动关闭、可带 ≤3 操作按钮——影响用户操作的提示；resolve 被点 action id，关闭 resolve null；上限 3 条。
- **Alert**（`alert(opts): Promise<string>`）：居中模态、**串行队列**（仅展示首条）、必须明确响应（Esc/点遮罩不关闭）、缺省单 ok 按钮、上限 8 条（溢出即刻 resolve 首按钮防调用方挂起）——系统级推送；resolve 被点按钮 id。

插件经帧协议 `ui` service 三方法使用（SDK 面 `wuh.ui.toast/message/alert`）：运行时调用制、无 manifest 声明、无额外权限（与 `ui.confirm` 同惯例）；入参经 `src/shared/plugin.ts` 的 `sanitizeToastArgs` / `sanitizeMessageArgs` / `sanitizeAlertArgs` 归一（kind 白名单、文本 500 / 标题 120 / 按钮文案 40 字符钳制、actions ≤3 / buttons ≤5），并有每插件滑动窗口频率护栏（`createFeedbackRateLimiter`，缺省 10s 内 5 条，超限抛错）；宿主内部调用不经护栏。

**系统通知降级**：Alert 入队即 fire-and-forget 调 `DesktopApi.notifySystem`；主进程 `src/main/systemNotify.ts` 以 `BrowserWindow.isFocused()/isMinimized()` 为单一事实源裁决——聚焦且未最小化时 no-op，失焦/最小化才发 OS 通知（点击聚焦主窗）。应用内 Alert 队列始终保留，回到窗口仍要求响应；toast/message 不触发系统通知。壳窗识别排除 `data:` 内嵌页（splash）。

## 执行约束

- 三机制语义边界固定为「非阻塞自动消退（Toast）/ 非阻塞常驻可操作（Message）/ 模态必须响应（Alert）」；新提示需求先归入其一，不为单场景新增第四种机制或把 Message 用成模态。
- 新增反馈入口一律经 `lib/feedback.ts` 命令式 API（组件树外同样可调）；不得绕过总线自建浮层或退回 `window.alert`。
- 插件侧入口只经帧协议 `ui` service 扩展（先入 SDK 词表面），必须携带 shared 校验器 + 频率护栏，不引入权限门槛。
- 系统通知只服务 Alert：窗口焦点裁决留在主进程（renderer 不自查焦点）；`notifySystem` 与 Alert 入队解耦，IPC 不可用/失败按「纯应用内」静默降级，不得阻塞或抛出。
- 样式只写语义 token（kind 映射 info→primary、success→success、warning→warning、error→danger）；图标经 `components/icons` 注册表；aria 文案（toastRegion / messageRegion / close）三语同步。

## 适用边界

适用于壳层宿主与插件帧的反馈提示、Alert 失焦降级链路。不适用于插件帧内部自绘 UI（帧内提示不走宿主总线）；不覆盖消息中心/历史收件箱语义（提示是瞬时的，无持久化）；文档操作的模态确认仍走既有 `uiConfirm`（Dialog/ConfirmHost 独立链路，未并入本系统）。

## 验证方式

- `vitest run tests/feedback.test.ts tests/feedback-render.test.tsx tests/plugin-feedback.test.ts tests/system-notify.test.ts`（总线护栏 / Promise 语义 / 三 Host 渲染与必须响应 / 插件入参校验与频率护栏 / 主进程裁决与点通知聚焦）。
- `vitest run tests/plugin-sdk.test.ts`（SDK 源码语法校验与 ui 三方法面冻结）。
- Electron 冒烟（可重复）：隐藏窗调 `notifySystem` 期望 `{shown:true}` 并出现系统通知；聚焦窗期望 `{shown:false,reason:'focused'}`。

## 关联知识

- [壳层 chrome 设计与插件扩展点](shell-chrome-design.md)
- [插件系统架构（loader/批准/重载）](plugin-architecture.md)
- [Renderer 壳层两栏布局与 App Router 路由约定](renderer-shell-routing.md)
