---
{
  "schema": "shadow-dev/v1",
  "name": "20260924-feature-ui-feedback-system",
  "type": "feature",
  "scope": "apps/desktop",
  "status": "reviewed",
  "baseBranch": "main",
  "branch": "feature/20260924-feature-ui-feedback-system",
  "files": [
    "app/(shell)/layout.tsx",
    "components/icons/index.tsx",
    "components/plugins/PluginFrameHost.tsx",
    "components/settings/PluginManagerSection.tsx",
    "components/ui/FeedbackHost.tsx",
    "lib/feedback.ts",
    "lib/i18n/locales.ts",
    "src/main/ipc.ts",
    "src/main/register-features.ts",
    "src/main/systemNotify.ts",
    "src/plugin-sdk/index.ts",
    "src/preload/index.ts",
    "src/shared/plugin.ts",
    "src/shared/types.ts",
    "tests/feedback-render.test.tsx",
    "tests/feedback.test.ts",
    "tests/plugin-feedback.test.ts",
    "tests/plugin-sdk.test.ts",
    "tests/system-notify.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 78,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/78",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "passed",
    "verifiedCommit": "d4922cf9497745e49a91f7bb6d9209062644d931",
    "verifiedAt": "2026-09-24T08:59:02.865Z"
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:78",
    "planHash": "946b5376f55d9238cb462f926b3fcbf992f291b13e1d6c2e029cb07f71360c01",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] UI 反馈提示系统（Toast / Message / Alert）+ 插件开放",
      "titleRaw": null,
      "supplement": "",
      "body": "## 动机\n宿主与插件目前只有零散提示能力：`uiConfirm`（模态确认）、编辑器面板内 notice 条（局部、2.6s）、设置页内联 SavedFlash——**没有统一的反馈通道**，插件侧更是只有 `ui.confirm` 一个出口。用户需要三档强度的提示机制（按阻塞程度分层），并开放给插件，用于优化整体体验：\n\n- **Toast**：非阻塞、自动消退（~3s），无按钮——配置变动、操作成功等确认性反馈；\n- **Message**：非阻塞、常驻到手动关闭、可带操作按钮——影响用户操作的提示（\"保存失败\"→[重试][忽略]）；\n- **Alert**：模态阻塞、必须明确响应——系统级推送（服务中断、需要用户决策的大事），窗口失焦时降级 OS 系统通知，保证强提醒不丢失。\n\n## 引用规范\n- shadow-docs/knowledge/shell-chrome-design.md\n  - 当前结论: 壳层 chrome 用语义 token + AppIcon；插件贡献点分「manifest 声明制」（statusBar/tasks/capsule）与「运行时调用制」（ui.confirm）；TitleBar 左区为通知/信息预留位（aria-live 就位）\n  - 适用 scope: app, components, lib, src/shared/plugin.ts, src/plugin-sdk\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 插件经帧协议 postMessage RPC 调 host 服务（service 分派）；归属由宿主按帧身份盖章；ui 服务无额外权限\n  - 适用 scope: src/plugin-sdk, src/preload/index.ts, components/plugins\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 编辑器内 notice 条为面板局部机制（本次保留不动，不作替换）\n  - 适用 scope: components/editor\n\n## 决策\n- **选型:** 命令式反馈总线 + 三 Host（`lib/feedback.ts` 纯逻辑三队列 + `components/ui/FeedbackHost.tsx` 壳层单实例）；Message 落内容区顶部横幅；Alert 失焦降级经 `DesktopApi.notifySystem` 交主进程裁决后发 OS 通知。\n- **对比方案:**\n  - React Context + useFeedback()——非组件上下文（lib/store、插件桥回帧、主进程事件）调不到，会与既有 uiConfirm 命令式惯例形成两套 API；\n  - 引第三方 toast 库（sonner 等）——项目零 UI 依赖、全自研语义 token，三语义（Alert 模态/Message 常驻带操作/OS 降级）与主题桥接都要二次封装，新增供应链维护面。\n- **理由:** 与 `uiConfirm`/`ConfirmHost` 既有惯例同构；纯逻辑可单测（对齐 lib/floats、lib/editor-state 惯例）；插件侧沿用帧协议 `ui` service 运行时调用制、无 manifest 声明、无额外权限，仅加**频率护栏**防刷屏；样式只写语义 token。\n- **契约要点:**\n  - `toast(opts): void`（kind: info|success|warning|error，默认 ~3s 消退）\n  - `message(opts): Promise<string | null>`（常驻，actions: [{id,label,variant?}] ≤3；返回点击的 id 或关闭 null）\n  - `alert(opts): Promise<string>`（模态串行队列，buttons 默认「知道了」；返回按钮 id；失焦时发 OS 通知且应用内队列**保留**——回到窗口仍要求响应，符合「必须响应」语义）\n  - 层叠：Message 在文档流（内容区顶部、TitleBar 之下），Toast z≈90（浮窗之上、模态之下），Alert 复用 Dialog 模态层\n  - 插件入参见面：`wuh.ui.toast/message/alert`（帧协议 ui service 扩展），opts 校验（kind 白名单、文本长度钳制、actions 上限）与频率护栏\n  - OS 降级：主进程 `BrowserWindow.isFocused()/isMinimized()` 裁决单一事实源，聚焦时 IPC 侧 no-op\n- **非目标:**\n  - 不做消息中心/历史收件箱（瞬时提示语义，无持久化）；\n  - 不改现有 `uiConfirm` 调用点（Alert 是其超集，收敛留后续）；\n  - 宿主现有提示点不全量替换（编辑器 notice 条、设置页 SavedFlash 保留）；\n  - 不做提示偏好设置（静音/免打扰留后续）。\n\n## 任务\n### Phase 1 反馈总线与宿主\n- [ ] 命令式总线：三队列 + 订阅（useSyncExternalStore）+ 护栏（队列上限、时长钳制、同文案去重）— `lib/feedback.ts` `tests/feedback.test.ts`\n- [ ] 三 Host 渲染件：ToastStack（右下浮出、自动消退）/ MessageBannerStack（内容区顶部横幅、常驻、可带操作）/ AlertHost（复用 Dialog 视觉、模态串行队列）— `components/ui/FeedbackHost.tsx`\n- [ ] 壳层挂载：MessageBannerStack 进 MainArea（children 之上）、FeedbackHost 挂根 — `app/(shell)/layout.tsx`\n- [ ] 三语 i18n（区块 aria、关闭按钮、默认按钮等）— `lib/i18n/locales.ts`\n- [ ] DOM 渲染测试（三机制结构/aria/自动消退/操作按钮 resolve/串行队列）— `tests/feedback-render.test.tsx`\n\n### Phase 2 插件开放\n- [ ] 帧协议 ui 服务三方法 + opts 纯逻辑校验（kind 白名单/长度钳制/actions 上限）— `components/plugins/PluginFrameHost.tsx` `src/shared/plugin.ts`\n- [ ] SDK 面 `wuh.ui.toast/message/alert` + 类型面 — `src/plugin-sdk/index.ts`\n- [ ] 协议与校验测试（含频率护栏）— `tests/plugin-feedback.test.ts`\n\n### Phase 3 Alert 系统级降级（OS 通知）\n- [ ] 主进程 systemNotify：纯逻辑裁决（focused/minimized → 是否发 OS 通知）+ Notification 薄封装 — `src/main/systemNotify.ts` `src/main/register-features.ts`\n- [ ] `DesktopApi.notifySystem` + ipc 桩 + preload 转发 — `src/shared/types.ts` `src/main/ipc.ts` `src/preload/index.ts`\n- [ ] renderer 触发链路：alert 入队同时发 notifySystem（fire-and-forget），主进程裁决 — `lib/feedback.ts`\n- [ ] 测试（裁决纯逻辑）+ dev 手动验证（窗口失焦触发 alert → 系统通知到达、回窗口模态仍要求响应）\n\n### Phase 4 宿主示范接入\n- [ ] 插件管理页「重载插件目录」成功 → Toast（重载完成，发现 N 个插件）— `components/settings/PluginManagerSection.tsx`\n\n完整 brief：shadow-docs/changes/20260924-feature-ui-feedback-system/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20260924-feature-ui-feedback-system\",\"type\":\"feature\",\"scope\":\"apps/desktop\",\"status\":\"proposed\",\"branch\":null,\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20260924-feature-ui-feedback-system/brief.md\",\"cliVersion\":\"1.3.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    }
  },
  "knowledge": null
}
---

# UI 反馈提示系统（Toast / Message / Alert）+ 插件开放

## 动机
宿主与插件目前只有零散提示能力：`uiConfirm`（模态确认）、编辑器面板内 notice 条（局部、2.6s）、设置页内联 SavedFlash——**没有统一的反馈通道**，插件侧更是只有 `ui.confirm` 一个出口。用户需要三档强度的提示机制（按阻塞程度分层），并开放给插件，用于优化整体体验：

- **Toast**：非阻塞、自动消退（~3s），无按钮——配置变动、操作成功等确认性反馈；
- **Message**：非阻塞、常驻到手动关闭、可带操作按钮——影响用户操作的提示（"保存失败"→[重试][忽略]）；
- **Alert**：模态阻塞、必须明确响应——系统级推送（服务中断、需要用户决策的大事），窗口失焦时降级 OS 系统通知，保证强提醒不丢失。

## 引用规范
- shadow-docs/knowledge/shell-chrome-design.md
  - 当前结论: 壳层 chrome 用语义 token + AppIcon；插件贡献点分「manifest 声明制」（statusBar/tasks/capsule）与「运行时调用制」（ui.confirm）；TitleBar 左区为通知/信息预留位（aria-live 就位）
  - 适用 scope: app, components, lib, src/shared/plugin.ts, src/plugin-sdk
- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 插件经帧协议 postMessage RPC 调 host 服务（service 分派）；归属由宿主按帧身份盖章；ui 服务无额外权限
  - 适用 scope: src/plugin-sdk, src/preload/index.ts, components/plugins
- shadow-docs/knowledge/editor.md
  - 当前结论: 编辑器内 notice 条为面板局部机制（本次保留不动，不作替换）
  - 适用 scope: components/editor

## 决策
- **选型:** 命令式反馈总线 + 三 Host（`lib/feedback.ts` 纯逻辑三队列 + `components/ui/FeedbackHost.tsx` 壳层单实例）；Message 落内容区顶部横幅；Alert 失焦降级经 `DesktopApi.notifySystem` 交主进程裁决后发 OS 通知。
- **对比方案:**
  - React Context + useFeedback()——非组件上下文（lib/store、插件桥回帧、主进程事件）调不到，会与既有 uiConfirm 命令式惯例形成两套 API；
  - 引第三方 toast 库（sonner 等）——项目零 UI 依赖、全自研语义 token，三语义（Alert 模态/Message 常驻带操作/OS 降级）与主题桥接都要二次封装，新增供应链维护面。
- **理由:** 与 `uiConfirm`/`ConfirmHost` 既有惯例同构；纯逻辑可单测（对齐 lib/floats、lib/editor-state 惯例）；插件侧沿用帧协议 `ui` service 运行时调用制、无 manifest 声明、无额外权限，仅加**频率护栏**防刷屏；样式只写语义 token。
- **契约要点:**
  - `toast(opts): void`（kind: info|success|warning|error，默认 ~3s 消退）
  - `message(opts): Promise<string | null>`（常驻，actions: [{id,label,variant?}] ≤3；返回点击的 id 或关闭 null）
  - `alert(opts): Promise<string>`（模态串行队列，buttons 默认「知道了」；返回按钮 id；失焦时发 OS 通知且应用内队列**保留**——回到窗口仍要求响应，符合「必须响应」语义）
  - 层叠：Message 在文档流（内容区顶部、TitleBar 之下），Toast z≈90（浮窗之上、模态之下），Alert 复用 Dialog 模态层
  - 插件入参见面：`wuh.ui.toast/message/alert`（帧协议 ui service 扩展），opts 校验（kind 白名单、文本长度钳制、actions 上限）与频率护栏
  - OS 降级：主进程 `BrowserWindow.isFocused()/isMinimized()` 裁决单一事实源，聚焦时 IPC 侧 no-op
- **非目标:**
  - 不做消息中心/历史收件箱（瞬时提示语义，无持久化）；
  - 不改现有 `uiConfirm` 调用点（Alert 是其超集，收敛留后续）；
  - 宿主现有提示点不全量替换（编辑器 notice 条、设置页 SavedFlash 保留）；
  - 不做提示偏好设置（静音/免打扰留后续）。

## 任务
### Phase 1 反馈总线与宿主
- [x] 命令式总线：三队列 + 订阅（useSyncExternalStore）+ 护栏（队列上限、时长钳制、同文案去重）— `lib/feedback.ts` `tests/feedback.test.ts`
- [x] 三 Host 渲染件：ToastStack（右下浮出、自动消退）/ MessageBannerStack（内容区顶部横幅、常驻、可带操作）/ AlertHost（复用 Dialog 视觉、模态串行队列）— `components/ui/FeedbackHost.tsx`
- [x] 壳层挂载：MessageBannerStack 进 MainArea（children 之上）、FeedbackHost 挂根 — `app/(shell)/layout.tsx`
- [x] 三语 i18n（区块 aria、关闭按钮、默认按钮等）— `lib/i18n/locales.ts`
- [x] DOM 渲染测试（三机制结构/aria/自动消退/操作按钮 resolve/串行队列）— `tests/feedback-render.test.tsx`

### Phase 2 插件开放
- [x] 帧协议 ui 服务三方法 + opts 纯逻辑校验（kind 白名单/长度钳制/actions 上限）— `components/plugins/PluginFrameHost.tsx` `src/shared/plugin.ts`
- [x] SDK 面 `wuh.ui.toast/message/alert` + 类型面 — `src/plugin-sdk/index.ts`
- [x] 协议与校验测试（含频率护栏）— `tests/plugin-feedback.test.ts`

### Phase 3 Alert 系统级降级（OS 通知）
- [x] 主进程 systemNotify：纯逻辑裁决（focused/minimized → 是否发 OS 通知）+ Notification 薄封装 — `src/main/systemNotify.ts` `src/main/register-features.ts`
- [x] `DesktopApi.notifySystem` + ipc 桩 + preload 转发 — `src/shared/types.ts` `src/main/ipc.ts` `src/preload/index.ts`
- [x] renderer 触发链路：alert 入队同时发 notifySystem（fire-and-forget），主进程裁决 — `lib/feedback.ts`
- [x] 测试（裁决纯逻辑）+ dev 手动验证（窗口失焦触发 alert → 系统通知到达、回窗口模态仍要求响应）

### Phase 4 宿主示范接入
- [x] 插件管理页「重载插件目录」成功 → Toast（重载完成，发现 N 个插件）— `components/settings/PluginManagerSection.tsx`

## 结果
- 实际耗时: —
- 验证: —

## 知识评估
- **预期影响:** 新增
- **候选卡片:** shadow-docs/knowledge/ui-feedback.md
- **理由:** 三机制契约（阻塞程度分层）、插件开放面（帧协议 ui 扩展 + 频率护栏）、OS 降级链路是跨 components/ui、lib、帧协议三层的长期稳定事实；shell-chrome-design 已聚焦布局/图标/贡献点惯例，独立成卡更清晰，并在 shell-chrome-design 的关联知识中互链。
