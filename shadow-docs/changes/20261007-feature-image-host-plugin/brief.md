---
{
  "schema": "shadow-dev/v1",
  "name": "20261007-feature-image-host-plugin",
  "type": "feature",
  "scope": "image-host",
  "status": "branched",
  "baseBranch": "main",
  "branch": "feature/20261007-feature-image-host-plugin",
  "files": [
    "components/plugins/PluginFrameHost/frameServices.ts",
    "components/settings/ImageHostSection.tsx",
    "components/settings/SettingsPage.tsx",
    "lib/i18n/locales.ts",
    "plugins/image-host/logic.js",
    "plugins/image-host/plugin.json",
    "plugins/image-host/view.html",
    "src/main/credentials.ts",
    "src/main/images.ts",
    "src/main/ipc.ts",
    "src/main/oss.ts",
    "src/main/pickers.ts",
    "src/main/uploader.ts",
    "src/shared/plugin.ts",
    "src/shared/types.ts",
    "tests/image-host-plugin.test.ts",
    "tests/oss-upload.test.ts"
  ],
  "github": {
    "repository": "stack-wuh/wuh.site.desktop",
    "issue": 143,
    "issueUrl": "https://github.com/stack-wuh/wuh.site.desktop/issues/143",
    "pullRequest": null,
    "pullRequestUrl": null
  },
  "review": {
    "conclusion": "pending",
    "verifiedCommit": null,
    "verifiedAt": null
  },
  "workflow": {
    "operation": null,
    "checkpoint": "issue:143",
    "planHash": "3d41bc8dadc4b962652ade1acd3d3be088a53424d91d8a0e3816159e40052b3b",
    "updatedAt": null,
    "lastError": null,
    "issuePlan": {
      "title": "[feature] 图床插件：阿里云 OSS 直传 + image-host 批量上传面板",
      "titleRaw": "图床插件：阿里云 OSS 直传 + image-host 批量上传面板",
      "supplement": "宿主内置阿里云 OSS 直传（凭证只存主进程），扩展插件能力白名单（uploadImages/pickImages/pickDirectory/clipboardWrite + net.oss.write/fs.picker.read/ui.clipboard.write），编辑器粘贴图片新增 OSS 上传模式（失败回退本地 .assets），新增官方 image-host 插件面板（本地目录批量/手动上传 + OSS 前缀选择 + 复制 markdown 链接），设置页新增图床区块。方案与任务清单见 shadow-docs/changes/20261007-feature-image-host-plugin/brief.md",
      "body": "## 动机\n当前图片只有两条出路：编辑器粘贴落本地 `<stem>.assets/`（不出本机），或设置页配一条外部「图床上传命令」由宿主调用（`src/main/uploader.ts` 的 `uploadImage`，仅宿主可见、插件调不到）。博客写作的图片需要托管到阿里云 OSS 才能发布后外链可用，且图床操作（批量上传、粘贴即传）希望由插件生态承载。本变更内置 OSS 直传、按标准白名单流程扩展插件能力，并提供官方 `image-host` 插件。\n\n**非目标**：腾讯 COS / SM.MS 等其他图床 provider（上传服务按 `uploadMode` 路由预留扩展点，v1 只实现 OSS 与 command 两模式）；上传历史/相册持久化；远端对象管理（列举/删除）；插件市场分发。\n\n## 引用规范\n- shadow-docs/knowledge/plugin-architecture.md\n  - 当前结论: 插件 = 目录 + manifest；能力白名单 `CAPABILITY_METHODS` 默认拒绝；插件凭证只经能力代理注入、帧不接触原文；启停/批准走 `plugin:setEnabled` 单通道\n  - 适用 scope: src/main/plugins, src/shared/plugin.ts, src/plugin-sdk\n- 父仓库 x.wuh.site/shadow-docs/knowledge/desktop-plugin-architecture.md（上位约束）\n  - 当前结论: `uploadImage`/`savePastedImage` 当前对插件不可见（默认拒绝）；新增插件能力必须先进白名单并绑定权限词表；图片落盘禁 base64 内嵌正文\n  - 适用 scope: 旧路径 apps/desktop，现 wuh.site.desktop 根\n- shadow-docs/knowledge/editor.md\n  - 当前结论: 图片粘贴统一走 `savePastedImage` 落 `<stem>.assets/` + 相对引用；凡选文件系统位置一律系统原生弹窗\n  - 适用 scope: src/main/images.ts, src/shared/imagePlan, components/editor\n- shadow-docs/knowledge/ui-feedback.md\n  - 当前结论: 反馈三档 Toast/Message/Alert；影响用户操作的提示用 Message\n  - 适用 scope: lib/feedback.ts\n- norms/code-style.md（默认）；norms/tdd-verification.md（L 级完整 TDD）；norms/ui-patterns.md、norms/interaction.md（设置页区块与插件面板 UI）\n\n## 决策\n- **选型:** 方案 A——宿主图床服务（OSS 直传 + command 兜底统一路由）+ 官方 `image-host` 插件面板 + 粘贴链上传分支\n- **对比方案:** B（STS 临时凭证下发插件帧内直传）否决——要求用户配 RAM 角色、打破「凭证不出主进程」的单一安全模式、形成双上传链路；C（纯宿主功能不做插件）否决——无插件生态位，不符合「图床插件」形态诉求\n- **理由:** 文件字节与 AccessKey 全程不出主进程，插件只做编排；粘贴与批量共用同一条上传链路；新增能力全部走标准白名单与批准流。关键设计：\n  - 安全钳制：`uploadImages` 只接受本会话 picker 返回的路径（主进程会话级白名单校验），防插件夹带任意路径外传文件\n  - 契约兼容：oss 模式粘贴仍先落本地 `.assets`（editor.md 契约不变），上传成功后 `markdownRef` 换远程 URL 并带 `uploaded` 标志，失败保持本地引用 + Message 提示（回退语义）\n  - 原生弹窗心智：`pickImages`/`pickDirectory` 走主进程 dialog（复用 saveDialog 先例）\n  - OSS 接入用 `ali-oss` 官方 SDK（package.json 声明消费），key 命名 = 前缀模板 + 时间戳 + hash8 防冲突，签名与重试交 SDK；自定义域名只影响回填 URL，不参与签名\n\n## 任务\n### Phase 1 主进程图床服务与设置（TDD 先红）\n- [ ] `AppSettings` 增图床配置（`oss`: endpoint/bucket/accessKeyId/accessKeySecret/自定义域名/默认前缀模板；`uploadMode`: local|oss|command）+ `credentials.ts` 读写与脱敏 — `src/shared/types.ts`、`src/main/credentials.ts`\n- [ ] OSS key 生成纯逻辑（前缀模板 + 时间戳 + hash8）单测先红 — `src/main/oss.ts`（新）、`tests/oss-upload.test.ts`\n- [ ] `ali-oss` SDK 直传实现 + 失败错误归一（不泄漏 AK） — `src/main/oss.ts`\n- [ ] `uploadImages` 主进程编排：按 `uploadMode` 路由 oss|command（复用 `uploader.ts` 命令适配器），多文件聚合 `UploadResult[]` — `src/main/uploader.ts`、`src/main/ipc.ts`\n\n### Phase 2 能力白名单与权限（TDD 先红）\n- [ ] `PluginPermission` 词表增 `net.oss.write` / `fs.picker.read` / `ui.clipboard.write`；`CAPABILITY_METHODS` 增 `uploadImages` / `pickImages` / `pickDirectory` / `clipboardWrite`；`authorizeCapability` 用例先红 — `src/shared/plugin.ts`\n- [ ] picker 与剪贴板主进程实现（dialog 多选图片/目录；`clipboard.writeText` 长度钳制）+ `uploadImages` 会话路径校验 — `src/main/pickers.ts`（新）、`src/main/ipc.ts`\n- [ ] broker 联通与帧服务参数钳制同步，plugin-* 测试更新 — `components/plugins/PluginFrameHost/frameServices.ts`\n\n### Phase 3 编辑器粘贴上传分支（TDD 先红）\n- [ ] `savePastedImage` 增上传模式分支：先落本地 `.assets` → `uploadMode=oss` 时上传，成功 `markdownRef` 换远程 URL + `uploaded` 标志，失败保持本地引用 — `src/main/images.ts`、`src/shared/types.ts`（`SavedImage`）\n- [ ] 渲染层对上传失败（`uploaded:false`）的 Message 提示，经 feedback 总线 — `components/editor`（粘贴入口）\n\n### Phase 4 image-host 插件\n- [ ] manifest：main 视图 + logic + 新权限声明 — `plugins/image-host/plugin.json`\n- [ ] 面板视图：本地目录/文件选择、OSS 目标前缀（默认模板可覆盖）、上传队列与进度、完成后复制 markdown 链接 — `plugins/image-host/view.html` 及资产\n- [ ] 逻辑帧编排：picker → `uploadImages` → `clipboardWrite`，进度推送视图 — `plugins/image-host/logic.js`\n- [ ] 插件契约测试（manifest 过 `validateManifest`、权限快照与批准流） — `tests/image-host-plugin.test.ts`\n\n### Phase 5 设置页与 i18n\n- [ ] 设置页「图床」区块：OSS 配置表单 + 上传模式三选 + 连接测试 — `components/settings/ImageHostSection.tsx`（新）、`components/settings/SettingsPage.tsx`\n- [ ] 三语文案 — `lib/i18n/locales.ts`\n\n### Phase 6 验证与走查\n- [ ] vitest 全量 + 三 tsconfig typecheck + `electron-vite build`\n- [ ] 实机走查：粘贴（oss 成功 / 失败回退 / local 不变）、面板批量上传（目录 + 前缀 + 复制链接）、插件批准/停用/重载流、command 模式兜底、凭证不出现在帧内 DevTools 与报错文案\n\n## 补充\n宿主内置阿里云 OSS 直传（凭证只存主进程），扩展插件能力白名单（uploadImages/pickImages/pickDirectory/clipboardWrite + net.oss.write/fs.picker.read/ui.clipboard.write），编辑器粘贴图片新增 OSS 上传模式（失败回退本地 .assets），新增官方 image-host 插件面板（本地目录批量/手动上传 + OSS 前缀选择 + 复制 markdown 链接），设置页新增图床区块。方案与任务清单见 shadow-docs/changes/20261007-feature-image-host-plugin/brief.md\n\n完整 brief：shadow-docs/changes/20261007-feature-image-host-plugin/brief.md\n\n<!-- shadow-dev:issue-metadata {\"name\":\"20261007-feature-image-host-plugin\",\"type\":\"feature\",\"scope\":\"image-host\",\"status\":\"branched\",\"branch\":\"feature/20261007-feature-image-host-plugin\",\"baseBranch\":\"main\",\"briefPath\":\"shadow-docs/changes/20261007-feature-image-host-plugin/brief.md\",\"cliVersion\":\"1.4.0\",\"prUrl\":null,\"issueNumber\":null} -->\n",
      "labels": [
        "feature"
      ]
    },
    "commit": {
      "files": [
        "components/editor/MarkdownEditor/index.tsx",
        "components/icons/index.tsx",
        "components/settings/ImageHostSection.tsx",
        "components/settings/SettingsPage.tsx",
        "lib/i18n/locales.ts",
        "package.json",
        "plugins/image-host/logic/upload.js",
        "plugins/image-host/plugin.json",
        "plugins/image-host/view/index.html",
        "plugins/image-host/view/view.css",
        "plugins/image-host/view/view.js",
        "pnpm-lock.yaml",
        "shadow-docs/changes/20261007-feature-image-host-plugin/brief.md",
        "src/main/credentials.ts",
        "src/main/images.ts",
        "src/main/ipc.ts",
        "src/main/oss.ts",
        "src/main/pickers.ts",
        "src/main/uploader.ts",
        "src/preload/index.ts",
        "src/shared/plugin.ts",
        "src/shared/types.ts",
        "tests/identity-store.test.ts",
        "tests/image-host-plugin.test.ts",
        "tests/oss-upload.test.ts",
        "tests/plugin-assets.test.ts",
        "tests/plugin-auth.test.ts"
      ],
      "message": "feat(image-host): 图床插件 —— 阿里云 OSS 直传 + image-host 批量上传面板 —— OSS 凭证 safeStorage 加密只进主进程，能力白名单新增 picker/oss/clipboard 三权限，粘贴 oss 模式失败回退本地 .assets，设置页图床区块与三语文案"
    }
  }
}
---

# 图床插件：阿里云 OSS 直传 + image-host 批量上传面板

## 动机

当前图片只有两条出路：编辑器粘贴落本地 `<stem>.assets/`（不出本机），或设置页配一条外部「图床上传命令」由宿主调用（`src/main/uploader.ts` 的 `uploadImage`，仅宿主可见、插件调不到）。博客写作的图片需要托管到阿里云 OSS 才能发布后外链可用，且图床操作（批量上传、粘贴即传）希望由插件生态承载。本变更内置 OSS 直传、按标准白名单流程扩展插件能力，并提供官方 `image-host` 插件。

**非目标**：腾讯 COS / SM.MS 等其他图床 provider（上传服务按 `uploadMode` 路由预留扩展点，v1 只实现 OSS 与 command 两模式）；上传历史/相册持久化；远端对象管理（列举/删除）；插件市场分发。

## 复杂度评级

- **评级:** L
- **理由:** 三要素均命中——契约变更（`CAPABILITY_METHODS` 白名单与权限词表新增、`AppSettings` schema 扩展、`SavedImage` 返回语义扩展）；触及宿主核心共享模块（`src/shared/plugin.ts`、`src/main/ipc.ts`、`src/main/images.ts`）；跨模块数据流（主进程上传服务 ↔ broker ↔ 插件帧 ↔ 编辑器粘贴链 ↔ 设置页）。
- **期望验证深度:** runtime（vitest 全绿 + 实机粘贴/面板上传走查，观察点见 Phase 6）

## 引用规范

- shadow-docs/knowledge/plugin-architecture.md
  - 当前结论: 插件 = 目录 + manifest；能力白名单 `CAPABILITY_METHODS` 默认拒绝；插件凭证只经能力代理注入、帧不接触原文；启停/批准走 `plugin:setEnabled` 单通道
  - 适用 scope: src/main/plugins, src/shared/plugin.ts, src/plugin-sdk
- 父仓库 x.wuh.site/shadow-docs/knowledge/desktop-plugin-architecture.md（上位约束）
  - 当前结论: `uploadImage`/`savePastedImage` 当前对插件不可见（默认拒绝）；新增插件能力必须先进白名单并绑定权限词表；图片落盘禁 base64 内嵌正文
  - 适用 scope: 旧路径 apps/desktop，现 wuh.site.desktop 根
- shadow-docs/knowledge/editor.md
  - 当前结论: 图片粘贴统一走 `savePastedImage` 落 `<stem>.assets/` + 相对引用；凡选文件系统位置一律系统原生弹窗
  - 适用 scope: src/main/images.ts, src/shared/imagePlan, components/editor
- shadow-docs/knowledge/ui-feedback.md
  - 当前结论: 反馈三档 Toast/Message/Alert；影响用户操作的提示用 Message
  - 适用 scope: lib/feedback.ts
- norms/code-style.md（默认）；norms/tdd-verification.md（L 级完整 TDD）；norms/ui-patterns.md、norms/interaction.md（设置页区块与插件面板 UI）

## 决策

- **选型:** 方案 A——宿主图床服务（OSS 直传 + command 兜底统一路由）+ 官方 `image-host` 插件面板 + 粘贴链上传分支
- **对比方案:** B（STS 临时凭证下发插件帧内直传）否决——要求用户配 RAM 角色、打破「凭证不出主进程」的单一安全模式、形成双上传链路；C（纯宿主功能不做插件）否决——无插件生态位，不符合「图床插件」形态诉求
- **理由:** 文件字节与 AccessKey 全程不出主进程，插件只做编排；粘贴与批量共用同一条上传链路；新增能力全部走标准白名单与批准流。关键设计：
  - 安全钳制：`uploadImages` 只接受本会话 picker 返回的路径（主进程会话级白名单校验），防插件夹带任意路径外传文件
  - 契约兼容：oss 模式粘贴仍先落本地 `.assets`（editor.md 契约不变），上传成功后 `markdownRef` 换远程 URL 并带 `uploaded` 标志，失败保持本地引用 + Message 提示（回退语义）
  - 原生弹窗心智：`pickImages`/`pickDirectory` 走主进程 dialog（复用 saveDialog 先例）
  - OSS 接入用 `ali-oss` 官方 SDK（package.json 声明消费），key 命名 = 前缀模板 + 时间戳 + hash8 防冲突，签名与重试交 SDK；自定义域名只影响回填 URL，不参与签名

## 任务

### Phase 1 主进程图床服务与设置（TDD 先红）
- [x] `AppSettings` 增图床配置（`oss`: endpoint/bucket/accessKeyId/accessKeySecret/自定义域名/默认前缀模板；`uploadMode`: local|oss|command）+ `credentials.ts` 读写与脱敏 — `src/shared/types.ts`、`src/main/credentials.ts`
- [x] OSS key 生成纯逻辑（前缀模板 + 时间戳 + hash8）单测先红 — `src/main/oss.ts`（新）、`tests/oss-upload.test.ts`
- [x] `ali-oss` SDK 直传实现 + 失败错误归一（不泄漏 AK） — `src/main/oss.ts`
- [x] `uploadImages` 主进程编排：按 `uploadMode` 路由 oss|command（复用 `uploader.ts` 命令适配器），多文件聚合 `UploadResult[]` — `src/main/uploader.ts`、`src/main/ipc.ts`

### Phase 2 能力白名单与权限（TDD 先红）
- [x] `PluginPermission` 词表增 `net.oss.write` / `fs.picker.read` / `ui.clipboard.write`；`CAPABILITY_METHODS` 增 `uploadImages` / `pickImages` / `pickDirectory` / `clipboardWrite`；`authorizeCapability` 用例先红 — `src/shared/plugin.ts`
- [x] picker 与剪贴板主进程实现（dialog 多选图片/目录；`clipboard.writeText` 长度钳制）+ `uploadImages` 会话路径校验 — `src/main/pickers.ts`（新）、`src/main/ipc.ts`
- [x] broker 联通与帧服务参数钳制同步，plugin-* 测试更新 — `components/plugins/PluginFrameHost/frameServices.ts`

### Phase 3 编辑器粘贴上传分支（TDD 先红）
- [x] `savePastedImage` 增上传模式分支：先落本地 `.assets` → `uploadMode=oss` 时上传，成功 `markdownRef` 换远程 URL + `uploaded` 标志，失败保持本地引用 — `src/main/images.ts`、`src/shared/types.ts`（`SavedImage`）
- [x] 渲染层对上传失败（`uploaded:false`）的 Message 提示，经 feedback 总线 — `components/editor`（粘贴入口）

### Phase 4 image-host 插件
- [x] manifest：main 视图 + logic + 新权限声明 — `plugins/image-host/plugin.json`
- [x] 面板视图：本地目录/文件选择、OSS 目标前缀（默认模板可覆盖）、上传队列与进度、完成后复制 markdown 链接 — `plugins/image-host/view.html` 及资产
- [x] 逻辑帧编排：picker → `uploadImages` → `clipboardWrite`，进度推送视图 — `plugins/image-host/logic.js`
- [x] 插件契约测试（manifest 过 `validateManifest`、权限快照与批准流） — `tests/image-host-plugin.test.ts`

### Phase 5 设置页与 i18n
- [x] 设置页「图床」区块：OSS 配置表单 + 上传模式三选 + 连接测试 — `components/settings/ImageHostSection.tsx`（新）、`components/settings/SettingsPage.tsx`
- [x] 三语文案 — `lib/i18n/locales.ts`

### Phase 6 验证与走查
- [x] vitest 全量 + 三 tsconfig typecheck + `electron-vite build`
- [ ] 实机走查：粘贴（oss 成功 / 失败回退 / local 不变）、面板批量上传（目录 + 前缀 + 复制链接）、插件批准/停用/重载流、command 模式兜底、凭证不出现在帧内 DevTools 与报错文案

## 结果

- 实际耗时: —
- 验证: —

## 知识评估

- **预期影响:** 更新
- **候选卡片:** shadow-docs/knowledge/plugin-architecture.md（新能力/权限词表与上传链路结论，更新时标 verified-depth）；shadow-docs/knowledge/editor.md（图片粘贴段增上传模式分支与失败回退语义）
- **理由:** 能力白名单与凭证模型是 plugin-architecture 卡核心结论的直接扩展；粘贴落盘语义变化触及 editor.md 图片粘贴段。若 image-host 面板交互沉淀出独立可复用模式（队列/前缀选择），再评估新增插件面卡片，不预先建冗余卡
